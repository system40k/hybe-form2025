// test/test.mjs
import assert from "node:assert/strict";
import test from "node:test";

import { handler as sendOtp } from "../netlify/functions/otp-send.js";
import { handler as verifyOtp } from "../netlify/functions/otp-verify.js";
import { handler as submitForm } from "../netlify/functions/submit-form.js";

const functions = [
  ["otp-send", sendOtp],
  ["otp-verify", verifyOtp],
  ["submit-form", submitForm],
];

for (const [name, handler] of functions) {
  test(`${name} rejects non-POST requests`, async () => {
    const response = await handler({ httpMethod: "GET", headers: {}, body: "" });
    assert.equal(response.statusCode, 405);
    assert.match(response.headers["Content-Type"], /application\/json/);
    assert.equal(response.headers["Cache-Control"], "no-store");
  });
}

test("OTP functions fail closed without server-only configuration", async () => {
  const saved = {
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    OTP_HASH_SECRET: process.env.OTP_HASH_SECRET,
  };
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.OTP_HASH_SECRET;

  try {
    for (const handler of [sendOtp, verifyOtp]) {
      const response = await handler({
        httpMethod: "POST",
        headers: {},
        body: JSON.stringify({ email: "test@example.com", otp_code: "123456" }),
      });
      assert.equal(response.statusCode, 503);
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("submission rejects a missing verification token", async () => {
  const response = await submitForm({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({
      "referral-code": "HYBE2025",
      "full-name": "Test User",
      email: "test@example.com",
    }),
  });
  assert.equal(response.statusCode, 401);
});
