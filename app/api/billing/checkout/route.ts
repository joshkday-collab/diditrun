import { getSessionUser } from "@/lib/auth";
import { startCheckout } from "@/lib/billing";
import { isPaidPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { plan?: PlanId };
  if (!body.plan || !isPaidPlan(body.plan)) {
    return Response.json({ ok: false, error: "plan must be solo or pro" }, { status: 400 });
  }
  const result = await startCheckout(user.id, body.plan);
  return Response.json(result);
}
