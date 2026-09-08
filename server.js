// server.js
// Standalone production server for the HYBE Fan-Permit SPA + OTP API.
//
// Serves the Vite build (dist/) and re-hosts the three Netlify Functions
// behind their /api/otp/* and /submit-form routes so the exact same code
// path (and security behavior) runs on Docker / Render / K8s as on
// Netlify. Functions are invoked with a synthesized Netlify event object
// and their { statusCode, headers, body } responses are translated back
// to HTTP.
//
// Endpoints:
//   GET  /                 -> SPA (dist/index.html)
//   GET  /success          -> confirmation page (dist/success.html)
//   POST /api/otp/send     -> netlify/functions/otp-send.js
//   POST /api/otp/verify   -> netlify/functions/otp-verify.js
//   POST /submit-form      -> netlify/functions/submit-form.js
//   GET  /api/countries    -> restcountries.com proxy (parity w/ netlify.toml)
//   GET  /api/ipinfo       -> ipwho.is proxy            (parity w/ netlify.toml)
//   GET  /health           -> liveness/readiness probe
//   GET  /metrics          -> Prometheus text format
//
// Auth uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
// (legacy VITE_SUPABASE_ANON_KEY fallback). SMTP is configured in Supabase.
// Old OTP endpoints return 410 so stale clients fail closed.

import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { securityHeaders, buildCsp } from "./lib/security.js";
import { handler as otpSendHandler } from "./lib/retired-otp.js";
import { handler as otpVerifyHandler } from "./lib/retired-otp.js";
import { handler as submitFormHandler } from "./lib/submit-form.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const BODY_LIMIT = "1mb";

const indexHtmlPath = path.join(DIST_DIR, "index.html");
const successHtmlPath = path.join(DIST_DIR, "success.html");

// ---------------------------------------------------------------------------
// In-process counters exposed via /metrics
// ---------------------------------------------------------------------------
const requestCounts = new Map();
let startedAt = Date.now();
let metricsErrors = 0;

function countRequest(req) {
  const key = req.path;
  requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
}

function renderMetrics() {
  const lines = [];
  lines.push("# HELP http_requests_total Total HTTP requests received by path.");
  lines.push("# TYPE http_requests_total counter");
  const sorted = [...requestCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [route, n] of sorted) {
    lines.push(
      `http_requests_total{route="${route.replace(/"/g, '\\"')}"} ${n}`,
    );
  }
  lines.push("# HELP process_start_time_seconds Start time in unix epoch seconds.");
  lines.push("# TYPE process_start_time_seconds gauge");
  lines.push(`process_start_time_seconds ${Math.floor(startedAt / 1000)}`);
  lines.push("# HELP process_uptime_seconds Process uptime.");
  lines.push("# TYPE process_uptime_seconds gauge");
  lines.push(`process_uptime_seconds ${process.uptime()}`);
  const mem = process.memoryUsage();
  lines.push("# HELP process_resident_memory_bytes Resident memory size in bytes.");
  lines.push("# TYPE process_resident_memory_bytes gauge");
  lines.push(`process_resident_memory_bytes ${mem.rss}`);
  lines.push("# HELP process_heap_used_bytes Heap used in bytes.");
  lines.push("# TYPE process_heap_used_bytes gauge");
  lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
  const cpu = process.cpuUsage();
  const cpuSec = (cpu.user + cpu.system) / 1e6;
  lines.push("# HELP process_cpu_seconds_total Total user+system CPU seconds.");
  lines.push("# TYPE process_cpu_seconds_total counter");
  lines.push(`process_cpu_seconds_total ${cpuSec}`);
  lines.push("# HELP hybe_metrics_render_errors_total Internal metric render errors.");
  lines.push("# TYPE hybe_metrics_render_errors_total counter");
  lines.push(`hybe_metrics_render_errors_total ${metricsErrors}`);
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Netlify-function adapter
// ---------------------------------------------------------------------------
const rawBody = express.raw({ type: "*/*", limit: BODY_LIMIT });

function buildNetlifyEvent(req) {
  const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  return {
    httpMethod: req.method,
    headers: { ...req.headers },
    queryStringParameters: { ...req.query },
    path: req.path,
    body: buffer.toString("utf8"),
    isBase64Encoded: false,
  };
}

function runFunction(handlerFn) {
  return async (req, res) => {
    let outcome;
    try {
      outcome = await handlerFn(buildNetlifyEvent(req));
    } catch (err) {
      console.error(`[server] ${req.path} handler error:`, err);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
      return;
    }
    const { statusCode = 200, headers = {}, body = "" } = outcome || {};
    res.status(statusCode);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, String(value));
    }
    res.send(body);
  };
}

