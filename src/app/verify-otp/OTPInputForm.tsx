"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { verifyOTPAction, sendOTPAction, type OtpChannel } from "@/lib/actions/otp";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

const CODE_LENGTH = 6;
/** Délai avant de pouvoir demander un nouveau code. */
const RESEND_COOLDOWN_S = 60;

interface OTPInputFormProps {
  target: string;
  channel: OtpChannel;
  /** Destination après vérification réussie (dashboard client ou prestataire). */
  redirectTo: string;
}

export function OTPInputForm({ target, channel, redirectTo }: OTPInputFormProps) {
  const { lang } = useLang();
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_S);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus sur la première case au chargement.
    inputRefs.current[0]?.focus();
  }, []);

  // Décompte du cooldown de renvoi. L'intervalle s'arrête de lui-même à 0.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const submitCode = useCallback(
    async (fullCode: string) => {
      setLoading(true);
      setError("");
      setNotice("");

      const result = await verifyOTPAction(target, fullCode, channel);

      if (result.success) {
        // `router.refresh()` recharge le layout serveur pour que la bannière de
        // rappel disparaisse immédiatement.
        router.refresh();
        router.push(redirectTo);
        return;
      }

      setError(result.error || t("otp.invalidCode", lang));
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      setLoading(false);
    },
    [target, channel, redirectTo, router, lang]
  );

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (!digit) return;

    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      return;
    }

    // Dernière case remplie : on soumet automatiquement.
    const full = newCode.join("");
    if (full.length === CODE_LENGTH) submitCode(full);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH)
      .split("");

    if (digits.length === 0) return;

    const newCode = Array(CODE_LENGTH).fill("");
    digits.forEach((d, i) => {
      newCode[i] = d;
    });
    setCode(newCode);

    if (digits.length === CODE_LENGTH) {
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      submitCode(digits.join(""));
    } else {
      inputRefs.current[digits.length]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const full = code.join("");
    if (full.length < CODE_LENGTH) return;
    await submitCode(full);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setNotice("");

    const result = await sendOTPAction(target, channel);
    if (result.success) {
      setNotice(t("otp.resent", lang));
      setSecondsLeft(RESEND_COOLDOWN_S);
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } else {
      setError(result.error ?? t("errors.server", lang));
    }
    setResending(false);
  };

  const complete = code.every((d) => d !== "");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* dir="ltr" : un code numérique se lit de gauche à droite même en RTL. */}
      <div className="grid grid-cols-6 gap-2" dir="ltr">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={loading}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`${t("otp.title", lang)} ${i + 1}`}
            className="h-12 w-full rounded-lg border border-zinc-300 text-center text-xl font-bold focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
          />
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-900/20">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-600 dark:bg-green-900/20">
          {notice}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !complete}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? t("otp.verifying", lang) : t("otp.verify", lang)}
      </button>

      <div className="text-center text-sm">
        {secondsLeft > 0 ? (
          <span className="text-zinc-500 dark:text-zinc-400">
            {t("otp.countdown", lang, { seconds: secondsLeft })}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-blue-600 underline transition hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
          >
            {resending ? t("otp.resending", lang) : t("otp.resend", lang)}
          </button>
        )}
      </div>
    </form>
  );
}
