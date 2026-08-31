// @ts-check
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import Mailosaur from "mailosaur";

/**
 * -------------------------------------------------------------------------------------------------
 * E2E Test Scaffold for HYBE Fan-Permit Form
 * -------------------------------------------------------------------------------------------------
 *
 * Purpose:
 * This test provides an end-to-end validation of the entire user journey, from filling out the form
 * to verifying an email via OTP and reaching the success page.
 *
 * Prerequisites:
 * 1. Playwright Setup:
 *    - Run `npm install @playwright/test`
 *    - Run `npx playwright install` to install browsers.
 *
 * 2. Environment Variables:
 *    - Create a `.env` file in the project root.
 *    - Add all required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FORMSPREE_URL`).
 *
 * 3. Email Testing Service (Mailosaur Example):
 *    - This test uses Mailosaur (https://mailosaur.com) to programmatically receive and read the OTP email.
 *    - Sign up for Mailosaur and create a server.
 *    - Add your Mailosaur API key and Server ID to the `.env` file.
 *    - `MAILOSAUR_API_KEY=your_api_key`
 *    - `MAILOSAUR_SERVER_ID=your_server_id`
 *
 * How to Run:
 * 1. Start the development server: `npm run dev`
 * 2. Run the Playwright test: `npx playwright test tests/e2e-flow.spec.js`
 *
 * -------------------------------------------------------------------------------------------------
 */

// Load environment variables from .env file
dotenv.config();

// Mailosaur configuration
const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY || "";
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID || "";

test.describe("HYBE Fan-Permit Form E2E Flow", () => {
  const baseURL = "http://localhost:5173"; // Assuming Vite dev server runs on this port

  test("should allow a user to fill out the form, verify email, and submit successfully", async ({
    page,
  }) => {
    if (!MAILOSAUR_API_KEY || !MAILOSAUR_SERVER_ID) {
      test.skip(true, "Mailosaur credentials not configured");
      return;
    }

    const Mailosaur = (await import("mailosaur")).default;
    const mailosaur = new Mailosaur(MAILOSAUR_API_KEY);
    // Step 1: Navigate to the form page
    await page.goto(baseURL);
    await expect(page).toHaveTitle(
      /Official HYBE Fan-Permit Subscription Form/,
    );

    // Generate a unique email address for this test run using Mailosaur
    const randomString = (Math.random() + 1).toString(36).substring(7);
    const testEmail = `${randomString}@${MAILOSAUR_SERVER_ID}.mailosaur.net`;

    // Step 2: Fill out the form with valid data
    await page.fill("#referral-code", "TESTCODE123");
    await page.fill("#full-name", "Test User");
    await page.fill("#email", testEmail);
    await page.fill("#phone", "1234567890");
    await page.fill("#address-line1", "123 Test St");
    await page.fill("#city", "Testville");
    await page.fill("#postal-code", "12345");
    await page.selectOption("#country-select", { label: "United States" });
    await page.fill("#dob", "2000-01-01");
    await page.selectOption("#gender", "Prefer Not to Say");
    await page.selectOption("#branch", "BigHit Music");
    await page.selectOption("#group", "BTS");
    await page.selectOption("#artist", "Jung Kook");
    await page.selectOption("#payment-type", "Full Payment");
    await page.check('input[name="payment-method"][value="Card Payment"]');
    await page.check('input[name="contact-method"][value="Via Email"]');
    await page.check("#privacy-policy");
    await page.check("#subscription-agreement");

    // Step 3: Initiate Email Verification
    // The form automatically triggers the verification modal on submit if email is not verified
    await page.click("#submit-btn");

    // The verification modal should appear
    await expect(page.locator("#emailVerificationModal")).toBeVisible();
    await expect(page.locator("#verification-email")).toHaveValue(testEmail);

    // Click the "Send Verification Code" button inside the modal
    await page.click("#send-otp-btn");
    await expect(page.locator("text=Verification Code Sent!")).toBeVisible();

    // Step 4: Retrieve the OTP from Mailosaur
    const email = await mailosaur.messages.get(MAILOSAUR_SERVER_ID, {
      sentTo: testEmail,
    });

    // Extract the 6-digit OTP from the email body
    const otpMatch = email.html.body.match(/(\d{6})/);
    expect(otpMatch).not.toBeNull();
    const otpCode = otpMatch[1];

    // Step 5: Enter the OTP and complete verification
    await page.fill("#otp-input", otpCode);

    // Verification should complete automatically, and the modal should close.
    // We wait for the modal to be hidden to ensure the flow continues.
    await expect(page.locator("#emailVerificationModal")).toBeHidden({
      timeout: 10000,
    });

    // Step 6: Final Submission and Success Page
    // After verification, the form should submit automatically.
    // We expect to see the final success modal.
    await expect(page.locator("#digitalCurrencySuccessModal")).toBeVisible();
    await expect(
      page.locator("text=Form Submitted Successfully!"),
    ).toBeVisible();

    // The test can end here, or we can wait for the redirect to the success page.
    await expect(page.locator("#digital-currency-countdown")).toBeVisible();

    // Wait for the navigation to the success page to complete
    await page.waitForURL("**/success.html", { timeout: 10000 });
    await expect(page.locator("h1")).toHaveText("Subscription Confirmed!");
  });
});
