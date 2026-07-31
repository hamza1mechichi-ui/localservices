/**
 * Statuts d'offre, partagés entre le client et le serveur.
 *
 * Le statut est une simple `String` en base (SQLite n'a pas d'enum natif) :
 * ce module est la seule source de vérité pour les valeurs admises et évite
 * que l'UI et les Server Actions divergent — divergence qui avait rendu le
 * dépôt d'avis impossible (l'UI n'affichait le formulaire que pour COMPLETED,
 * que le serveur refusait).
 */

export const OFFER_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED"] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** Statuts pour lesquels le client est autorisé à déposer un avis. */
export const REVIEWABLE_OFFER_STATUSES: readonly string[] = ["ACCEPTED", "COMPLETED"];

/** Vrai si une prestation à ce statut peut être notée par le client. */
export function canReviewOffer(status: string): boolean {
  return REVIEWABLE_OFFER_STATUSES.includes(status);
}
