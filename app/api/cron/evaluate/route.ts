import { cronSecret } from "@/lib/config";
import { evaluateOnce } from "@/lib/scheduler";

function authorized(request: Request): boolean {
  const expected = cronSecret();
  if (!expected) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("secret");
  return header === `Bearer ${expected}` || query === expected;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await evaluateOnce();
  return Response.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
