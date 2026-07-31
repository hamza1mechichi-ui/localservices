"use client";

import { useState, useEffect } from "react";
import { X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

const STORAGE_KEY = "localservices_ad_last_shown";

export function CreativeAdModal() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Lecture localStorage côté client uniquement — même justification que
    // ThemeProvider.tsx : impossible dans l'initialiseur de useState sans
    // provoquer un mismatch d'hydratation SSR.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const today = new Date().toDateString();
      if (lastShown !== today) setOpen(true);
    } catch {
      // localStorage indisponible : on n'affiche simplement rien.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    } catch {
      // pas grave : la modale réapparaîtra simplement plus souvent.
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-[32px] bg-white shadow-2xl sm:grid-cols-5 dark:bg-neo-obsidian"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label={t("comp.close", lang)}
          className="tactile absolute end-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 backdrop-blur transition hover:bg-white sm:end-5 sm:top-5"
        >
          <X size={16} />
        </button>

        {/* Panneau visuel — "couverture" saturée, abstraite, grain cinématographique */}
        <div className="bg-grain relative col-span-1 flex min-h-[220px] flex-col justify-between overflow-hidden bg-zinc-900 p-7 sm:col-span-2 sm:min-h-0">
          <div
            aria-hidden
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(120% 90% at 15% 0%, var(--color-neo-orange) 0%, transparent 55%), radial-gradient(120% 90% at 100% 100%, var(--color-neo-blue) 0%, transparent 60%)",
            }}
          />
          <span className="relative z-10 text-start text-xs font-medium uppercase tracking-[0.2em] text-white/70">
            LocalServices — N°01
          </span>
          <span className="relative z-10 mt-auto text-start font-serif text-[5rem] italic leading-none text-white/15">
            &ldquo;
          </span>
        </div>

        {/* Panneau texte — mise en page éditoriale */}
        <div className="col-span-1 flex flex-col justify-center p-8 sm:col-span-3 sm:p-10">
          <p className="text-start text-xs font-medium uppercase tracking-[0.2em] text-neo-orange">
            {t("ad.kicker", lang)}
          </p>
          <h2 className="mt-3 text-start text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl dark:text-white">
            {t("ad.title", lang)}
          </h2>
          <p className="mt-4 text-start text-sm italic leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("ad.body", lang)}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/inscription"
              onClick={handleClose}
              className="tactile group inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              {t("ad.cta", lang)}
              <ArrowUpRight size={15} className="rtl-flip transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <button
              onClick={handleClose}
              className="text-start text-xs font-medium text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {t("ad.dismiss", lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
