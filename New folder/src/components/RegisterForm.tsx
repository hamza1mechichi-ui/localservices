"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { register } from "@/lib/actions/auth";
import { CATEGORIES } from "@/lib/utils";
import { LocationPicker } from "@/components/LocationPicker";

export function RegisterForm() {
  const { lang } = useLang();
  const router = useRouter();
  const [role, setRole] = useState<"CLIENT" | "PROVIDER">("CLIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("role", role);
    if (role === "PROVIDER") {
      formData.set("location", location);
      if (coords) {
        formData.set("lat", coords.lat.toString());
        formData.set("lng", coords.lng.toString());
      }
    }

    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const signInResult = await signIn("credentials", { email, password, redirect: false });

    if (signInResult?.error) {
      // Compte créé mais connexion automatique échouée (cas très rare) : on
      // renvoie vers la page de connexion plutôt que de bloquer l'utilisateur.
      router.push("/connexion");
      return;
    }

    router.refresh();
    const freshSession = await getSession();
    const sessionRole = freshSession?.user?.role;
    router.push(sessionRole === "PROVIDER" ? "/dashboard/prestataire" : "/dashboard/client");
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setRole("CLIENT")}
          className={`flex-1 py-3 rounded-lg font-medium transition ${
            role === "CLIENT"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          {t("auth.client", lang)}
        </button>
        <button
          type="button"
          onClick={() => setRole("PROVIDER")}
          className={`flex-1 py-3 rounded-lg font-medium transition ${
            role === "PROVIDER"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          {t("auth.provider", lang)}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.name", lang)}
        </label>
        <input
          type="text"
          name="name"
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t("auth.namePlaceholder", lang)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.password", lang)}
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      {role === "PROVIDER" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.businessName", lang)}
            </label>
            <input
              type="text"
              name="businessName"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("auth.businessPlaceholder", lang)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.category", lang)}
            </label>
            <select
              name="category"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t("auth.selectCategory", lang)}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.location", lang)}
            </label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              onCoordinates={(lat, lng) => setCoords({ lat, lng })}
            />
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? t("auth.registering", lang) : t("auth.registerBtn", lang)}
      </button>

      {role === "PROVIDER" && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t("auth.freeOffers", lang)}
          <br />
          {t("auth.proUnlimited", lang)}
        </p>
      )}
    </form>
  );
}
