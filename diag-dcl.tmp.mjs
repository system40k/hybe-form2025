// Diag: does app init (country options etc.) run after manual DOMContentLoaded dispatch?
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const page = await browser.newPage();

const snap = () => page.evaluate(() => ({
  readyState: document.readyState,
  bootstrap: typeof window.bootstrap,
  AOS: typeof window.AOS,
  countryOptions: [...document.querySelectorAll('#country-select option')].map(o => o.value).slice(0, 5),
  countryCount: document.querySelectorAll('#country-select option').length,
  submitBtn: !!document.getElementById('submit-btn'),
  otpModal: !!document.getElementById('otpModal'),
  langSwitcher: !!document.getElementById('language-switcher'),
  eventsChildren: document.getElementById('events-list')?.children.length ?? -1,
}));

await page.goto(BASE, { waitUntil: 'commit', timeout: 15000 });
await page.waitForSelector('#submit-btn', { state: 'visible', timeout: 15000 });
console.log('AFTER COMMIT + 0s wait (pre-DCL-dispatch):');
console.log(JSON.stringify(await snap(), null, 2));

// Wait a moment to give module scripts a chance to evaluate & register DCL listeners
await page.waitForTimeout(3000);
console.log('AFTER 3s wait (still no manual DCL):');
console.log(JSON.stringify(await snap(), null, 2));

// Manually dispatch DOMContentLoaded
await page.evaluate(() => {
  document.dispatchEvent(new Event('DOMContentLoaded'));
});
await page.waitForTimeout(1500);
console.log('AFTER MANUAL DOMContentLoaded dispatch (+1.5s):');
console.log(JSON.stringify(await snap(), null, 2));

await browser.close();
console.log('DONE');

