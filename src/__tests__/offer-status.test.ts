import { describe, it, expect } from "vitest";
import {
  canReviewOffer,
  REVIEWABLE_OFFER_STATUSES,
  OFFER_STATUSES,
} from "@/lib/offer-status";

/**
 * Non-régression : l'UI n'affichait le formulaire d'avis que pour les offres
 * COMPLETED, statut que `submitReview` rejetait ("Vous ne pouvez noter qu'une
 * offre acceptée"). Le dépôt d'avis était donc totalement impossible. UI et
 * Server Action partagent désormais `canReviewOffer`.
 */
describe("canReviewOffer", () => {
  it("autorise une offre terminée", () => {
    // Cas nominal : `markOfferCompleted` invite explicitement le client à noter.
    expect(canReviewOffer("COMPLETED")).toBe(true);
  });

  it("autorise une offre acceptée", () => {
    expect(canReviewOffer("ACCEPTED")).toBe(true);
  });

  it("refuse une offre en attente ou refusée", () => {
    expect(canReviewOffer("PENDING")).toBe(false);
    expect(canReviewOffer("REJECTED")).toBe(false);
  });

  it("refuse un statut inconnu", () => {
    expect(canReviewOffer("")).toBe(false);
    expect(canReviewOffer("TERMINATED")).toBe(false);
  });

  it("reste cohérent avec REVIEWABLE_OFFER_STATUSES", () => {
    for (const status of OFFER_STATUSES) {
      expect(canReviewOffer(status)).toBe(REVIEWABLE_OFFER_STATUSES.includes(status));
    }
  });
});
