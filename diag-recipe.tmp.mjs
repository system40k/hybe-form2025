// Recipe validation: abort cdn.jsdelivr classic JS; inject real bootstrap+aos via init script; abort other externals.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const bs = readFileSync('/tmp/bootstrap.bundle.min.js', 'utf8');
const aos = readFileSync('/tmp/aos.js', 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 250)));
page.on('close', () => console.log('!! PAGE CLOSED'));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Inspector')) console.log('[console.error]', m.text().slice(0, 150)); });

// define real libs before page scripts
await page.addInitScript(code => { (0, eval)(code); }, bs);
await page.addInitScript(code => { (0, eval)(code); }, aos);

await page.route('**/*', async r => {
  const url = r.request().url();
  if (url.startsWith(BASE)) { await r.continue(); return; }
  await r.abort('blockedbyclient'); // abort all external: CDN css/js/fonts, cloudinary, restcountries, ipwho, ipapi
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
    bootstrapType: typeof window.bootstrap,
    hasModal: !!(window.bootstrap && window.bootstrap.Modal),
    hasTooltip: !!(window.bootstrap && window.bootstrap.Tooltip),
    aosType: typeof window.AOS,
    countryCount: document.querySelectorAll('#country-select option').length,
    hasUS: [...document.querySelectorAll('#country-select option')].some(o => o.textContent === 'United States'),
    countryVal: document.getElementById('country-select').value,
    events: document.querySelectorAll('#events-list .event-card').length,
    docLang: document.documentElement.lang,
    submitBtnEnabled: !document.getElementById('submit-btn').disabled,
  }));
  console.log('SNAP', JSON.stringify(s, null, 2));
} catch (e) { console.log('snap failed:', String(e).slice(0, 150)); }
await browser.close();
console.log('DONE');

