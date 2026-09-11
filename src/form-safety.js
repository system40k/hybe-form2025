import './phone-autodetect.js';

const LEGACY_LANGUAGE_KEY = 'hybe-language';
const LEGACY_PROMPT_KEY = 'hybe-language-prompt-accepted';
const AUTHORITATIVE_LANGUAGE_KEY = 'hybe_preferred_language';

function suppressLegacyLanguagePrompt() {
  try {
    localStorage.setItem(LEGACY_PROMPT_KEY, 'true');
    const preferred = localStorage.getItem(AUTHORITATIVE_LANGUAGE_KEY);
    if (preferred) localStorage.setItem(LEGACY_LANGUAGE_KEY, preferred);
  } catch {}
}

function installSharedGeoFetchAdapter() {
  if (typeof window === 'undefined' || window.__hybeSharedGeoFetchInstalled) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url || '';
    if (raw.startsWith('https://ipapi.co/json/') || raw.startsWith('https://ipwho.is/')) {
      return nativeFetch('/api/ipinfo', init);
    }
    if (raw.startsWith('https://restcountries.com/v3.1/all')) {
      return nativeFetch('/api/countries', init);
    }
    return nativeFetch(input, init);
  };

  window.__hybeSharedGeoFetchInstalled = true;
}

function installAddressWrapperGuard() {
  const addressFields = document.getElementById('address-fields');
  if (!addressFields || addressFields.dataset.wrapperGuardInstalled === 'true') return;

  const guardedIds = new Set([
    'address-line1',
    'address-line2',
    'city',
    'state',
    'postal-code',
  ]);
  const originalAppendChild = addressFields.appendChild.bind(addressFields);

  addressFields.appendChild = (node) => {
    if (node?.nodeType === Node.ELEMENT_NODE && guardedIds.has(node.id)) {
      return node;
    }
    return originalAppendChild(node);
  };

  addressFields.dataset.wrapperGuardInstalled = 'true';
}

function installCountryChangeGuard() {
  const countrySelect = document.getElementById('country-select');
  const phoneInput = document.getElementById('phone');
  if (!countrySelect || !phoneInput || countrySelect.dataset.safetyGuardInstalled === 'true') return;

  let manualCountry = '';

  countrySelect.addEventListener('change', (event) => {
    const userPhone = phoneInput.value;
    const selectionStart = phoneInput.selectionStart;
    const selectionEnd = phoneInput.selectionEnd;

    if (event.isTrusted) {
      manualCountry = countrySelect.value;
      countrySelect.dataset.userSelected = 'true';
    }

    queueMicrotask(() => {
      if (!event.isTrusted && manualCountry && countrySelect.value !== manualCountry) {
        countrySelect.value = manualCountry;
      }

      if (userPhone && phoneInput.value !== userPhone) {
        phoneInput.value = userPhone;
        try {
          if (document.activeElement === phoneInput && selectionStart != null && selectionEnd != null) {
            phoneInput.setSelectionRange(selectionStart, selectionEnd);
          }
        } catch {}
      }

      phoneInput.oninput = null;
    });
  }, true);

  countrySelect.dataset.safetyGuardInstalled = 'true';
}

export function initializeFormSafety() {
  suppressLegacyLanguagePrompt();
  installAddressWrapperGuard();
  installCountryChangeGuard();
}

installSharedGeoFetchAdapter();
suppressLegacyLanguagePrompt();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormSafety, { once: true });
  } else {
    initializeFormSafety();
  }
}
