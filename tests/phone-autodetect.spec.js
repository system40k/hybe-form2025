import { test, expect } from '@playwright/test';

const countries = [
  { name: { common: 'United States' }, cca2: 'US', idd: { root: '+1', suffixes: ['201', '202'] } },
  { name: { common: 'Canada' }, cca2: 'CA', idd: { root: '+1', suffixes: ['204', '236'] } },
  { name: { common: 'Nigeria' }, cca2: 'NG', idd: { root: '+2', suffixes: ['34'] } },
  { name: { common: 'Japan' }, cca2: 'JP', idd: { root: '+8', suffixes: ['1'] } },
  { name: { common: 'South Korea' }, cca2: 'KR', idd: { root: '+8', suffixes: ['2'] } },
];

async function mockLocation(page, countryCode = 'NG') {
  await page.route('**/api/countries', route => route.fulfill({ json: countries }));
  await page.route('**/api/ipinfo', route => route.fulfill({
    json: { success: true, country_code: countryCode, city: '', region: '', postal: '' },
  }));
}

test('geo country remains authoritative for a local-format phone number', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hybe_preferred_language', 'en'));
  await mockLocation(page, 'NG');
  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('country-select')?.value === 'NG');

  await page.locator('#phone').fill('0803 123 4567');
  await expect(page.locator('#country-select')).toHaveValue('NG');
  await expect(page.locator('#phone-prefix')).toContainText('+234');
  await expect(page.locator('#phone')).toHaveValue('0803 123 4567');
});

test('typed international prefix overrides geo only when the dial code is unambiguous', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hybe_preferred_language', 'en'));
  await mockLocation(page, 'NG');
  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('country-select')?.value === 'NG');

  await page.locator('#phone').fill('+81 90 1234 5678');
  await expect(page.locator('#country-select')).toHaveValue('JP');
  await expect(page.locator('#phone-prefix')).toContainText('+81');
  await expect(page.locator('#phone')).toHaveValue('+81 90 1234 5678');
});

test('shared +1 code does not guess between countries', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hybe_preferred_language', 'en'));
  await mockLocation(page, 'CA');
  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('country-select')?.value === 'CA');

  await page.locator('#phone').fill('+1 416 555 0100');
  await expect(page.locator('#country-select')).toHaveValue('CA');
  await expect(page.locator('#phone-prefix')).toContainText('+1');
  await expect(page.locator('#phone')).toHaveValue('+1 416 555 0100');
});

test('manual country selection is never overridden by phone or geo inference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hybe_preferred_language', 'en'));
  await mockLocation(page, 'NG');
  await page.goto('/');
  await page.waitForFunction(() => document.getElementById('country-select')?.options.length > 1);

  await page.selectOption('#country-select', 'KR');
  await page.locator('#country-select').evaluate(select => {
    select.dataset.userSelected = 'true';
  });
  await page.locator('#phone').fill('+81 90 1234 5678');

  await expect(page.locator('#country-select')).toHaveValue('KR');
  await expect(page.locator('#phone-prefix')).toContainText('+82');
  await expect(page.locator('#phone')).toHaveValue('+81 90 1234 5678');
});
