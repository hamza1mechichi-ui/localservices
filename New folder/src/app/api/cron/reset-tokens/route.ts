import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PLAN_LIMITS } from "@/lib/plan-limits";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.RESET_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const [freeResult, starterResult] = await Promise.all([
      prisma.providerProfile.updateMany({
        where: { plan: "FREE" },
        data: { offerTokens: PLAN_LIMITS.FREE },
      }),
      prisma.providerProfile.updateMany({
        where: { plan: "STARTER" },
        data: { offerTokens: PLAN_LIMITS.STARTER },
      }),
    ]);
    // PRO est illimité (isUnlimited()) : offerTokens n'est jamais consulté pour ce plan, pas besoin de reset.

    const resetCount = freeResult.count + starterResult.count;
    return NextResponse.json({
      success: true,
      resetCount,
      details: { free: freeResult.count, starter: starterResult.count },
      message: `${resetCount} prestataires ont été réinitialisés (${freeResult.count} FREE, ${starterResult.count} STARTER)`,
    });
  } catch (error) {
    console.error("[CRON reset-tokens]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
