import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';
import type { SupportedLanguage, Translations } from '../i18n/translations';

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('sgim_lang') as SupportedLanguage;
    return saved === 'en' || saved === 'ki' ? saved : 'es';
  });

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('sgim_lang', newLang);
  };

  const t = translations[lang] || translations.es;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe ser utilizado dentro de LanguageProvider');
  }
  return context;
};
