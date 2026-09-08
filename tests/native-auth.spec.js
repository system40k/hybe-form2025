import { test, expect } from '@playwright/test';

// Run against a build configured with a public Supabase URL/key. No emails sent.
test('native OTP handles errors, resend, session restoration and sign-out', async ({ page }) => {
  const email = 'native-auth@example.com';
  let verified = false;
  await page.route('**/auth/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/otp')) {
      expect(route.request().postDataJSON().email).toBe(email);
      return route.fulfill({ json: {} });
    }
    if (path.endsWith('/verify')) {
      const body = route.request().postDataJSON();
      expect(body.type).toBe('email');
      if (body.token !== '123456') return route.fulfill({ status: 403, json: { msg: 'Token has expired or is invalid' } });
      verified = true;
      return route.fulfill({ json: { access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600,
        user: { id: 'test-id', aud: 'authenticated', email, email_confirmed_at: new Date().toISOString() } } });
    }
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    return route.fulfill({ status: 400, json: { msg: 'Unexpected Auth call' } });
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.bootstrap));
  await page.evaluate(() => window.bootstrap.Modal.getOrCreateInstance(document.getElementById('otpModal')).show());
  await page.locator('#otp-email-input').fill(email);
  await page.locator('#otp-send-btn').click();
  await expect(page.locator('#otp-display-email')).toHaveText(email);
  await expect(page.locator('#otp-resend-wrapper')).toBeVisible();
  await expect(page.locator('#otp-resend-btn')).toBeDisabled();
  await page.locator('#otp-code-input').fill('000000');
  await page.locator('#otp-verify-btn').click();
  await expect(page.locator('#otp-code-error')).toBeVisible();
  await page.locator('#otp-code-input').fill('123456');
  await page.locator('#otp-verify-btn').click();
  await expect(page.locator('#otp-success-step')).toBeVisible();
  expect(verified).toBe(true);
  await page.reload();
  await expect(page.locator('#auth-signout-btn')).toBeVisible();
  await page.locator('#auth-signout-btn').click();
  await expect(page.locator('#auth-signout-btn')).toBeHidden();
});

for (const width of [320, 375, 768, 1440]) {
  test(`layout fits viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.bootstrap));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const id of ['otpModal', 'confirmModal', 'onboardingModal']) {
      await page.evaluate(id => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show(), id);
      const dialog = page.locator(`#${id} .modal-content`);
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await page.evaluate(id => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).hide(), id);
      await expect(page.locator(`#${id}`)).toBeHidden();
    }
  });
}
