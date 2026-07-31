"use client";

import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createServiceRequest, getMyRequests, getMyRequestsStats, closeServiceRequest, updateServiceRequest, deleteServiceRequest } from "@/lib/actions/requests";
import { updateOfferStatus } from "@/lib/actions/offers";
import { CATEGORIES } from "@/lib/utils";
import { canReviewOffer } from "@/lib/offer-status";
import { ReviewForm } from "@/components/ReviewForm";
import { ProviderCard } from "@/components/ProviderCard";
import { RequestStepper } from "@/components/RequestStepper";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { LocationPicker } from "@/components/LocationPicker";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ConversationView } from "@/components/ConversationView";
import { ConversationsList } from "@/components/ConversationsList";
import { getOrCreateConversation } from "@/lib/actions/messages";
import { getMyFavorites } from "@/lib/actions/favorites";
import { searchProviders } from "@/lib/actions/profile";
import { MysticVoiceRecorder, AiMagicSwitch, AiScanOverlay } from "@/components/VoiceAndAiPremium";
import { CreativeAdModal } from "@/components/CreativeAdModal";
import type { ProviderCardData } from "@/components/ProviderCard";

type Favorite = Awaited<ReturnType<typeof getMyFavorites>>[number];

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  estimatedBudget?: number | null;
  images?: string | null;
  status: string;
  createdAt: Date | string;
  offers: Array<{
    id: string;
    price: number;
    message: string;
    status: string;
    provider: {
      id: string;
      businessName: string;
      category: string;
      user: { name: string };
    };
    review?: { id: string } | null;
  }>;
}

