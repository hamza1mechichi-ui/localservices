/**
 * Client Twilio minimal, en REST direct via `fetch`.
 *
 * On n'utilise pas le SDK `twilio` : il embarque des dépendances Node lourdes
 * (et un client HTTP maison) pour un seul endpoint. L'API Messages tient en une
 * requête `application/x-www-form-urlencoded` avec une auth Basic.
 *
 * Variables d'environnement (voir `.env.example`) :
 *   TWILIO_ACCOUNT_SID   — identifiant du compte (commence par « AC »)
 *   TWILIO_AUTH_TOKEN    — jeton d'authentification
 *   TWILIO_PHONE_NUMBER  — numéro expéditeur E.164 pour les SMS
 *   TWILIO_WHATSAPP_FROM — numéro expéditeur WhatsApp (ex: +14155238886 en sandbox)
 *
 * Si les identifiants sont absents, on retombe sur un `console.log` : le flux
 * d'inscription reste testable en local sans compte Twilio.
 */

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  smsFrom?: string;
  whatsappFrom?: string;
}

/** Retourne la config Twilio, ou null si le compte n'est pas configuré. */
function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  return {
    accountSid,
    authToken,
    smsFrom: process.env.TWILIO_PHONE_NUMBER,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  };
}

/** Corps du message OTP, volontairement court (contrainte 160 caractères SMS). */
function otpBody(otp: string): string {
  return `LocalServices : votre code de verification est ${otp}. Il expire dans 10 minutes. Ne le partagez avec personne.`;
}

interface TwilioErrorPayload {
  message?: string;
  code?: number;
}

/**
 * Envoie un message via l'API Twilio Messages.
 * @throws si Twilio répond une erreur — l'appelant (sendOTPAction) la convertit
 *   en message utilisateur et n'expose pas le détail.
 */
async function sendMessage(config: TwilioConfig, from: string, to: string, body: string): Promise<void> {
  const url = `${TWILIO_API_BASE}/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    // Les Server Actions ne doivent jamais mettre en cache un envoi.
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as TwilioErrorPayload;
      if (payload.message) detail = `${payload.message} (code ${payload.code ?? "?"})`;
    } catch {
      // Réponse non-JSON : on garde le code HTTP.
    }
    throw new Error(`Twilio: ${detail}`);
  }
}

/**
 * Envoie un OTP par SMS.
 */
export async function sendSmsOTP(target: string, otp: string): Promise<void> {
  const config = getConfig();

  if (!config?.smsFrom) {
    // Mode développement : le code est affiché dans la console serveur.
    console.log(`[SMS OTP] To: ${target} | Code: ${otp}`);
    return;
  }

  await sendMessage(config, config.smsFrom, target, otpBody(otp));
}

/**
 * Envoie un OTP par WhatsApp.
 *
 * L'API Twilio attend le préfixe `whatsapp:` sur les deux numéros.
 */
export async function sendWhatsAppOTP(target: string, otp: string): Promise<void> {
  const config = getConfig();

  if (!config?.whatsappFrom) {
    console.log(`[WhatsApp OTP] To: ${target} | Code: ${otp}`);
    return;
  }

  await sendMessage(
    config,
    `whatsapp:${config.whatsappFrom}`,
    `whatsapp:${target}`,
    otpBody(otp)
  );
}
