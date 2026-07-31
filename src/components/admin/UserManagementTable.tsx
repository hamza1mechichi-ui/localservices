"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import {
  getAllUsers,
  toggleUserBanAction,
  verifyProAccountAction,
  type AdminUser,
} from "@/lib/actions/admin";
import {
  ActionConfirmationModal,
  useConfirmationModal,
} from "@/components/admin/ActionConfirmationModal";
import { Loader2, ShieldCheck, ShieldOff, Ban, Check, Search } from "lucide-react";

type RoleFilter = "ALL" | "CLIENT" | "PROVIDER" | "ADMIN";
type StatusFilter = "ALL" | "BANNED" | "UNVERIFIED_PROVIDER";

export default function UserManagementTable() {
  const { lang } = useLang();
  const { modalState, showModal, hideModal } = useConfirmationModal();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [banReason, setBanReason] = useState("");
  const [, startTransition] = useTransition();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Le filtrage est délégué au serveur pour éviter de charger toute la base.
      const data = await getAllUsers({ search, role, status });
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.server", lang));
    } finally {
      setLoading(false);
    }
  }, [search, role, status, lang]);

  // Debounce sur la recherche pour ne pas requêter à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        fetchUsers();
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const askBan = (user: AdminUser) => {
    setBanReason("");
    showModal({
      title: user.banned
        ? t("admin.confirmUnban", lang, { name: user.name })
        : t("admin.confirmBan", lang, { name: user.name }),
      description: user.banned
        ? t("admin.confirmUnbanDesc", lang)
        : t("admin.confirmBanDesc", lang),
      confirmLabel: user.banned ? t("admin.unban", lang) : t("admin.ban", lang),
      variant: user.banned ? "info" : "danger",
      onConfirm: async () => {
        const result = await toggleUserBanAction(user.id, banReason || undefined);
        if (!result.success) {
          setError(result.error);
        } else {
          await fetchUsers();
        }
        hideModal();
      },
    });
  };

  const askVerify = (user: AdminUser) => {
    const isVerified = user.provider?.verified ?? false;
    showModal({
      title: isVerified
        ? t("admin.confirmUnverifyPro", lang, { name: user.name })
        : t("admin.confirmVerifyPro", lang, { name: user.name }),
      description: isVerified
        ? t("admin.confirmUnverifyProDesc", lang)
        : t("admin.confirmVerifyProDesc", lang),
      confirmLabel: isVerified ? t("admin.unverifyPro", lang) : t("admin.verifyPro", lang),
      variant: isVerified ? "warning" : "info",
      onConfirm: async () => {
        const result = await verifyProAccountAction(user.id);
        if (!result.success) {
          setError(result.error);
        } else {
          await fetchUsers();
        }
        hideModal();
      },
    });
  };

  const roleTabs: RoleFilter[] = ["ALL", "CLIENT", "PROVIDER", "ADMIN"];
  const roleLabel: Record<RoleFilter, string> = {
    ALL: t("admin.all", lang),
    CLIENT: t("admin.clients", lang),
    PROVIDER: t("admin.providers", lang),
    ADMIN: "Admin",
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-zinc-400"
            size={16}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.search", lang)}
            className="w-full rounded-lg border border-zinc-300 py-2 ps-9 pe-4 text-sm focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {roleTabs.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                role === r
                  ? "bg-neo-blue text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {roleLabel[r]}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        >
          <option value="ALL">{t("admin.all", lang)}</option>
          <option value="BANNED">{t("admin.banned", lang)}</option>
          <option value="UNVERIFIED_PROVIDER">{t("admin.unverifiedProviders", lang)}</option>
        </select>
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
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-zinc-900/10 bg-white p-8 text-center text-zinc-500 dark:border-white/10 dark:bg-neo-obsidian dark:text-zinc-400">
          {t("admin.noUsers", lang)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-900/10 bg-white shadow-sm dark:border-white/10 dark:bg-neo-obsidian">
          <table className="w-full min-w-[760px] divide-y divide-zinc-100 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.name", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.email", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.phone", lang)}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  {t("admin.role", lang)}
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 text-start font-medium text-zinc-900 dark:text-white">
                    {user.name}
                    {user.provider && (
                      <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {user.provider.businessName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300" dir="ltr">
                    {user.phone ? (
                      <span className="inline-flex items-center gap-1">
                        {user.phone}
                        {user.verifiedPhone && (
                          <Check className="text-green-600 dark:text-green-400" size={14} />
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-start text-zinc-600 dark:text-zinc-300">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-start">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.banned
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                        }`}
                      >
                        {user.banned ? t("admin.banned", lang) : t("admin.active", lang)}
                      </span>
                      {user.provider && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.provider.verified
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {user.provider.verified
                            ? t("admin.verified", lang)
                            : t("admin.unverified", lang)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {user.provider && (
                        <button
                          type="button"
                          onClick={() => askVerify(user)}
                          title={
                            user.provider.verified
                              ? t("admin.unverifyPro", lang)
                              : t("admin.verifyPro", lang)
                          }
                          className="rounded-lg border border-zinc-300 p-2 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5"
                        >
                          {user.provider.verified ? (
                            <ShieldOff size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                        </button>
                      )}
                      {user.role !== "ADMIN" && (
                        <button
                          type="button"
                          onClick={() => askBan(user)}
                          title={user.banned ? t("admin.unban", lang) : t("admin.ban", lang)}
                          className={`rounded-lg border p-2 transition ${
                            user.banned
                              ? "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                              : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                          }`}
                        >
                          {user.banned ? <Check size={16} /> : <Ban size={16} />}
                        </button>
                      )}
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
      >
        {modalState.variant === "danger" && (
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder={t("admin.banReason", lang)}
            maxLength={200}
            className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
        )}
      </ActionConfirmationModal>
    </div>
  );
}
