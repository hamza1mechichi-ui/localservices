"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole, AuthError } from "@/lib/require-role";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sendTemplate } from "@/lib/email";
import { isUnlimited } from "@/lib/plan-limits";

const createOfferSchema = z.object({
  serviceRequestId: z.string(),
  price: z.number().min(0, "Le prix doit être positif"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
});

export async function createOffer(formData: FormData) {
  let user;
  try {
    user = await requireRole("PROVIDER");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return { error: "Profil prestataire introuvable" };
  }

  const serviceRequestId = formData.get("serviceRequestId") as string;
  const price = parseFloat(formData.get("price") as string);
  const message = formData.get("message") as string;

  const validated = createOfferSchema.safeParse({ serviceRequestId, price, message });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
  });

  if (!serviceRequest || serviceRequest.status !== "OPEN") {
    return { error: "Cette demande n'est plus ouverte" };
  }

  if (serviceRequest.clientId === user.id) {
    return { error: "Vous ne pouvez pas répondre à votre propre demande" };
  }

  const existingOffer = await prisma.offer.findUnique({
    where: {
      providerId_serviceRequestId: {
        providerId: profile.id,
        serviceRequestId,
      },
    },
  });

  if (existingOffer) {
    return { error: "Vous avez déjà envoyé une offre pour cette demande" };
  }

  if (!isUnlimited(profile.plan) && profile.offerTokens <= 0) {
    return {
      error:
        profile.plan === "FREE"
          ? "Vous avez épuisé vos 3 offres gratuites ce mois-ci. Passez à un plan supérieur pour continuer."
          : "Vous avez épuisé vos 15 offres ce mois-ci. Passez au plan PRO pour un accès illimité.",
      blocked: true,
    };
  }

  await prisma.$transaction(async (tx) => {
    if (!isUnlimited(profile.plan)) {
      await tx.providerProfile.update({
        where: { id: profile.id },
        data: { offerTokens: { decrement: 1 } },
      });
    }

    await tx.offer.create({
      data: {
        providerId: profile.id,
        clientId: serviceRequest.clientId,
        serviceRequestId,
        price,
        message,
      },
    });

    await tx.notification.create({
      data: {
        userId: serviceRequest.clientId,
        type: "NEW_OFFER",
        message: `${profile.businessName} a envoy\u00e9 une offre pour "${serviceRequest.title}"`,
        link: "/dashboard/client",
      },
    });
  });

  const clientUser = await prisma.user.findUnique({ where: { id: serviceRequest.clientId } });
  if (clientUser?.email) {
    sendTemplate("newOffer", clientUser.email, clientUser.name, profile.businessName, serviceRequest.title);
  }

  revalidatePath("/dashboard/prestataire");
  return { success: "Offre envoyée avec succès" };
}

export async function getMyOffers() {
  const session = await auth();
  if (!session?.user) return [];

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) return [];

  return prisma.offer.findMany({
    where: { providerId: profile.id },
    include: {
      serviceRequest: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOfferStatus(
  offerId: string,
  status: "ACCEPTED" | "REJECTED"
) {
  let user;
  try {
    user = await requireRole("CLIENT");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { serviceRequest: true, provider: true },
  });

  if (!offer || offer.clientId !== user.id) {
    return { error: "Offre introuvable" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offerId },
      data: { status },
    });

    if (status === "ACCEPTED") {
      await tx.serviceRequest.update({
        where: { id: offer.serviceRequestId },
        data: { status: "IN_PROGRESS" },
      });

      await tx.offer.updateMany({
        where: {
          serviceRequestId: offer.serviceRequestId,
          id: { not: offerId },
        },
        data: { status: "REJECTED" },
      });
    }

    await tx.notification.create({
      data: {
        // Bug corrigé : Notification.userId doit référencer un User.id, pas un ProviderProfile.id
        userId: offer.provider.userId,
        type: status === "ACCEPTED" ? "OFFER_ACCEPTED" : "OFFER_REJECTED",
        message:
          status === "ACCEPTED"
            ? `Votre offre pour "${offer.serviceRequest.title}" a \u00e9t\u00e9 accept\u00e9e`
            : `Votre offre pour "${offer.serviceRequest.title}" a \u00e9t\u00e9 refus\u00e9e`,
        link: "/dashboard/prestataire",
      },
    });
  });

  const providerProfile = await prisma.providerProfile.findUnique({ where: { id: offer.providerId }, include: { user: { select: { email: true, name: true } } } });
  if (providerProfile?.user?.email) {
    if (status === "ACCEPTED") {
      sendTemplate("offerAccepted", providerProfile.user.email, providerProfile.user.name, offer.serviceRequest.title);
    } else {
      sendTemplate("offerRejected", providerProfile.user.email, providerProfile.user.name, offer.serviceRequest.title);
    }
  }

  revalidatePath("/dashboard/client");
  return { success: status === "ACCEPTED" ? "Offre acceptée" : "Offre refusée" };
}

export async function markOfferCompleted(offerId: string) {
  let user;
  try {
    user = await requireRole("PROVIDER");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return { error: "Profil introuvable" };

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { serviceRequest: true },
  });
  if (!offer || offer.providerId !== profile.id) return { error: "Offre introuvable" };
  if (offer.status !== "ACCEPTED") return { error: "Seules les offres acceptées peuvent être marquées terminées" };

  await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offerId },
      data: { status: "COMPLETED" },
    });

    await tx.serviceRequest.update({
      where: { id: offer.serviceRequestId },
      data: { status: "CLOSED" },
    });

    await tx.notification.create({
      data: {
        userId: offer.clientId,
        type: "OFFER_COMPLETED",
        message: `${profile.businessName} a marqu\u00e9 les travaux comme termin\u00e9s pour "${offer.serviceRequest.title}". N'oubliez pas de laisser un avis !`,
        link: "/dashboard/client",
      },
    });
  });

  const clientUser = await prisma.user.findUnique({ where: { id: offer.clientId } });
  if (clientUser?.email) {
    sendTemplate("offerCompleted", clientUser.email, clientUser.name, profile.businessName, offer.serviceRequest.title);
  }

  revalidatePath("/dashboard/prestataire");
  return { success: "Offre marquée comme terminée" };
}

export async function getProviderStats() {
  let user;
  try {
    user = await requireRole("PROVIDER");
  } catch {
    return null;
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return null;

  const offers = await prisma.offer.findMany({
    where: { providerId: profile.id },
    select: { status: true, price: true },
  });

  const total = offers.length;
  const accepted = offers.filter((o) => o.status === "ACCEPTED" || o.status === "COMPLETED").length;
  const rejected = offers.filter((o) => o.status === "REJECTED").length;
  const completed = offers.filter((o) => o.status === "COMPLETED").length;
  const pending = offers.filter((o) => o.status === "PENDING").length;

  const totalRevenue = offers
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.price, 0);

  return { total, accepted, rejected, completed, pending, totalRevenue, acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0 };
}

export async function getProviderProfile() {
  const session = await auth();
  if (!session?.user) return null;

  return prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true, email: true, subscription: true } },
    },
  });
}
