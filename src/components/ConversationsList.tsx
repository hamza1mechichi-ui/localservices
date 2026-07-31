"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyConversations } from "@/lib/actions/messages";
import { useSession } from "next-auth/react";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

interface Conversation {
  id: string;
  client: { id: string; name: string };
  provider: { id: string; businessName: string; user: { name: string } } | null;
  request: { id: string; title: string } | null;
  messages: Array<{ content: string; createdAt: Date | string }>;
  _count: { messages: number };
  updatedAt: Date | string;
}

export function ConversationsList({
  onSelect,
  selectedId,
}: {
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  const { data: session } = useSession();
  const { lang } = useLang();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    const data = await getMyConversations();
    setConversations(data as unknown as Conversation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: initial fetch + polling interval to sync with server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="animate-spin text-gray-400 dark:text-gray-500 dark:text-gray-400" size={20} />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("comp.noConversations", lang)}</p>
      </div>
    );
  }

  const isProvider = session?.user?.role === "PROVIDER";

  return (
    <div className="space-y-1">
      {conversations.map((c) => {
        const name = isProvider
          ? c.client.name
          : c.provider?.businessName || c.provider?.user.name || "Inconnu";
        const lastMsg = c.messages[0]?.content || "";
        const unread = c._count.messages;

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "w-full text-start p-3 rounded-lg transition",
              selectedId === c.id
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent"
            )}
          >
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm truncate">{name}</p>
              {unread > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ms-2">
                  {unread}
                </span>
              )}
            </div>
            {c.request && <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 truncate">{c.request.title}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{lastMsg || t("comp.clickToStart", lang)}</p>
          </button>
        );
      })}
    </div>
  );
}
