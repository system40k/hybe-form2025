import { LANGUAGE_READY_EVENT, LANGUAGE_PROMPT_CLOSED_EVENT } from './i18n/index.js';

function showOnboarding() {
  const el = document.getElementById('onboardingModal');
  if (!el || typeof bootstrap === 'undefined') return;
  const modal = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: true });
  if (!el.classList.contains('show')) modal.show();
}

function coordinateStartup() {
  let languageReady = false;
  let languagePromptOpen = false;
  let onboardingShown = false;

  const maybeShowOnboarding = () => {
    if (!languageReady || languagePromptOpen || onboardingShown) return;
    onboardingShown = true;
    setTimeout(showOnboarding, 0);
  };

  window.addEventListener(LANGUAGE_READY_EVENT, (event) => {
    languageReady = true;
    languagePromptOpen = Boolean(event.detail?.prompted);
    maybeShowOnboarding();
  });

  window.addEventListener(LANGUAGE_PROMPT_CLOSED_EVENT, () => {
    languagePromptOpen = false;
    maybeShowOnboarding();
  });

  // Fallback for cached-language or unusually fast module execution.
  setTimeout(() => {
    if (!languageReady) {
      languageReady = true;
      languagePromptOpen = Boolean(document.getElementById('language-prompt-modal'));
      maybeShowOnboarding();
    }
  }, 1200);
}

function preservePhoneOnCountryChanges() {
  const country = document.getElementById('country-select');
  const phone = document.getElementById('phone');
  if (!country || !phone) return;

  let before = '';
  country.addEventListener('change', () => { before = phone.value; }, true);
  country.addEventListener('change', () => {
    if (!before) return;
    queueMicrotask(() => {
      if (!phone.value) {
        phone.value = before;
        phone.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}

function keepAddressWrappersStable() {
  const container = document.getElementById('address-fields');
  if (!container) return;
  const ids = ['address-line1','address-line2','city','state','postal-code'];
  const wrappers = new Map();
  ids.forEach((id) => {
    const input = document.getElementById(id);
    const wrapper = input?.closest('.mb-3, .col, .col-md-6, .col-12');
    if (input && wrapper && wrapper !== container) wrappers.set(id, wrapper);
  });

  const observer = new MutationObserver(() => {
    wrappers.forEach((wrapper, id) => {
      const input = document.getElementById(id);
      if (!input || wrapper.contains(input)) return;
      const label = wrapper.querySelector('label');
      if (label) wrapper.appendChild(input);
    });
  });
  observer.observe(container, { childList: true, subtree: true });
}

function init() {
  coordinateStartup();
  preservePhoneOnCountryChanges();
  keepAddressWrappersStable();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