const functionRoutes = [
  { path: "/api/otp/send", fn: otpSendHandler },
  { path: "/api/otp/verify", fn: otpVerifyHandler },
  { path: "/submit-form", fn: submitFormHandler },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// Baseline security headers on every response + request counter.
app.use((req, res, next) => {
  countRequest(req);
  res.set(securityHeaders({ isProd: IS_PROD }));
  next();
});

// ---- Probes ----------------------------------------------------------------
app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    status: "ok",
    uptime: process.uptime(),
    dist: fs.existsSync(indexHtmlPath),
    config: {
      supabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
      supabaseKey: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", (req, res) => {
  try {
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.set("Cache-Control", "no-store");
    res.send(renderMetrics());
  } catch (err) {
    metricsErrors += 1;
    console.error("[server] metrics render error:", err);
    res.status(500).send("# metrics render error\n");
  }
});

// ---- API functions (same code as Netlify) ---------------------------------
for (const { path: routePath, fn } of functionRoutes) {
  app.all(routePath, rawBody, runFunction(fn));
}

// ---- External-data proxies (Netlify parity for /api/countries, /api/ipinfo)
const UPSTREAMS = {
  "/api/countries": "https://restcountries.com/v3.1/all?fields=name,cca2",
  "/api/ipinfo": "https://ipwho.is/",
};

for (const [routePath, upstream] of Object.entries(UPSTREAMS)) {
  app.get(routePath, async (req, res) => {
    try {
      const upstreamRes = await fetch(upstream, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" },
      });
      const text = await upstreamRes.text();
      res.status(upstreamRes.status);
      const contentType = upstreamRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        res.set("Content-Type", contentType);
      }
      res.set("Cache-Control", "no-store");
      res.send(text);
    } catch (err) {
      console.error(`[server] ${routePath} upstream error:`, err);
      res.status(502).json({
        success: false,
        error: "Upstream service unavailable",
      });
    }
  });
}

// Unknown API routes must never fall through to the SPA shell.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "Not Found" });
});

// POST / with form-name=subscription-form is Netlify Forms capture. The
// standalone server has no forms backend, so answer explicitly instead of
// silently swallowing data or returning the SPA shell for a POST.
app.post("/", (req, res) => {
  res.status(501).json({
    success: false,
    error: "Netlify Forms capture is not available on this host; use /submit-form.",
  });
});

// ---- Static site -----------------------------------------------------------
if (!fs.existsSync(indexHtmlPath)) {
  console.error(
    `[server] ${indexHtmlPath} not found. Run "npm run build" before starting.`,
  );
}

app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite emits content-hashed filenames in /assets - cache forever.
        res.set("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.get("/success", (req, res) => {
  if (!fs.existsSync(successHtmlPath)) {
    res.status(404).send("success page not found");
    return;
  }
  res.sendFile(successHtmlPath);
});

// SPA fallback (GET/HEAD only). API routes, asset files and anything with a
// file extension return 404 instead of the HTML shell.
app.get("/{*splat}", (req, res) => {
  if (/\.\w+$/.test(req.path) || req.path.startsWith("/api/")) {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }
  if (!fs.existsSync(indexHtmlPath)) {
    res.status(503).type("text/plain").send(
      "Frontend build missing - run `npm run build` and restart.",
    );
    return;
  }
  res.sendFile(indexHtmlPath);
});

// ---- Final error handler ---------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] unhandled error:", err);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  const status = err.type === "entity.too.large" ? 413 : 500;
  res.status(status).json({ success: false, error: "Server error" });
});

// Bind only when executed directly (importing server.js for tests must not
// occupy the port).
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  app.listen(PORT, HOST, () => {
    console.log(
      `[server] HYBE Fan-Permit listening on http://${HOST}:${PORT} ` +
        `(NODE_ENV=${process.env.NODE_ENV || "development"})`,
    );
    if (!fs.existsSync(indexHtmlPath)) {
      console.warn(
        '[server] WARNING: dist/index.html missing - run "npm run build" first.',
      );
    }
  });
}

export { app, DIST_DIR, buildCsp };
