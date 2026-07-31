"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { ShieldAlert, X } from "lucide-react";

/** Clé de session : le rejet ne vaut que pour l'onglet courant, le rappel
 *  réapparaît à la prochaine visite tant que le numéro n'est pas vérifié. */
const DISMISS_KEY = "phone-verification-banner-dismissed";

interface PhoneVerificationBannerProps {
  /** Numéro E.164 à vérifier, transmis par le layout serveur. */
  phone: string;
}

export function PhoneVerificationBanner({ phone }: PhoneVerificationBannerProps) {
  const { lang } = useLang();
  // Lecture paresseuse : `sessionStorage` n'existe pas au rendu serveur.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed) return null;

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mx-auto mt-4 max-w-7xl px-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
        <ShieldAlert className="shrink-0 text-amber-600 dark:text-amber-400" size={20} />

        <div className="min-w-0 flex-1">
          <p className="text-start text-sm font-medium text-amber-900 dark:text-amber-100">
            {t("otp.bannerTitle", lang)}
          </p>
          <p className="text-start text-xs text-amber-800 dark:text-amber-200/80">
            {t("otp.bannerBody", lang)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/verify-otp?target=${encodeURIComponent(phone)}`}
            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-700"
          >
            {t("otp.bannerCta", lang)}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("otp.bannerDismiss", lang)}
            title={t("otp.bannerDismiss", lang)}
            className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
