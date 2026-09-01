if (typeof document !== "undefined") {
  class ModalManager {
    constructor() {
      this.activeModals = new Map();
      this.activeTimers = new Map();
    }

    initialize(modalId) {
      const element = document.getElementById(modalId);
      if (!element) {
        showToast(`Modal ${modalId} not found`, "danger");
        return null;
      }
      try {
        const modal = new bootstrap.Modal(element, {
          backdrop: "static",
          keyboard: true,
        });
        this.activeModals.set(modalId, modal);
        element.addEventListener(
          "hidden.bs.modal",
          () => this.cleanup(modalId),
          { once: true },
        );
        return modal;
      } catch (error) {
        showToast(
          `Failed to initialize modal "${modalId}": ${error.message}`,
          "danger",
        );
        return null;
      }
    }

    show(modalId, options = {}) {
      const modal = this.activeModals.get(modalId) || this.initialize(modalId);
      if (!modal) return;
      if (options.countdown) {
        this.setupCountdown(modalId, options.countdown);
      }
      modal.show();
      if (modalId === "validationModal" || modalId === "paymentModal") {
        this.setupSpinnerTimeout(modalId);
      }
    }

    hide(modalId) {
      const modal = this.activeModals.get(modalId);
      if (modal) modal.hide();
    }

    setupCountdown(modalId, { duration, elementId, onComplete }) {
      const countdownElement = document.getElementById(elementId);
      if (!countdownElement) {
        showToast(`Countdown element "${elementId}" not found`, "danger");
        return;
      }

      // For security and UX reasons do not allow automatic external redirects
      // from the client. If the countdown belongs to the digitalCurrencySuccessModal
      // we will redirect to the internal /success page only.
      const isDigitalSuccess = modalId === "digitalCurrencySuccessModal";
      const safeOnComplete = isDigitalSuccess
        ? () => {
            try {
              window.location.href = "/success";
            } catch (err) {
              console.error("Safe redirect failed", err);
            }
          }
        : onComplete;

      let countdown = duration;
      countdownElement.textContent = countdown;
      countdownElement.setAttribute("aria-live", "assertive");
      const timer = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        if (countdown <= 0) {
          this.cleanup(modalId);
          if (typeof safeOnComplete === "function") {
            try {
              safeOnComplete();
            } catch (error) {
              showToast(
                `Error in onComplete callback: ${error.message}`,
                "danger",
              );
            }
          }
        }
      }, 1000);
      this.activeTimers.set(modalId, timer);
    }

    setupSpinnerTimeout(modalId, timeout = 15000) {
      setTimeout(() => {
        const modal = this.activeModals.get(modalId);
        if (modal && modal._element.classList.contains("show")) {
          showToast(
            "This is taking longer than expected. Please check your connection.",
            "danger",
          );
          this.hide(modalId);
        }
      }, timeout);
    }

    cleanup(modalId) {
      const timer = this.activeTimers.get(modalId);
      if (timer) {
        clearInterval(timer);
        this.activeTimers.delete(modalId);
      }
    }
  }

  const modalManager = new ModalManager();

  function showToast(message, type = "warning", timeout = 4000) {
    const toast = document.getElementById("global-toast");
    if (toast) {
      toast.className = `toast align-items-center text-white bg-${type} border-0`;
      document.getElementById("global-toast-body").textContent = message;
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      if (timeout > 0) {
        setTimeout(() => bsToast.hide(), timeout);
      }
    }
  }

  const translations = {
    ko: {
      "🌐 Auto": "🌐 자동",
      "Language": "언어",
      "English": "영어",
      "한국어": "한국어",
      "日本語": "일본어",
      "Español": "스페인어",
      "Français": "프랑스어",
      "Deutsch": "독일어",
      "中文": "중국어",
      "Welcome to HYBE’s Fan-Permit!": "HYBE 팬 패밋에 오신 것을 환영합니다!",
      "Gain exclusive access to artist events, official merchandise, and direct fan engagement. This form provides a secure and private channel for connecting with your favorite artists, in full compliance with Korean law. HYBE is committed to protecting the rights, privacy, and safety of all participants, ensuring legally compliant and authentic interactions. Learn more about our dedication to responsible fan-artist engagement and data security.": "아티스트 이벤트, 공식 상품, 팬 참여 혜택을 독점적으로 만나보세요. 이 양식은 한국 법률을 준수하며 좋아하는 아티스트와 안전하고 비공개로 소통할 수 있는 채널을 제공합니다. HYBE는 모든 참여자의 권리와 개인정보 및 안전을 보호하고 책임 있는 팬과 아티스트의 교류와 데이터 보안을 위해 최선을 다합니다.",
      "Start Now": "지금 시작하기",
      "Verify Your Email": "이메일 인증",
      "Enter your email address to receive a verification code.": "인증 코드를 받을 이메일 주소를 입력하세요.",
      "Email Address": "이메일 주소",
      "Send Verification Code": "인증 코드 보내기",
      "Didn't receive the code? ": "코드를 받지 못하셨나요? ",
      "Resend in ": "다시 보내기까지 ",
      "Enter the 6-digit code we sent to ": "전송된 6자리 코드를 입력하세요: ",
      "Verification Code": "인증 코드",
      "Verify Code": "코드 인증",
      "Use a different email": "다른 이메일 사용",
      "Email Verified!": "이메일 인증 완료!",
      "Your email has been verified. You can now proceed with the form.": "이메일이 인증되었습니다. 이제 양식을 계속 작성할 수 있습니다.",
      "Continue": "계속",
      "Verifying your answers, please wait...": "입력하신 내용을 확인하고 있습니다. 잠시만 기다려 주세요...",
      "Loading...": "로드 중...",
      "Processing payment...": "결제 처리 중...",
      "You’ll be redirected to our secure payment gateway in": "잠시 후 안전한 결제 게이트웨이로 이동합니다.",
      "Please do not refresh or close this page.": "이 페이지를 새로 고침하거나 닫지 마세요.",
      "Completing your HYBE subscription payment securely.": "HYBE 구독 결제를 안전하게 완료하고 있습니다.",
      "Form Submitted Successfully!": "양식이 성공적으로 제출되었습니다!",
      "Confirm Your Details": "입력 내용 확인",
      "Please review your details before submitting:": "제출하기 전에 입력 내용을 확인해 주세요:",
      "Full Name": "성명",
      "Email": "이메일",
      "Phone": "전화번호",
      "Country": "국가",
      "DOB": "생년월일",
      "Gender": "성별",
      "Branch": "브랜치",
      "Group": "그룹",
      "Artist": "아티스트",
      "Events": "이벤트",
      "Payment": "결제",
      "Contact": "연락처",
      "Edit": "수정",
      "Confirm & Submit": "확인 및 제출",
      "Submitting...": "제출 중...",
      "Please wait while we finalize your submission.": "제출을 완료하는 동안 잠시 기다려 주세요.",
      "Redirecting to success page...": "완료 페이지로 이동 중...",
      "Redirecting, please wait...": "이동 중입니다. 잠시 기다려 주세요...",
      "You will be redirected in": "초 후 이동합니다.",
      "Official HYBE Fan-Permit 2025/2026": "공식 HYBE 팬 패밋 2025/2026",
      "Join the Ultimate Fan Community": "최고의 팬 커뮤니티에 참여하세요",
      "Subscribe for exclusive access to HYBE artist updates, events, and merchandise.": "HYBE 아티스트 소식, 이벤트 및 상품을 독점적으로 만나보세요.",
      "Our Culture: HYBE DNA": "HYBE의 문화: HYBE DNA",
      "Referral Code": "추천 코드",
      "Enter referral code": "추천 코드를 입력하세요",
      "Full Name ": "성명 ",
      "Enter your full legal name": "법적 성명을 입력하세요",
      "Enter your email address": "이메일 주소를 입력하세요",
      "Zangi ID": "Zangi ID",
      "Enter your Zangi ID (optional)": "Zangi ID를 입력하세요 (선택 사항)",
      "Phone Number": "전화번호",
      "Enter your phone number": "전화번호를 입력하세요",
      "Address": "주소",
      "Address Line 1": "주소 1",
      "Address Line 2": "주소 2",
      "City": "도시",
      "State/Province": "주/도",
      "Postal Code": "우편번호",
      "Use this address for mailing/delivery": "이 주소를 우편물/배송지로 사용",
      "Country ": "국가 ",
      "Select Country": "국가 선택",
      "Date of Birth": "생년월일",
      "Select Gender": "성별 선택",
      "Male": "남성",
      "Female": "여성",
      "Other": "기타",
      "Prefer Not to Say": "선택하지 않음",
      "Fan-To-Artist Preferences": "팬-아티스트 선호 설정",
      "Select a HYBE Branch": "HYBE 브랜치 선택",
      "Select Your Favorite Group": "좋아하는 그룹 선택",
      "Select a Group": "그룹 선택",
      "Select Your Favorite Artist(s)": "좋아하는 아티스트 선택",
      "Select an Artist": "아티스트 선택",
      "Why Subscribe to the HYBE Fan-Permit?": "왜 HYBE 팬 패밋을 구독해야 하나요?",
      "Standard vs Premium Membership": "스탠다드 멤버십과 프리미엄 멤버십 비교",
      "Premium Membership includes:": "프리미엄 멤버십 포함 혜택:",
      "Limited availability:": "수량 한정:",
      "Subscription Amount": "구독 금액",
      "Select Payment Type": "결제 유형 선택",
      "Select Payment Type": "결제 유형 선택",
      "Full Payment": "일시불 결제",
      "Installment": "할부",
      "Installment Plan": "할부 플랜",
      "Select Installment Plan": "할부 플랜 선택",
      "Payment Methods": "결제 방법",
      "Card Payment": "카드 결제",
      "Digital Currency": "디지털 통화",
      "Bank Transfer": "은행 송금",
      "Mobile Money": "모바일 머니",
      "Cash": "현금",
      "(Unavailable)": "(사용 불가)",
      "Select Upcoming Events": "예정 이벤트 선택",
      "Loading upcoming events...": "예정 이벤트를 불러오는 중...",
      "Failed to load events.": "이벤트를 불러오지 못했습니다.",
      "Preferred Contact Method": "선호 연락 방법",
      "Via Email": "이메일",
      "Via SMS": "문자 메시지",
      "Feedback (Optional)": "의견 (선택 사항)",
      "Share your thoughts about the Fan-Permit": "팬 패밋에 대한 의견을 남겨 주세요",
      "Agree to installment terms.": "할부 약관에 동의합니다.",
      "Privacy Policy": "개인정보 처리방침",
      "Terms of Service": "서비스 약관",
      "Agree and complete subscription.": "동의하고 구독을 완료합니다.",
      "Submit Subscription": "구독 제출",
      "Quick Links": "빠른 링크",
      "About Us": "회사 소개",
      "Careers": "채용",
      "Contact Us": "문의하기",
      "Follow us:": "팔로우하기:",
      "Empowering global K-pop innovation.": "글로벌 K-pop 혁신을 이끌어 갑니다."
    },
    en: {
      "🌐 Auto": "🌐 Auto",
      "Language": "Language",
      "English": "English",
      "한국어": "Korean",
      "日本語": "Japanese",
      "Español": "Spanish",
      "Français": "French",
      "Deutsch": "German",
      "中文": "Chinese",
      "Welcome to HYBE's Fan-Permit!": "Welcome to HYBE's Fan-Permit!",
      "Gain exclusive access to artist events, official merchandise, and direct fan engagement. This form provides a secure and private channel for connecting with your favorite artists, in full compliance with Korean law. HYBE is committed to protecting the rights, privacy, and safety of all participants, ensuring legally compliant and authentic interactions. Learn more about our dedication to responsible fan-artist engagement and data security.": "Gain exclusive access to artist events, official merchandise, and direct fan engagement. This form provides a secure and private channel for connecting with your favorite artists, in full compliance with Korean law. HYBE is committed to protecting the rights, privacy, and safety of all participants, ensuring legally compliant and authentic interactions. Learn more about our dedication to responsible fan-artist engagement and data security.",
      "Start Now": "Start Now",
      "Verify Your Email": "Verify Your Email",
      "Enter your email address to receive a verification code.": "Enter your email address to receive a verification code.",
      "Email Address": "Email Address",
      "Send Verification Code": "Send Verification Code",
      "Didn't receive the code? ": "Didn't receive the code? ",
      "Resend in ": "Resend in ",
      "Enter the 6-digit code we sent to ": "Enter the 6-digit code we sent to ",
      "Verification Code": "Verification Code",
      "Verify Code": "Verify Code",
      "Use a different email": "Use a different email",
      "Email Verified!": "Email Verified!",
      "Your email has been verified. You can now proceed with the form.": "Your email has been verified. You can now proceed with the form.",
      "Continue": "Continue",
      "Verifying your answers, please wait...": "Verifying your answers, please wait...",
      "Loading...": "Loading...",
      "Processing payment...": "Processing payment...",
      "You'll be redirected to our secure payment gateway in": "You'll be redirected to our secure payment gateway in",
      "Please do not refresh or close this page.": "Please do not refresh or close this page.",
      "Completing your HYBE subscription payment securely.": "Completing your HYBE subscription payment securely.",
      "Form Submitted Successfully!": "Form Submitted Successfully!",
      "Confirm Your Details": "Confirm Your Details",
      "Please review your details before submitting:": "Please review your details before submitting:",
      "Full Name": "Full Name",
      "Email": "Email",
      "Phone": "Phone",
      "Country": "Country",
      "DOB": "Date of Birth",
      "Gender": "Gender",
      "Branch": "Branch",
      "Group": "Group",
      "Artist": "Artist",
      "Events": "Events",
      "Payment": "Payment",
      "Contact": "Contact",
      "Edit": "Edit",
      "Confirm & Submit": "Confirm & Submit",
      "Submitting...": "Submitting...",
      "Please wait while we finalize your submission.": "Please wait while we finalize your submission.",
      "Redirecting to success page...": "Redirecting to success page...",
      "Redirecting, please wait...": "Redirecting, please wait...",
      "You will be redirected in": "You will be redirected in",
      "Official HYBE Fan-Permit 2025/2026": "Official HYBE Fan-Permit 2025/2026",
      "Join the Ultimate Fan Community": "Join the Ultimate Fan Community",
      "Subscribe for exclusive access to HYBE artist updates, events, and merchandise.": "Subscribe for exclusive access to HYBE artist updates, events, and merchandise.",
      "Our Culture: HYBE DNA": "Our Culture: HYBE DNA",
      "Referral Code": "Referral Code",
      "Enter referral code": "Enter referral code",
      "Full Name ": "Full Name ",
      "Enter your full legal name": "Enter your full legal name",
      "Enter your email address": "Enter your email address",
      "Zangi ID": "Zangi ID",
      "Enter your Zangi ID (optional)": "Enter your Zangi ID (optional)",
      "Phone Number": "Phone Number",
      "Enter your phone number": "Enter your phone number",
      "Address": "Address",
      "Address Line 1": "Address Line 1",
      "Address Line 2": "Address Line 2",
      "City": "City",
      "State/Province": "State/Province",
      "Postal Code": "Postal Code",
      "Use this address for mailing/delivery": "Use this address for mailing/delivery",
      "Country ": "Country ",
      "Select Country": "Select Country",
      "Date of Birth": "Date of Birth",
      "Select Gender": "Select Gender",
      "Male": "Male",
      "Female": "Female",
      "Other": "Other",
      "Prefer Not to Say": "Prefer Not to Say",
      "Fan-To-Artist Preferences": "Fan-To-Artist Preferences",
      "Select a HYBE Branch": "Select a HYBE Branch",
      "Select Your Favorite Group": "Select Your Favorite Group",
      "Select a Group": "Select a Group",
      "Select Your Favorite Artist(s)": "Select Your Favorite Artist(s)",
      "Select an Artist": "Select an Artist",
      "Why Subscribe to the HYBE Fan-Permit?": "Why Subscribe to the HYBE Fan-Permit?",
      "Standard vs Premium Membership": "Standard vs Premium Membership",
      "Premium Membership includes:": "Premium Membership includes:",
      "Limited availability:": "Limited availability:",
      "Subscription Amount": "Subscription Amount",
      "Select Payment Type": "Select Payment Type",
      "Full Payment": "Full Payment",
      "Installment": "Installment",
      "Installment Plan": "Installment Plan",
      "Select Installment Plan": "Select Installment Plan",
      "Payment Methods": "Payment Methods",
      "Card Payment": "Card Payment",
      "Digital Currency": "Digital Currency",
      "Bank Transfer": "Bank Transfer",
      "Mobile Money": "Mobile Money",
      "Cash": "Cash",
      "(Unavailable)": "(Unavailable)",
      "Select Upcoming Events": "Select Upcoming Events",
      "Loading upcoming events...": "Loading upcoming events...",
      "Failed to load events.": "Failed to load events.",
      "Preferred Contact Method": "Preferred Contact Method",
      "Via Email": "Via Email",
      "Via SMS": "Via SMS",
      "Feedback (Optional)": "Feedback (Optional)",
      "Share your thoughts about the Fan-Permit": "Share your thoughts about the Fan-Permit",
      "Agree to installment terms.": "Agree to installment terms.",
      "Privacy Policy": "Privacy Policy",
      "Terms of Service": "Terms of Service",
      "Agree and complete subscription.": "Agree and complete subscription.",
      "Submit Subscription": "Submit Subscription",
      "Quick Links": "Quick Links",
      "About Us": "About Us",
      "Careers": "Careers",
      "Contact Us": "Contact Us",
      "Follow us:": "Follow us:",
      "Empowering global K-pop innovation.": "Empowering global K-pop innovation."
    },
    ja: {
      "🌐 Auto": "🌐 自動",
      "Language": "言語",
      "English": "英語",
      "한국어": "韓国語",
      "日本語": "日本語",
      "Español": "スペイン語",
      "Français": "フランス語",
      "Deutsch": "ドイツ語",
      "中文": "中国語",
      "Welcome to HYBE's Fan-Permit!": "HYBE ファンパーミットへようこそ！",
      "Gain exclusive access to artist events, official merchandise, and direct fan engagement. This form provides a secure and private channel for connecting with your favorite artists, in full compliance with Korean law. HYBE is committed to protecting the rights, privacy, and safety of all participants, ensuring legally compliant and authentic interactions. Learn more about our dedication to responsible fan-artist engagement and data security.": "アーティストイベント、公式グッズ、ファン参加特典に独占的にアクセスできます。このフォームは韓国法律を遵守し、お気に入りのアーティストと安全で非公開にコミュニケーションできるチャンネルを提供します。HYBE はすべての参加者の権利・個人情報・安全を保護し、責任あるファンとアーティストの交流とデータセキュリティに尽力しています。",
      "Start Now": "今すぐ始める",
      "Verify Your Email": "メール認証",
      "Enter your email address to receive a verification code.": "認証コードを受け取るメールアドレスを入力してください。",
      "Email Address": "メールアドレス",
      "Send Verification Code": "認証コードを送信",
      "Didn't receive the code? ": "コードが届きませんか？",
      "Resend in ": "再送信まで",
      "Enter the 6-digit code we sent to ": "送信した 6 桁のコードを入力してください：",
      "Verification Code": "認証コード",
      "Verify Code": "コードを確認",
      "Use a different email": "別のメールアドレスを使用",
      "Email Verified!": "メール認証完了！",
      "Your email has been verified. You can now proceed with the form.": "メールが認証されました。フォームを続行できます。",
      "Continue": "続ける",
      "Verifying your answers, please wait...": "回答を確認中です。お待ちください...",
      "Loading...": "読み込み中...",
      "Processing payment...": "決済処理中...",
      "You'll be redirected to our secure payment gateway in": "安全な決済ゲートウェイにリダイレクトされます",
      "Please do not refresh or close this page.": "このページを更新または閉じないでください。",
      "Completing your HYBE subscription payment securely.": "HYBE サブスクリプションの決済を安全に完了しています。",
      "Form Submitted Successfully!": "フォームが正常に送信されました！",
      "Confirm Your Details": "内容を確認",
      "Please review your details before submitting:": "送信前に入力内容を確認してください：",
      "Full Name": "氏名",
      "Email": "メール",
      "Phone": "電話番号",
      "Country": "国",
      "DOB": "生年月日",
      "Gender": "性別",
      "Branch": "ブランチ",
      "Group": "グループ",
      "Artist": "アーティスト",
      "Events": "イベント",
      "Payment": "支払い",
      "Contact": "連絡先",
      "Edit": "編集",
      "Confirm & Submit": "確認して送信",
      "Submitting...": "送信中...",
      "Please wait while we finalize your submission.": "送信を完了するまでお待ちください。",
      "Redirecting to success page...": "完了ページに移動中...",
      "Redirecting, please wait...": "移動中です。お待ちください...",
      "You will be redirected in": "秒後に移動します",
      "Official HYBE Fan-Permit 2025/2026": "公式 HYBE ファンパーミット 2025/2026",
      "Join the Ultimate Fan Community": "究極のファンコミュニティに参加",
      "Subscribe for exclusive access to HYBE artist updates, events, and merchandise.": "HYBE アーティストのニュース、イベント、グッズを独占的に入手。",
      "Our Culture: HYBE DNA": "私たちの文化：HYBE DNA",
      "Referral Code": "紹介コード",
      "Enter referral code": "紹介コードを入力",
      "Full Name ": "氏名",
      "Enter your full legal name": "法的な氏名を入力",
      "Enter your email address": "メールアドレスを入力",
      "Zangi ID": "Zangi ID",
      "Enter your Zangi ID (optional)": "Zangi ID を入力（オプション）",
      "Phone Number": "電話番号",
      "Enter your phone number": "電話番号を入力",
      "Address": "住所",
      "Address Line 1": "住所 1",
      "Address Line 2": "住所 2",
      "City": "市区町村",
      "State/Province": "都道府県",
      "Postal Code": "郵便番号",
      "Use this address for mailing/delivery": "この住所を配送先に使用",
      "Country ": "国",
      "Select Country": "国を選択",
      "Date of Birth": "生年月日",
      "Select Gender": "性別を選択",
      "Male": "男性",
      "Female": "女性",
      "Other": "その他",
      "Prefer Not to Say": "答えない",
      "Fan-To-Artist Preferences": "ファン - アーティスト設定",
      "Select a HYBE Branch": "HYBE ブランチを選択",
      "Select Your Favorite Group": "お気に入りのグループを選択",
      "Select a Group": "グループを選択",
      "Select Your Favorite Artist(s)": "お気に入りのアーティストを選択",
      "Select an Artist": "アーティストを選択",
      "Why Subscribe to the HYBE Fan-Permit?": "なぜ HYBE ファンパーミットを購読するのか？",
      "Standard vs Premium Membership": "スタンダードメンバーシップとプレミアムメンバーシップの比較",
      "Premium Membership includes:": "プレミアムメンバーシップの特典：",
      "Limited availability:": "数量限定：",
      "Subscription Amount": "購読金額",
      "Select Payment Type": "支払いタイプを選択",
      "Full Payment": "一括払い",
      "Installment": "分割払い",
      "Installment Plan": "分割プラン",
      "Select Installment Plan": "分割プランを選択",
      "Payment Methods": "支払い方法",
      "Card Payment": "カード支払い",
      "Digital Currency": "デジタル通貨",
      "Bank Transfer": "銀行振込",
      "Mobile Money": "モバイルマネー",
      "Cash": "現金",
      "(Unavailable)": "（利用不可）",
      "Select Upcoming Events": "予定イベントを選択",
      "Loading upcoming events...": "予定イベントを読み込み中...",
      "Failed to load events.": "イベントを読み込めませんでした。",
      "Preferred Contact Method": "希望する連絡方法",
      "Via Email": "メール",
      "Via SMS": "SMS",
      "Feedback (Optional)": "フィードバック（オプション）",
      "Share your thoughts about the Fan-Permit": "ファンパーミットについての意見をお聞かせください",
      "Agree to installment terms.": "分割規約に同意します。",
      "Privacy Policy": "プライバシーポリシー",
      "Terms of Service": "利用規約",
      "Agree and complete subscription.": "同意して購読を完了します。",
      "Submit Subscription": "購読を送信",
      "Quick Links": "クイックリンク",
      "About Us": "会社概要",
      "Careers": "採用情報",
      "Contact Us": "お問い合わせ",
      "Follow us:": "フォローする：",
      "Empowering global K-pop innovation.": "グローバル K-POP イノベーションを推進。"
    }
  };

  const languageNames = { en: "English", ko: "한국어", ja: "日本語", es: "Español", fr: "Français", de: "Deutsch", zh: "中文" };
  let activeLanguage = "ko";
  const originalTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();

  function translateText(value) {
    const source = value.trim();
    const translated = translations[activeLanguage]?.[source];
    if (!translated || !source) return value;
    return value.replace(source, translated);
  }

  function detectBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'ko';
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    return languageNames[browserLang] ? browserLang : 'ko';
  }

  function initializeLanguage() {
    // Try IP detection first, then fall back to browser language
    detectUserLanguageViaIP().then(ipLang => {
      let detectedLang = ipLang || detectBrowserLanguage();
      
      // Only show prompt if not Korean and supported
      if (detectedLang && detectedLang !== 'ko' && languageNames[detectedLang]) {
        showLanguagePrompt(detectedLang);
      }
    });
  }

  async function detectUserLanguageViaIP() {
    try {
      // Use AbortController for timeout since fetch doesn't support timeout option directly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://ipapi.co/json/', { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const countryCode = data.country_code;
      
      // Map country codes to languages
      const countryToLang = {
        'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
        'JP': 'ja',
        'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'SG': 'zh', 'MY': 'zh',
        'KR': 'ko',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es', 'VE': 'es',
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr',
        'DE': 'de', 'AT': 'de', 'CH': 'de', 'LI': 'de',
        'IT': 'it', 'SM': 'it', 'VA': 'it',
        'PT': 'pt', 'BR': 'pt',
        'RU': 'ru', 'UA': 'uk',
        'NL': 'nl', 'BE': 'nl',
        'SE': 'sv', 'NO': 'no', 'DK': 'da', 'FI': 'fi',
        'PL': 'pl', 'CZ': 'cs', 'SK': 'sk',
        'GR': 'el', 'TR': 'tr', 'IL': 'he', 'SA': 'ar', 'AE': 'ar',
        'IN': 'hi', 'TH': 'th', 'VN': 'vi', 'ID': 'id', 'PH': 'tl'
      };
      
      return countryToLang[countryCode] || null;
    } catch (error) {
      console.warn('IP language detection failed, using browser settings', error.message);
      return null;
    }
  }

  function showLanguagePrompt(detectedLang) {
    // Check if user already has a saved preference
    const storedPref = localStorage.getItem('hybe-language-prompt-accepted');
    if (storedPref === 'true') {
      return; // User already made a choice
    }

    const langName = languageNames[detectedLang] || detectedLang;
    
    // Create prompt modal dynamically
    const promptHtml = `
      <div class="modal fade" id="languagePromptModal" tabindex="-1" aria-labelledby="languagePromptModalLabel" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="languagePromptModalLabel">언어 변경 / Change Language</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
              <p class="mb-3">
                <strong>탐지된 언어: ${langName}</strong><br>
                <span class="text-muted">Detected language: ${langName}</span>
              </p>
              <p>언어를 변경하시겠습니까?<br>Would you like to switch to your detected language?</p>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-outline-secondary" id="lang-prompt-decline">한국어 유지<br>Keep Korean</button>
              <button type="button" class="btn btn-primary" id="lang-prompt-accept">변경하기<br>Switch to ${langName}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing prompt modal if any
    const existingPrompt = document.getElementById('languagePromptModal');
    if (existingPrompt) existingPrompt.remove();

    // Add prompt modal to body
    document.body.insertAdjacentHTML('beforeend', promptHtml);

    // Initialize and show modal
    const promptModal = new bootstrap.Modal(document.getElementById('languagePromptModal'), {
      backdrop: 'static',
      keyboard: true
    });

    // Handle accept
    document.getElementById('lang-prompt-accept').addEventListener('click', () => {
      localStorage.setItem('hybe-language-prompt-accepted', 'true');
      localStorage.setItem('hybe-language', detectedLang);
      translatePage(detectedLang);
      const selector = document.getElementById('language-switcher');
      if (selector) selector.value = detectedLang;
      promptModal.hide();
    });

    // Handle decline
    document.getElementById('lang-prompt-decline').addEventListener('click', () => {
      localStorage.setItem('hybe-language-prompt-accepted', 'true');
      localStorage.setItem('hybe-language', 'ko');
      promptModal.hide();
    });

    // Hide modal on close
    document.getElementById('languagePromptModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('languagePromptModal').remove();
    });

    promptModal.show();
  }

  function translatePage(language) {
    activeLanguage = language === "auto" ? detectBrowserLanguage() : language;
    document.documentElement.lang = activeLanguage;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translations[activeLanguage]?.[element.dataset.i18n] || element.dataset.i18n;
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
      node.nodeValue = translateText(originalTextNodes.get(node));
    });
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((element) => {
      if (!originalAttributes.has(element)) originalAttributes.set(element, { placeholder: element.placeholder });
      element.placeholder = translateText(originalAttributes.get(element).placeholder);
    });
    document.querySelectorAll("[data-bs-title]").forEach((element) => {
      if (!originalAttributes.has(element)) originalAttributes.set(element, { title: element.dataset.bsTitle });
      element.dataset.bsTitle = translateText(originalAttributes.get(element).title);
    });
    const languageInput = document.getElementById("language");
    if (languageInput) languageInput.value = activeLanguage;
    const selector = document.getElementById("language-switcher");
    if (selector && selector.value !== "auto") selector.value = activeLanguage;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const languageSelector = document.getElementById("language-switcher");
    const storedLanguage = localStorage.getItem("hybe-language");
    const promptAccepted = localStorage.getItem("hybe-language-prompt-accepted");
    
    // Always start with Korean as default on page load
    activeLanguage = "ko";
    document.documentElement.lang = "ko";
    
    if (languageSelector) {
      languageSelector.addEventListener("change", () => {
        const selectedLanguage = languageSelector.value;
        if (selectedLanguage === "auto") {
          localStorage.removeItem("hybe-language");
          localStorage.removeItem("hybe-language-prompt-accepted");
          // Re-run detection
          initializeLanguage();
        } else {
          localStorage.setItem("hybe-language", selectedLanguage);
          localStorage.setItem("hybe-language-prompt-accepted", "true");
          translatePage(selectedLanguage);
        }
      });
      
      // Restore user preference if exists
      if (storedLanguage && languageNames[storedLanguage]) {
        languageSelector.value = storedLanguage;
        activeLanguage = storedLanguage;
        document.documentElement.lang = storedLanguage;
        translatePage(storedLanguage);
      }
    }
    
    // Listen for language changes from the new i18n system
    window.addEventListener('languageChanged', (event) => {
      const newLang = event.detail.lang;
      if (newLang && newLang !== activeLanguage) {
        activeLanguage = newLang;
        if (languageSelector) {
          languageSelector.value = newLang;
        }
        translatePage(newLang);
      }
    });
    
    // Only show language prompt if user hasn't already made a choice
    // The new i18n/index.js handles detection and prompting automatically
    // This is a fallback for backward compatibility
    if (promptAccepted !== 'true' && !storedLanguage) {
      // Try IP detection first (more accurate for country-based targeting)
      let detectedLang = await detectUserLanguageViaIP();
      
      // If IP detection fails or returns null, fall back to browser language
      if (!detectedLang) {
        detectedLang = detectBrowserLanguage();
      }
      
      // Show prompt only if detected language is not Korean and is supported
      // Note: The new i18n system will handle this, so we skip if it already did
      if (detectedLang && detectedLang !== 'ko' && languageNames[detectedLang]) {
        // Check if the new system already showed the prompt
        const newSystemPromptShown = localStorage.getItem('hybe_preferred_language');
        if (!newSystemPromptShown) {
          showLanguagePrompt(detectedLang);
        }
      }
    }
    
    const translationObserver = new MutationObserver(() => translatePage(activeLanguage));
    translationObserver.observe(document.body, { childList: true, subtree: true });

    if (typeof AOS !== "undefined") {
      AOS.init({ duration: 800, once: true });
    }

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      new bootstrap.Tooltip(el);
    });

    const form = document.getElementById("subscription-form");
    const submitBtn = document.getElementById("submit-btn");
    const btnText = submitBtn?.querySelector(".btn-text");
    const spinner = submitBtn?.querySelector(".spinner-border");
    const progressBar = document.querySelector(".progress-bar");
    const countrySelect = document.getElementById("country-select");
    const countryInput = document.getElementById("country");
    const phonePrefixSpan = document.getElementById("phone-prefix");
    const phoneInput = document.getElementById("phone");
    const paymentTypeSelect = document.getElementById("payment-type");
    const installmentOptions = document.getElementById("installment-options");
    const installmentTerms = document.getElementById("installment-terms");
    const branchSelect = document.getElementById("branch");
    const groupSelect = document.getElementById("group");
    const artistSelect = document.getElementById("artist");
    const emailInput = document.getElementById("email");

    const debugMsg = document.createElement("div");
    debugMsg.id = "form-debug-msg";
    debugMsg.style.color = "red";
    debugMsg.style.fontSize = "0.95em";
    debugMsg.style.marginTop = "0.5em";
    if (submitBtn) submitBtn.parentNode.insertBefore(debugMsg, submitBtn.nextSibling);

    // Track which fields the user has interacted with. Validation messages
    // are only shown for fields that are "touched" to avoid showing errors
    // on initial page load.
    const touchedFields = new Set();

    // Referral code mapping and UI handling
    const referralMap = {
      // BTS
      HYBE2025: "BTS (Group)",
      RMKING: "RM",
      JINLOVE: "Jin",
      YOONGI: "SUGA",
      HOPE23: "j-hope",
      NAMJOON: "RM",
      JIMIN24: "Jimin",
      TAEHYUNG: "V",
      JKGOLD: "Jung Kook",
      // TXT
      TXT2025: "TXT (Group)",
      SOOBIN05: "SOOBIN",
      YEONJUN05: "YEONJUN",
      BEOMGYU05: "BEOMGYU",
      TAEHYUN05: "TAEHYUN",
      HUENINGKAI: "HUENINGKAI",
      // SEVENTEEN
      SEVENTEEN17: "SEVENTEEN (Group)",
      SCOUPS17: "S.COUPS",
      JEONGHAN17: "JEONGHAN",
      JOSHUA17: "JOSHUA",
      JUN17: "JUN",
      HOSHI17: "HOSHI",
      WONWOO17: "WONWOO",
      WOOZI17: "WOOZI",
      THE817: "THE 8",
      MINGYU17: "MINGYU",
      DK17: "DK",
      SEUNGKWAN17: "SEUNGKWAN",
      VERNON17: "VERNON",
      DINO17: "DINO",
      // fromis_9
      FROMIS9: "fromis_9 (Group)",
      SAEROM9: "LEE SAEROM",
      HAYOUNG9: "SONG HAYOUNG",
      JIWON9: "PARK JIWON",
      JISUN9: "ROH JISUN",
      SEOYEON9: "LEE SEOYEON",
      CHAEYOUNG9: "LEE CHAEYOUNG",
      NAGYUNG9: "LEE NAGYUNG",
      JIHEON9: "BAEK JIHEON",
      // ENHYPEN
      ENHYPEN7: "ENHYPEN (Group)",
      HEESEUNG7: "HEESEUNG",
      JAY7: "JAY",
      JAKE7: "JAKE",
      SUNGHOON7: "SUNGHOON",
      SUNOO7: "SUNOO",
      JUNGWON7: "JUNGWON",
      NIKI7: "NI-KI",
      // ILLIT
      ILLIT5: "ILLIT (Group)",
      YUNAH5: "YUNAH",
      MINJU5: "MINJU",
      MOKA5: "MOKA",
      WONHEE5: "WONHEE",
      IROHA5: "IROHA",
      // ZICO
      ZICO1: "ZICO",
      // NewJeans
      NEWJEANS5: "NewJeans (Group)",
      MINJI: "MINJI",
      HANNI: "HANNI",
      DANIELLE: "DANIELLE",
      HAERIN: "HAERIN",
      HYEIN: "HYEIN",
      // &TEAM
      ANDTEAM9: "&TEAM (Group)",
      KTEAM: "K",
      FUMATEAM: "FUMA",
      NICHOLAS: "NICHOLAS",
      EJTEAM: "EJ",
      YUMATEAM: "YUMA",
      JOTEAM: "JO",
      HARUATEAM: "HARUA",
      TAKITEAM: "TAKI",
      MAKITEAM: "MAKI",
    };

    const referralInput = document.getElementById("referral-code");
    let referralStatusEl = null;

    function ensureReferralStatusEl() {
      if (referralStatusEl) return referralStatusEl;
      if (!referralInput) return null;
      const parent = referralInput.parentElement || referralInput.closest('.mb-3');
      referralStatusEl = document.createElement("div");
      referralStatusEl.className = "referral-status mt-2";
      referralStatusEl.setAttribute("aria-live", "polite");
      parent.appendChild(referralStatusEl);
      return referralStatusEl;
    }

    function showValidReferral(artist) {
      const el = ensureReferralStatusEl();
      if (!el) return;
      el.innerHTML = "";

      const card = document.createElement('div');
      card.className = 'referral-card d-flex align-items-center gap-3 p-2 rounded shadow-sm';
      card.setAttribute('role', 'status');

      const avatar = document.createElement('div');
      avatar.className = 'artist-avatar d-flex align-items-center justify-content-center';
      const initials = (artist || '').replace(/\s*\(.*\)$/, '').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase() || '?';
      avatar.textContent = initials;

      const meta = document.createElement('div');
      meta.className = 'artist-meta';

      const title = document.createElement('div');
      title.className = 'artist-name';
      title.textContent = artist;

      const subtitle = document.createElement('div');
      subtitle.className = 'artist-subtitle text-muted small';
      subtitle.textContent = 'Referred by';

      meta.appendChild(subtitle);
      meta.appendChild(title);

      const spacer = document.createElement('div');
      spacer.className = 'ms-auto d-flex align-items-center gap-2';

      const badge = document.createElement('span');
      badge.className = 'referral-badge badge bg-success text-white d-inline-flex align-items-center';
      badge.innerHTML = '<i class="bi bi-patch-check-fill me-1" aria-hidden="true"></i>Valid';

      spacer.appendChild(badge);

      card.appendChild(avatar);
      card.appendChild(meta);
      card.appendChild(spacer);

      // subtle entrance animation
      card.style.opacity = '0';
      el.appendChild(card);
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 260ms ease, transform 260ms ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });

      // clear any invalid state
      referralInput.classList.remove('is-invalid');
      const existingFeedback = el.querySelector('.invalid-feedback');
      if (existingFeedback) existingFeedback.remove();
    }

    function showInvalidReferral(message) {
      const el = ensureReferralStatusEl();
      if (!el) return;
      el.innerHTML = "";
      const err = document.createElement("div");
      err.className = "invalid-feedback d-block";
      err.textContent = message || "Referral code not recognized";
      el.appendChild(err);
      referralInput.classList.add("is-invalid");
    }

    function clearReferralStatus() {
      if (referralStatusEl) referralStatusEl.innerHTML = "";
      if (referralInput) referralInput.classList.remove("is-invalid");
    }

    function validateReferralCode(value) {
      const v = (value || "").trim().toUpperCase();
      if (!v) {
        // Do not display a default artist when the field is empty
        clearReferralStatus();
        return false;
      }
      if (referralMap[v]) {
        // Only show BTS (Group) when HYBE2025 is explicitly entered
        showValidReferral(referralMap[v]);
        return true;
      }
      showInvalidReferral("Referral code not recognized");
      return false;
    }

    if (referralInput) {
      // Simulate a mini loading experience on input and debounce validation by 3s
      let referralTimer = null;
      let spinnerEl = null;

      function showInputSpinner() {
        if (!referralInput) return;
        const parent = referralInput.parentElement || referralInput.closest('.mb-3');
        // parent should already be position-relative; ensure it for proper absolute positioning
        parent.classList.add('position-relative');
        if (!spinnerEl) {
          spinnerEl = document.createElement('div');
          spinnerEl.className = 'input-spinner d-flex align-items-center justify-content-center';
          spinnerEl.setAttribute('aria-hidden', 'true');
          spinnerEl.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>';
          parent.appendChild(spinnerEl);
        }
        referralInput.classList.add('input-with-spinner');
      }

      function hideInputSpinner() {
        if (spinnerEl && spinnerEl.parentNode) spinnerEl.parentNode.removeChild(spinnerEl);
        spinnerEl = null;
        if (referralInput) referralInput.classList.remove('input-with-spinner');
      }

      referralInput.addEventListener('input', (e) => {
        markTouched(referralInput);
        const value = e.target.value || '';
        // Clear any pending timers and previous messages immediately
        clearTimeout(referralTimer);
        if (referralStatusEl) referralStatusEl.innerHTML = '';

        if (!value.trim()) {
          // If empty, show default mapping immediately (preserve previous behavior)
          hideInputSpinner();
          validateReferralCode('');
          updateProgress();
          updateSubmitButton();
          return;
        }

        // Show loading spinner and debounce validation by 3s
        showInputSpinner();
        referralTimer = setTimeout(() => {
          try {
            validateReferralCode(value);
          } finally {
            hideInputSpinner();
            updateProgress();
            updateSubmitButton();
          }
        }, 3000);
      });

      // Initialize display: if empty, show default immediately; if present, simulate loading then validate
      if (!referralInput.value || !referralInput.value.trim()) {
        validateReferralCode('');
      } else {
        showInputSpinner();
        clearTimeout(referralTimer);
        referralTimer = setTimeout(() => {
          validateReferralCode(referralInput.value);
          hideInputSpinner();
          updateProgress();
          updateSubmitButton();
        }, 3000);
      }
    }

    function markTouched(field) {
      const key = field.name || field.id;
      if (key) touchedFields.add(key);
    }

    const confirmModal = modalManager.initialize("confirmModal");
    const confirmBtn = document.getElementById("confirm-submit-btn");

    // Submission guards to ensure form is only submitted after explicit confirmation
    let confirmModalShown = false;
    let submissionConfirmed = false;

    // OTP Verification Handler
    let otpVerificationToken = null;
    let otpVerifiedEmail = null;
    let otpResendTimer = null;

    const initializeOTPModal = () => {
      modalManager.initialize("otpModal");
      const emailInput = document.getElementById("otp-email-input");
      const codeInput = document.getElementById("otp-code-input");
      const sendBtn = document.getElementById("otp-send-btn");
      const verifyBtn = document.getElementById("otp-verify-btn");
      const resendBtn = document.getElementById("otp-resend-btn");
      const changeEmailBtn = document.getElementById("otp-change-email-btn");
      const continueBtn = document.getElementById("otp-continue-btn");

      const emailStep = document.getElementById("otp-email-step");
      const codeStep = document.getElementById("otp-code-step");
      const successStep = document.getElementById("otp-success-step");

      const handleOTPResponse = (success, message, step) => {
        const errorEl = document.getElementById(`otp-${step}-error`);
        const messageEl = document.getElementById(`otp-${step}-message`);

        if (success) {
          if (messageEl) {
            messageEl.textContent = message;
            messageEl.classList.remove("d-none");
          }
          if (errorEl) errorEl.classList.add("d-none");
        } else {
          if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove("d-none");
          }
          if (messageEl) messageEl.classList.add("d-none");
        }
      };

      const showOTPStep = (step) => {
        emailStep.classList.toggle("d-none", step !== "email");
        codeStep.classList.toggle("d-none", step !== "code");
        successStep.classList.toggle("d-none", step !== "success");
      };

      const startResendTimer = () => {
        if (resendBtn) {
          resendBtn.disabled = true;
          let countdown = 30;
          const timerEl = document.getElementById("otp-resend-timer");
          if (timerEl) timerEl.textContent = countdown;

          otpResendTimer = setInterval(() => {
            countdown--;
            if (timerEl) timerEl.textContent = countdown;
            if (countdown <= 0) {
              clearInterval(otpResendTimer);
              resendBtn.disabled = false;
            }
          }, 1000);
        }
      };

      // Send OTP
      if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
          const email = emailInput.value.trim();

          if (!email) {
            handleOTPResponse(false, "Please enter your email address", "email");
            return;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            handleOTPResponse(false, "Please enter a valid email address", "email");
            return;
          }

          const btnText = sendBtn.querySelector(".btn-text");
          const spinner = sendBtn.querySelector(".spinner-border");
          if (btnText) btnText.classList.add("d-none");
          if (spinner) spinner.classList.remove("d-none");
          sendBtn.disabled = true;

          try {
            const response = await fetch("/api/otp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
              otpVerifiedEmail = email;
              document.getElementById("otp-display-email").textContent = email;
              showOTPStep("code");
              startResendTimer();
              codeInput.focus();
            } else {
              handleOTPResponse(false, data.error || "Failed to send OTP", "email");
            }
          } catch (error) {
            console.error("OTP send error:", error);
            handleOTPResponse(false, "Network error. Please try again.", "email");
          } finally {
            if (btnText) btnText.classList.remove("d-none");
            if (spinner) spinner.classList.add("d-none");
            sendBtn.disabled = false;
          }
        });
      }

      // Verify OTP
      if (verifyBtn) {
        verifyBtn.addEventListener("click", async () => {
          const code = codeInput.value.trim();

          if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
            handleOTPResponse(false, "Please enter a valid 6-digit code", "code");
            return;
          }

          const btnText = verifyBtn.querySelector(".btn-text");
          const spinner = verifyBtn.querySelector(".spinner-border");
          if (btnText) btnText.classList.add("d-none");
          if (spinner) spinner.classList.remove("d-none");
          verifyBtn.disabled = true;

          try {
            const response = await fetch("/api/otp/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: otpVerifiedEmail, otp_code: code }),
            });

            const data = await response.json();

            if (data.success) {
              otpVerificationToken = data.token;
              showOTPStep("success");
            } else {
              handleOTPResponse(false, data.error || "Failed to verify OTP", "code");
            }
          } catch (error) {
            console.error("OTP verify error:", error);
            handleOTPResponse(false, "Network error. Please try again.", "code");
          } finally {
            if (btnText) btnText.classList.remove("d-none");
            if (spinner) spinner.classList.add("d-none");
            verifyBtn.disabled = false;
          }
        });
      }

      // Resend OTP
      if (resendBtn) {
        resendBtn.addEventListener("click", async () => {
          sendBtn.click();
          document.getElementById("otp-resend-wrapper").classList.add("d-none");
        });
      }

      // Change Email
      if (changeEmailBtn) {
        changeEmailBtn.addEventListener("click", () => {
          if (otpResendTimer) clearInterval(otpResendTimer);
          emailInput.value = "";
          codeInput.value = "";
          document.getElementById("otp-email-error").classList.add("d-none");
          document.getElementById("otp-code-error").classList.add("d-none");
          document.getElementById("otp-send-message").classList.add("d-none");
          document.getElementById("otp-verify-message").classList.add("d-none");
          document.getElementById("otp-resend-wrapper").classList.add("d-none");
          showOTPStep("email");
          emailInput.focus();
        });
      }

      // Continue from success
      if (continueBtn) {
        continueBtn.addEventListener("click", () => {
          if (otpResendTimer) clearInterval(otpResendTimer);
          modalManager.hide("otpModal");
        });
      }

      // Allow numeric-only input for OTP code
      if (codeInput) {
        codeInput.addEventListener("input", (e) => {
          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
        });

        codeInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") verifyBtn.click();
        });
      }

      // Allow enter key for email step
      if (emailInput) {
        emailInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") sendBtn.click();
        });
      }
    };

    initializeOTPModal();

    const branches = [
      { name: "BigHit Music", groups: ["BTS", "TXT"] },
      { name: "PLEDIS Entertainment", groups: ["SEVENTEEN", "fromis_9"] },
      { name: "BELIFT LAB", groups: ["ENHYPEN", "ILLIT"] },
      { name: "KOZ Entertainment", groups: ["ZICO"] },
      { name: "ADOR", groups: ["NewJeans"] },
      { name: "HYBE Labels Japan", groups: ["&TEAM"] },
    ];

    const artists = {
      BTS: ["RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"],
      TXT: ["SOOBIN", "YEONJUN", "BEOMGYU", "TAEHYUN", "HUENINGKAI"],
      SEVENTEEN: [
        "S.COUPS",
        "JEONGHAN",
        "JOSHUA",
        "JUN",
        "HOSHI",
        "WONWOO",
        "WOOZI",
        "THE 8",
        "MINGYU",
        "DK",
        "SEUNGKWAN",
        "VERNON",
        "DINO",
      ],
      fromis_9: [
        "LEE SAEROM",
        "SONG HAYOUNG",
        "PARK JIWON",
        "ROH JISUN",
        "LEE SEOYEON",
        "LEE CHAEYOUNG",
        "LEE NAGYUNG",
        "BAEK JIHEON",
      ],
      ENHYPEN: [
        "HEESEUNG",
        "JAY",
        "JAKE",
        "SUNGHOON",
        "SUNOO",
        "JUNGWON",
        "NI-KI",
      ],
      ILLIT: ["YUNAH", "MINJU", "MOKA", "WONHEE", "IROHA"],
      ZICO: ["ZICO"],
      NewJeans: ["MINJI", "HANNI", "DANIELLE", "HAERIN", "HYEIN"],
      "&TEAM": [
        "K",
        "FUMA",
        "NICHOLAS",
        "EJ",
        "YUMA",
        "JO",
        "HARUA",
        "TAKI",
        "MAKI",
      ],
    };

    const countryPhoneData = {};
    const countryCodeToFlagEmoji = (code) => {
      if (!code || code.length !== 2) return "🌐";
      const A = 0x1f1e6;
      return String.fromCodePoint(
        A + (code.toUpperCase().charCodeAt(0) - 65),
        A + (code.toUpperCase().charCodeAt(1) - 65)
      );
    };
    async function populateCountries() {
      if (!countrySelect) return;
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd");
        const json = await res.json();
        const countries = Array.isArray(json) ? json : [];
        countries
          .map((c) => {
            const root = c?.idd?.root || "";
            const suffix = Array.isArray(c?.idd?.suffixes) && c.idd.suffixes.length ? c.idd.suffixes[0] : "";
            const dial = root || suffix ? `${root}${suffix}` : "";
            const flag = countryCodeToFlagEmoji(c.cca2 || "");
            return {
              name: c?.name?.common || c?.name?.official || c?.cca2 || "",
              code2: c?.cca2 || "",
              dialCode: dial,
              flag,
            };
          })
          .filter((c) => c.name && c.code2)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.code2;
            opt.textContent = c.name;
            countrySelect.appendChild(opt);
            countryPhoneData[c.code2] = { flag: c.flag, code: c.dialCode, format: "" };
          });

        try {
          const ipRes = await fetch("https://ipwho.is/");
          const ip = await ipRes.json();
          const cc = ip?.country_code || ip?.country_code_iso2 || "";
          if (cc && countryPhoneData[cc]) {
            countrySelect.value = cc;
            countrySelect.dispatchEvent(new Event("change"));
          }
          const setIfEmpty = (id, val) => {
            const el = document.getElementById(id);
            if (el && !el.value && val) el.value = val;
          };
          setIfEmpty("city", ip?.city || "");
          setIfEmpty("state", ip?.region || ip?.region_name || "");
          setIfEmpty("postal-code", ip?.postal || ip?.postal_code || "");
        } catch {}
      } catch (e) {
        console.error("Failed to load countries", e);
      }
    }
    populateCountries();

    async function fetchAndPopulateEvents() {
      const eventsList = document.getElementById('events-list');
      const eventsLoading = document.getElementById('events-loading');
      const eventsError = document.getElementById('events-error');

      if (!eventsList || !eventsLoading || !eventsError) return;

      try {
        eventsLoading.classList.remove('d-none');
        eventsError.classList.add('d-none');
        eventsList.innerHTML = '';

        const eventsData = [
          { id: 'bts-concert-seoul', name: 'BTS Seoul Concert', date: '2026-04-09', artist: 'BTS' },
          { id: 'bts-concert-tokyo', name: 'BTS Tokyo Dome', date: '2026-04-17', artist: 'BTS' },
          { id: 'enhypen-tour', name: 'ENHYPEN World Tour', date: '2026-05-15', artist: 'ENHYPEN' },
          { id: 'andteam-concert', name: '&TEAM Blaze Tour Japan', date: '2026-05-13', artist: '&TEAM' },
          { id: 'lesserafim-concert', name: 'LE SSERAFIM Comeback Event', date: '2026-03-20', artist: 'LE SSERAFIM' },
          { id: 'seventeen-unit', name: 'SEVENTEEN DxS Serenade Tour', date: '2026-04-17', artist: 'SEVENTEEN' },
        ];

        renderEvents(eventsData);
        translatePage(activeLanguage);
        eventsLoading.classList.add('d-none');
      } catch (error) {
        console.error('Failed to load events', error);
        eventsLoading.classList.add('d-none');
        eventsError.classList.remove('d-none');
      }
    }

    function renderEvents(events) {
      const eventsList = document.getElementById('events-list');
      if (!eventsList || !Array.isArray(events)) return;

      eventsList.innerHTML = '';
      events.forEach((event) => {
        const col = document.createElement('div');
        col.className = 'col-md-6';

        const eventCard = document.createElement('div');
        eventCard.className = 'card h-100 event-card border-0 shadow-sm';

        const eventBody = document.createElement('div');
        eventBody.className = 'card-body d-flex align-items-start gap-3';

        const eventCheckbox = document.createElement('input');
        eventCheckbox.type = 'checkbox';
        eventCheckbox.className = 'form-check-input mt-1';
        eventCheckbox.style.flexShrink = '0';
        eventCheckbox.id = `event-${event.id}`;
        eventCheckbox.value = event.id;
        eventCheckbox.name = `event-${event.id}`;

        const eventLabel = document.createElement('label');
        eventLabel.className = 'form-check-label event-label flex-grow-1 mb-0';
        eventLabel.htmlFor = `event-${event.id}`;

        const eventTitle = document.createElement('div');
        eventTitle.className = 'fw-bold text-dark';
        eventTitle.textContent = event.name;

        const eventDate = document.createElement('div');
        eventDate.className = 'text-muted small mt-1';
        const dateObj = new Date(event.date);
        eventDate.textContent = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        const eventArtist = document.createElement('div');
        eventArtist.className = 'text-primary small mt-1';
        eventArtist.textContent = event.artist;

        eventLabel.appendChild(eventTitle);
        eventLabel.appendChild(eventDate);
        eventLabel.appendChild(eventArtist);

        eventBody.appendChild(eventCheckbox);
        eventBody.appendChild(eventLabel);
        eventCard.appendChild(eventBody);
        col.appendChild(eventCard);
        eventsList.appendChild(col);

        eventCheckbox.addEventListener('change', updateSelectedEvents);
      });
    }

    function updateSelectedEvents() {
      const selectedCheckboxes = document.querySelectorAll('#events-list input[type="checkbox"]:checked');
      const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      const selectedEventsInput = document.getElementById('selected-events');
      if (selectedEventsInput) {
        selectedEventsInput.value = selectedIds.join(',');
      }
    }

    const validationRules = {
      "referral-code": {
        required: true,
        message: "Referral code is required.",
      },
      "full-name": { required: true, message: "Please enter your full name." },
      email: {
        required: true,
        pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
        message: "Please enter a valid email address.",
      },
      phone: {
        required: true,
        pattern: /^\+?[\d\s\-()]{7,20}$/,
        message: "Please enter a valid phone number.",
      },
      "address-line1": {
        required: false,
        message: "Street address is required.",
      },
      city: { required: false, message: "" },
      "postal-code": {
        required: false,
        pattern: null,
        message: "",
      },
      "country": {
        required: true,
        message: "Please select your country.",
      },
      dob: { required: true, message: "Date of birth is required." },
      gender: { required: true, message: "Please select your gender." },
      branch: { required: true, message: "Please select a branch." },
      group: { required: true, message: "Please select a group." },
      artist: { required: true, message: "Please select an artist." },
      "payment-type": {
        required: true,
        message: "Please select a payment type.",
      },
      "contact-method": {
        required: true,
        message: "Please select a contact method.",
      },
      "subscription-agreement": {
        required: true,
        message: "You must agree to complete your subscription.",
      },
      "installment-plan": {
        required: false,
        message: "Please select an installment plan.",
      },
      "installment-terms": {
        required: false,
        message: "You must agree to the installment terms.",
      },
      "selected-events": {
        required: true,
        message: "Please select at least one event.",
      },
    };

    function sanitizeInput(value) {
      const temp = document.createElement("div");
      temp.textContent = value;
      return temp.innerHTML;
    }

    function showFieldError(field, message) {
      let feedback = null;
      const describedBy = field.getAttribute("aria-describedby");
      if (describedBy) {
        feedback = document.getElementById(describedBy);
      }

      if (!feedback) {
        if (field.type === "radio") {
          const container = field.closest(".mb-3") || field.parentElement;
          const groupId = `${field.name}-error`;
          feedback = container.querySelector(`#${CSS.escape(groupId)}`) || container.querySelector(".invalid-feedback");
          if (!feedback) {
            feedback = document.createElement("div");
            feedback.className = "invalid-feedback d-block";
            feedback.id = groupId;
            container.appendChild(feedback);
          } else {
            feedback.classList.add("d-block");
          }
          const radios = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(field.name)}"]`);
          radios.forEach((r) => {
            const existing = r.getAttribute("aria-describedby");
            if (!existing || !existing.includes(groupId)) {
              r.setAttribute("aria-describedby", groupId);
            }
          });
        } else {
          const parent = field.parentElement || field.closest(".mb-3");
          feedback = parent.querySelector(".invalid-feedback");
          if (!feedback) {
            feedback = document.createElement("div");
            feedback.className = "invalid-feedback";
            parent.appendChild(feedback);
          }
        }
      }

      feedback.setAttribute("aria-live", "polite");
      feedback.textContent = message;
      if (field.type === "radio") {
        const radios = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(field.name)}"]`);
        radios.forEach((r) => {
          r.classList.add("is-invalid");
          r.setAttribute("aria-invalid", "true");
        });
      } else {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");
      }
    }

    function clearFieldError(field) {
      const describedBy = field.getAttribute("aria-describedby");
      let feedback = describedBy ? document.getElementById(describedBy) : null;
      if (!feedback) {
        if (field.type === "radio") {
          const container = field.closest(".mb-3") || field.parentElement;
          feedback = container.querySelector(".invalid-feedback");
        } else {
          feedback = field.parentElement.querySelector(".invalid-feedback");
        }
      }
      if (feedback) feedback.textContent = "";
      if (field.type === "radio") {
        const radios = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(field.name)}"]`);
        radios.forEach((r) => {
          r.classList.remove("is-invalid");
          r.setAttribute("aria-invalid", "false");
        });
      } else {
        field.classList.remove("is-invalid");
        field.setAttribute("aria-invalid", "false");
      }
    }

    function validateField(field, showErrors = true) {
      const key = field.name || field.id;
      const rule = validationRules[key];
      const isRequired = rule?.required ?? field.required;

      function returnFalse(msg) {
        if (showErrors) showFieldError(field, msg);
        return false;
      }
      function returnTrue() {
        if (showErrors) clearFieldError(field);
        return true;
      }

      // Radio group handling
      if (field.type === "radio") {
        const name = field.name;
        const radios = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
        const anyChecked = Array.from(radios).some((r) => r.checked);
        if (isRequired && !anyChecked) {
          return returnFalse(rule?.message || "This selection is required.");
        }
        return returnTrue();
      }

      // Checkbox handling
      if (field.type === "checkbox") {
        if (isRequired && !field.checked) {
          return returnFalse(rule?.message || "This checkbox is required.");
        }
        return returnTrue();
      }

      // Default inputs/selects
      const value = (field.value || "").trim();
      if (isRequired && !value) {
        return returnFalse(rule?.message || "This field is required.");
      }

      const pattern = rule?.pattern;
      if (pattern && value && !pattern.test(value)) {
        return returnFalse(rule?.message || "Invalid value.");
      }

      if (field.type === "date" && value) {
        const min = field.getAttribute("min");
        const max = field.getAttribute("max");
        const d = new Date(value);
        if ((min && d < new Date(min)) || (max && d > new Date(max))) {
          const msg = rule?.message || `Please enter a date between ${min} and ${max}.`;
          return returnFalse(msg);
        }
      }

      return returnTrue();
    }

    function shakeField(field) {
      if (!field) return;
      field.classList.remove("shake");
      void field.offsetWidth;
      field.classList.add("shake");
      field.addEventListener(
        "animationend",
        () => field.classList.remove("shake"),
        { once: true },
      );
    }

    function updateProgress() {
      const requiredElements = Array.from(form.querySelectorAll("[required]"));
      const items = [];
      const radioNames = new Set();

      requiredElements.forEach((el) => {
        if (el.type === "radio") {
          if (!radioNames.has(el.name)) {
            radioNames.add(el.name);
            items.push({ type: "radio", name: el.name });
          }
        } else if (el.type === "checkbox") {
          items.push({ type: "checkbox", el });
        } else {
          items.push({ type: "field", el });
        }
      });

      let filled = 0;
      items.forEach((item) => {
        if (item.type === "radio") {
          const anyChecked = !!form.querySelector(`input[type="radio"][name="${CSS.escape(item.name)}"]:checked`);
          if (anyChecked) filled++;
        } else if (item.type === "checkbox") {
          if (item.el.checked) filled++;
        } else {
          if ((item.el.value || "").trim()) filled++;
        }
      });

      const progress = items.length ? (filled / items.length) * 100 : 0;
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute("aria-valuenow", progress);
    }

    function isFormValidRealtime(debug = false, showErrors = true) {
      const requiredElements = Array.from(form.querySelectorAll("[required]"));
      const radioNames = new Set();
      const debugList = [];
      let valid = true;

      for (const field of requiredElements) {
        if (field.type === "radio") {
          if (radioNames.has(field.name)) continue;
          radioNames.add(field.name);
          const ok = validateField(field, showErrors);
          if (!ok) {
            valid = false;
            if (debug) debugList.push(field.name);
          }
        } else {
          const ok = validateField(field, showErrors);
          if (!ok) {
            valid = false;
            if (debug) debugList.push(field.name || field.id);
          }
        }
      }

      return debug ? debugList : valid;
    }

    function updateSubmitButton() {
      if (!submitBtn) return;
      // Keep the submit button clickable at all times so the user is directed to
      // the first invalid field on submit. Validation still runs on submit.
      const isValid = isFormValidRealtime(false, false);
      // Never actually disable the button (so it's always clickable). Use
      // aria-disabled to communicate the state to assistive tech instead.
      submitBtn.disabled = false;
      if (!isValid) {
        submitBtn.setAttribute('aria-disabled', 'true');
      } else {
        submitBtn.removeAttribute('aria-disabled');
      }
    }

    branches.forEach((branch) => {
      const option = document.createElement("option");
      option.value = branch.name;
      option.textContent = branch.name;
      branchSelect.appendChild(option);
    });

    branchSelect.addEventListener("change", () => {
      groupSelect.innerHTML =
        '<option value="" disabled selected>Select a Group</option>';
      artistSelect.innerHTML =
        '<option value="" disabled selected>Select an Artist</option>';
      const selectedBranch = branches.find(
        (branch) => branch.name === branchSelect.value,
      );
      if (selectedBranch) {
        selectedBranch.groups.forEach((group) => {
          const option = document.createElement("option");
          option.value = group;
          option.textContent = group;
          groupSelect.appendChild(option);
        });
      }
      updateProgress();
      updateSubmitButton();
    });

    groupSelect.addEventListener("change", () => {
      artistSelect.innerHTML =
        '<option value="" disabled selected>Select an Artist</option>';
      const selectedGroup = groupSelect.value;
      if (artists[selectedGroup]) {
        artists[selectedGroup].forEach((artist) => {
          const option = document.createElement("option");
          option.value = artist;
          option.textContent = artist;
          artistSelect.appendChild(option);
        });
      }
      updateProgress();
      updateSubmitButton();
    });

    function updatePhonePrefix(countryCode) {
      const phoneData = countryPhoneData[countryCode] || {
        flag: "🌐",
        code: "",
        format: "",
      };
      phonePrefixSpan.textContent = `${phoneData.flag} ${phoneData.code}`;
      phoneInput.value = "";
      phoneInput.oninput = () => {
        let val = phoneInput.value.replace(/\D/g, "");
        let formatted = val;
        if (countryCode === "US" || countryCode === "CA") {
          if (val.length > 3 && val.length <= 6)
            formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
          else if (val.length > 6)
            formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6, 10)}`;
        } else if (countryCode === "GB") {
          if (val.length > 4)
            formatted = `${val.slice(0, 4)} ${val.slice(4, 10)}`;
        } else if (countryCode === "NG") {
          if (val.length > 3)
            formatted = `${val.slice(0, 3)} ${val.slice(3, 6)} ${val.slice(6, 10)}`;
        }
        phoneInput.value = formatted;
      };
    }

    function updateAddressFieldsForCountry(countryCode) {
      const addressFormats = {
        US: {
          fields: [
            {
              id: "address-line1",
              label: "Street Address",
              placeholder: "123 Main St",
              required: true,
            },
            {
              id: "address-line2",
              label: "Apt/Suite (optional)",
              placeholder: "Apt, suite, etc.",
              required: false,
            },
            { id: "city", label: "City", placeholder: "City", required: true },
            {
              id: "state",
              label: "State",
              placeholder: "State",
              required: true,
            },
            {
              id: "postal-code",
              label: "ZIP Code",
              placeholder: "12345",
              required: true,
              pattern: /^\d{5}(-\d{4})?$/,
              error: "Invalid ZIP code",
            },
          ],
          order: [
            "address-line1",
            "address-line2",
            "city",
            "state",
            "postal-code",
          ],
        },
        JP: {
          fields: [
            {
              id: "postal-code",
              label: "Postal Code",
              placeholder: "100-0001",
              required: true,
              pattern: /^\d{3}-\d{4}$/,
              error: "Invalid postal code",
            },
            {
              id: "address-line1",
              label: "Prefecture",
              placeholder: "Tokyo",
              required: true,
            },
            {
              id: "address-line2",
              label: "City/Ward",
              placeholder: "Chiyoda-ku",
              required: true,
            },
            {
              id: "city",
              label: "Town/Block",
              placeholder: "Kanda",
              required: true,
            },
            {
              id: "state",
              label: "Building/Apartment (optional)",
              placeholder: "Building, room, etc.",
              required: false,
            },
          ],
          order: [
            "postal-code",
            "address-line1",
            "address-line2",
            "city",
            "state",
          ],
        },
        default: {
          fields: [
            {
              id: "address-line1",
              label: "Address Line 1",
              placeholder: "Address Line 1",
              required: true,
            },
            {
              id: "address-line2",
              label: "Address Line 2 (optional)",
              placeholder: "Address Line 2",
              required: false,
            },
            {
              id: "city",
              label: "City/Town",
              placeholder: "City/Town",
              required: true,
            },
            {
              id: "state",
              label: "State/Province/Region",
              placeholder: "State/Province/Region",
              required: false,
            },
            {
              id: "postal-code",
              label: "Postal Code",
              placeholder: "Postal Code",
              required: true,
              pattern: /^.{2,10}$/,
              error: "Invalid postal code",
            },
          ],
          order: [
            "address-line1",
            "address-line2",
            "city",
            "state",
            "postal-code",
          ],
        },
      };
      const format = addressFormats[countryCode] || addressFormats.default;
      try {
        format.fields.forEach((field) => {
          field.pattern = null;
          field.error = "";
        });
      } catch {}
      format.fields.forEach((f) => {
        const el = document.getElementById(f.id);
        if (el) {
          el.placeholder = f.placeholder;
          const label = el.previousElementSibling;
          if (label && label.classList.contains("form-label"))
            label.textContent = f.label;
          el.required = f.required;
          el.pattern = f.pattern ? f.pattern.source : "";

          if (!validationRules[f.id]) {
            validationRules[f.id] = {
              required: !!f.required,
              message: f.error || "",
            };
          }
          validationRules[f.id].required = !!f.required;

          validationRules[f.id].pattern = f.pattern || null;
          validationRules[f.id].message =
            f.error || validationRules[f.id].message;
          el.style.display = "";
        }
      });
      [
        "address-line1",
        "address-line2",
        "city",
        "state",
        "postal-code",
      ].forEach((id) => {
        if (!format.order.includes(id)) {
          const el = document.getElementById(id);
          if (el) el.style.display = "none";
        }
      });
      const addressFields = document.getElementById("address-fields");
      format.order.forEach((id) => {
        const el = document.getElementById(id);
        if (el && addressFields) addressFields.appendChild(el);
      });
    }

    function updateInstallmentOptions() {
      const amountEl = document.getElementById("subscription-amount");
      const amountInputEl = document.getElementById("amount-input");
      const base = amountEl ? parseFloat(amountEl.dataset.baseAmount || "0") : 0;
      const currency = amountEl ? amountEl.dataset.currency || "USD" : "USD";
      const currencySymbol = currency === "USD" ? "$" : "";
      const planSelect = document.getElementById("installment-plan");

      if (paymentTypeSelect.value === "Installment") {
        installmentOptions.classList.remove("d-none");
        if (planSelect) planSelect.required = true;
        if (installmentTerms) {
          const wrapper = document.getElementById("installment-terms-wrapper") || installmentTerms.closest(".form-check");
          if (wrapper) wrapper.classList.remove("d-none");
          installmentTerms.required = true;
          validationRules["installment-terms"].required = true;
        }

        // Determine number of installments from plan or default to 2
        let installments = 2;
        if (planSelect && planSelect.value) {
          const m = String(planSelect.value).match(/^(\d+)/);
          installments = m ? Number(m[1]) : installments;
        }
        if (!installments || installments < 1) installments = 2;
        let per = base / installments;
        if (planSelect) {
          const selected = planSelect.options[planSelect.selectedIndex];
          if (selected && selected.dataset && selected.dataset.perAmount) {
            const override = parseFloat(selected.dataset.perAmount);
            if (!Number.isNaN(override) && override > 0) per = override;
          }
        }
        const perStr = per.toFixed(2);
        if (amountEl) amountEl.textContent = `${currencySymbol}${perStr} / installment (x${installments})`;
        if (amountInputEl) amountInputEl.value = `${perStr}${currency}/installment x${installments}`;
      } else {
        installmentOptions.classList.add("d-none");
        if (planSelect) planSelect.required = false;
        if (installmentTerms) {
          const wrapper = document.getElementById("installment-terms-wrapper") || installmentTerms.closest(".form-check");
          if (wrapper) wrapper.classList.add("d-none");
          installmentTerms.checked = false;
          installmentTerms.required = false;
          validationRules["installment-terms"].required = false;
        }
        if (amountEl) amountEl.textContent = `${currencySymbol}${base.toFixed(2)} / year`;
        if (amountInputEl) amountInputEl.value = `${base.toFixed(2)}${currency}/year`;
      }

      updateProgress();
      updateSubmitButton();
    }

    // Update amount when installment plan changes
    const _installmentPlanSelect = document.getElementById("installment-plan");
    if (_installmentPlanSelect) {
      _installmentPlanSelect.addEventListener("change", updateInstallmentOptions);
    }

    paymentTypeSelect.addEventListener("change", updateInstallmentOptions);
    countrySelect.addEventListener("change", () => {
      countryInput.value = countrySelect.value;
      updatePhonePrefix(countrySelect.value);
      updateAddressFieldsForCountry(countrySelect.value);
      updateProgress();
      updateSubmitButton();
    });
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      const key = field.name || field.id;
      // On input: update progress and show validation only if the field was touched
      field.addEventListener("input", () => {
        const shouldShow = key ? touchedFields.has(key) : false;
        validateField(field, shouldShow);
        updateProgress();
        updateSubmitButton();
      });

      // On change and blur: mark as touched and validate with errors visible
      field.addEventListener("change", () => {
        markTouched(field);
        validateField(field, true);
        updateProgress();
        updateSubmitButton();
      });
      field.addEventListener("blur", () => {
        markTouched(field);
        validateField(field, true);
      });

      field.addEventListener("invalid", () => shakeField(field));
    });

    try {
      const mailingCheckbox = document.getElementById("use-as-mailing-address");
      if (mailingCheckbox) {
        let hidden = document.getElementById("use-as-mailing-address-hidden");
        if (!hidden) {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.id = "use-as-mailing-address-hidden";
          hidden.name = "use-as-mailing-address";
          hidden.value = mailingCheckbox.checked ? "true" : "false";
          form.appendChild(hidden);
        }
        mailingCheckbox.addEventListener("change", () => {
          hidden.value = mailingCheckbox.checked ? "true" : "false";
        });
      }
    } catch {}

    function generateUniqueID() {
      const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let result = "";
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `HYB${result}`;
    }

    function prepareNetlifyFormData(form) {
      const uniqueID = generateUniqueID();
      const submissionTime = new Date().toISOString();
      const userAgentStr = navigator.userAgent;
      const screenResStr = `${screen.width}x${screen.height}`;
      const referrerStr = document.referrer || "Direct";

      const setElValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setElValue("submission-id", uniqueID);
      setElValue("submission-timestamp", submissionTime);
      setElValue("user-agent", userAgentStr);
      setElValue("screen-resolution", screenResStr);
      setElValue("referrer", referrerStr);

      const formData = new FormData(form);

      formData.set("submission-id", uniqueID);
      formData.set("submission-timestamp", submissionTime);

      const paymentMethod = document.querySelector(
        'input[name="payment-method"]:checked',
      );
      if (paymentMethod) {
        formData.set("payment-method", paymentMethod.value);
      }

      const contactMethod = document.querySelector(
        'input[name="contact-method"]:checked',
      );
      if (contactMethod) {
        formData.set("contact-method", contactMethod.value);
      }

      const langSwitcher = document.getElementById("language-switcher");
      if (langSwitcher) formData.set("language", langSwitcher.value);

      const countrySel = document.getElementById("country-select");
      if (countrySel) formData.set("country", countrySel.value);

      const currencyEl = document.getElementById("currency");
      if (currencyEl) formData.set("currency", currencyEl.value || "USD");

      try {
        const hiddenMailing = document.getElementById(
          "use-as-mailing-address-hidden",
        );
        const mailingCheckbox = document.getElementById(
          "use-as-mailing-address",
        );
        if (hiddenMailing) {
          formData.set(
            "use-as-mailing-address",
            hiddenMailing.value === "true" ? "true" : "false",
          );
        } else if (mailingCheckbox) {
          formData.set(
            "use-as-mailing-address",
            mailingCheckbox.checked ? "true" : "false",
          );
        }
      } catch {}

      const selectedEventsInput = document.getElementById("selected-events");
      if (selectedEventsInput) {
        formData.set("selected-events", selectedEventsInput.value);
      }

      formData.set("user-agent", userAgentStr);
      formData.set("screen-resolution", screenResStr);
      formData.set("referrer", referrerStr);

      if (otpVerificationToken) {
        formData.set("otp_token", otpVerificationToken);
      }

      return { formData, uniqueID, submissionTime };
    }

    function showRedirectOverlayAndGo() {
      const overlay = document.getElementById("redirect-overlay");
      if (overlay) {
        overlay.classList.remove("d-none");
        overlay.setAttribute("aria-hidden", "false");
      }
      setTimeout(() => {
        window.location.href = "/success";
      }, 3000);
    }

    async function submitFormInternal() {
      // Ensure this flow is only executed after explicit confirmation click
      if (!submissionConfirmed) {
        showToast(
          "Please confirm your details before final submission.",
          "danger",
        );
        // If confirm modal was not shown, open it so the user can review
        if (!confirmModalShown) {
          fillConfirmDetails();
          confirmModal?.show();
          confirmModalShown = true;
        }
        return;
      }

      if (!isFormValidRealtime()) {
        showToast(
          "Please correct the highlighted errors and try again.",
          "danger",
        );
        form.querySelectorAll("[required]").forEach((field) => {
          if (!validateField(field)) shakeField(field);
        });
        return;
      }

      submitBtn.disabled = true;
      if (spinner) spinner.classList.remove("d-none");
      if (btnText) btnText.textContent = "Submitting...";

      try {
        const { formData } = prepareNetlifyFormData(form);
        // Ensure Netlify picks up this form and all fields
        formData.set("form-name", "subscription-form");
        const payload = Object.fromEntries(formData.entries());

        const netlifyCapture = (async () => {
          try {
            const encoded = new URLSearchParams();
            for (const [k, v] of formData.entries()) encoded.append(k, v);
            await fetch("/", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: encoded.toString(),
            });
          } catch (e) {
            if (location.hostname !== "localhost") {
              console.warn("Netlify forms capture failed", e);
            }
          }
        })();

        const serverFunction = (async () => {
          try {
            const endpoint = "/submit-form";
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.success === false) {
              const formLevelErrorMessage =
                data?.message ||
                (response.status === 400
                  ? "Invalid data sent to the server. Please refresh and try again."
                  : response.status >= 500
                  ? "A server error occurred. Please try again later."
                  : "An error occurred. Please check the form and try again.");
              showToast(formLevelErrorMessage, "warning");
            }
          } catch (e) {
            console.warn("Server function submission failed", e);
          }
        })();

        const results = await Promise.allSettled([netlifyCapture, serverFunction]);
        const allFailed = results.every((r) => r.status === "rejected");
        if (allFailed) {
          throw new Error("All submission attempts failed");
        }

        sessionStorage.setItem("submissionData", JSON.stringify(payload));
        // Reset confirmation state to avoid accidental re-submits
        submissionConfirmed = false;
        confirmModalShown = false;
        // If payment method is Digital Currency or Card Payment, show the unified success modal with 24-hour payment notice.
        try {
          const pm = document.querySelector('input[name="payment-method"]:checked');
          const paymentValue = pm ? pm.value : null;
          if (paymentValue === "Digital Currency" || paymentValue === "Card Payment") {
            modalManager.show("digitalCurrencySuccessModal");
          } else {
            showRedirectOverlayAndGo();
          }
        } catch (e) {
          console.warn('Failed to show unified success modal, falling back to redirect overlay', e);
          showRedirectOverlayAndGo();
        }
      } catch (err) {
        console.error("Submission Error:", err.message, err.stack);
        showToast(
          `Submission failed: ${err.message}. Please try again.`,
          "danger",
        );
        // Reset confirmation flags so user must reconfirm after fixing errors
        submissionConfirmed = false;
        confirmModalShown = false;
        submitBtn.disabled = false;
        if (spinner) spinner.classList.add("d-none");
        if (btnText) btnText.textContent = "Submit Subscription";
      }
    }

    function fillConfirmDetails() {
      const get = (id) => document.getElementById(id);
      const text = (el, val) => {
        if (el) el.textContent = val || "—";
      };
      text(get("confirm-full-name"), document.getElementById("full-name").value);
      text(get("confirm-email"), emailInput.value);
      text(get("confirm-phone"), `${phonePrefixSpan.textContent} ${phoneInput.value}`.trim());
      const countryOption = countrySelect.options[countrySelect.selectedIndex];
      text(get("confirm-country"), countryOption ? countryOption.textContent : "");
      text(get("confirm-dob"), document.getElementById("dob").value);
      text(get("confirm-gender"), document.getElementById("gender").value);
      text(get("confirm-branch"), document.getElementById("branch").value);
      text(get("confirm-group"), document.getElementById("group").value);
      text(get("confirm-artist"), document.getElementById("artist").value);

      const selectedCheckboxes = document.querySelectorAll('#events-list input[type="checkbox"]:checked');
      const selectedEventNames = Array.from(selectedCheckboxes).map(cb => {
        const label = cb.nextElementSibling;
        if (label) {
          const titleDiv = label.querySelector('div.fw-bold');
          return titleDiv ? titleDiv.textContent : '';
        }
        return '';
      }).filter(Boolean);
      text(get("confirm-events"), selectedEventNames.length > 0 ? selectedEventNames.join(', ') : "None selected");

      text(get("confirm-payment"), document.getElementById("payment-type").value);
      const contactMethod = document.querySelector('input[name="contact-method"]:checked');
      text(get("confirm-contact"), contactMethod ? contactMethod.value : "");
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        showToast("Spam detected. Submission blocked.", "danger");
        return;
      }

      // When submitting, mark all required fields as touched so users see errors
      form.querySelectorAll("[required]").forEach((f) => markTouched(f));
      if (!isFormValidRealtime(false, true)) {
        const missing = isFormValidRealtime(true, true);
        console.debug("Invalid fields:", missing);
        showToast("Please complete the required fields.", "danger");

        // Find the first invalid element or radio group. Prefer visible elements.
        const allInvalid = Array.from(form.querySelectorAll('.is-invalid, [aria-invalid="true"]'));
        const isVisible = (el) => !!(el && el.offsetParent !== null && el.getClientRects && el.getClientRects().length);
        let target = allInvalid.find(isVisible) || allInvalid[0];

        // If target is inside a known hidden section, try to reveal it so we can focus.
        if (target && !isVisible(target)) {
          try {
            const container = target.closest('#installment-options');
            if (container && container.classList.contains('d-none')) {
              // Reveal installment options and recalc UI
              updateInstallmentOptions();
              container.classList.remove('d-none');
            }
            const addressContainer = target.closest('#address-section');
            if (addressContainer && addressContainer.classList.contains('d-none')) {
              updateAddressFieldsForCountry(countrySelect.value);
              addressContainer.classList.remove('d-none');
            }
          } catch (err) {
            console.warn('Failed to reveal hidden section for invalid field', err);
          }

          // Wait a tick for layout to update and try to find a visible invalid field again
          await new Promise((r) => setTimeout(r, 50));
          const refreshed = Array.from(form.querySelectorAll('.is-invalid, [aria-invalid="true"]'));
          target = refreshed.find(isVisible) || target;
        }

        if (target) {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}

          try {
            // If the invalid target is a radio input, focus the first radio in the group
            if (target.type === 'radio') {
              const radios = form.querySelectorAll(`input[type="radio"][name="${CSS.escape(target.name)}"]`);
              if (radios && radios[0] && typeof radios[0].focus === 'function') radios[0].focus({ preventScroll: true });
            } else if (typeof target.focus === 'function') {
              target.focus({ preventScroll: true });
            } else {
              const focusable = target.querySelector && target.querySelector('input,select,textarea,button');
              if (focusable && typeof focusable.focus === 'function') focusable.focus({ preventScroll: true });
            }
          } catch (err) {
            console.warn('Focus failed for invalid field', err);
          }

          shakeField(target);
        }

        return;
      }

      fillConfirmDetails();
      modalManager.show('confirmModal');
      // Mark that the confirm modal was shown for this submission flow
      confirmModalShown = true;
      submissionConfirmed = false;
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        // Only allow submission when user explicitly clicked confirm
        submissionConfirmed = true;
        try { confirmModal?.hide(); } catch {}
        await submitFormInternal();
      });
    }

    try {
      const onboardingModalInstance = modalManager.initialize("onboardingModal");
      const startBtn = document.getElementById('start-now-btn');
      if (startBtn) startBtn.addEventListener('click', () => {
        try { document.getElementById('subscription-form').scrollIntoView({ behavior: 'smooth' }); } catch {}
      });
      if (onboardingModalInstance) modalManager.show('onboardingModal');
    } catch {}

    // Create and initialize a lightweight 5-step wizard grouping existing fields
    function createWizard() {
      const totalSteps = 5;
      let current = 1;
      const form = document.getElementById('subscription-form');
      if (!form) return;
      if (form.dataset.wizardInitialized) return;
      form.dataset.wizardInitialized = 'true';

      const findWrapper = (el) => {
        if (!el) return null;
        if (typeof el.closest === 'function' && el.closest('.mb-3')) return el.closest('.mb-3');
        return el.parentElement || el;
      };

      const stepMap = {
        1: ['referral-code','full-name','email','zangi-id','phone'],
        2: ['address-section','country-select','dob','gender'],
        3: ['branch','group','artist','subscription-amount','payment-type','installment-options','payment-methods','email-contact'],
        4: ['events-section'],
        5: ['feedback','installment-terms-wrapper','privacy-policy','subscription-agreement','submit-btn','submit-help-text']
      };

      // Build indicators and step containers
      const indicators = document.createElement('div');
      indicators.className = 'step-indicators d-flex justify-content-center mb-3';
      indicators.id = 'wizard-step-indicators';
      indicators.setAttribute('role','tablist');
      ['Profile','Address','Preferences','Events','Review'].forEach((label, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `step-tab-${i+1}`;
        btn.className = `btn btn-sm btn-light step-indicator${i===0? ' active' : ''}`;
        btn.dataset.step = String(i+1);
        btn.setAttribute('role','tab');
        btn.setAttribute('aria-controls', `step-${i+1}`);
        btn.setAttribute('aria-selected', i===0 ? 'true' : 'false');
        btn.tabIndex = i===0?0:-1;
        btn.textContent = label;
        btn.addEventListener('click', () => showStep(i+1));
        indicators.appendChild(btn);
      });

      const stepsContainer = document.createElement('div');
      stepsContainer.className = 'form-steps';

      for (let i=1;i<=totalSteps;i++){
        const sec = document.createElement('section');
        sec.className = 'step' + (i===1 ? '' : ' d-none');
        sec.dataset.step = String(i);
        sec.id = `step-${i}`;
        sec.setAttribute('role','tabpanel');
        sec.setAttribute('aria-labelledby', `step-tab-${i}`);
        sec.setAttribute('aria-hidden', i===1 ? 'false' : 'true');
        stepsContainer.appendChild(sec);
      }

      // Move elements into steps
      for (let s=1;s<=totalSteps;s++){
        const ids = stepMap[s] || [];
        ids.forEach((id) => {
          try{
            let el = document.getElementById(id);
            if (!el) el = form.querySelector(`[name="${id}"]`);
            if (!el) return;
            const wrapper = findWrapper(el);
            const target = document.getElementById(`step-${s}`);
            if (wrapper && target && wrapper !== target) target.appendChild(wrapper);
            else if (el && target && el.parentElement !== target) target.appendChild(el);
          }catch(e){ console.warn('move error', e); }
        });
      }

      // Insert indicators and steps at top of form
      form.insertBefore(indicators, form.firstChild);
      form.insertBefore(stepsContainer, indicators.nextSibling);

      function updateWizardUI() {
        for (let i=1;i<=totalSteps;i++){
          const sEl = document.getElementById(`step-${i}`);
          if (!sEl) continue;
          const visible = i===current;
          sEl.classList.toggle('d-none', !visible);
          sEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }
        document.querySelectorAll('.step-indicator').forEach((b)=>{
          const isCurrent = Number(b.dataset.step)===current;
          b.classList.toggle('active', isCurrent);
          b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
          b.tabIndex = isCurrent ? 0 : -1;
          if (isCurrent) b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current');
        });
        // progress UI updated via step indicators
        // Update progress bar to reflect step progress
        try{
          const stepProgress = ((current-1)/(totalSteps-1))*100;
          if (progressBar) { progressBar.style.width = `${stepProgress}%`; progressBar.setAttribute('aria-valuenow', String(Math.round(stepProgress))); }
        }catch{}
      }

      function showStep(n){
        if (!n || n<1) n=1; if (n>totalSteps) n=totalSteps;
        current = n;
        updateWizardUI();
        // focus first input in step
        const first = document.querySelector(`#step-${current} input, #step-${current} select, #step-${current} textarea, #step-${current} button`);
        if (first && typeof first.focus === 'function') try{ first.focus({preventScroll:true}); }catch{}
      }

      /* Back/Next controls removed; navigation handled via step indicators */


      // initialize view
      showStep(1);
    }

    try { createWizard(); } catch (e) { console.warn('Wizard init failed', e); }
    try { fetchAndPopulateEvents(); } catch (e) { console.warn('Event population failed', e); }
    updateProgress();
    updateSubmitButton();
    // Ensure subscription amount and installment UI reflect initial selection
    try { updateInstallmentOptions(); } catch (e) { console.warn('updateInstallmentOptions failed on init', e); }

    if (window.location.hostname === "localhost") {
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        field.addEventListener("change", () => {
          console.log("[FORM AUDIT]", "Field changed", {
            id: sanitizeInput(field.id),
            value: sanitizeInput(field.value),
          });
        });
      });
    }
  });
}
