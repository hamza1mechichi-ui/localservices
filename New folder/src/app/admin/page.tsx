"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState, useEffect } from "react";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getAllReviews,
  hideReview,
  deleteReview,
  getAdvancedStats,
} from "@/lib/actions/admin";
import { CATEGORIES } from "@/lib/utils";
import { Trash2, EyeOff, Plus, Loader2 } from "lucide-react";

type Stats = NonNullable<Awaited<ReturnType<typeof getAdvancedStats>>>;
type Category = Awaited<ReturnType<typeof getCategories>>[number];
type Review = Awaited<ReturnType<typeof getAllReviews>>[number];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"stats" | "categories" | "reviews">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { lang } = useLang();

  useEffect(() => {
    if (activeTab === "stats") loadStats();
    if (activeTab === "categories") loadCategories();
    if (activeTab === "reviews") loadReviews();
  }, [activeTab]);

  async function loadStats() {
    setLoadingData(true);
    const data = await getAdvancedStats();
    setStats(data);
    setLoadingData(false);
  }

  async function loadCategories() {
    setLoadingData(true);
    const data = await getCategories();
    setCategories(data);
    setLoadingData(false);
  }

  async function loadReviews() {
    setLoadingData(true);
    const data = await getAllReviews();
    setReviews(data);
    setLoadingData(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.set("name", newCategory);
    const result = await createCategory(fd);
    if (result?.error) setError(result.error);
    else if (result?.success) {
      setSuccess(t("admin.categoryAdded", lang));
      setNewCategory("");
      loadCategories();
    }
    setLoading(false);
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm(t("admin.confirmDeleteCategory", lang))) return;
    const result = await deleteCategory(id);
    if (result?.error) setError(result.error);
    else loadCategories();
  }

  async function handleHideReview(id: string) {
    await hideReview(id);
    loadReviews();
  }

  async function handleDeleteReview(id: string) {
    if (!confirm(t("admin.confirmDeleteReview", lang))) return;
    await deleteReview(id);
    loadReviews();
  }

  function renderTab(label: string, tab: typeof activeTab) {
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          activeTab === tab
            ? "bg-neo-blue text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-start text-3xl font-bold text-zinc-900 dark:text-white">
        {t("admin.title", lang)}
      </h1>

      <div className="mb-6 flex gap-2">
        {renderTab(t("admin.stats", lang), "stats")}
        {renderTab(t("admin.categories", lang), "categories")}
        {renderTab(t("admin.reviews", lang), "reviews")}
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-start text-red-600 dark:bg-red-900/20">{error}</div>}
      {success && <div className="mb-6 rounded-lg bg-green-50 p-4 text-start text-green-600 dark:bg-green-900/20">{success}</div>}

      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-zinc-400 dark:text-zinc-500" size={24} />
        </div>
      ) : (
        <>
          {activeTab === "stats" && stats && (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("admin.users", lang)} value={stats.totalUsers} />
                <StatCard label={t("admin.clients", lang)} value={stats.totalClients} color="blue" />
                <StatCard label={t("admin.providers", lang)} value={stats.totalProviders} color="green" />
                <StatCard label={t("admin.new7days", lang)} value={stats.usersLast7Days} color="purple" />
                <StatCard label={t("admin.requests", lang)} value={stats.totalRequests} />
                <StatCard label={t("admin.offers", lang)} value={stats.totalOffers} />
                <StatCard label={t("admin.proMembers", lang)} value={stats.proCount} color="purple" />
                <StatCard label={t("admin.reviews", lang)} value={stats.reviewsCount} color="yellow" />
                <StatCard label={t("admin.pending", lang)} value={stats.offersPending} color="orange" />
                <StatCard label={t("admin.accepted", lang)} value={stats.offersAccepted} color="green" />
                <StatCard label={t("admin.completed", lang)} value={stats.offersCompleted} color="blue" />
                <StatCard
                  label={t("admin.revenue", lang)}
                  value={`${stats.totalRevenue.toLocaleString("fr-FR")} ${t("currency.symbol", lang)}`}
                  color="green"
                />
              </div>

              {stats.topCategories.length > 0 && (
                <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
                  <h2 className="mb-4 text-start text-lg font-semibold">{t("admin.topCategories", lang)}</h2>
                  <div className="space-y-3">
                    {stats.topCategories.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-start text-sm font-medium">{c.name}</span>
                        <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-700">
                          <div
                            className="h-2.5 rounded-full bg-neo-blue"
                            style={{ width: `${Math.min(100, (c.count / stats.topCategories[0].count) * 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-end text-sm text-zinc-500 dark:text-zinc-400">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "categories" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
                <h2 className="mb-4 text-start text-lg font-semibold">{t("admin.currentCategories", lang)}</h2>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-start text-sm text-zinc-400 dark:text-zinc-500">{t("admin.noCategories", lang)}</p>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between border-b border-zinc-50 py-2 dark:border-white/10">
                        <span className="text-start text-sm">{cat.name}</span>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-red-400 transition hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t border-zinc-900/10 pt-4 dark:border-white/10">
                  <p className="text-start text-xs text-zinc-400 dark:text-zinc-500">
                    {t("admin.defaultCategories", lang)} : {CATEGORIES.join(", ")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
                <h2 className="mb-4 text-start text-lg font-semibold">{t("admin.addCategory", lang)}</h2>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={t("admin.categoryName", lang)}
                    required
                    minLength={2}
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-start text-sm dark:border-white/20"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newCategory}
                    className="flex items-center gap-1 rounded-lg bg-neo-blue px-4 py-2 text-sm text-white transition hover:bg-neo-blue/90 disabled:opacity-50"
                  >
                    <Plus size={16} /> {t("admin.add", lang)}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
              {reviews.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                  <p className="text-lg">{t("admin.noReviews", lang)}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-zinc-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.client", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.provider", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.rating", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.comment", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.request", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.status", lang)}</th>
                        <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{t("admin.actions", lang)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {reviews.map((r) => (
                        <tr key={r.id} className={`hover:bg-zinc-50 dark:hover:bg-white/10 ${r.hidden ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3 text-start text-sm">{r.client.name}</td>
                          <td className="px-4 py-3 text-start text-sm">{r.provider.businessName}</td>
                          <td className="px-4 py-3">
                            <span className="text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-start text-sm">{r.comment || "-"}</td>
                          <td className="px-4 py-3 text-start text-sm text-zinc-500 dark:text-zinc-400">{r.serviceRequest.title}</td>
                          <td className="px-4 py-3">
                            {r.hidden ? (
                              <span className="text-xs font-medium text-red-600">{t("admin.hidden", lang)}</span>
                            ) : (
                              <span className="text-xs font-medium text-green-600">{t("admin.visible", lang)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {!r.hidden && (
                                <button onClick={() => handleHideReview(r.id)} className="p-1 text-orange-500 hover:text-orange-700" title={t("admin.hide", lang)}>
                                  <EyeOff size={14} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteReview(r.id)} className="p-1 text-red-500 hover:text-red-700" title={t("admin.delete", lang)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    blue: "text-neo-blue",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    yellow: "text-yellow-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
      <p className="text-start text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold ${color ? colors[color] : "text-zinc-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}
