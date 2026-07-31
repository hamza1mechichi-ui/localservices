"use client";

import { useState, useEffect, useRef } from "react";
import { sendMessage, getConversationMessages } from "@/lib/actions/messages";
import { Loader2, Send } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

interface Message {
  id: string;
  content: string;
  senderId: string;
  isMine: boolean;
  createdAt: Date | string;
  sender: { id: string; name: string };
}

interface ConversationData {
  id: string;
  otherName: string;
  messages: Message[];
  clientId: string;
  providerId: string;
  request?: { id: string; title: string } | null;
}

export function ConversationView({ conversationId, onBack }: { conversationId: string; onBack?: () => void }) {
  const { lang } = useLang();
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  async function loadMessages() {
    const result = await getConversationMessages(conversationId);
    if (result) setData(result as unknown as ConversationData);
    setLoading(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("content", text);
    await sendMessage(fd);
    setText("");
    setSending(false);
    loadMessages();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={24} />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t("comp.convNotFound", lang)}</div>;
  }

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline me-2">{t("comp.back", lang)}</button>
        )}
        <span className="font-semibold">{data.otherName}</span>
        {data.request && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ms-2">{t("comp.aboutRequest", lang)} {data.request.title}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.messages.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">{t("comp.noMessages", lang)}</p>
        ) : data.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg text-sm ${
                msg.isMine
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm"
              }`}
            >
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.isMine ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>
                {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("comp.messagePlaceholder", lang)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t("comp.send", lang)}
        </button>
      </form>
    </div>
  );
}
