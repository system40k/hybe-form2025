const GEO_READY_EVENT = 'hybe:geo-ready';

let dialDataPromise;
let initialized = false;

function normalizeDialCode(country) {
  const root = String(country?.idd?.root || '').trim();
  const suffixes = Array.isArray(country?.idd?.suffixes) ? country.idd.suffixes.filter(Boolean) : [];
  if (!root) return '';
  // Shared numbering plans (+1, +7, etc.) must stay at their shared root.
  // Combining an arbitrary suffix would turn an area code into a country code.
  if (suffixes.length !== 1) return root;
  return `${root}${suffixes[0]}`;
}

async function getDialData() {
  if (!dialDataPromise) {
    dialDataPromise = fetch('/api/countries', {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Country metadata unavailable (${response.status})`);
        return response.json();
      })
      .then((countries) => (Array.isArray(countries) ? countries : []))
      .then((countries) => countries
        .map((country) => ({
          code: String(country?.cca2 || '').toUpperCase(),
          dial: normalizeDialCode(country),
        }))
        .filter((entry) => /^[A-Z]{2}$/.test(entry.code) && /^\+\d+$/.test(entry.dial)));
  }
  return dialDataPromise;
}

function flagFor(code) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...code.split('').map((char) => 127397 + char.charCodeAt(0)));
}

function setPrefix(prefixEl, code, dial) {
  if (!prefixEl) return;
  prefixEl.textContent = `${flagFor(code)} ${dial || ''}`.trim();
}

function chooseFromInternationalNumber(value, entries, currentCountry) {
  const normalized = String(value || '').replace(/[^\d+]/g, '');
  if (!normalized.startsWith('+')) return null;

  const matches = entries.filter((entry) => normalized.startsWith(entry.dial));
  if (!matches.length) return null;

  const longestLength = Math.max(...matches.map((entry) => entry.dial.length));
  const longest = matches.filter((entry) => entry.dial.length === longestLength);
  if (longest.length === 1) return longest[0];

  // Shared dialing codes (for example +1) are ambiguous. Preserve an already
  // plausible country instead of guessing from the first country in the list.
  return longest.find((entry) => entry.code === currentCountry) || null;
}

function markProgrammaticChange(select, source) {
  select.dispatchEvent(new CustomEvent('change', {
    bubbles: true,
    detail: { source },
  }));
}

export async function initializePhoneAutodetect() {
  if (initialized || typeof document === 'undefined') return;

  const countrySelect = document.getElementById('country-select');
  const phoneInput = document.getElementById('phone');
  const prefixEl = document.getElementById('phone-prefix');
  if (!countrySelect || !phoneInput || !prefixEl) return;

  initialized = true;
  const entries = await getDialData().catch(() => []);
  if (!entries.length) return;

  const byCountry = new Map(entries.map((entry) => [entry.code, entry]));

  const syncPrefix = () => {
    const entry = byCountry.get(String(countrySelect.value || '').toUpperCase());
    if (entry) setPrefix(prefixEl, entry.code, entry.dial);
  };

  const inferFromPhone = () => {
    if (countrySelect.dataset.userSelected === 'true') {
      syncPrefix();
      return;
    }

    const current = String(countrySelect.value || '').toUpperCase();
    const inferred = chooseFromInternationalNumber(phoneInput.value, entries, current);
    if (!inferred || inferred.code === current) {
      syncPrefix();
      return;
    }

    const optionExists = Array.from(countrySelect.options).some(
      (option) => String(option.value || '').toUpperCase() === inferred.code,
    );
    if (!optionExists) return;

    countrySelect.value = inferred.code;
    setPrefix(prefixEl, inferred.code, inferred.dial);
    markProgrammaticChange(countrySelect, 'phone-prefix');
  };

  countrySelect.addEventListener('change', (event) => {
    if (event.isTrusted) countrySelect.dataset.userSelected = 'true';
    queueMicrotask(syncPrefix);
  }, true);

  phoneInput.addEventListener('input', () => {
    // Only an explicit international prefix is strong enough evidence to
    // override geo detection. Local-format numbers keep the selected/geo country.
    if (String(phoneInput.value || '').trim().startsWith('+')) inferFromPhone();
  });

  window.addEventListener(GEO_READY_EVENT, () => {
    if (countrySelect.dataset.userSelected !== 'true' && !String(phoneInput.value || '').trim().startsWith('+')) {
      syncPrefix();
    }
  });

  syncPrefix();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializePhoneAutodetect(), { once: true });
  } else {
    initializePhoneAutodetect();
  }
}
