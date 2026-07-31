"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/require-role";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";
import { monthlyQuotaFor, isUnlimited, type Plan } from "@/lib/plan-limits";
import { z } from "zod";

const planSchema = z.enum(["FREE", "STARTER", "PRO"]);

/**
 * Change le plan d'un prestataire (aucun paiement réel intégré ici — ce projet
 * reste 100% gratuit pour le moment ; à brancher sur un fournisseur de paiement
 * plus tard si besoin).
 */
export async function changePlan(newPlan: string): Promise<ActionResult<{ plan: Plan }>> {
  let user;
  try {
    user = await requireRole("PROVIDER");
  } catch (e) {
    return fail(e instanceof AuthError ? e.message : "Non autorisé");
  }

  const parsed = planSchema.safeParse(newPlan);
  if (!parsed.success) return fail("Plan invalide");

  const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return fail("Profil introuvable");

  if (profile.plan === parsed.data) {
    return fail("Vous êtes déjà sur ce plan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.providerProfile.update({
      where: { id: profile.id },
      data: {
        plan: parsed.data,
        // En repassant à un plan limité, on redonne le quota complet du nouveau
        // plan plutôt que de laisser un solde incohérent avec l'ancien plan.
        offerTokens: isUnlimited(parsed.data) ? profile.offerTokens : monthlyQuotaFor(parsed.data),
      },
    });

    await tx.subscription.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { status: "CANCELLED", endDate: new Date() },
    });

    if (parsed.data !== "FREE") {
      await tx.subscription.create({
        data: { userId: user.id, plan: parsed.data, status: "ACTIVE" },
      });
    }
  });

  revalidatePath("/dashboard/prestataire");
  return ok({ plan: parsed.data });
}
