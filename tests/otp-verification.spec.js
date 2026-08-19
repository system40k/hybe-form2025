// @ts-check
import { test, expect } from '@playwright/test';

/**
 * OTP Verification Flow Tests
 * Tests the email verification functionality using OTP codes
 */
test.describe('OTP Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display OTP modal when form is submitted without verification', async ({ page }) => {
    // Fill minimal required fields
    await page.fill('#referral-code', 'HYBE2025');
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    // Try to submit - should trigger OTP modal
    await page.click('#submit-btn');
    
    // OTP modal should appear
    await expect(page.locator('#otpModal')).toBeVisible();
    await expect(page.locator('#otp-email-input')).toBeVisible();
  });

  test('should validate email format before sending OTP', async ({ page }) => {
    await page.click('#submit-btn');
    
    // Enter invalid email
    await page.fill('#otp-email-input', 'invalid-email');
    await page.click('#otp-send-btn');
    
    // Should show error
    await expect(page.locator('#otp-email-error')).not.toHaveClass('d-none');
  });

  test('should show resend timer after sending OTP', async ({ page }) => {
    await page.click('#submit-btn');
    
    // Enter valid email
    await page.fill('#otp-email-input', 'test@example.com');
    await page.click('#otp-send-btn');
    
    // Resend timer should appear (may be disabled initially)
    await expect(page.locator('#otp-resend-wrapper')).toBeVisible();
  });

  test('should validate OTP code format', async ({ page }) => {
    await page.click('#submit-btn');
    await page.fill('#otp-email-input', 'test@example.com');
    await page.click('#otp-send-btn');
    
    // Wait for code step to appear (simulated)
    await page.waitForSelector('#otp-code-step', { state: 'visible' });
    
    // Enter invalid OTP (less than 6 digits)
    await page.fill('#otp-code-input', '123');
    await page.click('#otp-verify-btn');
    
    // Should show error or not proceed
    const codeError = page.locator('#otp-code-error');
    await expect(codeError).toBeVisible();
  });

  test('should allow changing email during verification', async ({ page }) => {
    await page.click('#submit-btn');
    await page.fill('#otp-email-input', 'first@example.com');
    await page.click('#otp-send-btn');
    
    // Click change email
    await page.click('#otp-change-email-btn');
    
    // Should return to email input step
    await expect(page.locator('#otp-email-step')).toBeVisible();
    await expect(page.locator('#otp-code-step')).not.toBeVisible();
  });
});

test.describe('Form Submission with OTP', () => {
  test('should block form submission until email is verified', async ({ page }) => {
    await page.goto('/');
    
    // Fill form
    await page.fill('#referral-code', 'HYBE2025');
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'unverified@example.com');
    await page.fill('#phone', '1234567890');
    await page.selectOption('#country-select', 'United States');
    await page.fill('#dob', '2000-01-01');
    await page.selectOption('#gender', 'Prefer Not to Say');
    await page.selectOption('#branch', 'BigHit Music');
    await page.selectOption('#group', 'BTS');
    await page.selectOption('#artist', 'Jung Kook');
    await page.selectOption('#payment-type', 'Full Payment');
    await page.check('input[name="payment-method"][value="Card Payment"]');
    await page.check('input[name="contact-method"][value="Via Email"]');
    await page.check('#privacy-policy');
    await page.check('#subscription-agreement');
    
    // Submit without verification
    await page.click('#submit-btn');
    
    // Should be blocked by OTP modal
    await expect(page.locator('#otpModal')).toBeVisible();
    
    // Form should not be submitted yet
    await expect(page.locator('#digitalCurrencySuccessModal')).not.toBeVisible();
  });
});
