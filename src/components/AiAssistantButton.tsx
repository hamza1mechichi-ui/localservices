"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { generateRequestText } from "@/lib/actions/ai";

export function AiAssistantButton({
  getKeywords,
  onGenerated,
}: {
  /** Récupère les mots-clés actuels du formulaire (ex: contenu du champ titre) */
  getKeywords: () => string;
  onGenerated: (result: { title: string; description: string }) => void;
}) {
  const { lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    const keywords = getKeywords().trim();
    if (keywords.length < 3) {
      setError(t("comp.aiNeedKeywords", lang));
      return;
    }
    setError("");
    setLoading(true);
    const result = await generateRequestText(keywords, lang);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onGenerated(result.data);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? t("comp.aiGenerating", lang) : t("comp.aiAssist", lang)}
      </button>
      {error && <p className="mt-1.5 text-start text-xs text-red-600">{error}</p>}
    </div>
  );
}
