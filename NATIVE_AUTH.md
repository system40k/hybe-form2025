# Native Supabase email OTP

The browser calls Supabase Auth `signInWithOtp` and `verifyOtp(type: "email")` directly. Supabase owns code generation, expiry, rate limits, delivery, sessions, refresh, and sign-out. `/submit-form` validates the bearer token with `auth.getUser` and checks confirmed email ownership. Custom OTP endpoints now return 410; old capability tokens are rejected. The old OTP table is retained without changes and is no longer used.

## Deployment configuration

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for both the Vite build and server/function runtime, then rebuild. The existing `VITE_SUPABASE_ANON_KEY` is supported as a fallback. Never use a service-role/secret key in either public variable.
2. In Supabase Auth Email Templates, set both Magic Link and Confirm Signup templates to include `{{ .Token }}`. Example: `<h2>Your sign-in code</h2><p>{{ .Token }}</p>`. Configure six-digit codes, a 600-second expiry, and at least a 60-second resend interval.
3. Configure Supabase Auth custom SMTP with your verified sender. Enable Email provider and signup; leave email confirmation enabled. Set Site URL to the production site and restrict redirect URLs to your owned sites.
4. Deploy frontend and functions together. Old open browser tabs must reload. The legacy OTP secrets and Resend configuration are no longer needed by these endpoints.
5. Verify a new-user code email and a returning-user code email with an owned test inbox, invalid/expired/replayed codes, resend throttling, session refresh/reload, email mismatch rejection, sign-out, and submission capture.

The connected project was checked: Email enabled, signup enabled, automatic email confirmation disabled. MCP does not expose SMTP/template configuration, so those settings and real inbox delivery require dashboard verification before rollout. No test emails were sent.

## Capture boundary

Netlify Forms remains the separate durable form collector. Direct posts to its public collection endpoint can bypass the application's validation request; captured forms must not be treated as proof of authentication or payment. This change authenticates `/submit-form`, not the public Netlify collector. Downstream privileged processing must independently authenticate submissions.

## References

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/reference/javascript/auth-getuser
