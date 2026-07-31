"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLang } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { verifyOTPAction } from "@/lib/actions/otp";

interface OTPVerificationModalProps {
  target: string; // Email ou téléphone
  channel: "email" | "sms" | "whatsapp";
  onVerified?: (userId?: string) => void;
}

/**
 * Modal de vérification OTP avec 6 cases de saisie.
 * Gère le compte à rebours et la vérification côté serveur.
 */
export function OTPVerificationModal({
  target,
  channel,
  onVerified,
}: OTPVerificationModalProps) {
  const { lang } = useLang();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Compte à rebours automatique
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus sur la case suivante
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    const digits = pasted.replace(/\D/g, "").split("");

    if (digits.length === 6) {
      setCode(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fullCode = code.join("");
    const result = await verifyOTPAction(target, fullCode, channel);

    if (result.success) {
      onVerified?.(result.userId);
    } else {
      setError(result.error || "Erreur de vérification");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t("otp.title", lang)}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t("otp.subtitle", lang, { channel: t(`otp.channel.${channel}`, lang) })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="\d{1}"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-12 text-center text-xl font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            ))}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="text-center text-sm text-gray-500">
            {countdown > 0
              ? t("otp.countdown", lang, { seconds: countdown })
              : t("otp.canResend", lang)}
          </div>

          <button
            type="submit"
            disabled={loading || code.some((d) => !d)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("otp.verifying", lang) : t("otp.verify", lang)}
          </button>
        </form>
      </div>
    </div>
  );
}