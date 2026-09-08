// Netlify Function: otp-send
// Issues a 6-digit one-time code by email.
//
// Hardening applied:
//  - OTP generated with crypto.randomInt (not Math.random)
//  - OTP stored ONLY as an HMAC-SHA256 digest (OTP_HASH_SECRET) - never plaintext
//  - 60s per-email resend cooldown enforced from the existing created_at column
//  - Best-effort per-IP throttling (in-memory window)
//  - Static top-level imports; clients built in-handler so config errors become explicit 503s
//  - Security headers + Cache-Control: no-store on every response
//  - Temp-domain blocklist retained

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_SENDS = 5;

const blockedDomains = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "temp-mail.org",
  "throwaway.email",
  "getnada.com",
  "0clickemail.com",
  "1secmail.com",
  "20minutemail.com",
  "2prong.com",
];

// Best-effort in-memory per-IP limiter. Not a substitute for a real
// rate-limit layer (e.g. Netlify Blasts / edge rules) but raises the bar
// against scripted abuse across warm instances.
const ipSendLog = new Map();
function ipAllowed(ip) {
  if (!ip) return true;
  const now = Date.now();
  const entry = ipSendLog.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipSendLog.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= IP_MAX_SENDS) return false;
  entry.count += 1;
  return true;
}
// Opportunistic cleanup so the map cannot grow without bound.
function pruneIpLog() {
  const now = Date.now();
  for (const [ip, entry] of ipSendLog) {
    if (now - entry.windowStart > IP_WINDOW_MS) ipSendLog.delete(ip);
  }
  if (ipSendLog.size > 5000) ipSendLog.clear();
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function securityHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}

function json(statusCode, obj) {
  return { statusCode, headers: securityHeaders(), body: JSON.stringify(obj) };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashOtp(otp, secret) {
  return crypto.createHmac("sha256", secret).update(String(otp)).digest("hex");
}

function validateEmailDomain(email) {
  const domain = email.split("@")[1];
  if (!domain) return { valid: false, error: "Invalid email format" };
  if (blockedDomains.includes(domain.toLowerCase())) {
    return { valid: false, error: "Temporary email addresses are not allowed" };
  }
  return { valid: true };
}

function generateOTP() {
  // crypto.randomInt is a CSPRNG; Math.random is not.
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

async function sendOTPEmail(resend, email, otp, fromAddr) {
  await resend.emails.send({
    from: fromAddr || "onboarding@resend.dev",
    to: email,
    subject: "Your HYBE Fan-Permit Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, error: "Method Not Allowed" });
  }

  try {
    // Lazy client construction: config errors surface as explicit 503s
    // instead of crashing the function at cold start.
    const hashSecret = requireEnv("OTP_HASH_SECRET");
    const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_KEY");

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { success: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(body.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json(400, { success: false, error: "Invalid email format" });
    }

    const domainValidation = validateEmailDomain(email);
    if (!domainValidation.valid) {
      return json(400, { success: false, error: domainValidation.error });
    }

    const clientIp =
      event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      event.headers["client-ip"] ||
      event.headers["x-nf-client-connection-ip"] ||
      null;
    if (!ipAllowed(clientIp)) {
      pruneIpLog();
      return json(429, {
        success: false,
        error: "Too many verification requests. Please try again later.",
      });
    }
    pruneIpLog();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Per-email resend cooldown (uses existing created_at column, no schema change)
    const { data: existing } = await supabase
      .from("otp_verifications")
      .select("email, created_at, verified")
      .eq("email", email)
      .maybeSingle();
    if (existing && !existing.verified) {
      const elapsed = Date.now() - new Date(existing.created_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryIn = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return json(429, {
          success: false,
          error: `Please wait ${retryIn} seconds before requesting another code.`,
          retryAfterSeconds: retryIn,
        });
      }
    }

    const otp = generateOTP();
    const otpHash = hashOtp(otp, hashSecret);
    const now = new Date();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const { error: upsertError } = await supabase
      .from("otp_verifications")
      .upsert(
        {
          email,
          otp_code: otpHash,
          verified: false,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          max_attempts: 3,
        },
        { onConflict: "email" },
      );
    if (upsertError) throw upsertError;

    const resend = new Resend(requireEnv("RESEND_API_KEY"));
    await sendOTPEmail(resend, email, otp, process.env.EMAIL_FROM);

    return json(200, {
      success: true,
      message: "OTP sent to your email. Check your inbox and spam folder.",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("OTP send error:", error);
    if (error && error.message && /Missing required env var/.test(error.message)) {
      return json(503, { success: false, error: "Server configuration error" });
    }
    return json(500, { success: false, error: "Failed to send OTP" });
  }
};
