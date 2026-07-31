"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

const STORAGE_KEY = "localservices_ad_last_shown";

export function AdModal() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Lecture localStorage uniquement côté client (comportement volontaire,
    // équivalent au pattern déjà utilisé dans ThemeProvider.tsx : impossible de
    // faire ce check dans l'initialiseur de useState sans casser l'hydratation SSR).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const today = new Date().toDateString();
      if (lastShown !== today) {
        setOpen(true);
      }
    } catch {
      // localStorage indisponible (navigation privée stricte, etc.) : on n'affiche rien.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    } catch {
      // pas grave si localStorage est indisponible : la modale réapparaîtra simplement plus souvent.
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label={t("comp.close", lang)}
          className="absolute end-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-gray-600 backdrop-blur transition hover:bg-white dark:bg-gray-900/80 dark:text-gray-300"
        >
          <X size={16} />
        </button>

        <div className="bg-gradient-to-br from-blue-600 to-violet-600 px-6 py-8 text-center text-white">
          <Sparkles className="mx-auto mb-2" size={32} />
          <h2 className="text-start text-center text-xl font-bold">{t("ad.title", lang)}</h2>
        </div>

        <div className="p-6 text-center">
          <p className="mb-5 text-start text-center text-sm text-gray-600 dark:text-gray-300">{t("ad.body", lang)}</p>
          <Link
            href="/inscription"
            onClick={handleClose}
            className="inline-block w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t("ad.cta", lang)}
          </Link>
        </div>
      </div>
    </div>
  );
}
