"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import {
  getAllSubscriptions,
  updateUserSubscriptionAction,
  type AdminSubscription,
} from "@/lib/actions/admin";
import {
  ActionConfirmationModal,
  useConfirmationModal,
} from "@/components/admin/ActionConfirmationModal";
import StatCard from "@/components/admin/StatCard";
import { Loader2, RefreshCw } from "lucide-react";

// Tarifs mensuels indicatifs en TND, utilisés pour estimer le revenu récurrent.
const PLAN_PRICES: Record<string, number> = { FREE: 0, STARTER: 29, PRO: 89 };
const PLANS = ["FREE", "STARTER", "PRO"] as const;

export default function SubscriptionPanel() {
  const { lang } = useLang();
  const { modalState, showModal, hideModal } = useConfirmationModal();

  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllSubscriptions();
      setSubscriptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.server", lang));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    startTransition(() => {
      fetchSubscriptions();
    });
  }, [fetchSubscriptions]);

  const askChangePlan = (sub: AdminSubscription, plan: string) => {
    showModal({
      title: t("admin.confirmChangePlan", lang, { name: sub.businessName, plan }),
      description: t("admin.confirmChangePlanDesc", lang, { plan }),
      confirmLabel: t("admin.confirm", lang),
      variant: plan === "FREE" ? "warning" : "info",
      onConfirm: async () => {
        const result = await updateUserSubscriptionAction(sub.userId, plan);
        if (!result.success) {
          setError(result.error);
        } else {
          await fetchSubscriptions();
        }
        hideModal();
      },
    });
  };

  const locale = lang === "ar-tn" ? "ar-TN" : "fr-FR";
  const currency = t("currency.symbol", lang);

  const mrr = subscriptions.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] ?? 0), 0);
  const countBy = (plan: string) => subscriptions.filter((s) => s.plan === plan).length;

  const planBadge: Record<string, string> = {
    FREE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    STARTER: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    PRO: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-zinc-400" size={24} />
        <p className="ms-3 text-sm text-zinc-500">{t("admin.loading", lang)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-start text-lg font-semibold">{t("admin.subscriptionsTab", lang)}</h2>
        <button
          type="button"
          onClick={fetchSubscriptions}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          <RefreshCw size={14} />
          {t("admin.refresh", lang)}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.totalMrr", lang)}
          value={`${mrr.toLocaleString(locale)} ${currency}`}
          color="green"
          locale={locale}
        />
        <StatCard label={t("admin.proMembers", lang)} value={countBy("PRO")} color="purple" locale={locale} />
        <StatCard label={t("admin.starterMembers", lang)} value={countBy("STARTER")} color="green" locale={locale} />
        <StatCard label={t("admin.freeMembers", lang)} value={countBy("FREE")} color="blue" locale={locale} />
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-zinc-900/10 bg-white p-8 text-center text-zinc-500 dark:border-white/10 dark:bg-neo-obsidian dark:text-zinc-400">
          {t("admin.noSubscriptions", lang)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-900/10 bg-white shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
          <table className="w-full min-w-[720px] divide-y divide-zinc-100 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.business", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.email", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.plan", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.tokens", lang)}
                </th>
                <th className="px-4 py-3 text-end text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.changePlan", lang)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {subscriptions.map((sub) => (
                <tr key={sub.profileId} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-start font-medium text-zinc-900 dark:text-white">
                    {sub.businessName}
                    <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {sub.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3 text-start">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${planBadge[sub.plan] ?? ""}`}
                    >
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {Number.isFinite(sub.quota)
                      ? `${sub.offerTokens} / ${sub.quota}`
                      : t("admin.unlimited", lang)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {PLANS.map((plan) => (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => askChangePlan(sub, plan)}
                          disabled={sub.plan === plan}
                          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5"
                        >
                          {plan}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActionConfirmationModal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        onConfirm={modalState.onConfirm ?? (async () => {})}
        title={modalState.title}
        description={modalState.description}
        confirmLabel={modalState.confirmLabel}
        variant={modalState.variant}
        cancelLabel={t("admin.cancel", lang)}
        processingLabel={t("admin.processing", lang)}
      />
    </div>
  );
}
