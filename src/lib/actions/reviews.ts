"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/require-role";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { REVIEWABLE_OFFER_STATUSES } from "@/lib/offer-status";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sendTemplate } from "@/lib/email";

const reviewSchema = z.object({
  offerId: z.string().min(1, "Offre invalide"),
  rating: z.coerce.number().int().min(1, "Note minimale : 1").max(5, "Note maximale : 5"),
  comment: z.string().min(5, "Le commentaire doit contenir au moins 5 caractères").optional(),
});

export async function submitReview(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("CLIENT");

    const parsed = reviewSchema.safeParse({
      offerId: formData.get("offerId"),
      rating: formData.get("rating"),
      comment: (formData.get("comment") as string) || undefined,
    });
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { offerId, rating, comment } = parsed.data;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { serviceRequest: true, provider: true },
    });

    if (!offer || offer.clientId !== user.id) {
      return fail("Offre introuvable");
    }
    // Une prestation clôturée (COMPLETED) reste notable : c'est même le cas
    // nominal, `markOfferCompleted` invitant explicitement le client à noter.
    if (!REVIEWABLE_OFFER_STATUSES.includes(offer.status)) {
      return fail("Vous ne pouvez noter qu'une offre acceptée ou terminée");
    }

    const existing = await prisma.review.findUnique({ where: { offerId } });
    if (existing) return fail("Vous avez déjà noté cette offre");

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          serviceRequestId: offer.serviceRequestId,
          providerId: offer.providerId,
          clientId: user.id,
          offerId,
          rating,
          comment: comment || null,
        },
      });

      await tx.offer.update({ where: { id: offerId }, data: { status: "COMPLETED" } });

      // Bug corrigé : Notification.userId doit référencer un User.id, pas un ProviderProfile.id
      await tx.notification.create({
        data: {
          userId: offer.provider.userId,
          type: "REVIEW_RECEIVED",
          message: `Un client vous a noté ${rating}/5`,
          link: "/dashboard/prestataire",
        },
      });

      return created;
    });

    const providerUser = await prisma.user.findUnique({
      where: { id: offer.provider.userId },
      select: { email: true, name: true },
    });
    if (providerUser?.email) {
      sendTemplate("reviewReceived", providerUser.email, providerUser.name ?? "Prestataire", rating);
    }

    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/prestataire");
    return ok({ id: review.id });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message);
    console.error("[submitReview]", e);
    return fail("Erreur serveur, réessayez.");
  }
}

export async function getProviderReviews(providerId: string) {
  return prisma.review.findMany({
    where: { providerId },
    include: {
      client: { select: { name: true } },
      serviceRequest: { select: { title: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProviderAverageRating(providerId: string) {
  const result = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    average: result._avg.rating ?? 0,
    count: result._count.rating,
  };
}
