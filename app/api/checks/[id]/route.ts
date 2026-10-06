import { getSessionUser } from "@/lib/auth";
import { readyStore } from "@/lib/store";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const store = await readyStore();
  const check = await store.getCheck(id);
  if (!check || check.userId !== user.id) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const [pings, alerts] = await Promise.all([
    store.listPings(check.id),
    store.listCheckAlerts(check.id),
  ]);
  return Response.json({ ok: true, check, pings, alerts });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const store = await readyStore();
  const check = await store.getCheck(id);
  if (!check || check.userId !== user.id) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    paused?: boolean;
    assertZero?: boolean;
    periodSeconds?: number;
    graceSeconds?: number;
    lastOkPingAt?: string;
  };
  const updated = await store.updateCheck(id, {
    name: body.name,
    paused: body.paused,
    assertZero: body.assertZero,
    periodSeconds: body.periodSeconds,
    graceSeconds: body.graceSeconds,
    lastOkPingAt: body.lastOkPingAt,
  });
  return Response.json({ ok: true, check: updated });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const store = await readyStore();
  const ok = await store.deleteCheck(id, user.id);
  return Response.json({ ok });
}
