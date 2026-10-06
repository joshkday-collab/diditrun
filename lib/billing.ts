import type { PlanId } from "@/lib/types";
import { PLANS } from "@/lib/plans";
import { readyStore } from "@/lib/store";

export interface CheckoutResult {
  ok: true;
  stub: true;
  plan: Exclude<PlanId, "free">;
  intentId: string;
  message: string;
}

/**
 * Billing is abstract until Josh unlocks Stripe or a MoR (Paddle / Lemon Squeezy).
 * Week 1 records an upgrade intent and shows the Checkout placeholder.
 */
export async function startCheckout(
  userId: string,
  plan: Exclude<PlanId, "free">
): Promise<CheckoutResult> {
  const store = await readyStore();
  const intent = await store.createBillingIntent(userId, plan);
  return {
    ok: true,
    stub: true,
    plan,
    intentId: intent.id,
    message: `${PLANS[plan].name} checkout is a stub. Stripe / Paddle stay locked until Josh unlocks payments. Intent ${intent.id} is recorded.`,
  };
}
