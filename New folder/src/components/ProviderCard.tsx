import Link from "next/link";
import { MapPin } from "lucide-react";
import { StarsDisplay } from "@/components/ReviewForm";
import { FavoriteButton } from "@/components/FavoriteButton";

export interface ProviderCardData {
  id: string;
  businessName: string;
  category: string;
  location: string;
  description?: string | null;
  plan?: string;
  averageRating: number;
  reviewsCount: number;
  user: { name: string };
}

export function ProviderCard({
  provider,
  isFavorited,
  distanceKm,
  viewProfileLabel,
}: {
  provider: ProviderCardData;
  isFavorited?: boolean;
  distanceKm?: number;
  viewProfileLabel: string;
}) {
  return (
    <article className="card-aurora tactile group relative overflow-hidden rounded-3xl border border-zinc-900/10 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-neo-obsidian/70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-start text-lg font-semibold text-zinc-900 dark:text-white">
            {provider.businessName}
          </h3>
          <p className="text-start text-sm text-zinc-500 dark:text-zinc-400">{provider.user.name}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {provider.plan === "PRO" && (
            <span className="bg-gold-brushed rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              PRO
            </span>
          )}
          <FavoriteButton providerId={provider.id} initialFavorited={isFavorited} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="rounded bg-neo-blue/10 px-2 py-0.5 text-xs text-neo-blue dark:bg-neo-blue/20">
          {provider.category}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {provider.location}
        </span>
        {distanceKm != null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">· à {distanceKm.toFixed(1)} km</span>
        )}
      </div>

      {provider.reviewsCount > 0 && (
        <div className="mt-2">
          <StarsDisplay rating={provider.averageRating} count={provider.reviewsCount} />
        </div>
      )}

      {provider.description && (
        <p className="mt-2 line-clamp-2 text-start text-sm text-zinc-600 dark:text-zinc-300">
          {provider.description}
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/prestataires/${provider.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-neo-blue transition group-hover:gap-1.5 hover:underline"
        >
          {viewProfileLabel} <span aria-hidden className="rtl-flip inline-block">→</span>
        </Link>
      </div>
    </article>
  );
}
