"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState, useEffect} from"react";
import { useSession} from"next-auth/react";
import {
 createOffer,
 getMyOffers,
 getProviderProfile,
 getProviderStats,
 markOfferCompleted,
} from"@/lib/actions/offers";
import { getOpenRequests} from"@/lib/actions/requests";
import { CATEGORIES} from"@/lib/utils";
import {
 changePlan,
} from"@/lib/actions/subscription";
import { EditProfileForm} from"@/components/EditProfileForm";
import { StarsDisplay} from"@/components/ReviewForm";
import { getProviderReviews, getProviderAverageRating} from"@/lib/actions/reviews";
import { AccountSettingsForm} from"@/components/AccountSettingsForm";
import { ConversationView} from"@/components/ConversationView";
import { ConversationsList} from"@/components/ConversationsList";
import { startConversationAsProvider} from"@/lib/actions/messages";
import { OfferStepper } from "@/components/OfferStepper";
import { isUnlimited } from "@/lib/plan-limits";

interface ServiceRequest {
 id: string;
 title: string;
 description: string;
 category: string;
 location: string;
 estimatedBudget?: number | null;
 images?: string | null;
 audioUrl?: string | null;
 status: string;
 createdAt: Date | string;
 client: { name: string; id: string};
 offers: Array<{ providerId: string}>;
}

interface ProviderProfile {
 id: string;
 businessName: string;
 category: string;
 location: string;
 plan: string;
 offerTokens: number;
 description?: string | null;
 phone?: string | null;
 avatarUrl?: string | null;
 websiteUrl?: string | null;
 facebookUrl?: string | null;
 instagramUrl?: string | null;
 tiktokUrl?: string | null;
 linkedinUrl?: string | null;
 youtubeUrl?: string | null;
 portfolioImages?: string | null;
 portfolioVideos?: string | null;
 user: { name: string; email: string};
}

interface Offer {
 id: string;
 price: number;
 message: string;
 status: string;
 createdAt: Date | string;
 serviceRequest: {
 id: string;
 title: string;
 category: string;
 location: string;
 status: string;
 client: { id: string; name: string};
};
}

interface Review {
 id: string;
 rating: number;
 comment: string | null;
 createdAt: Date | string;
 client: { name: string};
 serviceRequest: { title: string; category: string};
}

