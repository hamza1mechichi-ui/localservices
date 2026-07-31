"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Lang } from "@/lib/i18n";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "fr", setLang: () => {} });

export function LanguageProvider({ children, initialLang }: { children: React.ReactNode; initialLang: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `lang=${l};path=/;max-age=31536000`;
    document.documentElement.dir = l === "ar-tn" ? "rtl" : "ltr";
    document.documentElement.lang = l === "ar-tn" ? "ar-TN" : "fr";
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar-tn" ? "rtl" : "ltr";
    document.documentElement.lang = lang === "ar-tn" ? "ar-TN" : "fr";
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