export default function ClientDashboard() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "favorites" | "messages" | "settings">("requests");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommended, setRecommended] = useState<ProviderCardData[]>([]);
  const [requestLocation, setRequestLocation] = useState("");
  const [requestCoords, setRequestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newRequestTitle, setNewRequestTitle] = useState("");
  const [newRequestDescription, setNewRequestDescription] = useState("");
  const [newRequestAudioUrl, setNewRequestAudioUrl] = useState<string | null>(null);
  const [aiScanning, setAiScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterClientCategory, setFilterClientCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "budget" | "title">("recent");
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, closed: 0 });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const { lang } = useLang();

  useEffect(() => {
    loadRequests();
  }, [currentPage]);

  useEffect(() => {
    searchProviders({}).then((r) => setRecommended(r.data.slice(0, 3) as unknown as ProviderCardData[]));
  }, []);

  useEffect(() => {
    if (activeTab === "favorites") loadFavorites();
  }, [activeTab]);

  async function loadRequests() {
    const [result, statsData] = await Promise.all([
      getMyRequests({
        status: filterStatus === "ALL" ? undefined : filterStatus,
        category: filterClientCategory || undefined,
        search: filterSearch || undefined,
        sort: sortOrder,
        page: currentPage,
      }),
      getMyRequestsStats(),
    ]);
    setRequests(result.data as unknown as ServiceRequest[]);
    setTotalPages(result.totalPages);
    setStats(statsData);
  }

  async function loadFavorites() {
    const data = await getMyFavorites();
    setFavorites(data);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);

    if (uploadFiles.length > 0) {
      setUploadingImages(true);
      const urls: string[] = [];
      for (const file of uploadFiles) {
        const fd = new FormData();
        fd.set("file", file);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (data.url) urls.push(data.url);
        } catch {
          setError("Erreur lors de l'upload d'une image");
        }
      }
      if (urls.length > 0) formData.set("images", JSON.stringify(urls));
      setUploadingImages(false);
    }

    formData.set("location", requestLocation);
    if (requestCoords) {
      formData.set("lat", requestCoords.lat.toString());
      formData.set("lng", requestCoords.lng.toString());
    }
    if (newRequestAudioUrl) {
      formData.set("audioUrl", newRequestAudioUrl);
    }

    const result = await createServiceRequest(formData);
    if (result?.error) setError(result.error);
    else if (result?.success) {
      setSuccess(result.success);
      setShowForm(false);
      setUploadFiles([]);
      setNewRequestTitle("");
      setNewRequestDescription("");
      setNewRequestAudioUrl(null);
      loadRequests();
    }
    setLoading(false);
  }

  async function handleClose(requestId: string) {
    await closeServiceRequest(requestId);
    loadRequests();
  }

  function startEdit(req: ServiceRequest) {
    setEditingRequest(req.id);
    setEditTitle(req.title);
    setEditDescription(req.description);
    setEditCategory(req.category);
    setEditLocation(req.location);
    setEditBudget(req.estimatedBudget?.toString() ?? "");
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");
    formData.set("requestId", editingRequest!);
    const result = await updateServiceRequest(formData);
    if (result?.error) setError(result.error);
    else if (result?.success) {
      setSuccess(result.success);
      setEditingRequest(null);
      loadRequests();
    }
    setLoading(false);
  }

  async function handleDelete(requestId: string) {
    if (!confirm("Supprimer cette demande ? Cette action est irréversible.")) return;
    const result = await deleteServiceRequest(requestId);
    if (result?.error) setError(result.error);
    else loadRequests();
  }

  async function handleAccept(offerId: string) {
    const result = await updateOfferStatus(offerId, "ACCEPTED");
    if (result?.error) setError(result.error);
    else loadRequests();
  }

  async function handleReject(offerId: string) {
    await updateOfferStatus(offerId, "REJECTED");
    loadRequests();
  }

  async function handleContact(providerId: string, requestId: string) {
    const conv = await getOrCreateConversation(providerId, requestId);
    if (conv) {
      setSelectedConversation(conv.id);
      setActiveTab("messages");
    }
  }

  const statusLabels: Record<string, string> = {
    OPEN: t("dash.client.status.open", lang),
    CLOSED: t("dash.client.status.closed", lang),
    IN_PROGRESS: t("dash.client.status.inProgress", lang),
  };

  const statusColors: Record<string, string> = {
    OPEN: "bg-green-100 text-green-800",
    CLOSED: "bg-zinc-100 text-zinc-800",
    IN_PROGRESS: "bg-neo-blue/10 text-neo-blue",
  };

  function renderTabButton(label: string, tab: typeof activeTab) {
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          activeTab === tab ? "bg-neo-blue text-white" : "bg-zinc-100 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CreativeAdModal />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{t("dash.client.title", lang)}, {session?.user?.name}</h1>
          <p className="text-zinc-600 dark:text-zinc-300 mt-1">{t("dash.client.subtitle", lang)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-neo-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-neo-blue/90 transition">
          {showForm ? t("dash.client.cancel", lang) : t("dash.client.newRequest", lang)}
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto flex-nowrap sm:flex-wrap">
        {renderTabButton(t("dash.client.myRequests", lang), "requests")}
        {renderTabButton(t("dash.client.favorites", lang), "favorites")}
        {renderTabButton(t("dash.client.messages", lang), "messages")}
        {renderTabButton(t("dash.client.settings", lang), "settings")}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-4 rounded-lg mb-6">{success}</div>}

      {activeTab === "requests" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {/* Stats badges */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("dash.client.all", lang), key: "ALL", count: stats.total },
              { label: t("dash.client.open", lang), key: "OPEN", count: stats.open },
              { label: t("dash.client.inProgress", lang), key: "IN_PROGRESS", count: stats.inProgress },
              { label: t("dash.client.closed", lang), key: "CLOSED", count: stats.closed },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => { setFilterStatus(s.key); setCurrentPage(1); setTimeout(loadRequests, 0); }}
                className={`rounded-2xl border p-4 text-start transition ${
                  filterStatus === s.key
                    ? "border-neo-blue bg-neo-blue/5 dark:border-blue-500 dark:bg-blue-500/10"
                    : "border-zinc-900/10 bg-white hover:border-zinc-200 dark:border-white/10 dark:bg-neo-obsidian dark:hover:border-zinc-600"
                }`}
              >
                <p className={`text-2xl font-bold ${filterStatus === s.key ? "text-neo-blue dark:text-blue-400" : "text-zinc-900 dark:text-white"}`}>
                  {s.count}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={t("dash.client.search", lang)} className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm min-w-[180px]" />
            <select value={filterClientCategory} onChange={(e) => setFilterClientCategory(e.target.value)}
              className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm">
              <option value="">{t("search.allCategories", lang)}</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm">
              <option value="recent">{t("dash.client.sortRecent", lang)}</option>
              <option value="budget">{t("dash.client.sortBudget", lang)}</option>
              <option value="title">{t("dash.client.sortAZ", lang)}</option>
            </select>
            <button onClick={() => { setCurrentPage(1); loadRequests(); }}
              className="bg-neo-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-neo-blue/90 transition">
              {t("dash.client.filter", lang)}
            </button>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-neo-obsidian p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10 mb-8">
              <h2 className="text-xl font-semibold mb-4">{t("dash.client.newRequest", lang)}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">{t("dash.client.form.title", lang)}</label>
                  <AiMagicSwitch
                    getKeywords={() => newRequestTitle}
                    onGenerated={({ title, description }) => {
                      setNewRequestTitle(title);
                      setNewRequestDescription(description);
                    }}
                    onScanChange={setAiScanning}
                  />
                </div>
                <AiScanOverlay active={aiScanning}>
                  <div className="space-y-4">
                    <input type="text" name="title" required
                      value={newRequestTitle}
                      onChange={(e) => setNewRequestTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t("dash.client.form.titlePlaceholder", lang)} />
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">{t("dash.client.form.desc", lang)}</label>
                      <textarea name="description" required rows={4}
                        value={newRequestDescription}
                        onChange={(e) => setNewRequestDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={t("dash.client.form.descPlaceholder", lang)} />
                    </div>
                  </div>
                </AiScanOverlay>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">{t("comp.addVoiceNote", lang)}</label>
                  <MysticVoiceRecorder
                    onUploaded={(url) => setNewRequestAudioUrl(url)}
                    onRemove={() => setNewRequestAudioUrl(null)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{t("auth.category", lang)}</label>
                    <select name="category" required
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">{t("auth.selectCategory", lang)}</option>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{t("auth.location", lang)}</label>
                    <LocationPicker
                      name="location"
                      value={requestLocation}
                      onChange={(v) => { setRequestLocation(v); }}
                      onCoordinates={(lat, lng) => setRequestCoords({ lat, lng })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{t("dash.client.form.budget", lang)} ({t("currency.symbol", lang)})</label>
                    <input type="number" name="estimatedBudget" min="0" step="1"
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t("dash.client.form.optional", lang)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">{t("dash.client.form.photos", lang)}</label>
                    <input type="file" multiple accept="image/*" onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                      className="w-full text-sm text-zinc-500 dark:text-zinc-400 file:me-3 file:px-4 file:py-2 file:border-0 file:rounded-lg file:bg-neo-blue/5 file:text-neo-blue/90 hover:file:bg-neo-blue/10" />
                    {uploadFiles.length > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{uploadFiles.length} {t("dash.client.form.filesSelected", lang)}</p>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={loading || uploadingImages}
                  className="bg-neo-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-neo-blue/90 disabled:opacity-50 transition">
                  {uploadingImages ? t("dash.client.form.uploading", lang) : loading ? t("dash.client.form.publishing", lang) : t("dash.client.form.publish", lang)}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <p className="text-lg">{t("dash.client.empty", lang)}</p>
                <p className="text-sm mt-1">{t("dash.client.emptyHint", lang)}</p>
              </div>
            ) : requests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-neo-obsidian p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{req.title}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{req.category} • {req.location}</p>
                    {req.estimatedBudget && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t("dash.client.budget", lang)} : {req.estimatedBudget.toLocaleString("fr-FR")} {t("currency.symbol", lang)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                      {req.status === "OPEN" ? t("dash.client.status.open", lang) : req.status === "IN_PROGRESS" ? t("dash.client.status.inProgress", lang) : req.status === "CLOSED" ? t("dash.client.status.closed", lang) : statusLabels[req.status]}
                    </span>
                    {req.status === "OPEN" && (
                      <>
                        <button onClick={() => startEdit(req)} className="text-sm text-neo-blue hover:underline">
                          {t("dash.client.edit", lang)}
                        </button>
                        <button onClick={() => handleClose(req.id)} className="text-sm text-orange-600 hover:underline">
                          {t("dash.client.close", lang)}
                        </button>
                        <button onClick={() => handleDelete(req.id)} className="text-sm text-red-600 hover:underline">
                          {t("dash.client.delete", lang)}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-4 max-w-xs">
                  <RequestStepper
                    status={req.status}
                    labels={[
                      t("dash.client.status.open", lang),
                      t("dash.client.status.inProgress", lang),
                      t("dash.client.status.closed", lang),
                    ]}
                  />
                </div>
                {editingRequest === req.id ? (
                  <form action={handleUpdate} className="space-y-3 mb-4 p-4 bg-zinc-50 dark:bg-white/5 rounded-lg">
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="text" name="title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" />
                    <textarea name="description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required rows={3}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" />
                    <div className="grid grid-cols-3 gap-3">
                      <select name="category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                        className="px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm">
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <input type="text" name="location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                        className="px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" />
                      <input type="number" name="estimatedBudget" value={editBudget} onChange={(e) => setEditBudget(e.target.value)}
                        placeholder={`Budget (${t("currency.symbol", lang)})`} className="px-3 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading}
                        className="bg-neo-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-neo-blue/90 disabled:opacity-50 transition">
                        {t("dash.client.save", lang)}
                      </button>
                      <button type="button" onClick={() => setEditingRequest(null)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 text-sm px-2">{t("dash.client.cancel", lang)}</button>
                    </div>
                  </form>
                ) : null}
                <p className="text-zinc-600 dark:text-zinc-300 mb-4">{req.description}</p>

                {req.images && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {(JSON.parse(req.images) as string[]).map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Photo ${i + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-zinc-200 dark:border-white/10 hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                )}

                {req.offers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white mb-3">{t("dash.client.offers", lang)} ({req.offers.length})</h4>
                    <div className="space-y-3">
                      {req.offers.map((offer) => (
                        <div key={offer.id} className="bg-zinc-50 dark:bg-white/5 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{offer.provider.businessName}</p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">{offer.provider.user.name} • {offer.provider.category}</p>
                            </div>
                            <div className="text-end">
                              <p className="text-lg font-bold text-neo-blue">{offer.price.toLocaleString("fr-FR")} {t("currency.symbol", lang)}</p>
                              <span className={`text-xs ${offer.status === "ACCEPTED" ? "text-green-600" : offer.status === "REJECTED" ? "text-red-600" : "text-zinc-500 dark:text-zinc-400"}`}>
                                {offer.status === "ACCEPTED" ? t("dash.client.accepted", lang) : offer.status === "REJECTED" ? t("dash.client.rejected", lang) : offer.status === "COMPLETED" ? t("dash.client.completed", lang) : t("dash.client.pending", lang)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">{offer.message}</p>
                          {canReviewOffer(offer.status) && !offer.review && (
                            <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                              <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                                {offer.status === "COMPLETED"
                                  ? t("dash.client.reviewRequired", lang)
                                  : t("dash.client.reviewInvite", lang)}
                              </p>
                              <ReviewForm offerId={offer.id} onDone={() => loadRequests()} />
                            </div>
                          )}
                          {offer.status === "PENDING" && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => handleAccept(offer.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition">{t("dash.client.accept", lang)}</button>
                              <button onClick={() => handleReject(offer.id)}
                                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-200 transition">{t("dash.client.reject", lang)}</button>
                            </div>
                          )}
                          <div className="mt-2">
                            <button
                              onClick={() => handleContact(offer.provider.id, req.id)}
                              className="text-sm text-neo-blue hover:underline flex items-center gap-1"
                            >
                              {t("dash.client.contact", lang)} {offer.provider.businessName}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-white/10 transition">
                {t("search.prev", lang)}
              </button>
              <span className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("search.page", lang)} {currentPage} / {totalPages}
              </span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-zinc-300 dark:border-white/20 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-white/10 transition">
                {t("search.next", lang)}
              </button>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4">
          <h2 className="mb-3 text-start text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("dash.client.recommended", lang)}
          </h2>
          {recommended.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">{t("dash.client.noRecommended", lang)}</p>
          ) : (
            <div className="space-y-4">
              {recommended.map((p) => (
                <ProviderCard key={p.id} provider={p} viewProfileLabel={t("search.viewProfile", lang)} />
              ))}
            </div>
          )}
        </aside>
        </div>
      )}

      {activeTab === "favorites" && (
        <div>
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <Heart size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-lg">{t("dash.client.noFavs", lang)}</p>
              <p className="text-sm mt-1">{t("dash.client.noFavsHint", lang)}</p>
              <Link href="/prestataires" className="text-neo-blue hover:underline text-sm mt-4 inline-block">
                {t("dash.client.viewProviders", lang)}
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => {
                const p = fav.provider;
                const ratings = p.reviews?.map((r) => r.rating) || [];
                const avg = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
                return (
                  <ProviderCard
                    key={fav.id}
                    provider={{ ...p, averageRating: avg, reviewsCount: ratings.length }}
                    isFavorited={true}
                    viewProfileLabel={t("dash.client.viewProfile", lang)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "messages" && (
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

      {activeTab === "settings" && (
        <div className="max-w-lg bg-white dark:bg-neo-obsidian p-6 rounded-2xl shadow-sm border border-zinc-900/10 dark:border-white/10">
          <h2 className="text-xl font-semibold mb-4">{t("dash.client.myAccount", lang)}</h2>
          <AccountSettingsForm
            defaultName={session?.user?.name}
            email={session?.user?.email}
          />
        </div>
      )}
    </div>
  );
}
