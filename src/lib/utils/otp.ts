/**
 * Utilitaires OTP partagés client / serveur.
 *
 * Ce module est importé aussi bien par `RegisterForm` (composant client) que par
 * les Server Actions : il ne doit donc dépendre d'aucune API réservée à Node.
 * On utilise la Web Crypto API (`globalThis.crypto`), disponible nativement dans
 * les navigateurs et dans Node 18+.
 */

const OTP_DIGITS = 6;
const OTP_MAX = 10 ** OTP_DIGITS; // 1_000_000 valeurs possibles : 000000 → 999999

/**
 * Génère un code OTP à 6 chiffres cryptographiquement sûr.
 *
 * `Math.random()` n'est pas adapté : son état interne est prédictible, ce qui
 * permettrait de deviner les codes suivants après en avoir observé quelques-uns.
 * On tire donc des octets via la Web Crypto API, avec rejection sampling pour
 * éviter le biais modulo (2^24 n'est pas un multiple de 1 000 000).
 */
export function generateOTP(): string {
  const buf = new Uint32Array(1);
  // Plus grand multiple de OTP_MAX représentable sur 32 bits : au-delà, on rejette.
  const limit = Math.floor(0x1_0000_0000 / OTP_MAX) * OTP_MAX;

  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);

  return String(value % OTP_MAX).padStart(OTP_DIGITS, "0");
}

/**
 * Valide un numéro de téléphone au format E.164.
 * Exemples valides : +21655123456, +33612345678, +14155552671 (entre 8 et 15 chiffres après +)
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{10,14}$/.test(phone);
}

/**
 * Formate un numéro de téléphone tunisien brut (8 chiffres) en E.164.
 * Exemple : "22123456" → "+21622123456"
 */
export function formatTNPhone(digits: string): string {
  if (digits.startsWith("+")) return digits;
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned.length === 8 && /^[0-9]{8}$/.test(cleaned)) {
    return `+216${cleaned}`;
  }
  return cleaned;
}

/**
 * Nettoie un numéro E.164 pour le stocker (supprime espaces, parenthèses, tirets).
 */
export function normalizeE164(phone: string): string {
  return phone.replace(/[\s()\-.]/g, "");
}

/**
 * Normalisation canonique unique, utilisée **partout** (formulaire client comme
 * Server Action) afin qu'un même numéro produise toujours la même clé en base.
 *
 * Elle enchaîne le nettoyage des séparateurs puis l'ajout de l'indicatif
 * tunisien pour les numéros locaux à 8 chiffres. Les numéros déjà internationaux
 * (préfixe `+` ou `00`) sont préservés tels quels.
 *
 * Exemples :
 *   "55 123 456"      → "+21655123456"
 *   "+216 55-123-456" → "+21655123456"
 *   "0021655123456"   → "+21655123456"
 */
export function toE164(raw: string): string {
  const cleaned = normalizeE164(raw.trim());
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  return formatTNPhone(cleaned);
}
