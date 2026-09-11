import { test, expect } from '@playwright/test';

const countries = [
  { name: { common: 'United States' }, cca2: 'US', idd: { root: '+1', suffixes: [''] } },
  { name: { common: 'Japan' }, cca2: 'JP', idd: { root: '+81', suffixes: [''] } },
  { name: { common: 'South Korea' }, cca2: 'KR', idd: { root: '+82', suffixes: [''] } },
];

async function mockGeo(page, countryCode = 'US') {
  await page.route('**/api/countries', route => route.fulfill({ json: countries }));
  await page.route('**/api/ipinfo', route => route.fulfill({
    json: {
      success: true,
      country_code: countryCode,
      city: countryCode === 'US' ? 'Las Vegas' : 'Tokyo',
      region: countryCode === 'US' ? 'Nevada' : 'Tokyo',
      postal: countryCode === 'US' ? '89101' : '100-0001',
    },
  }));
}

test.describe('production form flow safeguards', () => {
  test('uses one language prompt, then shows onboarding, without direct third-party geo calls', async ({ page }) => {
    const externalGeoRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('ipapi.co') || url.includes('ipwho.is') || url.includes('restcountries.com')) {
        externalGeoRequests.push(url);
      }
    });

    await mockGeo(page, 'US');
    await page.goto('/');

    await expect(page.locator('#language-prompt-modal')).toBeVisible();
    await expect(page.locator('#languagePromptModal')).toHaveCount(0);

    await page.locator('#lang-no-btn').click();
    await expect(page.locator('#language-prompt-modal')).toHaveCount(0);
    await expect(page.locator('#onboardingModal')).toBeVisible();

    expect(externalGeoRequests).toEqual([]);
  });

  test('country changes preserve typed phone input and keep address inputs in their wrappers', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hybe_preferred_language', 'en');
    });
    await mockGeo(page, 'US');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.bootstrap));

    await page.evaluate(() => {
      const modal = document.getElementById('onboardingModal');
      if (modal) window.bootstrap.Modal.getOrCreateInstance(modal).hide();
      window.__addressParents = {};
      for (const id of ['address-line1', 'address-line2', 'city', 'state', 'postal-code']) {
        window.__addressParents[id] = document.getElementById(id)?.parentElement || null;
      }
    });

    await page.waitForFunction(() => document.getElementById('country-select')?.options.length > 1);
    await page.locator('#phone').fill('555 123 4567');
    await page.selectOption('#country-select', 'JP');
    await page.waitForTimeout(0);

    await expect(page.locator('#phone')).toHaveValue('555 123 4567');

    const state = await page.evaluate(() => ({
      formatterRemoved: document.getElementById('phone')?.oninput === null,
      wrappersStable: ['address-line1', 'address-line2', 'city', 'state', 'postal-code'].every(
        id => document.getElementById(id)?.parentElement === window.__addressParents[id],
      ),
    }));

    expect(state.formatterRemoved).toBe(true);
    expect(state.wrappersStable).toBe(true);
  });

  test('saved language preference bypasses translation prompt and keeps selector authoritative', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hybe_preferred_language', 'ja');
    });
    await mockGeo(page, 'US');
    await page.goto('/');

    await expect(page.locator('#language-prompt-modal')).toHaveCount(0);
    await expect(page.locator('#languagePromptModal')).toHaveCount(0);
    await expect(page.locator('#language-switcher')).toHaveValue('ja');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

    await page.selectOption('#language-switcher', 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate(() => localStorage.getItem('hybe_preferred_language'))).toBe('en');
  });
});
