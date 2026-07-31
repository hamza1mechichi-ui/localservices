"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useLang } from "@/components/LanguageProvider";
import { getAdvancedStats } from "@/lib/actions/admin";
import { t } from "@/lib/i18n";
import { Loader2 } from "lucide-react";
import StatCard from "./StatCard";

type Stats = NonNullable<Awaited<ReturnType<typeof getAdvancedStats>>>;

export default function AdminDashboard() {
  const { lang } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdvancedStats();
      // getAdvancedStats renvoie null si l'appelant n'est pas ADMIN.
      if (!data) {
        setError(t("errors.unauthorized", lang));
        setStats(null);
        return;
      }
      setStats(data);
      setError(null);
      setLastUpdate(new Date().toLocaleTimeString(lang === "ar-tn" ? "ar-TN" : "fr-FR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.server", lang));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  // Chargement initial + rafraîchissement automatique toutes les 30 s.
  // startTransition : les mises à jour d'état déclenchées par fetchStats sont
  // non urgentes, ce qui évite les rendus en cascade au montage.
  useEffect(() => {
    startTransition(() => {
      fetchStats();
    });
    const poll = setInterval(() => {
      startTransition(() => {
        fetchStats();
      });
    }, 30_000);
    return () => clearInterval(poll);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-zinc-400 dark:text-zinc-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-start text-red-600 dark:bg-red-900/20">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const locale = lang === "ar-tn" ? "ar-TN" : "fr-FR";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.users", lang)} value={stats.totalUsers} color="blue" locale={locale} />
        <StatCard label={t("admin.clients", lang)} value={stats.totalClients} color="blue" locale={locale} />
        <StatCard label={t("admin.providers", lang)} value={stats.totalProviders} color="green" locale={locale} />
        <StatCard label={t("admin.new7days", lang)} value={stats.usersLast7Days} color="purple" locale={locale} />
        <StatCard label={t("admin.requests", lang)} value={stats.totalRequests} locale={locale} />
        <StatCard label={t("admin.offers", lang)} value={stats.totalOffers} locale={locale} />
        <StatCard label={t("admin.proMembers", lang)} value={stats.proCount} color="purple" locale={locale} />
        <StatCard label={t("admin.reviews", lang)} value={stats.reviewsCount} color="yellow" locale={locale} />
        <StatCard label={t("admin.pending", lang)} value={stats.offersPending} color="orange" locale={locale} />
        <StatCard label={t("admin.accepted", lang)} value={stats.offersAccepted} color="green" locale={locale} />
        <StatCard label={t("admin.completed", lang)} value={stats.offersCompleted} color="blue" locale={locale} />
        <StatCard
          label={t("admin.revenue", lang)}
          value={`${stats.totalRevenue.toLocaleString(locale)} ${t("currency.symbol", lang)}`}
          color="green"
          locale={locale}
        />
        <StatCard label={t("admin.verifiedProviders", lang)} value={stats.verifiedProviders} color="green" locale={locale} />
        <StatCard label={t("admin.bannedUsers", lang)} value={stats.bannedUsers} color="red" locale={locale} />
      </div>

      {stats.topCategories.length > 0 && (
        <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
          <h2 className="mb-4 text-start text-lg font-semibold">{t("admin.topCategories", lang)}</h2>
          <div className="space-y-3">
            {stats.topCategories.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-start text-sm font-medium">{cat.name}</span>
                <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-700">
                  <div
                    className="h-2.5 rounded-full bg-neo-blue"
                    style={{
                      width: `${Math.min(100, (cat.count / stats.topCategories[0].count) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-12 text-end text-sm text-zinc-500 dark:text-zinc-400">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastUpdate && (
        <p className="text-start text-xs text-zinc-500 dark:text-zinc-400">
          {t("admin.lastUpdate", lang, { time: lastUpdate })}
        </p>
      )}
    </div>
  );
}
