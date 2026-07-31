"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toggleFavorite } from "@/lib/actions/favorites";
import { Heart } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export function FavoriteButton({ providerId, initialFavorited }: { providerId: string; initialFavorited?: boolean }) {
  const { data: session } = useSession();
  const { lang } = useLang();
  const [isFav, setIsFav] = useState(initialFavorited ?? false);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  if (!session || session.user?.role !== "CLIENT") return null;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setPulse(true);
    setTimeout(() => setPulse(false), 350);
    const result = await toggleFavorite(providerId);
    if (result?.success) setIsFav(!isFav);
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-full p-1.5 transition ${isFav ? "text-red-500" : "text-gray-300 hover:text-red-400"}`}
      title={isFav ? t("comp.removeFav", lang) : t("comp.addFav", lang)}
    >
      <Heart size={18} fill={isFav ? "currentColor" : "none"} className={pulse ? "animate-ping-once" : ""} />
    </button>
  );
}
