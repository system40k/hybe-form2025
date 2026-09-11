const GEO_CACHE_KEY = "hybe:geo-profile:v2";
const GEO_READY_EVENT = "hybe:geo-ready";

const countryToLanguage = {
  KR: "ko", US: "en", GB: "en", CA: "en", AU: "en", NZ: "en",
  JP: "ja", CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  ES: "es", MX: "es", AR: "es", CO: "es",
  FR: "fr", BE: "fr", CH: "fr", DE: "de", AT: "de",
  BR: "pt", PT: "pt", RU: "ru", TH: "th", VN: "vi", ID: "id",
};

function readCachedGeo() {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedGeo(profile) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(profile));
  } catch {}
}

async function fetchJson(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Geo lookup failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProfile(data) {
  const countryCode = String(data?.country_code || data?.country_code_iso2 || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;
  return {
    countryCode,
    language: countryToLanguage[countryCode] || null,
    city: String(data?.city || "").trim(),
    region: String(data?.region || data?.region_name || "").trim(),
    postal: String(data?.postal || data?.postal_code || "").trim(),
  };
}

export async function getGeoProfile() {
  const cached = readCachedGeo();
  if (cached?.countryCode) return cached;

  try {
    const profile = normalizeProfile(await fetchJson("/api/ipinfo"));
    if (profile) writeCachedGeo(profile);
    return profile;
  } catch {
    try {
      const profile = normalizeProfile(await fetchJson("https://ipwho.is/", 3000));
      if (profile) writeCachedGeo(profile);
      return profile;
    } catch {
      return null;
    }
  }
}

function setIfEmpty(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el && !String(el.value || "").trim()) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function waitForCountries(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const countrySelect = document.getElementById("country-select");
    if (!countrySelect) return resolve(null);
    if (countrySelect.options.length > 1) return resolve(countrySelect);
    const started = Date.now();
    const timer = setInterval(() => {
      if (countrySelect.options.length > 1 || Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        resolve(countrySelect);
      }
    }, 100);
  });
}

function applyProfile(profile) {
  if (!profile) return false;
  const countrySelect = document.getElementById("country-select");
  if (!countrySelect) return false;

  const matchingOption = Array.from(countrySelect.options).find(
    (option) => String(option.value || "").toUpperCase() === profile.countryCode,
  );
  if (!matchingOption) return false;

  if (!countrySelect.dataset.userSelected && !countrySelect.value) {
    countrySelect.value = matchingOption.value;
    countrySelect.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { source: "geo" } }));
  }

  setIfEmpty("city", profile.city);
  setIfEmpty("state", profile.region);
  setIfEmpty("postal-code", profile.postal);
  return true;
}

export async function initializeGeoAutofill() {
  const countrySelect = document.getElementById("country-select");
  if (!countrySelect) return null;

  countrySelect.addEventListener("change", (event) => {
    if (event.isTrusted) countrySelect.dataset.userSelected = "true";
  });

  const [profile] = await Promise.all([getGeoProfile(), waitForCountries()]);
  if (profile) {
    if (!applyProfile(profile)) setTimeout(() => applyProfile(profile), 800);
    window.dispatchEvent(new CustomEvent(GEO_READY_EVENT, { detail: profile }));
  }
  return profile;
}

export { countryToLanguage, GEO_READY_EVENT };
