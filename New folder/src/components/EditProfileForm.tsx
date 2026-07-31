"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { CATEGORIES } from "@/lib/utils";
import { updateProviderProfile } from "@/lib/actions/profile";
import { LocationPicker } from "@/components/LocationPicker";

interface ProfileFormProps {
  profile: {
    businessName: string;
    category: string;
    location: string;
    description?: string | null;
    phone?: string | null;
  };
  onUpdate: () => void;
}

export function EditProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const { lang } = useLang();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    formData.set("location", editLocation);
    if (editCoords) {
      formData.set("lat", editCoords.lat.toString());
      formData.set("lng", editCoords.lng.toString());
    }

    const result = await updateProviderProfile(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess("Profil mis à jour avec succès");
      onUpdate();
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.businessName", lang)}
          </label>
          <input
            type="text"
            name="businessName"
            defaultValue={profile.businessName}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("comp.phone", lang)}
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={profile.phone ?? ""}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={t("phone.placeholder", lang)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth.category", lang)}
          </label>
          <select
            name="category"
            defaultValue={profile.category}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
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
            value={editLocation}
            onChange={setEditLocation}
            onCoordinates={(lat, lng) => setEditCoords({ lat, lng })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("comp.description", lang)}
        </label>
        <textarea
          name="description"
          defaultValue={profile.description ?? ""}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder={t("comp.descriptionPlaceholder", lang)}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? t("comp.saving", lang) : t("comp.save", lang)}
      </button>
    </form>
  );
}
