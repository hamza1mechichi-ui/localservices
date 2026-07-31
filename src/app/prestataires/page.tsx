"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { searchProviders } from "@/lib/actions/profile";
import { CATEGORIES } from "@/lib/utils";
import { ProviderCard } from "@/components/ProviderCard";
import { getFavoritedIds } from "@/lib/actions/favorites";
import { useSession } from "next-auth/react";
import { Search, MapPin, Briefcase } from "lucide-react";

interface Provider {
  id: string;
  businessName: string;
  category: string;
  location: string;
  description: string | null;
  plan: string;
  averageRating: number;
  reviewsCount: number;
  user: { name: string; createdAt: Date | string };
}

export default function PrestatairesPage() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoritedIds, setFavoritedIds] = useState<string[]>([]);
  const { lang } = useLang();

  useEffect(() => {
    loadProviders();
  }, [currentPage]);

  async function loadProviders() {
    setLoading(true);
    const [result, favIds] = await Promise.all([
      searchProviders({
        search: search || undefined,
        category: category || undefined,
        location: location || undefined,
        page: currentPage,
      }),
      session?.user?.role === "CLIENT" ? getFavoritedIds() : [],
    ]);
    setProviders(result.data as unknown as Provider[]);
    setTotalPages(result.totalPages);
    setFavoritedIds(favIds);
    setLoading(false);
  }

  function handleSearch() {
    setCurrentPage(1);
    loadProviders();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("search.title", lang)}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        {t("search.subtitle", lang)}
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search.placeholder", lang)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full sm:w-48">
          <option value="">{t("search.allCategories", lang)}</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder={t("search.locationPlaceholder", lang)}
            className="w-full sm:w-48 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
        </div>
        <button onClick={handleSearch}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">{t("search.button", lang)}</button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Briefcase size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg">{t("search.empty", lang)}</p>
          <p className="text-sm mt-1">{t("search.emptyHint", lang)}</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                isFavorited={favoritedIds.includes(p.id)}
                viewProfileLabel={t("search.viewProfile", lang)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← {t("search.prev", lang)}
              </button>
              <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                {t("search.page", lang)} {currentPage} / {totalPages}
              </span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                {t("search.next", lang)} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