export default function PrestataireDashboard() {
 const { data: session} = useSession();
 const [requests, setRequests] = useState<ServiceRequest[]>([]);
 const [totalPages, setTotalPages] = useState(1);
 const [currentPage, setCurrentPage] = useState(1);
 const [myOffers, setMyOffers] = useState<Offer[]>([]);
 const [profile, setProfile] = useState<ProviderProfile | null>(null);
 const [reviews, setReviews] = useState<Review[]>([]);
 const [avgRating, setAvgRating] = useState({ average: 0, count: 0});
 const [stats, setStats] = useState<{ total: number; accepted: number; rejected: number; completed: number; pending: number; totalRevenue: number; acceptanceRate: number} | null>(null);
 const [activeTab, setActiveTab] = useState<"browse" |"offers" |"reviews" |"messages" |"settings">("browse");
 const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
 const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
 const [offerPrice, setOfferPrice] = useState("");
 const [offerMessage, setOfferMessage] = useState("");
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");
 const [loading, setLoading] = useState(false);
 const [filterCategory, setFilterCategory] = useState("");
 const [filterLocation, setFilterLocation] = useState("");
 const [filterSearch, setFilterSearch] = useState("");
 const [filterBudgetMin, setFilterBudgetMin] = useState("");
 const [filterBudgetMax, setFilterBudgetMax] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" |"budget_asc" |"budget_desc">("recent");
  const { lang } = useLang();

  useEffect(() => {
 loadData();
}, [currentPage]);

 async function loadData() {
 const [profileData, requestsData, offersData, statsData] = await Promise.all([
 getProviderProfile(),
 getOpenRequests({
 category: filterCategory || undefined,
 location: filterLocation || undefined,
 search: filterSearch || undefined,
 sort: sortOrder,
 budgetMin: filterBudgetMin ? parseFloat(filterBudgetMin) : undefined,
 budgetMax: filterBudgetMax ? parseFloat(filterBudgetMax) : undefined,
 page: currentPage,
}),
 getMyOffers(),
 getProviderStats(),
 ]);
 setProfile(profileData as unknown as ProviderProfile);
 setRequests(requestsData.data as unknown as ServiceRequest[]);
 setTotalPages(requestsData.totalPages);
 setMyOffers(offersData as unknown as Offer[]);
 setStats(statsData);

 if (profileData?.id) {
 const [reviewData, ratingData] = await Promise.all([
 getProviderReviews(profileData.id),
 getProviderAverageRating(profileData.id),
 ]);
 setReviews(reviewData as unknown as Review[]);
 setAvgRating(ratingData);
}
}

 async function handleSendOffer(requestId: string) {
 setLoading(true);
 setError("");
 setSuccess("");

 const formData = new FormData();
 formData.set("serviceRequestId", requestId);
 formData.set("price", offerPrice);
 formData.set("message", offerMessage);

 const result = await createOffer(formData);
 if (result?.error) {
 setError(result.error);
} else if (result?.success) {
 setSuccess(result.success);
 setSelectedRequest(null);
 setOfferPrice("");
 setOfferMessage("");
 loadData();
}
 setLoading(false);
}

 async function handleMarkCompleted(offerId: string) {
 if (!confirm("Confirmer que les travaux sont terminés ?")) return;
 const result = await markOfferCompleted(offerId);
 if (result?.error) setError(result.error);
 else if (result?.success) setSuccess(result.success);
 loadData();
}

 async function handleContactClient(clientId: string, requestId?: string) {
 const conv = await startConversationAsProvider(clientId, requestId);
 if (conv) {
 setSelectedConversation(conv.id);
 setActiveTab("messages");
}
}

 const tokenStatus =
 profile?.plan ==="PRO"
 ? null
 : profile?.offerTokens ?? 0;

 function renderTabButton(label: string, tab: typeof activeTab, count?: number) {
 return (
 <button
 onClick={() => setActiveTab(tab)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
 activeTab === tab
 ?"bg-neo-blue text-white"
 :"bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
}`}
 >
 {label}{count !== undefined ? ` (${count})` :""}
 </button>
 );
}

 return (
 <div className="max-w-7xl mx-auto px-4 py-8">
 <div className="flex justify-between items-center mb-8">
 <div>
 <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
 {profile?.businessName || session?.user?.name}
 </h1>
 <p className="text-zinc-600 dark:text-zinc-300 dark:text-zinc-400 mt-1">
 {profile?.category} • {profile?.location}
 {avgRating.count > 0 && (
 <span className="ms-3 inline-flex items-center gap-1">
 <StarsDisplay rating={avgRating.average} count={avgRating.count} />
 </span>
 )}
 </p>
 </div>
 {profile && (
 <div className="text-end">
 <span
 className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
 profile.plan ==="PRO"
 ?"bg-purple-100 text-purple-800"
 :"bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
}`}
 >
  {t("dash.provider.plan", lang)} {profile.plan}
 </span>
 {tokenStatus !== null && (
 <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mt-1">
  {tokenStatus} {t("dash.provider.remaining", lang)}
 </p>
 )}
 </div>
 )}
 </div>

        {/* Subscription card */}
        <div className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10 mb-6">
          <h3 className="font-semibold text-lg mb-1">{t("dash.provider.subscription", lang)}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {profile?.plan === "PRO"
              ? t("dash.provider.proUnlimited", lang)
              : `${profile?.offerTokens ?? 0} ${t("dash.provider.remaining", lang)}`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                { key: "FREE", label: "Free", desc: t("dash.provider.planFreeDesc", lang), color: "border-zinc-200 dark:border-white/20" },
                { key: "STARTER", label: "Starter", desc: t("dash.provider.planStarterDesc", lang), color: "border-blue-200 dark:border-blue-500/40" },
                { key: "PRO", label: "PRO", desc: t("dash.provider.planProDesc", lang), color: "border-purple-300 dark:border-purple-500/40" },
              ] as const
            ).map((p) => {
              const isCurrent = profile?.plan === p.key;
              return (
                <div
                  key={p.key}
                  className={`rounded-2xl border-2 p-4 text-start transition ${
                    isCurrent ? "border-neo-blue dark:border-blue-400 bg-neo-blue/5/50 dark:bg-blue-500/10" : p.color
                  }`}
                >
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{p.desc}</p>
                  {isCurrent ? (
                    <span className="inline-block text-xs font-medium text-neo-blue dark:text-blue-400">
                      {t("dash.provider.currentPlan", lang)}
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        const r = await changePlan(p.key);
                        if (r.success) { setSuccess(t("dash.provider.currentPlan", lang)); loadData(); }
                        else setError(r.error);
                      }}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {t("dash.provider.switchTo", lang)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

 {/* Stats */}
 {stats && (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
 <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-neo-obsidian">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.offersSent", lang)}</p>
 <p className="text-xl font-bold">{stats.total}</p>
 </div>
 <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-neo-obsidian">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.accepted", lang)}</p>
 <p className="text-xl font-bold text-green-600">{stats.accepted}</p>
 </div>
 <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-neo-obsidian">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.rejected", lang)}</p>
 <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
 </div>
 <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-neo-obsidian">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.acceptRate", lang)}</p>
 <p className="text-xl font-bold text-neo-blue">{stats.acceptanceRate}%</p>
 </div>
 <div className="rounded-2xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-neo-obsidian">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.completed", lang)}</p>
 <p className="text-xl font-bold text-purple-600">{stats.completed}</p>
 </div>
 <div className="col-span-2 rounded-2xl border border-neo-blue/10 bg-gradient-to-br from-neo-blue/5 to-transparent p-4 dark:border-blue-500/20 dark:from-blue-500/10 sm:col-span-1">
  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.revenue", lang)}</p>
  <p className="text-xl font-bold text-neo-blue">{stats.totalRevenue.toLocaleString("fr-FR")} {t("currency.symbol", lang)}</p>
 </div>
 </div>
 )}

 {/* Tabs */}
  <div className="flex gap-2 mb-6 overflow-x-auto flex-nowrap sm:flex-wrap">
    {renderTabButton(t("dash.provider.requests", lang),"browse")}
    {renderTabButton(t("dash.provider.myOffers", lang),"offers", myOffers.length)}
    {renderTabButton(t("dash.provider.reviews", lang),"reviews", reviews.length)}
    {renderTabButton(t("dash.client.messages", lang),"messages")}
    {renderTabButton(t("dash.client.settings", lang),"settings")}
  </div>

 {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg mb-6">{error}</div>}
 {success && <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-4 rounded-lg mb-6">{success}</div>}

 {/* === BROWSE TAB === */}
 {activeTab ==="browse" && (
 <>
 <div className="flex flex-wrap gap-3 mb-6">
 <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
   placeholder={t("dash.provider.searchPlaceholder", lang)} className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg min-w-[200px]" />
 <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
 className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg">
  <option value="">{t("search.allCategories", lang)}</option>
 {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
 </select>
 <input type="text" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
   placeholder={t("search.locationPlaceholder", lang)} className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg w-40" />
 <input type="number" value={filterBudgetMin} onChange={(e) => setFilterBudgetMin(e.target.value)}
   placeholder={t("dash.provider.budgetMin", lang) + " (" + t("currency.symbol", lang) + ")"} className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg w-32" />
 <input type="number" value={filterBudgetMax} onChange={(e) => setFilterBudgetMax(e.target.value)}
   placeholder={t("dash.provider.budgetMax", lang) + " (" + t("currency.symbol", lang) + ")"} className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg w-32" />
 <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
 className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg">
  <option value="recent">{t("dash.provider.sortRecent", lang)}</option>
  <option value="budget_asc">{t("dash.provider.sortAsc", lang)}</option>
  <option value="budget_desc">{t("dash.provider.sortDesc", lang)}</option>
 </select>
 <button onClick={() => { setCurrentPage(1); loadData();}}
  className="bg-neo-blue text-white px-4 py-2 rounded-lg hover:bg-neo-blue/90 transition">{t("search.button", lang)}</button>
 <button onClick={() => {
 setFilterSearch(""); setFilterCategory(""); setFilterLocation("");
 setFilterBudgetMin(""); setFilterBudgetMax(""); setSortOrder("recent");
 setCurrentPage(1); loadData();
}} className="px-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">{t("dash.provider.reset", lang)}</button>
 </div>
 <div className="space-y-4">
 {requests.length === 0 ? (
 <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
  <p className="text-lg">{t("dash.provider.empty", lang)}</p>
  <p className="text-sm mt-1">{t("dash.provider.emptyHint", lang)}</p>
 </div>
 ) : requests.map((req) => {
 const hasAlreadyOffered = req.offers.some((o) => o.providerId === profile?.id);
 return (
 <div key={req.id} className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
 <div className="flex justify-between items-start mb-3">
 <div>
 <h3 className="text-lg font-semibold">{req.title}</h3>
 <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{req.category} • {req.location}</p>
 {req.estimatedBudget && (
  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
  {t("dash.client.budget", lang)} : {req.estimatedBudget.toLocaleString("fr-FR")} {t("currency.symbol", lang)}
  </p>
 )}
 </div>
 <span className="text-xs text-zinc-400 dark:text-zinc-500">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</span>
 </div>
 <p className="text-zinc-600 dark:text-zinc-300 dark:text-zinc-400 mb-4">{req.description}</p>

 {req.images && (
 <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
 {(JSON.parse(req.images) as string[]).map((url: string, i: number) => (
 <a key={i} href={url} target="_blank" rel="noopener noreferrer">
 <img src={url} alt={`Photo ${i + 1}`}
 className="w-20 h-20 object-cover rounded-lg border border-zinc-200 dark:border-white/10 hover:opacity-80 transition" />
 </a>
 ))}
 </div>
 )}

 {req.audioUrl && (
 <div className="mb-4">
 <audio controls src={req.audioUrl} className="h-10 w-full max-w-xs" />
 </div>
 )}

 <div className="flex justify-between items-center">
  <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{t("dash.provider.requestedBy", lang)} <strong>{req.client.name}</strong></p>
 {hasAlreadyOffered ? (
  <span className="text-sm text-green-600 font-medium">{t("dash.provider.alreadyOffered", lang)}</span>
 ) : selectedRequest === req.id ? (
 <div className="flex gap-2 items-end">
 <div>
  <label className="block text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mb-1">{t("dash.provider.price", lang)} ({t("currency.symbol", lang)})</label>
 <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
 className="w-28 px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" placeholder="0.00" min="0" step="0.01" />
 </div>
 <div>
  <label className="block text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 mb-1">{t("dash.provider.message", lang)}</label>
  <textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)}
  className="w-64 px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" rows={2}
  placeholder={t("dash.provider.messagePlaceholder", lang)} />
 </div>
 <button onClick={() => handleSendOffer(req.id)}
 disabled={loading || !offerPrice || !offerMessage}
 className="bg-neo-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-neo-blue/90 disabled:opacity-50 transition">
  {loading ? t("dash.provider.sending", lang) : t("dash.provider.send", lang)}
 </button>
 <button onClick={() => { setSelectedRequest(null); setOfferPrice(""); setOfferMessage("");}}
  className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">{t("dash.client.cancel", lang)}</button>
 </div>
 ) : (
 <button onClick={() => setSelectedRequest(req.id)}
 disabled={!isUnlimited(profile?.plan ?? "FREE") && (profile?.offerTokens ?? 0) <= 0}
 className="bg-neo-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-neo-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition">
  {t("dash.provider.respond", lang)}
 </button>
 )}
 </div>
 </div>
 );
})}
 </div>
 {totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-6">
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPage <= 1}
 className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
 >
  {t("search.prev", lang)}
 </button>
 <span className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
  {t("search.page", lang)} {currentPage} / {totalPages}
 </span>
 <button
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={currentPage >= totalPages}
 className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
 >
  {t("search.next", lang)}
 </button>
 </div>
 )}
 </>
 )}

 {/* === OFFERS TAB === */}
 {activeTab ==="offers" && (
 <div className="space-y-4">
 {myOffers.length === 0 ? (
 <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
  <p className="text-lg">{t("dash.provider.noOffers", lang)}</p>
  <p className="text-sm mt-1">{t("dash.provider.noOffersHint", lang)}</p>
 </div>
 ) : myOffers.map((offer) => (
 <div key={offer.id} className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
 <div className="flex justify-between items-start mb-3">
 <div>
 <h3 className="text-lg font-semibold">{offer.serviceRequest.title}</h3>
 <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{offer.serviceRequest.category} • {offer.serviceRequest.location}</p>
 </div>
 <p className="text-lg font-bold text-neo-blue">{offer.price.toLocaleString("fr-FR")} {t("currency.symbol", lang)}</p>
 </div>
 <div className="mb-3 max-w-xs">
   <OfferStepper
     status={offer.status}
     labels={[
       t("dash.client.pending", lang),
       t("dash.client.accepted", lang),
       t("dash.client.completed", lang),
       t("dash.client.rejected", lang),
     ]}
   />
 </div>
 <p className="text-zinc-600 dark:text-zinc-300 dark:text-zinc-400 mb-2">{offer.message}</p>
 <div className="flex justify-between items-center">
  <p className="text-sm text-zinc-400 dark:text-zinc-500">{t("dash.provider.client", lang)} : {offer.serviceRequest.client.name}</p>
 {offer.status ==="ACCEPTED" && (
 <button onClick={() => handleMarkCompleted(offer.id)}
 className="text-sm text-green-600 hover:underline font-medium">
  {t("dash.provider.markComplete", lang)}
 </button>
 )}
 <button
 onClick={() => handleContactClient(offer.serviceRequest.client.id, offer.serviceRequest.id)}
 className="text-sm text-neo-blue hover:underline"
 >
  {t("dash.client.contact", lang)}
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* === REVIEWS TAB === */}
 {activeTab ==="reviews" && (
 <div className="space-y-4">
 {avgRating.count > 0 && (
 <div className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10 mb-4">
  <p className="text-lg font-semibold mb-2">{t("dash.provider.avgRating", lang)}</p>
 <StarsDisplay rating={avgRating.average} count={avgRating.count} />
 </div>
 )}
 {reviews.length === 0 ? (
 <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
  <p className="text-lg">{t("dash.provider.noReviews", lang)}</p>
 </div>
 ) : reviews.map((r) => (
 <div key={r.id} className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
 <div className="flex items-center gap-2 mb-2">
 <StarsDisplay rating={r.rating} />
 <span className="text-sm font-medium">{r.client.name}</span>
 <span className="text-xs text-zinc-400 dark:text-zinc-500">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
 </div>
 <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">{r.serviceRequest.title} • {r.serviceRequest.category}</p>
 {r.comment && <p className="text-zinc-600 dark:text-zinc-300 dark:text-zinc-400 mt-1">{r.comment}</p>}
 </div>
 ))}
 </div>
 )}

 {/* === MESSAGES TAB === */}
 {activeTab ==="messages" && (
 <div className="grid md:grid-cols-[300px_1fr] gap-4">
 <div className="bg-white dark:bg-neo-obsidian rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10 p-3">
  <h3 className="font-semibold text-sm px-2 mb-2">{t("dash.client.conversations", lang)}</h3>
 <ConversationsList onSelect={setSelectedConversation} selectedId={selectedConversation ?? undefined} />
 </div>
 <div>
 {selectedConversation ? (
 <ConversationView conversationId={selectedConversation} onBack={() => setSelectedConversation(null)} />
 ) : (
 <div className="flex items-center justify-center h-64 bg-white dark:bg-neo-obsidian rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10 text-zinc-400 dark:text-zinc-500 text-sm">
  {t("dash.client.selectConv", lang)}
 </div>
 )}
 </div>
 </div>
 )}

 {/* === SETTINGS TAB === */}
 {activeTab ==="settings" && (
 <div className="grid md:grid-cols-2 gap-6">
 <div className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
  <h2 className="text-xl font-semibold mb-4">{t("dash.provider.profile", lang)}</h2>
  {profile && (
  <EditProfileForm
  profile={{
  businessName: profile.businessName,
  category: profile.category,
  location: profile.location,
  description: profile.description,
  phone: profile.phone,
  avatarUrl: profile.avatarUrl,
  websiteUrl: profile.websiteUrl,
  facebookUrl: profile.facebookUrl,
  instagramUrl: profile.instagramUrl,
  tiktokUrl: profile.tiktokUrl,
  linkedinUrl: profile.linkedinUrl,
  youtubeUrl: profile.youtubeUrl,
  portfolioImages: profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [],
  portfolioVideos: profile.portfolioVideos ? JSON.parse(profile.portfolioVideos) : [],
}}
  onUpdate={loadData}
  />
  )}
 </div>
 <div className="bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
  <h2 className="text-xl font-semibold mb-4">{t("dash.provider.account", lang)}</h2>
 <AccountSettingsForm
 defaultName={profile?.user?.name || session?.user?.name}
 email={profile?.user?.email}
 />
 </div>
 </div>
 )}
 </div>
 );
}
