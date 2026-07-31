"use client";

import { useState } from "react";
import { updateAccountSettings } from "@/lib/actions/account";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export function AccountSettingsForm({ defaultName, email }: { defaultName?: string | null; email?: string | null }) {
  const { lang } = useLang();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!name || name.length < 2) {
      setError(t("error.nameTooShort", lang));
      setLoading(false);
      return;
    }

    if (currentPassword && newPassword && newPassword.length < 6) {
      setError(t("error.passwordTooShort", lang));
      setLoading(false);
      return;
    }

    const result = await updateAccountSettings(formData);
    if (result?.error) setError(result.error);
    else if (result?.success) setSuccess(result.success);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t("auth.name", lang)}</label>
        <input type="text" name="name" defaultValue={defaultName ?? ""}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t("auth.email", lang)}</label>
        <input type="email" value={email ?? ""} disabled
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400" />
      </div>
      <hr />
      <h3 className="font-medium">{t("comp.changePassword", lang)}</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t("comp.currentPassword", lang)}</label>
        <input type="password" name="currentPassword" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t("comp.newPassword", lang)}</label>
        <input type="password" name="newPassword" minLength={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
      </div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>}
      <button type="submit" disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition">
        {loading ? t("comp.saving", lang) : t("comp.save", lang)}
      </button>
    </form>
  );
}
