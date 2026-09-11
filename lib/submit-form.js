// Validates submissions using native Supabase Auth and persists an idempotent application ledger.
import { createClient } from "@supabase/supabase-js";

const referralCodeMap = {
  HYBE2025: "BTS (Group)", RMKING: "RM", JINLOVE: "Jin", YOONGI: "SUGA", HOPE23: "j-hope",
  NAMJOON: "RM", JIMIN24: "Jimin", TAEHYUNG: "V", JKGOLD: "Jung Kook",
  TXT2025: "TXT (Group)", SOOBIN05: "SOOBIN", YEONJUN05: "YEONJUN", BEOMGYU05: "BEOMGYU", TAEHYUN05: "TAEHYUN", HUENINGKAI: "HUENINGKAI",
  SEVENTEEN17: "SEVENTEEN (Group)", SCOUPS17: "S.COUPS", JEONGHAN17: "JEONGHAN", JOSHUA17: "JOSHUA", JUN17: "JUN", HOSHI17: "HOSHI", WONWOO17: "WONWOO", WOOZI17: "WOOZI", THE817: "THE 8", MINGYU17: "MINGYU", DK17: "DK", SEUNGKWAN17: "SEUNGKWAN", VERNON17: "VERNON", DINO17: "DINO",
  FROMIS9: "fromis_9 (Group)", SAEROM9: "LEE SAEROM", HAYOUNG9: "SONG HAYOUNG", JIWON9: "PARK JIWON", JISUN9: "ROH JISUN", SEOYEON9: "LEE SEOYEON", CHAEYOUNG9: "LEE CHAEYOUNG", NAGYUNG9: "LEE NAGYUNG", JIHEON9: "BAEK JIHEON",
  ENHYPEN7: "ENHYPEN (Group)", HEESEUNG7: "HEESEUNG", JAY7: "JAY", JAKE7: "JAKE", SUNGHOON7: "SUNGHOON", SUNOO7: "SUNOO", JUNGWON7: "JUNGWON", NIKI7: "NI-KI",
  ILLIT5: "ILLIT (Group)", YUNAH5: "YUNAH", MINJU5: "MINJU", MOKA5: "MOKA", WONHEE5: "WONHEE", IROHA5: "IROHA",
  ZICO1: "ZICO",
  NEWJEANS5: "NewJeans (Group)", MINJI: "MINJI", HANNI: "HANNI", DANIELLE: "DANIELLE", HAERIN: "HAERIN", HYEIN: "HYEIN",
  ANDTEAM9: "&TEAM (Group)", KTEAM: "K", FUMATEAM: "FUMA", NICHOLAS: "NICHOLAS", EJTEAM: "EJ", YUMATEAM: "YUMA", JOTEAM: "JO", HARUATEAM: "HARUA", TAKITEAM: "TAKI", MAKITEAM: "MAKI",
};

function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name];
}

