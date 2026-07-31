"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { register } from "@/lib/actions/auth";
import { CATEGORIES } from "@/lib/utils";
import { LocationPicker } from "@/components/LocationPicker";
import { isValidE164, toE164 } from "@/lib/utils/otp";

export function RegisterForm() {
  const { lang } = useLang();
  const router = useRouter();
  const [role, setRole] = useState<"CLIENT" | "PROVIDER">("CLIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [phone, setPhone] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    // Le téléphone n'est demandé qu'aux prestataires : pour un client, le champ
    // n'est pas rendu et toute valeur résiduelle est ignorée.
    const isProvider = role === "PROVIDER";
    const rawPhone = isProvider ? phone.trim() : "";
    const normalizedPhone = rawPhone ? toE164(rawPhone) : "";

    if (isProvider && !normalizedPhone) {
      setError(t("auth.phoneRequired", lang));
      setLoading(false);
      return;
    }
    if (normalizedPhone && !isValidE164(normalizedPhone)) {
      setError(t("auth.phoneInvalid", lang));
      setLoading(false);
      return;
    }

    formData.set("role", role);
    formData.set("phone", normalizedPhone);

    if (isProvider) {
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

    // Si un numéro a été fourni, on passe par la vérification OTP. Le dashboard
    // reste accessible sans vérification (bannière de rappel) : /verify-otp est
    // une étape recommandée, pas un mur.
    if (normalizedPhone) {
      router.push(`/verify-otp?target=${encodeURIComponent(normalizedPhone)}`);
      return;
    }

    const freshSession = await getSession();
    const sessionRole = freshSession?.user?.role;
    router.push(sessionRole === "PROVIDER" ? "/dashboard/prestataire" : "/dashboard/client");
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => {
            // Le champ téléphone disparaît : on vide la saisie pour qu'un
            // numéro tapé avant la bascule ne soit pas envoyé silencieusement.
            setPhone("");
            setError("");
            setRole("CLIENT");
          }}
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
          onClick={() => {
            setError("");
            setRole("PROVIDER");
          }}
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
              {t("auth.phone", lang)}
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+216 55 123 456"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("auth.phoneHint", lang)}
            </p>
          </div>

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
