const LEGACY_LANGUAGE_KEY = 'hybe-language';
const LEGACY_PROMPT_KEY = 'hybe-language-prompt-accepted';
const AUTHORITATIVE_LANGUAGE_KEY = 'hybe_preferred_language';

function mirrorAuthoritativeLanguagePreference() {
  const preferred = localStorage.getItem(AUTHORITATIVE_LANGUAGE_KEY);
  if (!preferred) return;
  // Keep legacy code inert while src/i18n remains the single language authority.
  localStorage.setItem(LEGACY_LANGUAGE_KEY, preferred);
  localStorage.setItem(LEGACY_PROMPT_KEY, 'true');
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
      // Legacy country formatting attempted to append the input itself to the
      // container, detaching it from its label/wrapper. Preserve the existing
      // DOM structure; labels/placeholders/required state can still update.
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

  countrySelect.addEventListener('change', () => {
    const userPhone = phoneInput.value;
    const selectionStart = phoneInput.selectionStart;
    const selectionEnd = phoneInput.selectionEnd;

    queueMicrotask(() => {
      // Country changes may update the displayed dial prefix, but must never
      // erase or silently rewrite a number the user already entered.
      if (userPhone && phoneInput.value !== userPhone) {
        phoneInput.value = userPhone;
        try {
          if (document.activeElement === phoneInput && selectionStart != null && selectionEnd != null) {
            phoneInput.setSelectionRange(selectionStart, selectionEnd);
          }
        } catch {}
      }
    });
  }, true);

  countrySelect.dataset.safetyGuardInstalled = 'true';
}

export function initializeFormSafety() {
  mirrorAuthoritativeLanguagePreference();
  installAddressWrapperGuard();
  installCountryChangeGuard();
}

if (typeof document !== 'undefined') {
  // Run before script.js DOMContentLoaded listeners because this module is
  // imported by the earlier-loaded i18n entrypoint.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormSafety, { once: true });
  } else {
    initializeFormSafety();
  }
}
