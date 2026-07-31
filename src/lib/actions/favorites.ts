"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/require-role";
import { auth } from "@/auth";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(providerId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const user = await requireRole("CLIENT");

    const existing = await prisma.favoriteProvider.findUnique({
      where: { clientId_providerId: { clientId: user.id, providerId } },
    });

    if (existing) {
      await prisma.favoriteProvider.delete({ where: { id: existing.id } });
      revalidatePath("/prestataires");
      return ok({ favorited: false });
    }

    await prisma.favoriteProvider.create({ data: { clientId: user.id, providerId } });
    revalidatePath("/prestataires");
    return ok({ favorited: true });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message);
    console.error("[toggleFavorite]", e);
    return fail("Erreur serveur, réessayez.");
  }
}

export async function getMyFavorites() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") return [];

  return prisma.favoriteProvider.findMany({
    where: { clientId: session.user.id },
    include: {
      provider: {
        include: {
          user: { select: { name: true } },
          reviews: { select: { rating: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isFavorited(providerId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") return false;

  const fav = await prisma.favoriteProvider.findUnique({
    where: { clientId_providerId: { clientId: session.user.id, providerId } },
  });

  return !!fav;
}

export async function getFavoritedIds() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") return [];

  const favs = await prisma.favoriteProvider.findMany({
    where: { clientId: session.user.id },
    select: { providerId: true },
  });

  return favs.map((f) => f.providerId);
}
