"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import {
  getAllDemands,
  deleteDemandAdminAction,
  updateDemandStatusAdminAction,
  type AdminDemand,
} from "@/lib/actions/admin";
import {
  ActionConfirmationModal,
  useConfirmationModal,
} from "@/components/admin/ActionConfirmationModal";
import { Loader2, Trash2 } from "lucide-react";

type StatusFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED";

export default function DemandManagementTable() {
  const { lang } = useLang();
  const { modalState, showModal, hideModal } = useConfirmationModal();

  const [demands, setDemands] = useState<AdminDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllDemands(filter);
      setDemands(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.server", lang));
    } finally {
      setLoading(false);
    }
  }, [filter, lang]);

  useEffect(() => {
    startTransition(() => {
      fetchDemands();
    });
  }, [fetchDemands]);

  const askDelete = (demand: AdminDemand) => {
    showModal({
      title: t("admin.confirmDeleteDemand", lang, { title: demand.title }),
      description: t("admin.confirmDeleteDemandDesc", lang),
      confirmLabel: t("admin.delete", lang),
      variant: "danger",
      onConfirm: async () => {
        const result = await deleteDemandAdminAction(demand.id);
        if (!result.success) {
          setError(result.error);
        } else {
          await fetchDemands();
        }
        hideModal();
      },
    });
  };

  const changeStatus = async (demandId: string, status: string) => {
    const result = await updateDemandStatusAdminAction(demandId, status);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await fetchDemands();
  };

  const filters: StatusFilter[] = ["ALL", "OPEN", "IN_PROGRESS", "CLOSED"];
  const filterLabel: Record<StatusFilter, string> = {
    ALL: t("admin.all", lang),
    OPEN: t("admin.open", lang),
    IN_PROGRESS: t("admin.inProgress", lang),
    CLOSED: t("admin.closed", lang),
  };
  const statusColor: Record<string, string> = {
    OPEN: "text-green-600 dark:text-green-400",
    IN_PROGRESS: "text-yellow-600 dark:text-yellow-400",
    CLOSED: "text-zinc-500 dark:text-zinc-400",
  };

  const locale = lang === "ar-tn" ? "ar-TN" : "fr-FR";
  const currency = t("currency.symbol", lang);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-neo-blue text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-zinc-400" size={24} />
        </div>
      ) : demands.length === 0 ? (
        <div className="rounded-xl border border-zinc-900/10 bg-white p-8 text-center text-zinc-500 dark:border-white/10 dark:bg-neo-obsidian dark:text-zinc-400">
          {t("admin.noDemands", lang)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-900/10 bg-white shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
          <table className="w-full min-w-[820px] divide-y divide-zinc-100 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.demandTitle", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.client", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.budget", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.offersCount", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.status", lang)}
                </th>
                <th className="px-4 py-3 text-end text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.actions", lang)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {demands.map((demand) => (
                <tr key={demand.id} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-start font-medium text-zinc-900 dark:text-white">
                    {demand.title}
                    <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {demand.category} · {demand.location}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {demand.clientName}
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {demand.clientEmail}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {demand.estimatedBudget !== null
                      ? `${demand.estimatedBudget.toLocaleString(locale)} ${currency}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {demand.offersCount}
                  </td>
                  <td className="px-4 py-3 text-start">
                    <select
                      value={demand.status}
                      onChange={(e) => changeStatus(demand.id, e.target.value)}
                      className={`rounded border border-zinc-300 bg-transparent px-2 py-1 text-xs font-medium dark:border-zinc-600 ${
                        statusColor[demand.status] ?? ""
                      }`}
                    >
                      <option value="OPEN">{t("admin.open", lang)}</option>
                      <option value="IN_PROGRESS">{t("admin.inProgress", lang)}</option>
                      <option value="CLOSED">{t("admin.closed", lang)}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => askDelete(demand)}
                        title={t("admin.delete", lang)}
                        className="rounded-lg border border-red-300 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                      </button>
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
