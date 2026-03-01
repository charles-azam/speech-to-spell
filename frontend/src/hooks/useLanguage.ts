import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { t as translate, type Lang, type TranslationKey } from "../i18n";
import React from "react";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Lang {
  const stored = localStorage.getItem("spell-lang");
  if (stored === "en" || stored === "fr") return stored;
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("spell-lang", newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(key, lang),
    [lang],
  );

  return React.createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, t } },
    children,
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
