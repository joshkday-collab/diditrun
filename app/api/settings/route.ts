import { getSessionUser } from "@/lib/auth";
import { isLikelyEmail } from "@/lib/crypto";
import { readyStore } from "@/lib/store";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { alertEmail?: string };
  const alertEmail = body.alertEmail?.trim().toLowerCase();
  if (!alertEmail || !isLikelyEmail(alertEmail)) {
    return Response.json({ ok: false, error: "Enter a valid alert email." }, { status: 400 });
  }
  const store = await readyStore();
  const profile = await store.updateProfile(user.id, { alertEmail });
  return Response.json({ ok: true, profile });
}
