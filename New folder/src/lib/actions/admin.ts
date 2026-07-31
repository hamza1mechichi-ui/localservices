"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/require-role";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// === Categories ===

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

const categorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50),
});

export async function createCategory(formData: FormData) {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { error: "Cette catégorie existe déjà" };

  await prisma.category.create({ data: { name: parsed.data.name } });
  revalidatePath("/admin");
  return { success: "Catégorie ajoutée" };
}

export async function deleteCategory(categoryId: string) {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin");
  return { success: "Catégorie supprimée" };
}

// === Reviews Moderation ===

export async function getAllReviews() {
  try {
    await requireRole("ADMIN");
  } catch {
    return [];
  }

  return prisma.review.findMany({
    include: {
      client: { select: { name: true, email: true } },
      provider: {
        select: { businessName: true, user: { select: { name: true } } },
      },
      serviceRequest: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function hideReview(reviewId: string) {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { hidden: true },
  });
  revalidatePath("/admin");
  return { success: "Avis masqué" };
}

export async function deleteReview(reviewId: string) {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return { error: e instanceof AuthError ? e.message : "Non autorisé" };
  }

  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/admin");
  return { success: "Avis supprimé" };
}

// === Advanced Stats ===

export async function getAdvancedStats() {
  try {
    await requireRole("ADMIN");
  } catch {
    return null;
  }

  const [
    totalUsers,
    totalClients,
    totalProviders,
    totalRequests,
    totalOffers,
    proCount,
    reviewsCount,
    totalRevenue,
    offersByStatus,
    requestsByCategory,
    usersLast7Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.serviceRequest.count(),
    prisma.offer.count(),
    prisma.providerProfile.count({ where: { plan: "PRO" } }),
    prisma.review.count({ where: { hidden: false } }),
    prisma.offer.aggregate({
      where: { status: "COMPLETED" },
      _sum: { price: true },
    }),
    prisma.offer.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.serviceRequest.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const statusBreakdown: Record<string, number> = {};
  for (const s of offersByStatus) {
    statusBreakdown[s.status] = s._count.id;
  }

  return {
    totalUsers,
    totalClients,
    totalProviders,
    totalRequests,
    totalOffers,
    proCount,
    reviewsCount,
    totalRevenue: totalRevenue._sum.price ?? 0,
    offersPending: statusBreakdown["PENDING"] ?? 0,
    offersAccepted: statusBreakdown["ACCEPTED"] ?? 0,
    offersCompleted: statusBreakdown["COMPLETED"] ?? 0,
    offersRejected: statusBreakdown["REJECTED"] ?? 0,
    topCategories: requestsByCategory.map((c) => ({ name: c.category, count: c._count.id })),
    usersLast7Days,
  };
}
