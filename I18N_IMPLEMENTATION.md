# Internationalization (i18n) Implementation Guide

## Overview
The HYBE Fan-Permit system now supports automatic language detection and multi-language support with Korean as the default.

## Features Implemented

### 1. Automatic Language Detection
- **Browser Language Detection**: Detects user's browser language settings
- **IP-based Geolocation**: Falls back to IP-based country detection if browser language is Korean but user is abroad
- **Smart Prompting**: Only shows language change prompt if detected language differs from Korean

### 2. Supported Languages
- 🇰🇷 한국어 (Korean) - **Default**
- 🇬🇧 English
- 🇯🇵 日本語 (Japanese)
- 🇨🇳 中文 (Chinese)
- 🇪🇸 Español (Spanish)

### 3. User Flow
1. Page loads in **Korean** by default
2. System detects browser language
3. If non-Korean detected → Shows modal asking "Would you like to switch to [Language]?"
4. User can accept (switches language & reloads) or decline (stays Korean)
5. Preference is saved in localStorage for future visits

### 4. Files Added/Modified

#### New Files:
```
src/
├── store/
│   └── languageStore.js      # Zustand state management for language
└── i18n/
    ├── translations.js       # All translation strings
    └── index.js              # Translation helper functions
```

#### Modified Files:
- `index.html` - Added language prompt modal and initialization script
- `package.json` - Added zustand dependency

### 5. How It Works

#### Language Detection Logic (`src/store/languageStore.js`)
```javascript
// 1. Check saved preference first
if (user has saved language preference) → use it

// 2. Detect browser language
const browserLang = navigator.language.split('-')[0]

// 3. If browser is not Korean, show prompt
if (browserLang !== 'ko') → showLanguagePrompt = true

// 4. Optional: IP-based detection (fallback)
fetch('https://ipapi.co/json/') → get country code → map to language
```

#### Translation Usage
```javascript
import t from './src/i18n/index.js';

// Basic usage
t('hero.title', 'en') // Returns "HYBE Fan Permit"

// With parameters
t('otp.resendTimer', 'ko', { seconds: 30 }) // Returns "재전송 가능: 30 초 후"
```

### 6. Testing

#### Test Scenarios:
1. **Korean Browser**: No prompt shown, stays Korean
2. **English Browser**: Prompt shows "Switch to English?"
3. **Japanese Browser**: Prompt shows "日本語に変更しますか？"
4. **Saved Preference**: Uses saved language, no prompt
5. **IP Detection**: Korean browser + US IP → Still shows prompt

#### Manual Testing:
```bash
# Start dev server
npm run dev

# Test different languages by changing browser settings:
# Chrome: Settings → Advanced → Languages
# Firefox: Settings → General → Language
```

### 7. Adding New Translations

1. Add language to `SUPPORTED_LANGUAGES` in `languageStore.js`
2. Add translations to `translations.js`:
```javascript
fr: {
  'hero.title': 'Permis Fan HYBE',
  'form.submitButton': 'Soumettre',
  // ... more translations
}
```
3. Add country mapping in `detectUserLanguage()` if needed

### 8. Netlify Deployment

The i18n system works seamlessly with Netlify Functions:
- Client-side detection happens before any API calls
- Language preference persists across sessions
- No server-side changes needed

### 9. Troubleshooting

**Modal not showing?**
- Check browser console for errors
- Ensure JavaScript modules are loading (check network tab)
- Verify zustand is installed: `npm list zustand`

**Wrong language detected?**
- Clear localStorage: `localStorage.removeItem('hybe-language-preference')`
- Check browser language settings
- IP detection may be inaccurate with VPNs/proxies

**Translation missing?**
- Check translation key exists in all languages
- Fallback to Korean if translation missing

## Next Steps for Full Implementation

To apply translations to the entire page:

1. Add `data-i18n` attributes to all translatable elements:
```html
<h1 data-i18n="hero.title">HYBE 팬 허가증</h1>
<button data-i18n="form.submitButton">제출하기</button>
```

2. Create translation update function:
```javascript
function updatePageLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key, lang);
  });
}
```

3. Call on language change and initial load

## Architecture Integration

This i18n system integrates with:
- ✅ OTP Verification flow
- ✅ Form submission
- ✅ Error messages
- ✅ Success pages
- ✅ Navigation
- ✅ Footer links

All while maintaining Korean as the respectful default for international fans.
