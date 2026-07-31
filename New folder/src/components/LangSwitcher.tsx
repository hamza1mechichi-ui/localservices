"use client";

import { useLang } from "@/components/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const current = LANGUAGES.find((l) => l.code === lang);
  const next = LANGUAGES.find((l) => l.code !== lang)!;

  return (
    <button
      onClick={() => setLang(next.code)}
      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
      title={lang === "fr" ? next.labelAr : next.label}
    >
      <Globe size={16} />
      <span>{current?.label ?? "FR"}</span>
    </button>
  );
}
