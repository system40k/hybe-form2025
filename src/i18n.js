// src/i18n.js

// Default Language
export const DEFAULT_LANG = 'ko';

// Supported Languages
export const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'];

// Translation Dictionary
export const translations = {
  ko: {
    appTitle: "HYBE 팬 허가증",
    verifyEmail: "이메일 인증",
    enterCode: "6자리 인증코드를 입력하세요",
    sendCode: "인증코드 발송",
    resendCode: "코드 재전송",
    verifying: "확인 중...",
    verified: "인증 완료",
    submitForm: "제출하기",
    formProtected: "이 양식은 이메일 인증이 필요합니다.",
    changeLanguage: "언어 변경",
    detectedLangPrompt: "감지된 언어로 변경하시겠습니까?",
    yes: "예",
    no: "아니요",
    emailPlaceholder: "이메일 주소 입력",
    invalidEmail: "유효하지 않은 이메일입니다",
    invalidCode: "유효하지 않은 코드입니다",
    codeExpired: "코드가 만료되었습니다",
    maxAttempts: "시도 횟수를 초과했습니다",
    successTitle: "성공!",
    successMessage: "이메일이 인증되었습니다.",
    redirecting: "리디렉션 중..."
  },
  en: {
    appTitle: "HYBE Fan Permit",
    verifyEmail: "Verify Email",
    enterCode: "Enter 6-digit verification code",
    sendCode: "Send Code",
    resendCode: "Resend Code",
    verifying: "Verifying...",
    verified: "Verified",
    submitForm: "Submit Form",
    formProtected: "This form requires email verification.",
    changeLanguage: "Change Language",
    detectedLangPrompt: "Switch to your detected language?",
    yes: "Yes",
    no: "No",
    emailPlaceholder: "Enter email address",
    invalidEmail: "Invalid email address",
    invalidCode: "Invalid code",
    codeExpired: "Code expired",
    maxAttempts: "Max attempts exceeded",
    successTitle: "Success!",
    successMessage: "Your email has been verified.",
    redirecting: "Redirecting..."
  },
  ja: {
    appTitle: "HYBE ファン許可証",
    verifyEmail: "メール認証",
    enterCode: "6桁の認証コードを入力してください",
    sendCode: "コードを送信",
    resendCode: "コードを再送信",
    verifying: "確認中...",
    verified: "認証済み",
    submitForm: "送信する",
    formProtected: "このフォームはメール認証が必要です。",
    changeLanguage: "言語を変更",
    detectedLangPrompt: "検出された言語に切り替えますか？",
    yes: "はい",
    no: "いいえ",
    emailPlaceholder: "メールアドレスを入力",
    invalidEmail: "無効なメールアドレス",
    invalidCode: "無効なコード",
    codeExpired: "コードの有効期限が切れました",
    maxAttempts: "試行回数を超過しました",
    successTitle: "成功！",
    successMessage: "メールが認証されました。",
    redirecting: "リダイレクト中..."
  },
  'zh-CN': {
    appTitle: "HYBE 粉丝许可证",
    verifyEmail: "验证电子邮件",
    enterCode: "输入 6 位验证码",
    sendCode: "发送代码",
    resendCode: "重发代码",
    verifying: "验证中...",
    verified: "已验证",
    submitForm: "提交表格",
    formProtected: "此表单需要电子邮件验证。",
    changeLanguage: "更改语言",
    detectedLangPrompt: "切换到检测到的语言？",
    yes: "是",
    no: "否",
    emailPlaceholder: "输入电子邮件地址",
    invalidEmail: "无效的电子邮件地址",
    invalidCode: "无效代码",
    codeExpired: "代码已过期",
    maxAttempts: "超过最大尝试次数",
    successTitle: "成功！",
    successMessage: "您的电子邮件已验证。",
    redirecting: "重定向中..."
  },
  'zh-TW': {
    appTitle: "HYBE 粉絲許可證",
    verifyEmail: "驗證電子郵件",
    enterCode: "輸入 6 位驗證碼",
    sendCode: "發送代碼",
    resendCode: "重發代碼",
    verifying: "驗證中...",
    verified: "已驗證",
    submitForm: "提交表格",
    formProtected: "此表單需要電子郵件驗證。",
    changeLanguage: "更改語言",
    detectedLangPrompt: "切換到檢測到的語言？",
    yes: "是",
    no: "否",
    emailPlaceholder: "輸入電子郵件地址",
    invalidEmail: "無效的電子郵件地址",
    invalidCode: "無效代碼",
    codeExpired: "代碼已過期",
    maxAttempts: "超過最大嘗試次數",
    successTitle: "成功！",
    successMessage: "您的電子郵件已驗證。",
    redirecting: "重定向中..."
  }
};

// Detect User Language
export function detectUserLanguage() {
  // 1. Check URL parameter (?lang=en)
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
    return urlLang;
  }

  // 2. Check LocalStorage
  const storedLang = localStorage.getItem('hybe_lang');
  if (storedLang && SUPPORTED_LANGS.includes(storedLang)) {
    return storedLang;
  }

  // 3. Check Browser Navigator
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    // Handle variants like 'en-US' -> 'en'
    const shortLang = browserLang.split('-')[0];
    if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;
    if (SUPPORTED_LANGS.includes(shortLang)) return shortLang;
    
    // Map specific regions if needed (e.g., zh-HK -> zh-TW)
    if (shortLang === 'zh') {
      return browserLang.includes('HK') || browserLang.includes('TW') ? 'zh-TW' : 'zh-CN';
    }
  }

  return DEFAULT_LANG;
}

// Get Translation Helper
export function t(key, lang = DEFAULT_LANG) {
  return translations[lang]?.[key] || translations[DEFAULT_LANG][key] || key;
}

// Apply Translations to DOM
export function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const text = t(key, lang);
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      if (element.getAttribute('placeholder')) {
        element.placeholder = text;
      } else {
        element.value = text;
      }
    } else {
      element.textContent = text;
    }
  });

  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Save preference
  localStorage.setItem('hybe_lang', lang);
}