function requireEnv(name) {
  const v = env(name);
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
  if (!data["submission-id"]) errors.push("Missing required field: submission-id");
  if (!data["referral-code"]) {
    errors.push("Missing required field: referral-code");
  } else {
    const referralCode = (data["referral-code"] || "").trim().toUpperCase();
    if (!referralCodeMap[referralCode]) errors.push("Invalid referral code");
  }
  if (!data["full-name"]) errors.push("Missing required field: full-name");
  if (String(data["full-name"] || "").length > 120) errors.push("full-name exceeds maximum length");
  if (!data.email) errors.push("Missing required field: email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(String(data.email))) errors.push("Invalid email format");
  return errors;
}

function publicPayload(data) {
  const copy = { ...data };
  ["otp_token", "access_token", "refresh_token", "website"].forEach((k) => delete copy[k]);
  return copy;
}

function appResponse(app, code = "APPLICATION_VALIDATED") {
  return {
    success: true,
    code,
    message: app.status === "validated" ? "Application validated successfully." : "Application already received.",
    applicationId: app.id,
    reference: app.submission_id,
    status: app.status,
    timestamp: new Date().toISOString(),
  };
}

function sameOwner(app, user, email) {
  return app?.user_id === user.id && normalizeEmail(app?.email) === normalizeEmail(email);
}

async function getExisting(admin, submissionId) {
  const { data, error } = await admin
    .from("applications")
    .select("id,submission_id,user_id,email,status,created_at,updated_at,completed_at")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { success: false, code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" });

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { success: false, code: "INVALID_JSON", message: "Invalid JSON body" });
  }

  const sanitized = {};
  for (const [k, v] of Object.entries(body)) sanitized[k] = typeof v === "string" ? sanitizeInput(v) : v;

  const errors = validate(sanitized);
  if (errors.length) return json(400, { success: false, code: "INVALID_APPLICATION", message: errors.join(", ") });

  try {
    const authorization = event.headers?.authorization || event.headers?.Authorization || "";
    const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
    if (!token) return json(401, { success: false, code: "AUTH_REQUIRED", message: "Please sign in with your email verification code." });

    const url = requireEnv("VITE_SUPABASE_URL");
    const publishableKey = env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_ANON_KEY");
    if (!publishableKey) throw new Error("Missing required env var: VITE_SUPABASE_PUBLISHABLE_KEY");

    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError) {
      return json(authError.status >= 500 || !authError.status ? 503 : 401, {
        success: false,
        code: authError.status >= 500 || !authError.status ? "AUTH_SERVICE_UNAVAILABLE" : "AUTH_EXPIRED",
        message: "Unable to verify your session. Please sign in again or retry later.",
      });
    }

    const user = authData.user;
    const normalizedEmail = normalizeEmail(sanitized.email);
    if (!user?.email_confirmed_at || user.is_anonymous || normalizeEmail(user.email) !== normalizedEmail) {
      return json(401, { success: false, code: "EMAIL_MISMATCH", message: "Your verified email must match the submission email." });
    }

    const serviceKey = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_KEY");
    if (!serviceKey) throw new Error("Missing required env var: SUPABASE_SECRET_KEY");
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const submissionId = sanitized["submission-id"];
    const existing = await getExisting(admin, submissionId);
    if (existing) {
      if (!sameOwner(existing, user, normalizedEmail)) {
        return json(409, { success: false, code: "IDEMPOTENCY_CONFLICT", message: "This submission reference is already in use." });
      }
      return json(200, appResponse(existing, "APPLICATION_ALREADY_RECEIVED"));
    }

    const ledgerRow = {
      submission_id: submissionId,
      user_id: user.id,
      email: normalizeEmail(user.email),
      status: "validated",
      payload: publicPayload(sanitized),
    };

    const { data: app, error: ledgerError } = await admin
      .from("applications")
      .insert(ledgerRow)
      .select("id,submission_id,user_id,email,status,created_at,updated_at,completed_at")
      .single();

    if (ledgerError) {
      if (ledgerError.code === "23505") {
        const raced = await getExisting(admin, submissionId);
        if (raced && sameOwner(raced, user, normalizedEmail)) {
          return json(200, appResponse(raced, "APPLICATION_ALREADY_RECEIVED"));
        }
        return json(409, { success: false, code: "IDEMPOTENCY_CONFLICT", message: "This submission reference is already in use." });
      }
      console.error("application ledger write failed", ledgerError.code);
      return json(503, { success: false, code: "APPLICATION_PERSIST_FAILED", message: "Unable to save the application. Please retry." });
    }

    return json(200, appResponse(app));
  } catch (error) {
    console.error("submit-form verification failed");
    if (error?.message && /Missing required env var/.test(error.message)) {
      return json(503, { success: false, code: "CONFIGURATION_ERROR", message: "Server configuration error" });
    }
    return json(500, { success: false, code: "VALIDATION_FAILED", message: "Failed to validate verification state" });
  }
};
