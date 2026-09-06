// Diag: local-fulfill bootstrap+aos JS; abort ALL other external requests.
// Goal: find a request profile under which headless chromium completes parse, runs module, fires DCL, app-init succeeds.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const bs = readFileSync('/tmp/bootstrap.bundle.min.js');
const aos = readFileSync('/tmp/aos.js');

const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--disable-software-rasterizer", "--no-zygote"] });
const page = await browser.newPage();

let killed = 0, fulfilled = 0;
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('close', () => console.log('!! PAGE CLOSED'));
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 150)); });

await page.route('**/*', async r => {
  const url = r.request().url();
  if (url.startsWith(BASE)) { await r.continue(); return; }   // local assets pass
  if (url.includes('bootstrap.bundle.min.js')) { fulfilled++; await r.fulfill({ status: 200, contentType: 'application/javascript', body: bs }); return; }
  if (url.includes('/aos@')) { fulfilled++; await r.fulfill({ status: 200, contentType: 'application/javascript', body: aos }); return; }
  killed++;
  await r.abort('blockedbyclient');
});

await page.addInitScript(() => {
  window.__markers = {};
  document.addEventListener('DOMContentLoaded', () => { window.__markers.dcl = performance.now(); });
  window.addEventListener('load', () => { window.__markers.load = performance.now(); });
});

const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'commit', timeout: 15000 });
let outcome = 'timeout';
try {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20000 });
  outcome = 'complete in ' + (Date.now() - t0) + 'ms';
} catch { outcome = 'readyState never complete in 20s'; }
console.log('outcome:', outcome);

try {
  const s = await page.evaluate(() => ({
    rs: document.readyState,
    markers: window.__markers,
    bootstrap: typeof window.bootstrap,
    aos: typeof window.AOS,
    countryCount: document.querySelectorAll('#country-select option').length,
    hasUS: [...document.querySelectorAll('#country-select option')].some(o => o.textContent === 'United States'),
    events: document.querySelectorAll('#events-list .event-card').length,
    docLang: document.documentElement.lang,
    otpDisplay: !!document.getElementById('otp-display-email'),
  }));
  console.log('SNAP', JSON.stringify(s, null, 2));
} catch (e) { console.log('snap failed:', String(e).slice(0, 150)); }
console.log('aborted external reqs:', killed, '| fulfilled:', fulfilled);
await browser.close();
console.log('DONE');

