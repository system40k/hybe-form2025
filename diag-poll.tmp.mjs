// Poll-based stall diagnosis: track readyState, parser progress, script exec markers over time.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const page = await browser.newPage();

let failures = [];
page.on('requestfailed', r => failures.push(r.request().url()));
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('CSP')) console.log('[console.error]', m.text().slice(0, 200)); });
page.on('close', () => console.log('!! PAGE CLOSED'));

// markers injected as early as possible via init script
await page.addInitScript(() => {
  window.__markers = {};
  document.addEventListener('readystatechange', () => { window.__markers['rs_' + document.readyState] = performance.now(); });
  document.addEventListener('DOMContentLoaded', () => { window.__markers.dcl = performance.now(); });
  window.addEventListener('load', () => { window.__markers.load = performance.now(); });
});

await page.goto(BASE, { waitUntil: 'commit', timeout: 15000 });

const poll = async (label, t) => {
  try {
    const s = await page.evaluate(() => ({
      rs: document.readyState,
      markers: window.__markers,
      htmlLen: document.documentElement.outerHTML.length,
      bootstrap: typeof window.bootstrap,
      aos: typeof window.AOS,
      countryOpts: document.querySelectorAll('#country-select option').length,
      scriptsExecuted: [...document.querySelectorAll('script[src]')].map(s => s.src.split('/').pop() + ':' + (s.dataset.loaded || '?')).slice(0, 10),
      dclListenersProbe: window.__dclListeners,
    }));
    console.log(`[t=${label}]`, JSON.stringify(s));
  } catch (e) {
    console.log(`[t=${label}] EVAL FAILED:`, String(e).slice(0, 120));
  }
};

// register a probe listener from within page (after commit we can inject via another script tag) - emulate module running
// Instead: poll; at the end try manual DCL dispatch to see if any listener ran.

await poll('1s', Date.now());
await page.waitForTimeout(3000); await poll('4s', Date.now());
await page.waitForTimeout(3000); await poll('7s', Date.now());
await page.waitForTimeout(3000); await poll('10s', Date.now());

// Manual DCL dispatch attempt + module-eval check: main.js should have set something. Check country again
try {
  await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
} catch (e) { console.log('dispatch failed', String(e).slice(0,100)); }
await page.waitForTimeout(1000);
await poll('11s(+manual DCL)', Date.now());

console.log('failed reqs:', [...new Set(failures)].slice(0, 15));
await browser.close();
console.log('DONE');

