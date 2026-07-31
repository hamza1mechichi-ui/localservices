"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

export function LoginForm() {
  const { lang } = useLang();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // signIn côté client (plutôt qu'une Server Action) met à jour directement
    // l'état interne de SessionProvider dès que la connexion réussit — la Navbar
    // reflète donc la session immédiatement, sans dépendre d'un nouveau rendu
    // serveur du layout racine.
    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    router.refresh();
    const freshSession = await getSession();
    const role = freshSession?.user?.role;
    router.push(role === "ADMIN" ? "/admin" : role === "PROVIDER" ? "/dashboard/prestataire" : "/dashboard/client");
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          {t("auth.email", lang)}
        </label>
        <input
          type="email"
          name="email"
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t("auth.emailPlaceholder", lang)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          {t("auth.password", lang)}
        </label>
        <input
          type="password"
          name="password"
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? t("auth.loggingIn", lang) : t("auth.loginBtn", lang)}
      </button>
    </form>
  );
}
