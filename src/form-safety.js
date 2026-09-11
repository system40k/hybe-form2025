const LEGACY_LANGUAGE_KEY = 'hybe-language';
const LEGACY_PROMPT_KEY = 'hybe-language-prompt-accepted';
const AUTHORITATIVE_LANGUAGE_KEY = 'hybe_preferred_language';

function suppressLegacyLanguagePrompt() {
  // script.js checks this legacy flag before starting its own IP lookup/prompt.
  // Mark it handled before DOMContentLoaded so src/i18n is the only language authority.
  try {
    localStorage.setItem(LEGACY_PROMPT_KEY, 'true');
    const preferred = localStorage.getItem(AUTHORITATIVE_LANGUAGE_KEY);
    if (preferred) localStorage.setItem(LEGACY_LANGUAGE_KEY, preferred);
  } catch {}
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
      // Preserve each input inside its original label/layout wrapper. Legacy
      // country formatting may still update labels/placeholders/validation.
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
      // Never allow delayed geo/programmatic callbacks to replace a user's
      // explicit country choice.
      if (!event.isTrusted && manualCountry && countrySelect.value !== manualCountry) {
        countrySelect.value = manualCountry;
      }

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

      // Remove the legacy country-specific formatter installed by script.js;
      // the user's typed representation should remain untouched.
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

suppressLegacyLanguagePrompt();

if (typeof document !== 'undefined') {
  // Run before script.js DOMContentLoaded listeners because this module is
  // imported by the earlier-loaded i18n entrypoint.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormSafety, { once: true });
  } else {
    initializeFormSafety();
  }
}
