import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/server-lang";

export const metadata: Metadata = {
  title: "Inscription - LocalServices",
  description: "Créez un compte gratuit sur LocalServices pour publier des demandes ou proposer vos services.",
};

export default async function InscriptionPage() {
  const lang = await getServerLang();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("auth.register.title", lang)}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t("auth.register.subtitle", lang)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <RegisterForm />
        </div>
        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-300">
          {t("auth.register.hasAccount", lang)}{" "}
          <Link href="/connexion" className="text-blue-600 hover:underline">
            {t("auth.register.link", lang)}
          </Link>
        </p>
      </div>
    </div>
  );
}
