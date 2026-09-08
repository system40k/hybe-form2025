import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

async function setup() {
  const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://test.example/', runScripts: 'outside-only' });
  const w = dom.window;
  await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  w.localStorage.setItem('hybe-language-prompt-accepted', 'true');
  w.CSS = { escape: value => value };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const instances = new Map();
  class Modal {
    constructor(el) { this.el = el; instances.set(el, this); }
    static getOrCreateInstance(el) { return instances.get(el) || new Modal(el); }
    static getInstance(el) { return instances.get(el); }
    show() { this.el.classList.add('show'); }
    hide() { this.el.classList.remove('show'); this.el.dispatchEvent(new w.Event('hidden.bs.modal')); }
  }
  w.bootstrap = { Modal, Toast: Modal, Tooltip: class {} };
  w.fetch = async () => ({ ok: true, json: async () => [] });
  w.getAuthClient = () => ({ auth: { onAuthStateChange() {} } });
  w.getVerifiedSession = async () => { throw new Error('No test session'); };
  w.eval(readFileSync(new URL('../script.js', import.meta.url), 'utf8').replace(/^import .*\n/, ''));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(resolve => setTimeout(resolve, 0));
  return dom;
}

test('wizard keeps every visible form group in a step, preserving field ownership', async () => {
  const dom = await setup(); const d = dom.window.document;
  try {
    assert.equal(d.querySelectorAll('.step').length, 5);
    for (const [id, step] of Object.entries({ 'full-name': 1, email: 1, phone: 1, 'country-select': 2, branch: 3, 'events-section': 4, 'submit-btn': 5 })) {
      assert.equal(d.getElementById(id).closest('.step')?.id, `step-${step}`, id);
    }
    for (const el of d.querySelectorAll('#subscription-form input:not([type="hidden"]), #subscription-form select, #subscription-form textarea')) {
      if (el.id !== 'website') assert.ok(el.closest('.step'), el.id);
    }
    assert.equal(d.getElementById('wizard-status').textContent, 'Step 1 of 5');
    assert.notEqual(d.querySelector('[data-i18n="hero.title"]').textContent, 'hero.title');
  } finally { dom.window.close(); }
});

test('Next validates current fields; step links and Back preserve values', async () => {
  const dom = await setup(); const d = dom.window.document;
  try {
    d.getElementById('full-name').value = 'Sample Applicant';
    d.getElementById('next-btn').click();
    assert.equal(d.getElementById('wizard-status').textContent, 'Step 1 of 5');
    assert.ok(d.querySelector('#step-1 .is-invalid'));
    d.getElementById('step-tab-2').click();
    assert.equal(d.getElementById('wizard-status').textContent, 'Step 2 of 5');
    d.getElementById('prev-btn').click();
    assert.equal(d.getElementById('full-name').value, 'Sample Applicant');
    d.getElementById('step-tab-5').click();
    assert.ok(d.getElementById('next-btn').classList.contains('d-none'));
    d.getElementById('subscription-form').dispatchEvent(new dom.window.CustomEvent('wizard:reveal', { detail: d.getElementById('email') }));
    assert.equal(d.getElementById('wizard-status').textContent, 'Step 1 of 5');
  } finally { dom.window.close(); }
});

test('onboarding is optional, organized and reopenable; offline notice recovers', async () => {
  const dom = await setup(); const w = dom.window; const d = w.document;
  try {
    assert.equal(d.querySelectorAll('.onboarding-steps li').length, 3);
    assert.ok(!d.getElementById('onboardingModal').classList.contains('show'));
    d.getElementById('open-onboarding-btn').click();
    assert.ok(d.getElementById('onboardingModal').classList.contains('show'));
    assert.ok(d.querySelector('#onboardingModal .modal-header [data-bs-dismiss]'));
    Object.defineProperty(w.navigator, 'onLine', { configurable: true, value: false });
    w.dispatchEvent(new w.Event('offline'));
    assert.ok(!d.getElementById('connection-status').classList.contains('d-none'));
    Object.defineProperty(w.navigator, 'onLine', { configurable: true, value: true });
    w.dispatchEvent(new w.Event('online'));
    assert.ok(d.getElementById('connection-status').classList.contains('d-none'));
  } finally { dom.window.close(); }
});
