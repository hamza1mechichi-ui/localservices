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
    avatarUrl?: string | null;
    websiteUrl?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    linkedinUrl?: string | null;
    youtubeUrl?: string | null;
    portfolioImages?: string[];
    portfolioVideos?: string[];
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

  // Champs réseaux sociaux
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(profile.facebookUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(profile.tiktokUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(profile.youtubeUrl ?? "");

  // Portfolio
  const [portfolioImages, setPortfolioImages] = useState<string[]>(profile.portfolioImages ?? []);
  const [portfolioVideos, setPortfolioVideos] = useState<string[]>(profile.portfolioVideos ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    formData.set("location", editLocation);
    if (editCoords) {
      formData.set("lat", editCoords.lat.toString());
      formData.set("lng", editCoords.lng.toString());
    }

    // Champs réseaux sociaux
    formData.set("avatarUrl", avatarUrl);
    formData.set("websiteUrl", websiteUrl);
    formData.set("facebookUrl", facebookUrl);
    formData.set("instagramUrl", instagramUrl);
    formData.set("tiktokUrl", tiktokUrl);
    formData.set("linkedinUrl", linkedinUrl);
    formData.set("youtubeUrl", youtubeUrl);

    // Portfolio
    portfolioImages.forEach((url) => formData.append("portfolioImages", url));
    portfolioVideos.forEach((url) => formData.append("portfolioVideos", url));

    const result = await updateProviderProfile(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess("Profil mis à jour avec succès");
      onUpdate();
    }
    setLoading(false);
  }

  function addImage() {
    if (newImageUrl.trim()) {
      setPortfolioImages([...portfolioImages, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  }

  function removeImage(index: number) {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
  }

  function addVideo() {
    if (newVideoUrl.trim()) {
      setPortfolioVideos([...portfolioVideos, newVideoUrl.trim()]);
      setNewVideoUrl("");
    }
  }

  function removeVideo(index: number) {
    setPortfolioVideos(portfolioVideos.filter((_, i) => i !== index));
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* === Infos de base === */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Informations générales
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t("auth.businessName", lang)}
            </label>
            <input
              type="text"
              name="businessName"
              defaultValue={profile.businessName}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t("comp.phone", lang)}
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={profile.phone ?? ""}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder={t("phone.placeholder", lang)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t("auth.category", lang)}
            </label>
            <select
              name="category"
              defaultValue={profile.category}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t("auth.location", lang)}
            </label>
            <LocationPicker
              value={editLocation}
              onChange={setEditLocation}
              onCoordinates={(lat, lng) => setEditCoords({ lat, lng })}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {t("comp.description", lang)}
          </label>
          <textarea
            name="description"
            defaultValue={profile.description ?? ""}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t("comp.descriptionPlaceholder", lang)}
          />
        </div>
      </div>

      {/* === Photo de profil === */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Photo de profil
        </h3>
        <div className="flex items-center gap-4">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
            />
          )}
          <div className="flex-1">
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://exemple.com/photo.jpg"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">URL de votre photo de profil professionnelle</p>
          </div>
        </div>
      </div>

      {/* === Réseaux sociaux === */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Présence en ligne
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">🌐</span>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://votre-site.com"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">📘</span>
            <input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/votre-page"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">📸</span>
            <input
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/votre-compte"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">🎵</span>
            <input
              type="url"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@votre-compte"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">💼</span>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/votre-profil"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">▶️</span>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@votre-chaine"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* === Portfolio Images === */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Portfolio — Images
        </h3>
        <div className="space-y-2">
          {portfolioImages.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <img src={url} alt={`img-${i}`} className="w-10 h-10 rounded object-cover flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate">{url}</span>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://exemple.com/image.jpg"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
            />
            <button
              type="button"
              onClick={addImage}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition"
            >
              + Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* === Portfolio Vidéos === */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Portfolio — Vidéos
        </h3>
        <div className="space-y-2">
          {portfolioVideos.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-lg flex-shrink-0">🎬</span>
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate">{url}</span>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="https://youtube.com/... ou lien vidéo directe"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVideo())}
            />
            <button
              type="button"
              onClick={addVideo}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition"
            >
              + Ajouter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-3 rounded-lg text-sm">{success}</div>
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
