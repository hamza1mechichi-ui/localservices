import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StarsDisplay } from "@/components/ReviewForm";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/server-lang";
import { CreativeAdModal } from "@/components/CreativeAdModal";
import { CATEGORIES } from "@/lib/utils";
import { Search, Compass, ArrowUpRight, Sparkles, Zap } from "lucide-react";

async function getStats() {
  const [providerCount, requestCount, reviewCount] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.serviceRequest.count(),
    prisma.review.count(),
  ]);
  return { providerCount, requestCount, reviewCount };
}

async function getFeaturedProviders() {
  const providers = await prisma.providerProfile.findMany({
    include: {
      user: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return providers.map((p) => {
    const ratings = p.reviews.map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit `reviews` from `rest`
    const { reviews, ...rest } = p;
    return { ...rest, averageRating: avg, reviewsCount: ratings.length };
  });
}

async function getTestimonials() {
  const reviews = await prisma.review.findMany({
    where: { rating: { gte: 4 }, comment: { not: null } },
    include: {
      client: { select: { name: true } },
      provider: { select: { businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return reviews;
}

export default async function HomePage() {
  const stats = await getStats();
  const featured = await getFeaturedProviders();
  const testimonials = await getTestimonials();
  const lang = await getServerLang();

  return (
    <div className="min-h-screen bg-neo-linen dark:bg-neo-ink">
      <CreativeAdModal />

      {/* ============ HERO — "The Oasis" ============ */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:pt-28">
        {/* Halo ambiant */}
        <div
          aria-hidden
          className="pointer-events-none absolute start-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-30 blur-3xl dark:opacity-20"
          style={{
            background:
              "radial-gradient(circle, var(--color-neo-blue) 0%, var(--color-neo-orange) 55%, transparent 75%)",
          }}
        />

        <div className="mx-auto max-w-5xl text-center">
          <span className="tactile mb-6 inline-flex items-center gap-1.5 rounded-full border border-zinc-900/10 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur-xl dark:border-white/10 dark:bg-neo-obsidian/80 dark:text-zinc-300">
            <Sparkles size={12} className="text-neo-orange" />
            {lang === "ar-tn" ? "السوق التونسية للخدمات" : "La marketplace tunisienne des services"}
          </span>

          {/* Titre colossal asymétrique */}
          <h1 className="text-start sm:text-center">
            <span className="block text-5xl font-bold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl dark:text-white">
              {t("home.hero.title1", lang)}
            </span>
            <span
              className="mt-1 block bg-gradient-to-r from-neo-blue via-neo-orange to-neo-blue bg-[length:200%_auto] bg-clip-text text-5xl font-bold italic leading-[1.05] tracking-tight text-transparent sm:text-6xl lg:text-7xl"
              style={{ animation: "shimmer-sweep 8s ease-in-out infinite" }}
            >
              {t("home.hero.title2", lang)}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-start text-base text-zinc-600 sm:text-center sm:text-lg dark:text-zinc-400">
            {t("home.hero.subtitle", lang)}
          </p>

          {/* Capsule de recherche flottante translucide */}
          <form
            action="/prestataires"
            className="group tactile mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 p-2 shadow-[0_8px_40px_-8px_rgba(0,85,255,0.25)] backdrop-blur-xl transition-all duration-500 focus-within:max-w-2xl focus-within:shadow-[0_12px_56px_-8px_rgba(0,85,255,0.4)] dark:border-white/10 dark:bg-neo-obsidian/70"
          >
            <Compass
              size={20}
              className="animate-compass ms-2 shrink-0 text-neo-blue transition-transform group-focus-within:text-neo-orange"
            />
            <input
              type="text"
              name="search"
              placeholder={lang === "ar-tn" ? "لوّج على مهني، خدمة..." : "Rechercher un métier, un besoin..."}
              className="w-full bg-transparent py-2.5 text-start text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
            />
            <button
              type="submit"
              className="tactile flex shrink-0 items-center gap-1.5 rounded-full bg-neo-blue px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neo-blue/90"
            >
              <Search size={15} />
              <span className="hidden sm:inline">{lang === "ar-tn" ? "لوّج" : "Rechercher"}</span>
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/inscription"
              className="tactile animate-shimmer rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl dark:bg-white dark:text-zinc-900"
            >
              {t("home.hero.cta", lang)}
            </Link>
            <Link
              href="/connexion"
              className="tactile rounded-full border border-zinc-900/15 bg-white/60 px-7 py-3 text-sm font-medium text-zinc-700 backdrop-blur-xl transition hover:border-zinc-900/30 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
            >
              {t("home.hero.login", lang)}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ BENTO GRID — "Mosaïque Moderne" ============ */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 sm:grid-rows-2">
          {/* Stat — prestataires (grande tuile, accent bleu) */}
          <div className="card-aurora tactile group col-span-2 row-span-1 overflow-hidden rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian">
            <p className="text-start text-4xl font-bold text-neo-blue">{stats.providerCount}+</p>
            <p className="text-start text-sm text-zinc-500 dark:text-zinc-400">{t("home.stats.providers", lang)}</p>
          </div>

          {/* Stat — demandes */}
          <div className="card-aurora tactile col-span-1 row-span-1 overflow-hidden rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian">
            <p className="text-start text-3xl font-bold text-zinc-900 dark:text-white">{stats.requestCount}+</p>
            <p className="text-start text-xs text-zinc-500 dark:text-zinc-400">{t("home.stats.requests", lang)}</p>
          </div>

          {/* Stat — avis (accent orange) */}
          <div className="card-aurora tactile col-span-1 row-span-1 overflow-hidden rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian">
            <p className="text-start text-3xl font-bold text-neo-orange">{stats.reviewCount}+</p>
            <p className="text-start text-xs text-zinc-500 dark:text-zinc-400">{t("home.stats.reviews", lang)}</p>
          </div>

          {/* Prestataires à la une — pile de cartes 3D (CSS pur) */}
          <Link
            href="/prestataires"
            className="tactile group relative col-span-2 row-span-2 overflow-hidden rounded-3xl border border-zinc-900/10 bg-zinc-900 p-6 dark:border-white/10"
          >
            <div className="relative z-10">
              <p className="flex items-center gap-1.5 text-start text-xs font-medium text-white/60">
                <Zap size={12} className="text-neo-orange" /> {t("home.featured.title", lang)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-start text-sm font-medium text-white">
                {t("home.featured.viewAll", lang)}
                <ArrowUpRight size={14} className="rtl-flip transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
            </div>

            <div className="relative mt-8 h-40">
              {featured.slice(0, 3).map((p, i) => (
                <div
                  key={p.id}
                  className="absolute inset-x-0 rounded-2xl border border-white/10 bg-neo-obsidian p-4 shadow-xl transition-transform duration-500 group-hover:translate-y-0"
                  style={{
                    top: `${i * 14}px`,
                    transform: `rotate(${(i - 1) * 3}deg) scale(${1 - i * 0.05})`,
                    zIndex: 3 - i,
                  }}
                >
                  <p className="truncate text-start text-sm font-semibold text-white">{p.businessName}</p>
                  <p className="truncate text-start text-xs text-white/50">{p.category} · {p.location}</p>
                  {p.reviewsCount > 0 && (
                    <div className="mt-1"><StarsDisplay rating={p.averageRating} count={p.reviewsCount} /></div>
                  )}
                </div>
              ))}
            </div>
          </Link>

          {/* Catégories — mosaïque de raccourcis */}
          <div className="col-span-2 row-span-1 grid grid-cols-3 gap-2 sm:col-span-4">
            {CATEGORIES.slice(0, 6).map((cat, i) => (
              <Link
                key={cat}
                href={`/prestataires?category=${encodeURIComponent(cat)}`}
                className={`tactile card-aurora flex items-center justify-center rounded-2xl border border-zinc-900/10 p-4 text-center text-xs font-medium transition dark:border-white/10 ${
                  i === 0
                    ? "bg-gradient-to-br from-neo-blue to-neo-blue/70 text-white"
                    : "bg-white text-zinc-700 hover:border-zinc-900/20 dark:bg-neo-obsidian dark:text-zinc-300"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <h2 className="mb-10 text-start text-2xl font-bold text-zinc-900 sm:text-center dark:text-white">
          {t("home.how.title", lang)}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <div key={step} className="tactile card-aurora rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian">
              <span className="mb-4 inline-flex size-9 items-center justify-center rounded-full bg-gold-brushed text-sm font-bold text-white">
                {step}
              </span>
              <h3 className="text-start font-semibold text-zinc-900 dark:text-white">
                {t(`home.how.step${step}.title`, lang)}
              </h3>
              <p className="mt-1.5 text-start text-sm text-zinc-500 dark:text-zinc-400">
                {t(`home.how.step${step}.desc`, lang)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TÉMOIGNAGES ============ */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <h2 className="mb-10 text-start text-2xl font-bold text-zinc-900 sm:text-center dark:text-white">
            {t("home.testimonials.title", lang)}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((r) => (
              <figure key={r.id} className="tactile card-aurora rounded-3xl border border-zinc-900/10 bg-white p-6 dark:border-white/10 dark:bg-neo-obsidian">
                <StarsDisplay rating={r.rating} />
                <blockquote className="mt-3 text-start text-sm italic text-zinc-600 dark:text-zinc-300">
                  &laquo;&nbsp;{r.comment}&nbsp;&raquo;
                </blockquote>
                <figcaption className="mt-4 text-start text-xs text-zinc-400">
                  {r.client.name} — <span className="text-neo-blue">{r.provider.businessName}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ============ CTA FINAL — grain cinématographique ============ */}
      <section className="bg-grain relative overflow-hidden bg-zinc-900 px-4 py-24 dark:bg-neo-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: "radial-gradient(circle at 30% 20%, color-mix(in oklch, var(--color-neo-blue) 40%, transparent), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{t("home.cta.title", lang)}</h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/60 sm:text-base">{t("home.cta.desc", lang)}</p>
          <Link
            href="/inscription"
            className="tactile animate-shimmer mt-8 inline-block rounded-full bg-gold-brushed px-8 py-4 text-sm font-semibold text-zinc-900 shadow-[0_8px_40px_-8px_rgba(232,197,104,0.5)] transition hover:shadow-[0_12px_56px_-8px_rgba(232,197,104,0.7)]"
          >
            {t("home.cta.button", lang)}
          </Link>
        </div>
      </section>
    </div>
  );
}
