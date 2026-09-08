import assert from 'node:assert/strict';
import test from 'node:test';
import { handler as retired } from '../lib/retired-otp.js';
import { handler as submit } from '../lib/submit-form.js';
import submitFunction from '../netlify/functions/submit-form.js';

const body = { 'referral-code': 'HYBE2025', 'full-name': 'Test User', email: 'test@example.com' };
const event = (headers = {}, data = body) => ({ httpMethod: 'POST', headers, body: JSON.stringify(data) });

test('legacy OTP endpoints fail closed', async () => {
  assert.equal((await retired(event())).statusCode, 410);
  assert.equal((await retired({ httpMethod: 'GET' })).statusCode, 405);
});
test('submission rejects missing bearer and legacy capability tokens', async () => {
  assert.equal((await submit(event())).statusCode, 401);
  assert.equal((await submit(event({}, { ...body, otp_token: 'legacy.signature' }))).statusCode, 401);
  assert.equal((await submit(event({ authorization: 'Bearer bad extra' }))).statusCode, 401);
});
test('submission validates request shape and method', async () => {
  assert.equal((await submit({ httpMethod: 'GET' })).statusCode, 405);
  assert.equal((await submit({ ...event(), body: '{' })).statusCode, 400);
  assert.equal((await submit(event({}, {}))).statusCode, 400);
});
test('Auth validation checks confirmed email, token validity and provider availability', async () => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.VITE_SUPABASE_URL;
  const oldKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  let responseBody;
  let status = 200;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://test.supabase.co/auth/v1/user');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-token');
    return new Response(JSON.stringify(responseBody), { status, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const user = { id: 'user-id', email: 'test@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', aud: 'authenticated' };
    responseBody = user;
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 200);
    responseBody = { ...user, email: 'other@example.com' };
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 401);
    responseBody = { ...user, email_confirmed_at: null };
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 401);
    responseBody = { ...user, is_anonymous: true };
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 401);
    status = 401; responseBody = { msg: 'invalid token' };
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 401);
    status = 503; responseBody = { msg: 'unavailable' };
    assert.equal((await submit(event({ authorization: 'Bearer test-token' }))).statusCode, 503);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY; else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
test('Netlify Request adapter preserves rejection and no-store headers', async () => {
  const response = await submitFunction(new Request('https://example.com/submit-form', { method: 'POST', body: JSON.stringify(body) }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
