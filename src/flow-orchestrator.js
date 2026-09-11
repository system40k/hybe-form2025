const LANGUAGE_READY_EVENT = 'hybe:language-ready';
const LANGUAGE_PROMPT_CLOSED_EVENT = 'hybe:language-prompt-closed';

function showOnboarding() {
  const el = document.getElementById('onboardingModal');
  if (!el || typeof bootstrap === 'undefined') return;
  const modal = bootstrap.Modal.getOrCreateInstance(el, {
    backdrop: 'static',
    keyboard: true,
  });
  if (!el.classList.contains('show')) modal.show();
}

function coordinateStartup() {
  let onboardingShown = false;
  const state = window.__hybeLanguageState || { ready: false, promptOpen: false };

  const maybeShowOnboarding = () => {
    const current = window.__hybeLanguageState || state;
    if (!current.ready || current.promptOpen || onboardingShown) return;
    onboardingShown = true;
    queueMicrotask(showOnboarding);
  };

  window.addEventListener(LANGUAGE_READY_EVENT, (event) => {
    window.__hybeLanguageState = {
      ready: true,
      promptOpen: Boolean(event.detail?.prompted),
    };
    maybeShowOnboarding();
  });

  window.addEventListener(LANGUAGE_PROMPT_CLOSED_EVENT, () => {
    window.__hybeLanguageState = { ready: true, promptOpen: false };
    maybeShowOnboarding();
  });

  maybeShowOnboarding();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', coordinateStartup, { once: true });
} else {
  coordinateStartup();
}
