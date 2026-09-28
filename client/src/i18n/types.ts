export type AppLanguage = 'vi' | 'en' | 'zh' | 'ru';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export interface TranslationSchema {
  nav: {
    newNote: string;
    online: string;
    lock: string;
    myNotes: string;
    logout: string;
    loginRegister: string;
    darkMode: string;
    lightMode: string;
  };
  toolbar: {
    undo: string;
    redo: string;
    zoomIn: string;
    zoomOut: string;
    changeUrl: string;
    protectPassword: string;
    share: string;
    rawTooltip: string;
    copy: string;
    copied: string;
    download: string;
    langPlaintext: string;
  };
  editor: {
    readOnly: string;
    codePlaceholder: string;
    textPlaceholder: string;
  };
  status: {
    isTyping: string;
    saving: string;
    synced: string;
    words: string;
    chars: string;
    noSpaces: string;
    lines: string;
  };
  passwordModal: {
    titleSet: string;
    titleChange: string;
    subtitle: string;
    currentPass: string;
    currentPlaceholder: string;
    newPass: string;
    pass: string;
    confirmPass: string;
    submitUpdate: string;
    submitEnable: string;
    removeBtn: string;
    errMismatch: string;
    successRemoved: string;
  };
  changeUrlModal: {
    title: string;
    subtitle: string;
    currentUrl: string;
    desiredUrl: string;
    notePassword: string;
    passPlaceholder: string;
    updating: string;
    confirmBtn: string;
    errEmpty: string;
    errFormat: string;
    errSame: string;
  };
  shareModal: {
    title: string;
    subtitle: string;
    readOnlyTitle: string;
    readOnlyBadge: string;
    readOnlyDesc: string;
    editTitle: string;
    editBadge: string;
    editDesc: string;
    copy: string;
    copied: string;
  };
  authModal: {
    loginTab: string;
    registerTab: string;
    loginTitle: string;
    registerTitle: string;
    username: string;
    usernamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    captcha: string;
    captchaPlaceholder: string;
    submitLogin: string;
    submitRegister: string;
    processing: string;
  };
  lockedNote: {
    title: string;
    subtitle: string;
    placeholder: string;
    unlockBtn: string;
    shareLockedTitle: string;
    shareLockedDesc: string;
    goToOriginal: string;
  };
  sharePage: {
    bannerTitle: string;
    bannerDesc: string;
    editBtn: string;
    copiedLink: string;
  };
  myNotes: {
    title: string;
    subtitle: string;
    newNote: string;
    searchPlaceholder: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    emptyPreview: string;
    words: string;
    chars: string;
    openNote: string;
  };
}
