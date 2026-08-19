import translations from './translations.js';

// Language detection and auto-translation system
class LanguageDetector {
  constructor() {
    this.currentLang = 'ko'; // Default to Korean
    this.detectedLang = null;
    this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'th', 'vi', 'id'];
  }

  /**
   * Get browser language
   */
  getBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (!browserLang) return 'ko';
    
    // Extract base language code (e.g., 'en-US' -> 'en')
    const baseLang = browserLang.split('-')[0].toLowerCase();
    
    // Check if supported
    if (this.supportedLanguages.includes(baseLang)) {
      return baseLang;
    }
    
    // Try to find partial match
    for (const code of this.supportedLanguages) {
      if (browserLang.toLowerCase().startsWith(code)) {
        return code;
      }
    }
    
    return 'en'; // Fallback to English
  }

  /**
   * Detect country/language via IP (using free ipapi.co API)
   */
  async detectLanguageByIP() {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // Add timeout
        signal: AbortSignal.timeout(3000)
      });
      
      if (!response.ok) throw new Error('IP detection failed');
      
      const data = await response.json();
      const countryCode = data.country_code;
      
      // Map country codes to languages
      const countryToLang = {
        'KR': 'ko',
        'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en',
        'JP': 'ja',
        'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'SG': 'zh',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es',
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr',
        'DE': 'de', 'AT': 'de',
        'BR': 'pt', 'PT': 'pt',
        'RU': 'ru',
        'TH': 'th',
        'VN': 'vi',
        'ID': 'id'
      };
      
      return countryToLang[countryCode] || null;
    } catch (error) {
      console.warn('IP language detection failed:', error.message);
      return null;
    }
  }

  /**
   * Main detection logic - Combines Browser + IP detection
   */
  async detect() {
    // Step 1: Get browser language (most reliable for first-time visitors)
    const browserLang = this.getBrowserLanguage();
    this.detectedLang = browserLang;

    // Step 2: ALSO check IP-based detection for ALL non-Korean users
    // This catches travelers or users with misconfigured browsers
    // We check IP for ANY non-Korean language to ensure accuracy
    if (browserLang !== 'ko') {
      const ipLang = await this.detectLanguageByIP();
      
      if (ipLang) {
        // If IP detection returns a result, use it as primary
        // IP is more accurate for geographic targeting
        this.detectedLang = ipLang;
      }
      // If IP fails or returns null, keep browser language as fallback
    }

    return this.detectedLang;
  }

  /**
   * Show language prompt modal if detected language is not Korean
   */
  showLanguagePrompt() {
    // Don't show prompt if detected language is Korean or already set
    if (this.detectedLang === 'ko' || this.currentLang !== 'ko') {
      return;
    }

    const detectedLangName = this.getNativeLanguageName(this.detectedLang);
    const t = (key) => this.translate(key, this.detectedLang);

    const modalHTML = `
      <div id="language-prompt-modal" class="language-prompt-modal" role="dialog" aria-modal="true">
        <div class="language-prompt-content">
          <h3>${t('lang.promptTitle')}</h3>
          <p>${t('lang.promptMessage').replace('{language}', `<strong>${detectedLangName}</strong>`)}</p>
          <div class="language-prompt-buttons">
            <button id="lang-yes-btn" class="btn-primary">${t('lang.acceptButton')}</button>
            <button id="lang-no-btn" class="btn-secondary">${t('lang.declineButton')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles if not already present
    if (!document.getElementById('lang-prompt-styles')) {
      const style = document.createElement('style');
      style.id = 'lang-prompt-styles';
      style.textContent = `
        .language-prompt-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }
        .language-prompt-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .language-prompt-content h3 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: #000;
        }
        .language-prompt-content p {
          margin: 0 0 1.5rem;
          line-height: 1.6;
          color: #555;
        }
        .language-prompt-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .btn-primary, .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #0066FF;
          color: white;
        }
        .btn-primary:hover {
          background: #0052CC;
        }
        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }
        .btn-secondary:hover {
          background: #e0e0e0;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Event listeners
    document.getElementById('lang-yes-btn').addEventListener('click', () => {
      this.setLanguage(this.detectedLang);
      this.closePrompt();
    });

    document.getElementById('lang-no-btn').addEventListener('click', () => {
      // Keep Korean - save preference explicitly
      localStorage.setItem('hybe_preferred_language', 'ko');
      this.closePrompt();
    });
  }

  closePrompt() {
    const modal = document.getElementById('language-prompt-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * Set and apply language
   */
  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.warn(`Language ${lang} not supported`);
      lang = 'ko';
    }

    this.currentLang = lang;
    localStorage.setItem('hybe_preferred_language', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Apply translations to all elements with data-i18n attribute
    this.applyTranslations();

    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
  }

  /**
   * Apply translations to all elements with data-i18n attribute
   */
  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const value = this.translate(key, this.currentLang);
      
      if (value) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          if (element.hasAttribute('placeholder')) {
            element.placeholder = value;
          } else {
            element.value = value;
          }
        } else if (element.tagName === 'SELECT' && element.hasAttribute('aria-label')) {
          // For select elements with aria-label, update aria-label only
          element.setAttribute('aria-label', value);
        } else {
          // For other elements, only update textContent if it's not an option element
          // Option elements keep their HTML content
          if (element.tagName !== 'OPTION') {
            element.textContent = value;
          }
        }
      }
    });

    // Update page title if there's a hero.title
    const pageTitle = this.translate('hero.title', this.currentLang);
    if (pageTitle) {
      document.title = pageTitle;
    }
  }

  /**
   * Translate a key to the specified language
   */
  translate(key, lang = 'ko', params = {}) {
    const langTranslations = translations[lang] || translations.ko;
    let text = langTranslations[key] || translations.ko[key] || key;
    
    // Replace parameters like {seconds}, {language}
    Object.keys(params).forEach(paramKey => {
      text = text.replace(`{${paramKey}}`, params[paramKey]);
    });
    
    return text;
  }

  /**
   * Get native language name
   */
  getNativeLanguageName(lang) {
    const langMap = {
      ko: '한국어',
      en: 'English',
      ja: '日本語',
      zh: '中文',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      pt: 'Português',
      ru: 'Русский',
      th: 'ไทย',
      vi: 'Tiếng Việt',
      id: 'Bahasa Indonesia'
    };
    return langMap[lang] || lang;
  }

  /**
   * Initialize language detection on page load
   */
  async init() {
    // ALWAYS start with Korean by default on every page load
    this.currentLang = 'ko';
    this.applyTranslations();
    document.documentElement.lang = 'ko';
    
    // Check if user has previously made a choice
    const savedLang = localStorage.getItem('hybe_preferred_language');
    const hasUserPreference = savedLang && this.supportedLanguages.includes(savedLang);
    
    // If user has saved preference, apply it immediately (no prompt)
    if (hasUserPreference) {
      this.setLanguage(savedLang);
      return;
    }
    
    // No saved preference - detect user's language via browser AND IP
    await this.detect();
    
    // Show prompt ONLY if detected language is not Korean
    // This ensures Korean users see Korean, others get prompted
    if (this.detectedLang && this.detectedLang !== 'ko') {
      // Small delay to ensure page is fully loaded
      setTimeout(() => this.showLanguagePrompt(), 800);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Create singleton instance
export const languageDetector = new LanguageDetector();

// Export translation function for backward compatibility
export const t = (key, lang = languageDetector.getCurrentLanguage(), params = {}) => {
  return languageDetector.translate(key, lang, params);
};

export const getNativeLanguageName = (lang) => {
  return languageDetector.getNativeLanguageName(lang);
};

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => languageDetector.init());
  } else {
    languageDetector.init();
  }
}

export default languageDetector;
