"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/require-role";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { monthlyQuotaFor, type Plan } from "@/lib/plan-limits";

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
    bannedUsers,
    verifiedProviders,
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
    prisma.user.count({ where: { banned: true } }),
    prisma.providerProfile.count({ where: { verified: true } }),
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
    bannedUsers,
    verifiedProviders,
  };
}

// === Users management ===

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  banned: boolean;
  bannedReason: string | null;
  verifiedPhone: boolean;
  emailVerified: boolean;
  createdAt: Date;
  provider: { id: string; businessName: string; verified: boolean; plan: string } | null;
};

/**
 * Liste les comptes pour la table d'administration.
 * Le filtrage/la recherche sont faits côté serveur pour éviter de charger
 * l'intégralité de la base dans le navigateur.
 */
export async function getAllUsers(options?: {
  search?: string;
  role?: "ALL" | "CLIENT" | "PROVIDER" | "ADMIN";
  status?: "ALL" | "BANNED" | "UNVERIFIED_PROVIDER";
  take?: number;
}): Promise<AdminUser[]> {
  try {
    await requireRole("ADMIN");
  } catch {
    return [];
  }

  const search = options?.search?.trim();
  const role = options?.role ?? "ALL";
  const status = options?.status ?? "ALL";

  const users = await prisma.user.findMany({
    where: {
      ...(role !== "ALL" ? { role } : {}),
      ...(status === "BANNED" ? { banned: true } : {}),
      ...(status === "UNVERIFIED_PROVIDER"
        ? { role: "PROVIDER", providerProfile: { verified: false } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      banned: true,
      bannedReason: true,
      verifiedPhone: true,
      emailVerified: true,
      createdAt: true,
      providerProfile: {
        select: { id: true, businessName: true, verified: true, plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 100,
  });

  return users.map(({ providerProfile, emailVerified, ...u }) => ({
    ...u,
    emailVerified: emailVerified !== null,
    provider: providerProfile,
  }));
}

const banSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(200).optional(),
});

/**
 * Bascule l'état banni d'un compte. Un admin ne peut ni se bannir lui-même,
 * ni bannir un autre admin.
 */
export async function toggleUserBanAction(
  userId: string,
  reason?: string
): Promise<ActionResult<{ banned: boolean }>> {
  let admin;
  try {
    admin = await requireRole("ADMIN");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const parsed = banSchema.safeParse({ userId, reason });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  if (userId === admin.id) return fail("Vous ne pouvez pas bannir votre propre compte");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, role: true },
  });
  if (!target) return fail("Utilisateur introuvable");
  if (target.role === "ADMIN") return fail("Impossible de bannir un administrateur");

  const banned = !target.banned;
  await prisma.user.update({
    where: { id: userId },
    data: {
      banned,
      bannedReason: banned ? parsed.data.reason?.trim() || null : null,
      bannedAt: banned ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  return ok({ banned });
}

/**
 * Attribue ou retire le badge « prestataire vérifié ».
 */
export async function verifyProAccountAction(
  userId: string
): Promise<ActionResult<{ verified: boolean }>> {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, verified: true },
  });
  if (!profile) return fail("Ce compte n'a pas de profil prestataire");

  const verified = !profile.verified;
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { verified, verifiedAt: verified ? new Date() : null },
  });

  revalidatePath("/admin");
  revalidatePath(`/prestataires/${profile.id}`);
  return ok({ verified });
}

// === Subscriptions ===

export type AdminSubscription = {
  userId: string;
  profileId: string;
  name: string;
  email: string;
  businessName: string;
  plan: string;
  verified: boolean;
  offerTokens: number;
  quota: number;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

export async function getAllSubscriptions(): Promise<AdminSubscription[]> {
  try {
    await requireRole("ADMIN");
  } catch {
    return [];
  }

  const profiles = await prisma.providerProfile.findMany({
    select: {
      id: true,
      userId: true,
      businessName: true,
      plan: true,
      verified: true,
      offerTokens: true,
      user: {
        select: {
          name: true,
          email: true,
          subscription: {
            select: { status: true, startDate: true, endDate: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return profiles.map((p) => ({
    userId: p.userId,
    profileId: p.id,
    name: p.user.name,
    email: p.user.email,
    businessName: p.businessName,
    plan: p.plan,
    verified: p.verified,
    offerTokens: p.offerTokens,
    quota: monthlyQuotaFor(p.plan),
    status: p.user.subscription?.status ?? "ACTIVE",
    startDate: p.user.subscription?.startDate ?? null,
    endDate: p.user.subscription?.endDate ?? null,
  }));
}

const planSchema = z.enum(["FREE", "STARTER", "PRO"]);

/**
 * Change le plan d'un prestataire. Le profil et la table Subscription sont
 * mis à jour ensemble, et les jetons d'offres sont recalculés selon le quota
 * du nouveau plan (Infinity → on stocke une grande valeur bornée).
 */
export async function updateUserSubscriptionAction(
  userId: string,
  plan: string
): Promise<ActionResult<{ plan: Plan }>> {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return fail("Plan invalide");
  const newPlan = parsed.data;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return fail("Ce compte n'a pas de profil prestataire");

  const quota = monthlyQuotaFor(newPlan);
  // PRO est illimité (Infinity) : on stocke une valeur finie car SQLite/Postgres
  // ne savent pas représenter Infinity dans une colonne Int.
  const tokens = Number.isFinite(quota) ? quota : 9999;

  await prisma.$transaction([
    prisma.providerProfile.update({
      where: { id: profile.id },
      data: { plan: newPlan, offerTokens: tokens, tokensResetAt: new Date() },
    }),
    prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: newPlan, status: "ACTIVE" },
      update: { plan: newPlan, status: "ACTIVE" },
    }),
  ]);

  revalidatePath("/admin");
  return ok({ plan: newPlan });
}

// === Demands moderation ===

export type AdminDemand = {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  estimatedBudget: number | null;
  createdAt: Date;
  clientName: string;
  clientEmail: string;
  offersCount: number;
};

export async function getAllDemands(
  status?: "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED"
): Promise<AdminDemand[]> {
  try {
    await requireRole("ADMIN");
  } catch {
    return [];
  }

  const demands = await prisma.serviceRequest.findMany({
    where: status && status !== "ALL" ? { status } : {},
    select: {
      id: true,
      title: true,
      category: true,
      location: true,
      status: true,
      estimatedBudget: true,
      createdAt: true,
      client: { select: { name: true, email: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return demands.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    location: d.location,
    status: d.status,
    estimatedBudget: d.estimatedBudget,
    createdAt: d.createdAt,
    clientName: d.client.name,
    clientEmail: d.client.email,
    offersCount: d._count.offers,
  }));
}

export async function deleteDemandAdminAction(
  demandId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const exists = await prisma.serviceRequest.findUnique({
    where: { id: demandId },
    select: { id: true },
  });
  if (!exists) return fail("Demande introuvable");

  await prisma.serviceRequest.delete({ where: { id: demandId } });
  revalidatePath("/admin");
  return ok(undefined);
}

const demandStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]);

export async function updateDemandStatusAdminAction(
  demandId: string,
  status: string
): Promise<ActionResult<{ status: string }>> {
  try {
    await requireRole("ADMIN");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const parsed = demandStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Statut invalide");

  const exists = await prisma.serviceRequest.findUnique({
    where: { id: demandId },
    select: { id: true },
  });
  if (!exists) return fail("Demande introuvable");

  await prisma.serviceRequest.update({
    where: { id: demandId },
    data: { status: parsed.data },
  });
  revalidatePath("/admin");
  return ok({ status: parsed.data });
}
