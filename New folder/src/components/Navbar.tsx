"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitcher } from "./LangSwitcher";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const { lang } = useLang();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const dashboardHref =
    session?.user?.role === "ADMIN"
      ? "/admin"
      : session?.user?.role === "PROVIDER"
      ? "/dashboard/prestataire"
      : "/dashboard/client";

  return (
    <header className="glass sticky top-0 z-50 border-b border-gray-200 transition-colors dark:border-gray-700">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-xl font-bold text-neo-blue">
          {t("app.name", lang)}
        </Link>

        {/* Bouton menu mobile */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 sm:hidden"
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Menu desktop */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/prestataires"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {t("nav.prestataires", lang)}
          </Link>

          <LangSwitcher />
          <ThemeToggle />

          {session ? (
            <>
              <NotificationBell />

              <div className="group relative">
                <button className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="flex size-7 items-center justify-center rounded-full bg-neo-blue text-xs font-semibold text-white">
                    {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="max-w-[120px] truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                    {session.user?.name}
                  </span>
                </button>

                <div className="invisible absolute end-0 top-full z-50 mt-2 w-52 origin-top-right scale-95 rounded-xl border border-gray-100 bg-white p-1.5 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:scale-100 group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800">
                  <p className="truncate px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {t("nav.hello", lang)}, {session.user?.name}
                  </p>
                  <Link
                    href={dashboardHref}
                    className="block rounded-lg px-3 py-2 text-start text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {t("nav.dashboard", lang)}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/connexion" })}
                    className="block w-full rounded-lg px-3 py-2 text-start text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    {t("nav.logout", lang)}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {t("nav.login", lang)}
              </Link>
              <Link
                href="/inscription"
                className="tactile rounded-lg bg-neo-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neo-blue/90"
              >
                {t("nav.register", lang)}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Menu mobile déroulant */}
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 sm:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 space-y-1 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <Link
            href="/prestataires"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-start text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("nav.prestataires", lang)}
          </Link>

          <div className="flex items-center justify-between px-3 py-2">
            <LangSwitcher />
            <ThemeToggle />
          </div>

          {session ? (
            <>
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-start text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t("nav.dashboard", lang)}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/connexion" })}
                className="block w-full rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {t("nav.logout", lang)}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 px-3 pt-1">
              <Link
                href="/connexion"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
              >
                {t("nav.login", lang)}
              </Link>
              <Link
                href="/inscription"
                onClick={() => setOpen(false)}
                className="tactile rounded-lg bg-neo-blue px-3 py-2 text-center text-sm font-semibold text-white"
              >
                {t("nav.register", lang)}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
