import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StarsDisplay } from "@/components/ReviewForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import ProviderMap from "@/components/ProviderMap";
import { MapPin, Phone, Calendar, Star } from "lucide-react";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const provider = await prisma.providerProfile.findUnique({ where: { id }, select: { businessName: true, category: true, location: true } });
  if (!provider) return { title: "Prestataire introuvable - LocalServices" };
  return {
    title: `${provider.businessName} - ${provider.category} à ${provider.location} | LocalServices`,
    description: `Découvrez ${provider.businessName}, ${provider.category} à ${provider.location}. Voir les avis, contact et devis.`,
  };
}

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getServerLang();

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, createdAt: true } },
      reviews: {
        include: {
          client: { select: { name: true } },
          serviceRequest: { select: { title: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!provider) notFound();

  const ratings = provider.reviews.map((r) => r.rating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neo-obsidian/70 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-neo-blue text-xl font-bold text-white">
              {provider.businessName[0]?.toUpperCase()}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-start text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
                  {provider.businessName}
                </h1>
                {provider.plan === "PRO" && (
                  <span className="bg-gold-brushed rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-start text-zinc-500 dark:text-zinc-400">{provider.user.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="rounded-full bg-neo-blue/10 px-3 py-1 text-sm font-medium text-neo-blue dark:bg-neo-blue/20">
                  {provider.category}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {provider.location}
                </span>
                {provider.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {provider.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
            <StarsDisplay rating={avgRating} count={provider._count.reviews} />
            <FavoriteButton providerId={id} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500">
          <Calendar size={14} />
          {t("profile.memberSince", lang)} {new Date(provider.user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {provider.description && (
            <div className="card-aurora rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian sm:p-8">
              <h2 className="mb-2 text-start font-semibold text-zinc-900 dark:text-white">{t("profile.about", lang)}</h2>
              <p className="text-start text-zinc-600 dark:text-zinc-300">{provider.description}</p>
            </div>
          )}

          {provider.lat && provider.lng && (
            <div className="card-aurora rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian sm:p-8">
              <h2 className="mb-4 text-start text-xl font-semibold text-zinc-900 dark:text-white">{t("profile.location", lang)}</h2>
              <ProviderMap lat={provider.lat} lng={provider.lng} />
            </div>
          )}

          {provider._count.reviews > 0 && (
            <div className="card-aurora rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian sm:p-8">
              <h2 className="mb-6 text-start text-xl font-semibold text-zinc-900 dark:text-white">
                {t("profile.reviews", lang)} ({provider._count.reviews})
              </h2>
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-zinc-50 p-4 dark:bg-white/5">
                <Star size={20} className="fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">/ 5 — {provider._count.reviews} {t("profile.reviewsCount", lang)}</span>
              </div>
              <div className="space-y-4">
                {provider.reviews.map((r) => (
                  <div key={r.id} className="border-b border-zinc-100 pb-4 last:border-0 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <StarsDisplay rating={r.rating} />
                      <span className="text-start text-sm font-medium">{r.client.name}</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <p className="mt-1 text-start text-xs text-zinc-500 dark:text-zinc-400">
                      {r.serviceRequest.title} • {r.serviceRequest.category}
                    </p>
                    {r.comment && <p className="mt-1 text-start text-sm text-zinc-600 dark:text-zinc-300">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar résumé */}
        <aside className="lg:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="card-aurora rounded-3xl border border-zinc-900/10 bg-white p-5 dark:border-white/10 dark:bg-neo-obsidian">
              <p className="text-start text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {t("profile.info", lang)}
              </p>
              <div className="mt-3 space-y-2 text-start text-sm text-zinc-600 dark:text-zinc-300">
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-zinc-400" /> {provider.location}
                </p>
                {provider.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-zinc-400" /> {provider.phone}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Star size={14} className="shrink-0 text-yellow-400" />
                  {avgRating.toFixed(1)} / 5 ({provider._count.reviews})
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
