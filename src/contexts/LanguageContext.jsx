import { createContext, useContext, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "kassa_language";

const LanguageContext = createContext({
  language: "ru",
  setLanguage: () => {},
  toggleLanguage: () => {},
});

const normalizeLanguage = (value) => (value === "en" ? "en" : "ru");

const getStoredLanguage = () => {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(raw);
  } catch {
    return "ru";
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getStoredLanguage());

  const setLanguage = (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "ru" ? "en" : "ru");
  };

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

