export const PLAN_LIMITS = {
  FREE: 3,
  STARTER: 15,
  PRO: Infinity,
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function isUnlimited(plan: string): boolean {
  return plan === "PRO";
}

export function monthlyQuotaFor(plan: string): number {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.FREE;
}
