import { getSessionUser } from "@/lib/auth";
import { readyStore } from "@/lib/store";

/** Demo helper: pretend the evaluator has been silent long enough to trip P0. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const store = await readyStore();
  const meta = await store.getMeta();
  const aged = new Date(
    Date.now() - (meta.periodSeconds + meta.graceSeconds + 15) * 1000
  ).toISOString();
  const silenced = await store.silenceMeta(aged);
  return Response.json({ ok: true, meta: silenced });
}
