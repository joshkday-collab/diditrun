import { readyStore } from "@/lib/store";

export async function GET() {
  const store = await readyStore();
  const meta = await store.getMeta();
  return Response.json({ ok: true, meta });
}
