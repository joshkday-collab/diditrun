import { getSessionUser } from "@/lib/auth";
import { readyStore } from "@/lib/store";

/** Demo helper: move last successful ping into the past so overdue can fire. */
export async function POST(
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
  const body = (await request.json().catch(() => ({}))) as { secondsAgo?: number };
  const secondsAgo = Number(body.secondsAgo ?? check.periodSeconds + check.graceSeconds + 5);
  const when = new Date(Date.now() - Math.max(1, secondsAgo) * 1000).toISOString();
  const updated = await store.updateCheck(check.id, {
    lastOkPingAt: when,
    lastPingAt: when,
    lastStatus: "ok",
  });
  return Response.json({ ok: true, check: updated, lastOkPingAt: when });
}
