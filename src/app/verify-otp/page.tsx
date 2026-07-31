import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServerLang } from "@/lib/server-lang";
import { t } from "@/lib/i18n";
import { sendOTPAction, type OtpChannel } from "@/lib/actions/otp";
import { toE164 } from "@/lib/utils/otp";
import { OTPInputForm } from "./OTPInputForm";

const CHANNELS: OtpChannel[] = ["sms", "whatsapp", "email"];

function isChannel(value: string | undefined): value is OtpChannel {
  return value !== undefined && (CHANNELS as string[]).includes(value);
}

/** En Next 16, `searchParams` est une Promise : elle doit être awaitée. */
interface VerifyOTPProps {
  searchParams: Promise<{
    target?: string | string[];
    channel?: string | string[];
    sent?: string | string[];
    error?: string | string[];
  }>;
}

/** Les paramètres d'URL peuvent être répétés (`?a=1&a=2`) : on ne garde que le premier. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyOTPPage({ searchParams }: VerifyOTPProps) {
  const [session, params, lang] = await Promise.all([
    auth(),
    searchParams,
    getServerLang(),
  ]);

  if (!session?.user?.id) {
    redirect("/inscription");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, email: true, verifiedPhone: true, role: true },
  });

  if (!user) {
    redirect("/inscription");
  }

  const dashboard = user.role === "PROVIDER" ? "/dashboard/prestataire" : "/dashboard/client";

  // Numéro déjà vérifié : rien à faire ici.
  if (user.verifiedPhone) {
    redirect(dashboard);
  }

  // Cible : celle passée en query (inscription qui vient d'enregistrer le
  // numéro), sinon celle du compte.
  const rawTarget = first(params.target) ?? user.phone ?? "";
  const target = rawTarget ? toE164(rawTarget) : "";

  if (!target) {
    return (
      <Shell title={t("otp.accountVerification", lang)}>
        <p className="mb-6 text-start text-sm text-zinc-600 dark:text-zinc-300">
          {t("otp.noPhone", lang)}
        </p>
        <Link
          href={dashboard}
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {t("otp.bannerDismiss", lang)}
        </Link>
      </Shell>
    );
  }

  const channelParam = first(params.channel);
  const channel = isChannel(channelParam) ? channelParam : null;
  const alreadySent = first(params.sent) === "1";
  const sendError = first(params.error);

  // Étape 1 — choix du canal.
  if (!channel || !alreadySent) {
    // Valeurs capturées par la Server Action : uniquement des chaînes, donc
    // sérialisables dans la référence d'action envoyée au client.
    const currentTarget = target;
    const currentEmail = user.email;
    const currentUserId = session.user.id;

    async function chooseChannel(formData: FormData) {
      "use server";
      const selected = formData.get("channel");
      if (typeof selected !== "string" || !isChannel(selected)) return;

      // L'email part vers l'adresse du compte, le SMS/WhatsApp vers le numéro.
      const dest = selected === "email" ? currentEmail : currentTarget;
      if (!dest) return;

      const result = await sendOTPAction(dest, selected, currentUserId);
      if (!result.success) {
        // Retour à l'étape 1 avec le message d'erreur en query.
        redirect(
          `/verify-otp?target=${encodeURIComponent(currentTarget)}&error=${encodeURIComponent(result.error ?? "")}`
        );
      }
      redirect(`/verify-otp?target=${encodeURIComponent(dest)}&channel=${selected}&sent=1`);
    }

    return (
      <Shell title={t("otp.accountVerification", lang)}>
        <p className="mb-6 text-start text-sm text-zinc-600 dark:text-zinc-300">
          {t("otp.chooseChannel", lang)}
        </p>

        {sendError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-start text-sm text-red-600 dark:bg-red-900/20">
            {sendError}
          </div>
        )}

        <form action={chooseChannel} className="space-y-3">
          <ChannelButton value="sms" icon="📱" label={t("otp.sendBySms", lang)} />
          <ChannelButton value="whatsapp" icon="💬" label={t("otp.sendByWhatsapp", lang)} />
          <ChannelButton value="email" icon="📧" label={t("otp.sendByEmail", lang)} />
        </form>

        <Link
          href={dashboard}
          className="mt-6 inline-block text-sm text-zinc-500 underline transition hover:text-zinc-700 dark:text-zinc-400"
        >
          {t("otp.bannerDismiss", lang)}
        </Link>
      </Shell>
    );
  }

  // Étape 2 — saisie du code.
  return (
    <Shell title={t("otp.title", lang)}>
      <p className="mb-1 text-start text-sm text-zinc-600 dark:text-zinc-300">
        {t("otp.subtitle", lang, { channel: t(`otp.channel.${channel}`, lang) })}
      </p>
      <p className="mb-6 text-start text-sm font-medium text-zinc-900 dark:text-white" dir="ltr">
        {t("otp.sentTo", lang, { target })}
      </p>

      <OTPInputForm target={target} channel={channel} redirectTo={dashboard} />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-sm dark:bg-neo-obsidian">
          <h1 className="mb-4 text-start text-2xl font-bold text-zinc-900 dark:text-white">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function ChannelButton({ value, icon, label }: { value: string; icon: string; label: string }) {
  return (
    <button
      type="submit"
      name="channel"
      value={value}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-white/5"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
