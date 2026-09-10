const GEO_CACHE_KEY = "hybe:geo-profile:v1";

function readCachedGeo() {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedGeo(profile) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Session storage may be unavailable in privacy modes; detection still works.
  }
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
  const countryCode = String(data?.country_code || data?.country_code_iso2 || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;

  return {
    countryCode,
    city: String(data?.city || "").trim(),
    region: String(data?.region || data?.region_name || "").trim(),
    postal: String(data?.postal || data?.postal_code || "").trim(),
  };
}

function setIfEmpty(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el && !String(el.value || "").trim()) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function applyProfile(profile) {
  if (!profile) return false;

  const countrySelect = document.getElementById("country-select");
  if (!countrySelect) return false;

  const matchingOption = Array.from(countrySelect.options).find(
    (option) => String(option.value || "").toUpperCase() === profile.countryCode,
  );
  if (!matchingOption) return false;

  // Only auto-select when the user has not already chosen a country.
  if (!countrySelect.dataset.userSelected && !countrySelect.value) {
    countrySelect.value = matchingOption.value;
    countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Never overwrite typed address data.
  setIfEmpty("city", profile.city);
  setIfEmpty("state", profile.region);
  setIfEmpty("postal-code", profile.postal);
  return true;
}

function waitForCountries(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const countrySelect = document.getElementById("country-select");
    if (!countrySelect) {
      resolve(null);
      return;
    }

    if (countrySelect.options.length > 1) {
      resolve(countrySelect);
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      if (countrySelect.options.length > 1 || Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        resolve(countrySelect);
      }
    }, 100);
  });
}

async function detectCountry() {
  const cached = readCachedGeo();
  if (cached) return cached;

  try {
    const data = await fetchJson("/api/ipinfo");
    const profile = normalizeProfile(data);
    if (profile) writeCachedGeo(profile);
    return profile;
  } catch {
    // Same-origin proxy should be preferred, but keep a graceful public fallback.
    try {
      const data = await fetchJson("https://ipwho.is/", 3000);
      const profile = normalizeProfile(data);
      if (profile) writeCachedGeo(profile);
      return profile;
    } catch {
      return null;
    }
  }
}

async function initializeGeoAutofill() {
  const countrySelect = document.getElementById("country-select");
  if (!countrySelect) return;

  countrySelect.addEventListener("change", (event) => {
    if (event.isTrusted) countrySelect.dataset.userSelected = "true";
  });

  const [profile] = await Promise.all([detectCountry(), waitForCountries()]);
  if (!profile) return;

  if (!applyProfile(profile)) {
    // Country options may still be arriving from the countries API.
    setTimeout(() => applyProfile(profile), 800);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGeoAutofill, { once: true });
} else {
  initializeGeoAutofill();
}
