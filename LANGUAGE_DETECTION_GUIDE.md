# Language Detection Implementation Guide

## ✅ Auto-Translate on Page Load - Complete

### How It Works

**Default Behavior:**
1. **Page loads in Korean by default** - Every user sees Korean first
2. **Detects user's language** via browser settings and IP geolocation
3. **Shows prompt** if detected language is NOT Korean
4. **Remembers preference** - Returning users get their saved language immediately

### Detection Priority

1. **LocalStorage** (returning users) → Apply saved preference immediately, no prompt
2. **Browser Language** (first-time visitors) → Detect from `navigator.language`
3. **IP Geolocation** (fallback) → Use ipapi.co API to detect country → map to language

### User Flow

```
First-Time Visitor (Korean browser/IP):
  → Page loads in Korean
  → No prompt shown
  → User browses in Korean

First-Time Visitor (English browser/IP):
  → Page loads in Korean (default)
  → Prompt appears: "Switch to English?"
  → User clicks "Yes" → Site switches to English, saves preference
  → User clicks "No" → Stays in Korean, saves preference

Returning User:
  → Page loads in their saved language immediately
  → No prompt shown
```

### Code Changes Made

**File: `/workspace/src/i18n/index.js`**

#### 1. Removed `userConfirmed` flag
- Simplified state management
- Now relies on localStorage to track user preference

#### 2. Updated `init()` method
```javascript
async init() {
  // Always start with Korean by default on every page load
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
  
  // No saved preference - detect user's language
  await this.detect();
  
  // Show prompt if detected language is not Korean
  if (this.detectedLang && this.detectedLang !== 'ko') {
    setTimeout(() => this.showLanguagePrompt(), 500);
  }
}
```

#### 3. Updated `detect()` method
```javascript
async detect() {
  // Priority 1: Browser language (most reliable for first-time visitors)
  const browserLang = this.getBrowserLanguage();
  this.detectedLang = browserLang;

  // Priority 2: IP-based detection (only if browser lang is not Korean and not English)
  if (browserLang !== 'ko' && browserLang !== 'en') {
    const ipLang = await this.detectLanguageByIP();
    if (ipLang && ipLang !== browserLang) {
      this.detectedLang = ipLang;
    }
  }

  return this.detectedLang;
}
```

#### 4. Updated `showLanguagePrompt()` method
```javascript
showLanguagePrompt() {
  // Don't show prompt if detected language is Korean or already set
  if (this.detectedLang === 'ko' || this.currentLang !== 'ko') {
    return;
  }
  
  // ... show modal with Yes/No buttons
  
  // Yes button: switch to detected language
  document.getElementById('lang-yes-btn').addEventListener('click', () => {
    this.setLanguage(this.detectedLang);
    this.closePrompt();
  });

  // No button: keep Korean, save preference
  document.getElementById('lang-no-btn').addEventListener('click', () => {
    localStorage.setItem('hybe_preferred_language', 'ko');
    this.closePrompt();
  });
}
```

### Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| `ko` | Korean | 한국어 |
| `en` | English | English |
| `ja` | Japanese | 日本語 |
| `zh` | Chinese | 中文 |
| `es` | Spanish | Español |
| `fr` | French | Français |
| `de` | German | Deutsch |
| `pt` | Portuguese | Português |
| `ru` | Russian | Русский |
| `th` | Thai | ไทย |
| `vi` | Vietnamese | Tiếng Việt |
| `id` | Indonesian | Bahasa Indonesia |

### IP-to-Language Mapping

The system maps country codes to languages:
- `KR` → Korean
- `US`, `GB`, `CA`, `AU`, `NZ` → English
- `JP` → Japanese
- `CN`, `TW`, `HK`, `SG` → Chinese
- `ES`, `MX`, `AR`, `CO` → Spanish
- `FR`, `BE`, `CH` → French
- `DE`, `AT` → German
- `BR`, `PT` → Portuguese
- `RU` → Russian
- `TH` → Thai
- `VN` → Vietnamese
- `ID` → Indonesian

### Testing

**Test Scenario 1: First-time Korean user**
```bash
# Open browser with Korean language setting
# Expected: Page loads in Korean, no prompt
```

**Test Scenario 2: First-time English user**
```bash
# Open browser with English language setting
# Expected: Page loads in Korean, prompt appears asking to switch to English
```

**Test Scenario 3: Returning user**
```bash
# Clear cache, but keep localStorage
# Or: Visit site again after choosing language
# Expected: Page loads in saved language, no prompt
```

**Test Scenario 4: IP detection override**
```bash
# Use VPN to connect from Japan while browser is in English
# Expected: May detect Japanese from IP, prompt to switch
```

### Manual Testing Steps

1. **Clear localStorage**: 
   ```javascript
   localStorage.removeItem('hybe_preferred_language');
   location.reload();
   ```

2. **Check browser language**: 
   ```javascript
   navigator.language
   ```

3. **Verify prompt appears** (if non-Korean)

4. **Accept/Decline and verify** localStorage is set

5. **Reload page** - should remember preference

### Debugging

Add console logs to see what's happening:
```javascript
// In browser console
console.log('Current lang:', languageDetector.currentLang);
console.log('Detected lang:', languageDetector.detectedLang);
console.log('Saved pref:', localStorage.getItem('hybe_preferred_language'));
console.log('Browser lang:', navigator.language);
```

### Troubleshooting

**Prompt not showing?**
- Check if browser language is Korean
- Check if localStorage already has a preference
- Check browser console for errors

**Wrong language detected?**
- Verify browser language settings
- IP detection may fail (timeout, blocked API)
- Check supported languages list

**Preference not saved?**
- Check if localStorage is enabled
- Check if browser is in incognito/private mode

### Production Deployment

No special configuration needed - works out of the box!

**Netlify**: Automatically deploys with build
**Docker**: Included in containerized build
**Kubernetes**: Static assets served via CDN

### Performance Considerations

- IP detection has 3-second timeout (won't block page load)
- Detection runs asynchronously after page renders
- Prompt shows with 500ms delay for smooth UX
- localStorage check is synchronous and instant

### Security Notes

- IP detection uses HTTPS endpoint (ipapi.co)
- No personal data stored - only language preference code
- Complies with GDPR (no consent needed for functional cookie)
