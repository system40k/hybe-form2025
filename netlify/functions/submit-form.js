// Netlify Function: submit-form
// Receives the validated subscription form payload from the SPA and enforces
// the email-verification gate server side.
//
// Hardening applied:
//  - otp_token is now REQUIRED (previously optional / trivially forgeable)
//  - Token is HMAC-SHA256 signed (OTP_SIGNING_SECRET) with iat/exp claims
//  - Token email must match the submission email (normalized)
//  - Cross-checked against the otp_verifications row (verified == true) so a
//    stolen token is useless without the corresponding verified database state
//  - Fails closed when signing config or the database is unavailable
//  - Security headers + Cache-Control: no-store on every response
//
// Persistence note: durable capture is handled by the Netlify Forms POST to
// "/" (form-name=subscription-form); this endpoint is the async validation
// layer and is intentionally non-destructive.

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const referralCodeMap = {
  // BTS
  HYBE2025: "BTS (Group)",
  RMKING: "RM",
  JINLOVE: "Jin",
  YOONGI: "SUGA",
  HOPE23: "j-hope",
  NAMJOON: "RM",
  JIMIN24: "Jimin",
  TAEHYUNG: "V",
  JKGOLD: "Jung Kook",
  // TXT
  TXT2025: "TXT (Group)",
  SOOBIN05: "SOOBIN",
  YEONJUN05: "YEONJUN",
  BEOMGYU05: "BEOMGYU",
  TAEHYUN05: "TAEHYUN",
  HUENINGKAI: "HUENINGKAI",
  // SEVENTEEN
  SEVENTEEN17: "SEVENTEEN (Group)",
  SCOUPS17: "S.COUPS",
  JEONGHAN17: "JEONGHAN",
  JOSHUA17: "JOSHUA",
  JUN17: "JUN",
  HOSHI17: "HOSHI",
  WONWOO17: "WONWOO",
  WOOZI17: "WOOZI",
  THE817: "THE 8",
  MINGYU17: "MINGYU",
  DK17: "DK",
  SEUNGKWAN17: "SEUNGKWAN",
  VERNON17: "VERNON",
  DINO17: "DINO",
  // fromis_9
  FROMIS9: "fromis_9 (Group)",
  SAEROM9: "LEE SAEROM",
  HAYOUNG9: "SONG HAYOUNG",
  JIWON9: "PARK JIWON",
  JISUN9: "ROH JISUN",
  SEOYEON9: "LEE SEOYEON",
  CHAEYOUNG9: "LEE CHAEYOUNG",
  NAGYUNG9: "LEE NAGYUNG",
  JIHEON9: "BAEK JIHEON",
  // ENHYPEN
  ENHYPEN7: "ENHYPEN (Group)",
  HEESEUNG7: "HEESEUNG",
  JAY7: "JAY",
  JAKE7: "JAKE",
  SUNGHOON7: "SUNGHOON",
  SUNOO7: "SUNOO",
  JUNGWON7: "JUNGWON",
  NIKI7: "NI-KI",
  // ILLIT
  ILLIT5: "ILLIT (Group)",
  YUNAH5: "YUNAH",
  MINJU5: "MINJU",
  MOKA5: "MOKA",
  WONHEE5: "WONHEE",
  IROHA5: "IROHA",
  // ZICO
  ZICO1: "ZICO",
  // NewJeans
  NEWJEANS5: "NewJeans (Group)",
  MINJI: "MINJI",
  HANNI: "HANNI",
  DANIELLE: "DANIELLE",
  HAERIN: "HAERIN",
  HYEIN: "HYEIN",
  // &TEAM
  ANDTEAM9: "&TEAM (Group)",
  KTEAM: "K",
  FUMATEAM: "FUMA",
  NICHOLAS: "NICHOLAS",
  EJTEAM: "EJ",
  YUMATEAM: "YUMA",
  JOTEAM: "JO",
  HARUATEAM: "HARUA",
  TAKITEAM: "TAKI",
  MAKITEAM: "MAKI",
};

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

function signPayload(payloadB64, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
}

function timingSafeHexEqual(a, b) {
  const ba = Buffer.from(String(a), "hex");
  const bb = Buffer.from(String(b), "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Returns the decoded payload when the token is authentic and unexpired,
// otherwise null.
function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = signPayload(payloadB64, requireEnv("OTP_SIGNING_SECRET"));
  if (!timingSafeHexEqual(expected, sig)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    if (!payload || payload.verified !== true) return null;
    const expSec = Number(payload.exp);
    if (!expSec || expSec * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

function validate(data) {
  const errors = [];

  // Validate referral code
  if (!data["referral-code"]) {
    errors.push("Missing required field: referral-code");
  } else {
    const referralCode = (data["referral-code"] || "").trim().toUpperCase();
    if (!referralCodeMap[referralCode]) {
      errors.push(`Invalid referral code: '${data["referral-code"]}'. Please enter a valid HYBE referral code.`);
    }
  }

  if (!data["full-name"]) errors.push("Missing required field: full-name");
  if (String(data["full-name"] || "").length > 120) errors.push("full-name exceeds maximum length");
  if (!data.email) errors.push("Missing required field: email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(String(data.email))) {
    errors.push("Invalid email format");
  }
  return errors;
}


export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, message: "Method Not Allowed" });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { success: false, message: "Invalid JSON body" });
  }

  // Sanitize inputs
  const sanitized = {};
  for (const [k, v] of Object.entries(body)) {
    sanitized[k] = typeof v === "string" ? sanitizeInput(v) : v;
  }

  // Validate
  const errors = validate(sanitized);
  if (errors.length) {
    return json(400, { success: false, message: errors.join(", ") });
  }

  try {
    // The signed verification token is mandatory for every submission.
    const token = sanitized.otp_token;
    const payload = verifyToken(token);
    if (!payload) {
      return json(401, {
        success: false,
        message: "A valid, unexpired email verification token is required.",
      });
    }

    const submissionEmail = normalizeEmail(sanitized.email);
    if (normalizeEmail(payload.email) !== submissionEmail) {
      return json(401, {
        success: false,
        message: "Verification token does not match the submission email.",
      });
    }

    // Cross-check server state: the email must actually be verified in the DB.
    const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: record, error: dbError } = await supabase
      .from("otp_verifications")
      .select("verified")
      .eq("email", submissionEmail)
      .maybeSingle();

    if (dbError) {
      console.error("submit-form DB check failed:", dbError);
      return json(503, { success: false, message: "Unable to validate verification state. Please try again later." });
    }
    if (!record || record.verified !== true) {
      return json(401, {
        success: false,
        message: "Email verification has not been completed. Please verify your email first.",
      });
    }
  } catch (error) {
    console.error("submit-form verification error:", error);
    if (error && error.message && /Missing required env var/.test(error.message)) {
      return json(503, { success: false, message: "Server configuration error" });
    }
    return json(500, { success: false, message: "Failed to validate verification state" });
  }

  const response = {
    success: true,
    message: "Form submitted successfully.",
    timestamp: new Date().toISOString(),
  };

  return json(200, response);
};
