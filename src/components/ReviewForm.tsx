"use client";

import { useState } from "react";
import { submitReview } from "@/lib/actions/reviews";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

interface ReviewFormProps {
  offerId: string;
  onDone: () => void;
}

export function ReviewForm({ offerId, onDone }: ReviewFormProps) {
  const { lang } = useLang();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("offerId", offerId);
    formData.set("rating", rating.toString());

    const result = await submitReview(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      onDone();
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
      <p className="text-sm font-medium">{t("comp.rateProvider", lang)}</p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl transition ${
              star <= (hover || rating)
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        placeholder={t("comp.yourComment", lang)}
      />

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? t("comp.sendingReview", lang) : t("comp.sendReview", lang)}
      </button>
    </form>
  );
}

export function StarsDisplay({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm transition-transform hover:scale-110 ${
            star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
          }`}
        >
          ★
        </span>
      ))}
      {count !== undefined && (
        <span className="ms-1 text-xs text-gray-500 dark:text-gray-400">({count})</span>
      )}
    </div>
  );
}
