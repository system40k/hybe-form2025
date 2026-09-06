// Netlify Function: otp-verify
// Validates the submitted 6-digit code against the stored HMAC digest and,
// on success, issues a short-lived, HMAC-signed capability token that the
// submission endpoint requires.
//
// Hardening applied:
//  - Constant-time comparison against the stored HMAC-SHA256 digest
//  - Attempts counter caps brute force (3 attempts, existing max_attempts column)
//  - Verification token is signed (HMAC-SHA256, OTP_SIGNING_SECRET) with an
//    exp claim (30 min) - no more forgeable unsigned base64 blobs
//  - Static top-level imports; client built in-handler; security headers on every response
//  - Token payload is base64url for safe transport in forms/JSON

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const TOKEN_TTL_S = 30 * 60;

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

function timingSafeHexEqual(a, b) {
  const ba = Buffer.from(String(a), "hex");
  const bb = Buffer.from(String(b), "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function base64url(s) {
  return Buffer.from(s)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signPayload(payloadB64, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
}

function issueVerificationToken(email) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { email, verified: true, iat: now, exp: now + TOKEN_TTL_S };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = signPayload(payloadB64, requireEnv("OTP_SIGNING_SECRET"));
  return `${payloadB64}.${sig}`;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, error: "Method Not Allowed" });
  }

  try {
    const hashSecret = requireEnv("OTP_HASH_SECRET");
    const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseKey) {
      return json(503, { success: false, error: "Server configuration error" });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { success: false, error: "Invalid JSON body" });
    }

    const email = normalizeEmail(body.email);
    const otp_code = String(body.otp_code || "").trim();

    if (!email || !otp_code) {
      return json(400, { success: false, error: "Email and OTP code are required" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: record, error } = await supabase
      .from("otp_verifications")
      .select("otp_code, verified, expires_at, attempts, max_attempts")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("OTP verify lookup error:", error);
      return json(500, { success: false, error: "Failed to verify OTP" });
    }
    if (!record) {
      return json(400, { success: false, error: "No verification code was requested for this email" });
    }

    if (record.verified) {
      return json(400, { success: false, error: "Email already verified" });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return json(400, { success: false, error: "OTP code has expired. Please request a new code." });
    }

    const maxAttempts = Number(record.max_attempts) || 3;
    if (Number(record.attempts) >= maxAttempts) {
      return json(400, { success: false, error: "Maximum attempts exceeded. Please request a new code." });
    }

    const expectedHash = record.otp_code;
    const candidateHash = hashOtp(otp_code, hashSecret);
    if (!timingSafeHexEqual(expectedHash, candidateHash)) {
      const { error: attemptError } = await supabase
        .from("otp_verifications")
        .update({ attempts: Number(record.attempts) + 1 })
        .eq("email", email);
      if (attemptError) console.error("Failed to increment OTP attempts:", attemptError);
      return json(400, { success: false, error: "Invalid OTP code" });
    }

    const { error: verifyError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("email", email);
    if (verifyError) {
      console.error("Failed to mark OTP verified:", verifyError);
      return json(500, { success: false, error: "Failed to verify OTP" });
    }

    const token = issueVerificationToken(email);

    return json(200, {
      success: true,
      message: "Email verified successfully",
      token,
      expiresInSeconds: TOKEN_TTL_S,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    if (error && error.message && /Missing required env var/.test(error.message)) {
      return json(503, { success: false, error: "Server configuration error" });
    }
    return json(500, { success: false, error: "Failed to verify OTP" });
  }
};

