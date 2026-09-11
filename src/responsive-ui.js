const RESPONSIVE_UI_STYLE_ID = 'hybe-responsive-ui';

const responsiveCss = `
  :root {
    --mobile-edge: max(10px, env(safe-area-inset-left));
    --modal-edge: max(8px, env(safe-area-inset-left));
  }

  html,
  body {
    max-width: 100%;
  }

  body,
  button,
  input,
  select,
  textarea {
    -webkit-tap-highlight-color: transparent;
  }

  button,
  .btn,
  input,
  select,
  textarea,
  summary,
  a {
    touch-action: manipulation;
  }

  .app-shell,
  .application-card,
  .application-card .card-body,
  .form-steps,
  .step,
  #subscription-form,
  .row > * {
    min-width: 0;
  }

  .application-card {
    overflow: clip;
  }

  .application-card > .card-body {
    padding: clamp(12px, 3.2vw, 20px);
  }

  .onboarding-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .onboarding-entry > span {
    flex: 1 1 220px;
    min-width: 0;
  }

  .onboarding-entry > .btn {
    flex: 0 0 auto;
  }

  .modal {
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
  }

  .modal-dialog {
    width: min(calc(100vw - 20px - env(safe-area-inset-left) - env(safe-area-inset-right)), 460px);
    max-width: 460px;
    margin-top: max(10px, env(safe-area-inset-top));
    margin-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .modal-dialog-centered {
    min-height: calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }

  .modal-content {
    max-height: calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    border-radius: 12px;
  }

  .modal-content.p-4,
  .modal-content.p-3,
  .modal-content.p-2 {
    padding: 0 !important;
  }

  .modal-header {
    flex: 0 0 auto;
    gap: 10px;
  }

  .modal-header .modal-title,
  .modal-header h2,
  .modal-header h5 {
    min-width: 0;
    margin: 0;
  }

  .modal-header .btn-close {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    padding: 10px;
    margin: -8px -8px -8px auto;
  }

  .modal-body {
    min-height: 0;
    scrollbar-gutter: stable;
  }

  .modal-footer {
    flex: 0 0 auto;
    gap: 8px;
  }

  .modal-footer .btn {
    min-width: 0;
  }

  #otp-display-email,
  #confirm-details dd,
  #global-error-message,
  .modal-body a,
  .modal-body strong {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  #otp-resend-btn,
  #otp-change-email-btn {
    min-height: 40px;
    padding: 0.35rem 0.4rem !important;
  }

  #otp-code-input {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.22em;
  }

  #confirm-details {
    row-gap: 0.3rem;
  }

  #confirm-details dt,
  #confirm-details dd {
    margin-bottom: 0.45rem;
  }

  .table-responsive {
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }

  .redirect-overlay {
    position: fixed;
    inset: 0;
    z-index: 1090;
    display: grid;
    place-items: center;
    padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
    overflow-y: auto;
    background: rgba(11, 11, 11, 0.62);
    backdrop-filter: blur(3px);
  }

  .redirect-overlay.d-none {
    display: none !important;
  }

  .redirect-card {
    width: min(100%, 420px);
    max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    overflow-y: auto;
    padding: clamp(18px, 5vw, 28px);
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
  }

  .language-prompt-modal {
    padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)) !important;
    overflow-y: auto;
  }

  .language-prompt-content {
    width: min(100%, 400px) !important;
    max-height: calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  .modal.fade .modal-dialog,
  .language-prompt-content,
  .redirect-card {
    will-change: transform, opacity;
  }

  .modal.fade .modal-dialog {
    transition: transform 180ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease-out;
    transform: translateY(6px) scale(.985);
    opacity: .94;
  }

  .modal.show .modal-dialog {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  @media (max-width: 575.98px) {
    main > .container {
      margin-top: 1rem !important;
      margin-bottom: 1rem !important;
    }

    .application-card {
      padding: 0;
      border-radius: 12px;
    }

    .application-card > .card-body {
      padding: 12px;
    }

    .modal-dialog {
      width: calc(100vw - 16px - env(safe-area-inset-left) - env(safe-area-inset-right));
      margin-left: auto;
      margin-right: auto;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 12px;
    }

    .modal-footer {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }

    .modal-footer > * {
      margin: 0 !important;
    }

    .modal-footer .btn {
      width: 100%;
    }

    #onboardingModal .modal-footer {
      grid-template-columns: 1fr;
    }

    #confirm-details dt,
    #confirm-details dd {
      width: 100%;
      max-width: 100%;
      flex: 0 0 100%;
    }

    #confirm-details dt {
      margin-bottom: 0.1rem;
      font-size: 0.78rem;
      color: #6c757d;
    }

    #confirm-details dd {
      margin-bottom: 0.65rem;
      font-size: 0.92rem;
    }

    .onboarding-entry {
      align-items: stretch;
    }

    .onboarding-entry > .btn {
      width: 100%;
    }

    .event-card .card-body,
    .premium-inclusions-card,
    .roadmap-card,
    .limited-availability-notice {
      padding: 0.8rem !important;
    }

    .language-prompt-buttons {
      display: grid !important;
      grid-template-columns: 1fr;
      gap: 8px !important;
    }

    .language-prompt-buttons > .btn {
      width: 100%;
      margin: 0;
    }
  }

  @media (max-width: 360px) {
    .application-card > .card-body {
      padding: 10px;
    }

    .modal-dialog {
      width: calc(100vw - 12px - env(safe-area-inset-left) - env(safe-area-inset-right));
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 10px;
    }

    .modal-footer {
      grid-template-columns: 1fr;
    }
  }

  @media (max-height: 500px) and (orientation: landscape) {
    .modal-dialog-centered {
      min-height: auto;
      align-items: flex-start;
    }

    .modal-dialog {
      margin-top: max(6px, env(safe-area-inset-top));
      margin-bottom: max(6px, env(safe-area-inset-bottom));
    }

    .modal-content,
    .language-prompt-content,
    .redirect-card {
      max-height: calc(100dvh - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .btn,
    .form-check-input,
    .btn-close,
    summary {
      cursor: default;
    }

    .btn:not(.btn-sm),
    .form-control,
    .form-select {
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal.fade .modal-dialog,
    .language-prompt-content,
    .redirect-card,
    .progress-bar,
    .btn,
    .bi-check-circle-fill,
    .logo-pulse,
    .shake {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }
`;

export function installResponsiveUi() {
  if (typeof document === 'undefined' || document.getElementById(RESPONSIVE_UI_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RESPONSIVE_UI_STYLE_ID;
  style.textContent = responsiveCss;
  document.head.appendChild(style);
  document.documentElement.dataset.responsiveUi = 'ready';
}

if (typeof document !== 'undefined') installResponsiveUi();
