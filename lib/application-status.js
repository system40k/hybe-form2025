import { createClient } from "@supabase/supabase-js";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name];
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: JSON.stringify(body),
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { success: false, code: "INVALID_JSON", message: "Invalid JSON body" });
  }

  const reference = String(body.reference || "").trim();
  const action = String(body.action || "read").trim().toLowerCase();
  if (!reference) {
    return json(400, { success: false, code: "REFERENCE_REQUIRED", message: "Application reference is required." });
  }
  if (!['read', 'captured'].includes(action)) {
    return json(400, { success: false, code: "INVALID_ACTION", message: "Unsupported application status action." });
  }

  try {
    const url = env("VITE_SUPABASE_URL");
    const publishableKey = env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_ANON_KEY");
    const serviceKey = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_KEY");
    if (!url || !publishableKey || !serviceKey) {
      return json(503, { success: false, code: "CONFIGURATION_ERROR", message: "Server configuration error" });
    }

    const authorization = event.headers?.authorization || event.headers?.Authorization || "";
    const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
    if (!token) {
      return json(401, { success: false, code: "AUTH_REQUIRED", message: "Authentication required." });
    }

    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return json(401, { success: false, code: "AUTH_EXPIRED", message: "Your session has expired. Please verify your email again." });
    }

    const user = authData.user;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: app, error: readError } = await admin
      .from("applications")
      .select("id,submission_id,user_id,email,status,created_at,updated_at,captured_at,completed_at")
      .eq("submission_id", reference)
      .maybeSingle();

    if (readError) throw readError;
    if (!app) {
      return json(404, { success: false, code: "APPLICATION_NOT_FOUND", message: "Application not found." });
    }
    if (app.user_id !== user.id || normalizeEmail(app.email) !== normalizeEmail(user.email)) {
      return json(403, { success: false, code: "APPLICATION_FORBIDDEN", message: "You cannot access this application." });
    }

    let current = app;
    if (action === "captured" && app.status === "validated") {
      const { data: updated, error: updateError } = await admin
        .from("applications")
        .update({ status: "captured", captured_at: new Date().toISOString() })
        .eq("id", app.id)
        .eq("status", "validated")
        .select("id,submission_id,user_id,email,status,created_at,updated_at,captured_at,completed_at")
        .single();
      if (updateError) throw updateError;
      current = updated;
    }

    return json(200, {
      success: true,
      code: action === "captured" ? "APPLICATION_CAPTURED" : "APPLICATION_STATUS",
      applicationId: current.id,
      reference: current.submission_id,
      status: current.status,
      createdAt: current.created_at,
      updatedAt: current.updated_at,
      capturedAt: current.captured_at,
      completedAt: current.completed_at,
    });
  } catch (error) {
    console.error("application-status failed", error?.code || error?.message || "unknown");
    return json(500, { success: false, code: "STATUS_FAILED", message: "Unable to read application status." });
  }
};
