"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateOTP, isValidE164, toE164 } from "@/lib/utils/otp";
import { isAnyRateLimited, otpRateLimitKeys } from "@/lib/utils/rate-limit";
import { sendEmailOTP } from "@/lib/api/email";
import { sendSmsOTP, sendWhatsAppOTP } from "@/lib/api/twilio";

export type OtpChannel = "email" | "sms" | "whatsapp";

/** Durée de validité d'un code. */
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
/** Nombre de vérifications ratées tolérées avant invalidation du code. */
const MAX_VERIFY_ATTEMPTS = 3;

interface SendOTPResult {
  success: boolean;
  error?: string;
  expiresAt?: Date;
}

/**
 * Normalise la cible selon le canal : minuscules pour un email, E.164 pour un
 * téléphone. Garantit qu'un même destinataire produit toujours la même clé.
 */
function normalizeTarget(target: string, channel: OtpChannel): string {
  return channel === "email" ? target.trim().toLowerCase() : toE164(target);
}

/**
 * Récupère l'IP de l'appelant depuis les en-têtes du proxy.
 * Retourne null si aucune IP n'est exposée (dev local derrière rien du tout)
 * ou si l'action est invoquée hors contexte de requête (tests unitaires, seed).
 */
async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    // x-forwarded-for est une liste « client, proxy1, proxy2 » : la première
    // entrée est l'IP d'origine.
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return h.get("x-real-ip");
  } catch {
    // `headers()` lève hors request scope : on retombe sur le rate-limit par cible seule.
    return null;
  }
}

/**
 * Supprime les codes expirés. Appelé opportunément à chaque envoi : la table
 * reste petite et l'index `@@index([expiresAt])` rend l'opération triviale.
 */
async function purgeExpiredOtps(): Promise<void> {
  try {
    await prisma.otp.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch (error) {
    // La purge est un nettoyage best-effort : elle ne doit jamais faire échouer l'envoi.
    console.error("Erreur purge OTP:", error);
  }
}

/**
 * Envoie un code OTP à l'utilisateur via le canal spécifié.
 *
 * @param userId - Si fourni, le code est rattaché au compte : sa vérification
 *   marquera `verifiedPhone` / `emailVerified` sur l'utilisateur.
 */
export async function sendOTPAction(
  target: string,
  channel: OtpChannel,
  userId?: string
): Promise<SendOTPResult> {
  const normalizedTarget = normalizeTarget(target, channel);

  // Valider le format cible avant toute écriture.
  if (channel !== "email" && !isValidE164(normalizedTarget)) {
    return { success: false, error: "Numéro de téléphone invalide" };
  }

  // Rate limiting par cible ET par IP.
  const ip = await getClientIp();
  if (isAnyRateLimited(otpRateLimitKeys(channel, normalizedTarget, ip))) {
    return { success: false, error: "Trop de tentatives. Réessayez plus tard." };
  }

  await purgeExpiredOtps();

  // Générer et hacher le code OTP
  const otpCode = generateOTP();
  const otpHash = await bcrypt.hash(otpCode, 12);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Sauvegarder en base de données
  try {
    await prisma.otp.upsert({
      where: {
        target_channel: {
          target: normalizedTarget,
          channel,
        },
      },
      create: {
        target: normalizedTarget,
        channel,
        otpHash,
        expiresAt,
        type: channel,
        userId: userId ?? null,
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        // Un renvoi peut désormais rattacher le code à un compte (ou le
        // conserver si l'appelant ne le connaît pas).
        ...(userId ? { userId } : {}),
      },
    });
  } catch (error) {
    console.error("Erreur création OTP:", error);
    return { success: false, error: "Échec de création du code de vérification" };
  }

  // Envoyer via le canal approprié
  try {
    if (channel === "email") {
      await sendEmailOTP(normalizedTarget, otpCode);
    } else if (channel === "sms") {
      await sendSmsOTP(normalizedTarget, otpCode);
    } else {
      await sendWhatsAppOTP(normalizedTarget, otpCode);
    }
  } catch (error) {
    console.error(`Erreur envoi ${channel} OTP:`, error);
    return { success: false, error: `Échec de l'envoi du code (${channel})` };
  }

  return { success: true, expiresAt };
}

interface VerifyOTPResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Vérifie un code OTP et marque le canal correspondant comme vérifié sur le compte.
 */
export async function verifyOTPAction(
  target: string,
  code: string,
  channel: OtpChannel
): Promise<VerifyOTPResult> {
  const normalizedTarget = normalizeTarget(target, channel);

  // Récupérer l'OTP en base
  const otpRecord = await prisma.otp.findFirst({
    where: {
      target: normalizedTarget,
      channel,
      type: channel,
    },
    orderBy: { createdAt: "desc" },
  });

  // Vérifier l'existence et l'expiration
  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    return { success: false, error: "Code expiré ou invalide" };
  }

  // Vérifier le nombre de tentatives
  if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, error: "Trop de tentatives. Demandez un nouveau code." };
  }

  // Vérifier le code
  const isValid = await bcrypt.compare(code, otpRecord.otpHash);
  if (!isValid) {
    // Incrémenter les tentatives
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 },
    });
    return { success: false, error: "Code incorrect" };
  }

  // Marquer le canal comme vérifié sur le compte rattaché, s'il y en a un.
  if (otpRecord.userId) {
    await prisma.user.update({
      where: { id: otpRecord.userId },
      data:
        channel === "email"
          ? { emailVerified: new Date() }
          : { verifiedPhone: true },
    });
  }

  // Le code est consommé quoi qu'il arrive : il ne doit jamais servir deux fois.
  await prisma.otp.delete({ where: { id: otpRecord.id } });

  return { success: true, userId: otpRecord.userId ?? undefined };
}
