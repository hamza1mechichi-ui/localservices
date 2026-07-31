"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date | string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const { lang } = useLang();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    const [notifs, count] = await Promise.all([
      getMyNotifications(),
      getUnreadCount(),
    ]);
    setNotifications(notifs as Notification[]);
    setUnread(count);
  }, []);

  useEffect(() => {
    if (session) {
      // Intentional: initial fetch + polling interval to sync with server state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session, loadNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleRead(id: string, link?: string | null) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    // eslint-disable-next-line react-hooks/immutability -- intentional full navigation, not a state mutation
    if (link) window.location.href = link;
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  if (!session) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Bell size={20} className={unread > 0 ? "animate-wiggle" : ""} />
        {unread > 0 && (
          <span className="absolute -top-1 end-[-4px] flex size-5 items-center justify-center rounded-full bg-red-500 text-xs text-white ring-2 ring-white dark:ring-gray-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 p-3 dark:border-gray-700">
            <p className="text-start text-sm font-semibold">{t("comp.notifications", lang)}</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("comp.markAllRead", lang)}
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("comp.noNotifications", lang)}
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n.id, n.link)}
                className={cn(
                  "w-full border-b border-gray-50 p-3 text-start transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700",
                  !n.read && "bg-blue-50 dark:bg-blue-500/10"
                )}
              >
                <p className="text-start text-sm">{n.message}</p>
                <p className="mt-1 text-start text-xs text-gray-400 dark:text-gray-500">
                  {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
