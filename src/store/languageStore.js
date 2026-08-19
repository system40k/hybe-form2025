import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SUPPORTED_LANGUAGES = {
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
};

const getBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return 'ko';
  const browserLang = navigator.language || navigator.userLanguage;
  if (!browserLang) return 'ko';
  
  // Extract base language code (e.g., 'en-US' -> 'en')
  const baseLang = browserLang.split('-')[0].toLowerCase();
  
  // Check if supported
  if (SUPPORTED_LANGUAGES[baseLang]) {
    return baseLang;
  }
  
  // Handle Chinese variants
  if (baseLang === 'zh') {
    if (browserLang.includes('HK') || browserLang.includes('TW')) {
      return 'zh';
    }
    return 'zh';
  }
  
  return 'ko'; // Default to Korean
};

const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'ko', // Always default to Korean
      detectedLanguage: null,
      showLanguagePrompt: false,
      userConfirmed: false,
      
      setLanguage: (lang) => {
        if (!SUPPORTED_LANGUAGES[lang]) {
          console.warn(`Language ${lang} not supported, defaulting to Korean`);
          lang = 'ko';
        }
        set({ 
          language: lang, 
          showLanguagePrompt: false,
          userConfirmed: true
        });
        // Update HTML lang attribute
        if (typeof document !== 'undefined') {
          document.documentElement.lang = lang;
          document.documentElement.dir = SUPPORTED_LANGUAGES[lang].dir;
          
          // Apply translations immediately
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
      },
      setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),
      setShowLanguagePrompt: (show) => set({ showLanguagePrompt: show }),
      setUserConfirmed: (confirmed) => set({ userConfirmed: confirmed }),
      
      resetPrompt: () => set({ showLanguagePrompt: false, detectedLanguage: null }),
      
      acceptDetectedLanguage: () => {
        const { detectedLanguage } = get();
        if (detectedLanguage && SUPPORTED_LANGUAGES[detectedLanguage]) {
          get().setLanguage(detectedLanguage);
        }
      },
      
      declineDetectedLanguage: () => {
        // Keep Korean, mark as confirmed
        set({ 
          showLanguagePrompt: false, 
          detectedLanguage: null,
          userConfirmed: true,
          language: 'ko'
        });
      },
    }),
    {
      name: 'hybe-language-preference',
      partialize: (state) => ({ 
        language: state.language,
        userConfirmed: state.userConfirmed 
      }),
    }
  )
);

export const detectUserLanguage = async () => {
  const store = useLanguageStore.getState();
  
  // If user has explicitly confirmed a preference before, use it
  if (store.userConfirmed && store.language && store.language !== 'ko') {
    return store.language;
  }
  
  // Always start with Korean as default
  let detectedLang = 'ko';

  // Detect Browser Language
  const browserLang = getBrowserLanguage();
  detectedLang = browserLang;
  
  // If browser is not Korean, we'll suggest change
  if (browserLang !== 'ko' && SUPPORTED_LANGUAGES[browserLang]) {
    store.setDetectedLanguage(browserLang);
    store.setShowLanguagePrompt(true);
    return 'ko'; // Keep UI in Korean until user accepts
  }

  // Optional: IP-based detection fallback (only if browser lang is Korean)
  if (browserLang === 'ko') {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        
        // Map country codes to languages
        const countryToLang = {
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
          'ID': 'id',
          'KR': 'ko'
        };
        
        const ipLang = countryToLang[countryCode];
        
        if (ipLang && ipLang !== 'ko' && SUPPORTED_LANGUAGES[ipLang]) {
          // User is in a non-Korean country but browser is set to Korean (traveler)
          store.setDetectedLanguage(ipLang);
          store.setShowLanguagePrompt(true);
          detectedLang = ipLang;
        }
      }
    } catch (error) {
      console.warn('IP detection failed, relying on browser settings', error.message);
    }
  }

  return 'ko'; // Always return Korean as the active language
};

export const getNativeLanguageName = (lang) => {
  return SUPPORTED_LANGUAGES[lang]?.nativeName || lang;
};

export default useLanguageStore;
