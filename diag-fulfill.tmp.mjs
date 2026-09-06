// Diag: fulfill the two CDN classic scripts locally → does the parser finish, modules run, DCL fire, app init work?
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const bs = readFileSync('/tmp/bootstrap.bundle.min.js');
const aos = readFileSync('/tmp/aos.js');

const browser = await chromium.launch();
const page = await browser.newPage();

let dclMs = null, loadMs = null, reqs = [];
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
page.on('requestfailed', r => reqs.push(r.url()));
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)));

await page.route(/cdn\.jsdelivr\.net\/.*\/js\/(bootstrap\.bundle\.min|aos)\.js/, async r => {
  const url = r.request().url();
  if (url.includes('bootstrap.bundle.min.js')) await r.fulfill({ status: 200, contentType: 'application/javascript', body: bs });
  else if (url.includes('/aos@')) await r.fulfill({ status: 200, contentType: 'application/javascript', body: aos });
  else await r.continue();
});

const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'commit', timeout: 15000 });
page.evaluate(() => { document.addEventListener('DOMContentLoaded', () => window.__dcl = Date.now()); });
// race DCL / timeout
try {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
  console.log('readyState=complete after', Date.now() - t0, 'ms');
} catch { console.log('readyState never complete after 15s'); }

const snap = await page.evaluate(() => ({
  readyState: document.readyState,
  dclFired: !!window.__dcl,
  bootstrap: typeof window.bootstrap,
  AOS: typeof window.AOS,
  countryCount: document.querySelectorAll('#country-select option').length,
  hasUS: [...document.querySelectorAll('#country-select option')].some(o => o.textContent === 'United States'),
  langSwitcherVal: document.getElementById('language-switcher')?.value,
  docLang: document.documentElement.lang,
  bodyMutation: !!window.MutationObserver,
}));
console.log(JSON.stringify(snap, null, 2));
console.log('failed requests:', reqs);
await browser.close();
console.log('DONE');

