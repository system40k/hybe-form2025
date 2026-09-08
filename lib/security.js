// lib/security.js
// Shared security-header and Content-Security-Policy builders for the
// standalone Node server (server.js). Netlify Functions keep their own
// self-contained header maps so they stay deployable without this module;
// this file exists so the Docker/Render/K8s runtime enforces the same
// posture as the Netlify-hosted API layer.
//
// Source of truth for external hosts (keep in sync with the frontend):
//   - https://cdn.jsdelivr.net     bootstrap + AOS + bootstrap-icons
//   - https://fonts.googleapis.com Poppins stylesheet (success.html)
//   - https://fonts.gstatic.com    Poppins woff2 files
//   - https://res.cloudinary.com   og:image / header & success logos
//   - https://ipapi.co             i18n language detection (script.js)
//   - https://ipwho.is             fallback geo detection (script.js)
//   - https://restcountries.com    country select options (script.js)

const CDN_JS_DELIVR = "https://cdn.jsdelivr.net";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_WOFF = "https://fonts.gstatic.com";
const CLOUDINARY_IMAGES = "https://res.cloudinary.com";
const EXTERNAL_CONNECT = [
  "https://ipapi.co",
  "https://ipwho.is",
  "https://restcountries.com",
  ...(process.env.VITE_SUPABASE_URL ? [new URL(process.env.VITE_SUPABASE_URL).origin] : []),
];

/**
 * Builds the Content-Security-Policy value.
 *
 * Notes:
 *  - `style-src 'unsafe-inline'` is required because AOS writes inline
 *    style attributes during animation and a handful of elements use
 *    style="" attributes. Scripts are kept strict (no 'unsafe-inline',
 *    no 'unsafe-eval'); all inline <script> blocks were removed from the
 *    HTML so module/external scripts are the only executable sources.
 *  - `upgrade-insecure-requests` is enabled in production so any leftover
 *    http:// subresource reference is upgraded by the browser.
 *
 * @param {{ upgradeInsecureRequests?: boolean }} [options]
 * @returns {string}
 */
export function buildCsp({ upgradeInsecureRequests = false } = {}) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${CDN_JS_DELIVR}`,
    `style-src 'self' 'unsafe-inline' ${CDN_JS_DELIVR} ${GOOGLE_FONTS_CSS}`,
    `font-src 'self' data: ${CDN_JS_DELIVR} ${GOOGLE_FONTS_WOFF}`,
    `img-src 'self' data: ${CDN_JS_DELIVR} ${CLOUDINARY_IMAGES}`,
    `connect-src 'self' ${EXTERNAL_CONNECT.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-src 'none'",
  ];
  if (upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

/**
 * Returns the base security header map applied to every server response.
 * Cache-Control is intentionally NOT set here - static assets, HTML
 * documents and API responses each get an appropriate policy where they
 * are served (see server.js).
 *
 * @param {{ isProd?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function securityHeaders({ isProd = false } = {}) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": buildCsp({ upgradeInsecureRequests: isProd }),
  };
  if (isProd) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

export const CSP_EXTERNAL_HOSTS = {
  script: [CDN_JS_DELIVR],
  style: [CDN_JS_DELIVR, GOOGLE_FONTS_CSS],
  font: [CDN_JS_DELIVR, GOOGLE_FONTS_WOFF],
  img: [CDN_JS_DELIVR, CLOUDINARY_IMAGES],
  connect: EXTERNAL_CONNECT,
};

