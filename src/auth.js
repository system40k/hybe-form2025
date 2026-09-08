import { createClient } from "@supabase/supabase-js";

let client;
export function getAuthClient() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Email sign-in is not configured. Please contact support.");
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export async function getVerifiedSession(email) {
  const { data, error } = await getAuthClient().auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.user?.email_confirmed_at ||
      session.user.email?.toLowerCase() !== email.trim().toLowerCase() ||
      session.expires_at * 1000 <= Date.now()) {
    throw new Error("Please verify your email again before submitting.");
  }
  return session;
}
