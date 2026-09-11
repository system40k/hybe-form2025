import { test, expect } from '@playwright/test';

async function prepare(page) {
  await page.addInitScript(() => localStorage.setItem('hybe_preferred_language', 'en'));
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.bootstrap));
  await page.waitForFunction(() => document.documentElement.dataset.responsiveUi === 'ready');
}

for (const width of [320, 360, 375, 390, 430, 768, 1440]) {
  test(`all modal surfaces fit ${width}px portrait viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await prepare(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const modalIds = await page.evaluate(() => Array.from(document.querySelectorAll('.modal[id]')).map(el => el.id));
    for (const id of modalIds) {
      await page.evaluate(id => {
        document.querySelectorAll('.modal.show').forEach(open => window.bootstrap.Modal.getOrCreateInstance(open).hide());
        window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show();
      }, id);
      const content = page.locator(`#${id} .modal-content`);
      await expect(content).toBeVisible();
      const box = await content.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeLessThanOrEqual(700);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(id => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).hide(), id);
      await expect(page.locator(`#${id}`)).toBeHidden();
    }
  });
}

for (const viewport of [
  { width: 667, height: 320 },
  { width: 844, height: 390 },
]) {
  test(`core modals remain usable in ${viewport.width}x${viewport.height} landscape`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await prepare(page);

    for (const id of ['onboardingModal', 'otpModal', 'confirmModal', 'digitalCurrencySuccessModal']) {
      await page.evaluate(id => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show(), id);
      const content = page.locator(`#${id} .modal-content`);
      await expect(content).toBeVisible();
      const box = await content.boundingBox();
      expect(box.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(id => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).hide(), id);
      await expect(page.locator(`#${id}`)).toBeHidden();
    }
  });
}

for (const width of [320, 375, 430, 768]) {
  test(`wizard controls stay separated at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await prepare(page);
    await page.waitForFunction(() => Boolean(document.querySelector('.wizard-nav')));

    const result = await page.evaluate(() => {
      const prev = document.querySelector('#prev-btn').getBoundingClientRect();
      const status = document.querySelector('#wizard-status').getBoundingClientRect();
      const next = document.querySelector('#next-btn').getBoundingClientRect();
      const indicators = Array.from(document.querySelectorAll('.step-indicator')).map(el => el.getBoundingClientRect());
      return {
        prevRight: prev.right,
        statusLeft: status.left,
        statusRight: status.right,
        nextLeft: next.left,
        navInsideViewport: prev.left >= 0 && next.right <= window.innerWidth,
        indicatorsInsideViewport: indicators.every(box => box.left >= 0 && box.right <= window.innerWidth),
      };
    });

    expect(result.navInsideViewport).toBe(true);
    expect(result.prevRight).toBeLessThanOrEqual(result.statusLeft);
    expect(result.statusRight).toBeLessThanOrEqual(result.nextLeft);
    expect(result.indicatorsInsideViewport).toBe(true);
    await expect(page.locator('#wizard-status')).toHaveText('Step 1 of 5');
  });
}

test('confirm modal stacks detail rows and keeps actions inside a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await prepare(page);
  await page.evaluate(() => window.bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmModal')).show());
  await expect(page.locator('#confirmModal')).toBeVisible();

  const result = await page.evaluate(() => {
    const dt = document.querySelector('#confirm-details dt').getBoundingClientRect();
    const dd = document.querySelector('#confirm-details dd').getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('#confirmModal .modal-footer .btn')).map(el => el.getBoundingClientRect());
    return {
      detailsStacked: Math.abs(dt.left - dd.left) < 2 && dd.top >= dt.bottom,
      buttonsInside: buttons.every(box => box.left >= 0 && box.right <= innerWidth),
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
    };
  });

  expect(result.detailsStacked).toBe(true);
  expect(result.buttonsInside).toBe(true);
  expect(result.noHorizontalOverflow).toBe(true);
});

test('reduced motion removes modal and progress transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page);

  const values = await page.evaluate(() => ({
    modalTransition: getComputedStyle(document.querySelector('#otpModal .modal-dialog')).transitionDuration,
    progressTransition: getComputedStyle(document.querySelector('.progress-bar')).transitionDuration,
  }));

  expect(['0s', '0.01ms']).toContain(values.modalTransition);
  expect(['0s', '0.01ms']).toContain(values.progressTransition);
});
