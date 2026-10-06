import type { PlanId } from "@/lib/types";

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    priceLabel: string;
    pricePence: number;
    checks: number;
    blurb: string;
    channels: string[];
  }
> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "£0",
    pricePence: 0,
    checks: 10,
    blurb: "Heartbeat plus the week-1 zero-records assertion. Enough to prove the wedge, not a volume race.",
    channels: ["Email alerts"],
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceLabel: "£5/mo",
    pricePence: 500,
    checks: 40,
    blurb: "Period + grace, ?count= assertions, email. Telegram channel is stubbed until the bot token unlock.",
    channels: ["Email", "Telegram (stub)"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "£12/mo",
    pricePence: 1200,
    checks: 200,
    blurb: "More checks and Slack later. Freshness-across-N-periods is week 2+, not this build.",
    channels: ["Email", "Telegram (stub)", "Slack (later)"],
  },
};

export function checkLimit(plan: PlanId): number {
  return PLANS[plan].checks;
}

export function isPaidPlan(plan: PlanId): plan is "solo" | "pro" {
  return plan === "solo" || plan === "pro";
}
