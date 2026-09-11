import translations from './translations.js';
import { getGeoProfile, initializeGeoAutofill } from '../geo-autofill.js';
import '../form-safety.js';
import '../responsive-ui.js';
import '../flow-orchestrator.js';

const LANGUAGE_READY_EVENT = 'hybe:language-ready';
const LANGUAGE_PROMPT_CLOSED_EVENT = 'hybe:language-prompt-closed';

function publishLanguageState(promptOpen, language) {
  window.__hybeLanguageState = {
    ready: true,
    promptOpen: Boolean(promptOpen),
    language: language || 'ko',
  };
}

class LanguageDetector {
  constructor() {
    this.currentLang = 'ko';
    this.detectedLang = null;
    this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'th', 'vi', 'id'];
    this.selectorBound = false;
  }

  getBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (!browserLang) return 'ko';
    const baseLang = browserLang.split('-')[0].toLowerCase();
    if (this.supportedLanguages.includes(baseLang)) return baseLang;
    for (const code of this.supportedLanguages) {
      if (browserLang.toLowerCase().startsWith(code)) return code;
    }
    return 'en';
  }

  async detect() {
    const browserLang = this.getBrowserLanguage();
    const geo = await getGeoProfile();
    const geoLang = geo?.language;
    this.detectedLang = geoLang && this.supportedLanguages.includes(geoLang) ? geoLang : browserLang;
    return this.detectedLang;
  }

  bindLanguageSelector() {
    if (this.selectorBound) return;
    const selector = document.getElementById('language-switcher');
    if (!selector) return;

    selector.addEventListener('change', (event) => {
      event.stopImmediatePropagation();
      const selected = selector.value;
      if (selected === 'auto') {
        localStorage.removeItem('hybe_preferred_language');
        this.currentLang = 'ko';
        this.applyTranslations();
        this.detect().then((lang) => {
          if (lang && lang !== 'ko') this.showLanguagePrompt();
          else this.setLanguage('ko');
        }).catch(() => this.setLanguage('ko'));
        return;
      }
      this.setLanguage(selected);
    });

    this.selectorBound = true;
  }

  syncSelector() {
    const selector = document.getElementById('language-switcher');
    if (selector && selector.value !== this.currentLang) selector.value = this.currentLang;
  }

  showLanguagePrompt() {
    if (this.detectedLang === 'ko' || this.currentLang !== 'ko') {
      publishLanguageState(false, this.currentLang);
      window.dispatchEvent(new CustomEvent(LANGUAGE_PROMPT_CLOSED_EVENT));
      return;
    }
    if (document.getElementById('language-prompt-modal')) return;

    publishLanguageState(true, this.detectedLang);
    const detectedLangName = this.getNativeLanguageName(this.detectedLang);
    const t = (key) => this.translate(key, this.detectedLang);
    const modalHTML = `
      <div id="language-prompt-modal" class="language-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="language-prompt-title">
        <div class="language-prompt-content">
          <h3 id="language-prompt-title">${t('lang.promptTitle')}</h3>
          <p>${t('lang.promptMessage').replace('{language}', `<strong>${detectedLangName}</strong>`)}</p>
          <div class="language-prompt-buttons">
            <button id="lang-yes-btn" type="button" class="btn btn-primary">${t('lang.acceptButton')}</button>
            <button id="lang-no-btn" type="button" class="btn btn-outline-secondary">${t('lang.declineButton')}</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    if (!document.getElementById('lang-prompt-styles')) {
      const style = document.createElement('style');
      style.id = 'lang-prompt-styles';
      style.textContent = `
        .language-prompt-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;z-index:1085;padding:1rem}
        .language-prompt-content{background:#fff;color:#111;width:min(100%,400px);padding:1.5rem;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center}
        .language-prompt-content h3{margin:0 0 .75rem;font-size:1.35rem}.language-prompt-content p{margin:0 0 1.25rem;line-height:1.55;color:#555}
        .language-prompt-buttons{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
        @media(max-width:430px){.language-prompt-content{padding:1.25rem}.language-prompt-buttons>*{width:100%}}
      `;
      document.head.appendChild(style);
    }

    const finish = (lang) => {
      if (lang) this.setLanguage(lang);
      this.closePrompt();
    };
    document.getElementById('lang-yes-btn')?.addEventListener('click', () => finish(this.detectedLang), { once: true });
    document.getElementById('lang-no-btn')?.addEventListener('click', () => finish('ko'), { once: true });
  }

  closePrompt() {
    document.getElementById('language-prompt-modal')?.remove();
    publishLanguageState(false, this.currentLang);
    window.dispatchEvent(new CustomEvent(LANGUAGE_PROMPT_CLOSED_EVENT));
  }

  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) lang = 'ko';
    this.currentLang = lang;
    localStorage.setItem('hybe_preferred_language', lang);
    localStorage.setItem('hybe-language', lang);
    localStorage.setItem('hybe-language-prompt-accepted', 'true');
    document.documentElement.lang = lang;
    this.applyTranslations();
    this.syncSelector();
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      const value = this.translate(key, this.currentLang);
      if (!value) return;
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.hasAttribute('placeholder')) element.placeholder = value;
      } else if (element.tagName === 'SELECT' && element.hasAttribute('aria-label')) {
        element.setAttribute('aria-label', value);
      } else if (element.tagName !== 'OPTION') {
        element.textContent = value;
      }
    });
    const pageTitle = this.translate('hero.title', this.currentLang);
    if (pageTitle) document.title = pageTitle;
  }

  translate(key, lang = 'ko', params = {}) {
    const langTranslations = translations[lang] || translations.ko;
    let text = langTranslations[key] || translations.ko[key] || key;
    Object.keys(params).forEach((paramKey) => { text = text.replace(`{${paramKey}}`, params[paramKey]); });
    return text;
  }

  getNativeLanguageName(lang) {
    const langMap = { ko:'한국어', en:'English', ja:'日本語', zh:'中文', es:'Español', fr:'Français', de:'Deutsch', pt:'Português', ru:'Русский', th:'ไทย', vi:'Tiếng Việt', id:'Bahasa Indonesia' };
    return langMap[lang] || lang;
  }

  async init() {
    this.bindLanguageSelector();
    this.currentLang = 'ko';
    this.applyTranslations();
    document.documentElement.lang = 'ko';
    initializeGeoAutofill().catch(() => null);

    const savedLang = localStorage.getItem('hybe_preferred_language');
    const hasPreference = savedLang && this.supportedLanguages.includes(savedLang);
    if (hasPreference) {
      this.setLanguage(savedLang);
      publishLanguageState(false, savedLang);
      window.dispatchEvent(new CustomEvent(LANGUAGE_READY_EVENT, { detail: { prompted: false, language: savedLang } }));
      return;
    }

    await this.detect();
    const shouldPrompt = Boolean(this.detectedLang && this.detectedLang !== 'ko');
    publishLanguageState(shouldPrompt, this.detectedLang || 'ko');
    window.dispatchEvent(new CustomEvent(LANGUAGE_READY_EVENT, { detail: { prompted: shouldPrompt, language: this.detectedLang || 'ko' } }));
    if (shouldPrompt) this.showLanguagePrompt();
  }

  getCurrentLanguage() { return this.currentLang; }
}

export const languageDetector = new LanguageDetector();
export const t = (key, lang = languageDetector.getCurrentLanguage(), params = {}) => languageDetector.translate(key, lang, params);
export const getNativeLanguageName = (lang) => languageDetector.getNativeLanguageName(lang);
export { LANGUAGE_READY_EVENT, LANGUAGE_PROMPT_CLOSED_EVENT };

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => languageDetector.init(), { once: true });
  else languageDetector.init();
}

export default languageDetector;
