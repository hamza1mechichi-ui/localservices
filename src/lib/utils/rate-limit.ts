/**
 * Rate-limiter en mémoire.
 *
 * ⚠️ Limite connue : le store est un `Map` local au process. En déploiement
 * serverless (Vercel) ou multi-instance, chaque instance a son propre compteur
 * et le quota effectif est multiplié par le nombre d'instances. Pour de la
 * production sérieuse, remplacer `store` par Redis / Upstash en conservant la
 * même signature `isRateLimited(key)`.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 heure
const MAX_ATTEMPTS = 5; // Max 5 tentatives par clé par fenêtre

/** Purge périodique des entrées expirées pour éviter que le Map ne grossisse sans fin. */
function sweep(now: number): void {
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

let lastSweep = 0;

/**
 * Vérifie si la clé est actuellement limitée.
 * Retourne true si le taux est dépassé, false sinon et incrémente le compteur.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();

  // Balayage au plus une fois par fenêtre : coût amorti négligeable.
  if (now - lastSweep > WINDOW_MS) {
    lastSweep = now;
    sweep(now);
  }

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle entrée ou fenêtre expirée
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

/**
 * Construit une clé de rate-limit composite.
 *
 * On limite **à la fois** par cible (empêche le spam d'un numéro donné, quel que
 * soit l'attaquant) et par IP (empêche un attaquant d'énumérer des milliers de
 * numéros différents). Les deux compteurs sont indépendants : un seul dépassement
 * suffit à bloquer.
 */
export function otpRateLimitKeys(
  channel: string,
  target: string,
  ip: string | null
): string[] {
  const keys = [`otp:target:${channel}:${target}`];
  if (ip) keys.push(`otp:ip:${ip}`);
  return keys;
}

/** Vrai si **au moins une** des clés fournies dépasse son quota. */
export function isAnyRateLimited(keys: string[]): boolean {
  // On évalue toutes les clés (pas de court-circuit) pour que chaque compteur
  // soit incrémenté, sinon une IP abusive resterait sous son quota.
  return keys.map(isRateLimited).some(Boolean);
}

/**
 * Réinitialise le compteur pour une clé donnée.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Retourne le nombre de tentatives restantes pour une clé.
 */
export function remainingAttempts(key: string): number {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetAt) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
