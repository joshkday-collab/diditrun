import { getSessionUser } from "@/lib/auth";
import { checkLimit } from "@/lib/plans";
import { readyStore } from "@/lib/store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const store = await readyStore();
  const checks = await store.listChecks(user.id);
  return Response.json({
    ok: true,
    checks,
    used: checks.length,
    limit: checkLimit(user.plan),
    plan: user.plan,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    periodSeconds?: number;
    graceSeconds?: number;
    assertZero?: boolean;
  };
  const periodSeconds = Number(body.periodSeconds ?? 3600);
  const graceSeconds = Number(body.graceSeconds ?? 300);
  if (!Number.isFinite(periodSeconds) || periodSeconds < 5 || periodSeconds > 86400 * 30) {
    return Response.json({ ok: false, error: "periodSeconds out of range" }, { status: 400 });
  }
  if (!Number.isFinite(graceSeconds) || graceSeconds < 0 || graceSeconds > 86400) {
    return Response.json({ ok: false, error: "graceSeconds out of range" }, { status: 400 });
  }
  try {
    const store = await readyStore();
    const check = await store.createCheck({
      userId: user.id,
      name: body.name?.trim() || "Untitled check",
      periodSeconds: Math.round(periodSeconds),
      graceSeconds: Math.round(graceSeconds),
      assertZero: body.assertZero !== false,
    });
    return Response.json({ ok: true, check });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "create failed" },
      { status: 400 }
    );
  }
}
