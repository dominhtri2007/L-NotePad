import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppLanguage, AVAILABLE_LANGUAGES, LanguageOption, TranslationSchema } from '../i18n/types';
import { vi } from '../i18n/vi';
import { en } from '../i18n/en';
import { zh } from '../i18n/zh';
import { ru } from '../i18n/ru';

export { AVAILABLE_LANGUAGES };
export type { AppLanguage, LanguageOption, TranslationSchema };

const translations: Record<AppLanguage, TranslationSchema> = {
  vi,
  en,
  zh,
  ru,
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('notepad_app_lang') as AppLanguage;
    if (saved && ['vi', 'en', 'zh', 'ru'].includes(saved)) {
      return saved;
    }
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('en')) return 'en';
    return 'vi';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('notepad_app_lang', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language] || translations.vi;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
