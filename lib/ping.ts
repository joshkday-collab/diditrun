import { dispatchAlert, zeroCopy } from "@/lib/alerts";
import { evaluateOnce } from "@/lib/scheduler";
import { isWeek1ZeroCount, parseCountParam } from "@/lib/stale";
import { readyStore } from "@/lib/store";
import type { PingStatus } from "@/lib/types";
import { isUuidV4 } from "@/lib/uuid";

export async function handlePing(input: {
  id: string;
  request: Request;
  status: PingStatus;
}) {
  if (!isUuidV4(input.id)) {
    return Response.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  const store = await readyStore();
  const check = await store.getCheck(input.id);
  if (!check || check.isMeta) {
    return Response.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  const rate = await store.consumeRateLimit(check.id);
  if (!rate.allowed) {
    return Response.json(
      {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "retry-after": String(rate.retryAfterSeconds),
          "cache-control": "no-store",
        },
      }
    );
  }

  const url = new URL(input.request.url);
  let rawCount = url.searchParams.get("count");
  if (rawCount === null && input.request.method !== "GET") {
    try {
      const body = (await input.request.clone().json()) as { count?: unknown };
      if (body && body.count !== undefined && body.count !== null) {
        rawCount = String(body.count);
      }
    } catch {
      // Body is optional.
    }
  }

  const parsed = parseCountParam(rawCount);
  if (parsed.invalid) {
    return Response.json(
      { ok: false, error: parsed.invalid },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const ip =
    input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    input.request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = input.request.headers.get("user-agent") || undefined;

  const { ping, check: updated } = await store.recordPing({
    checkId: check.id,
    status: input.status,
    count: parsed.count,
    countProvided: parsed.countProvided,
    ip,
    userAgent,
  });

  let zeroAlert = false;
  if (
    input.status === "ok" &&
    updated.assertZero &&
    isWeek1ZeroCount({
      countProvided: parsed.countProvided,
      count: parsed.count,
    })
  ) {
    const copy = zeroCopy(updated);
    await dispatchAlert({
      check: updated,
      type: "zero_count",
      subject: copy.subject,
      text: copy.text,
      extra: { count: 0, rule: "week1_count_eq_0" },
    });
    zeroAlert = true;
  }

  // Opportunistic sweep so Hobby-tier daily cron is not the only evaluator.
  void evaluateOnce().catch((error) => {
    console.error("[diditrun:evaluate-on-ping]", error);
  });

  return Response.json(
    {
      ok: true,
      checkId: updated.id,
      status: ping.status,
      count: ping.count,
      countProvided: ping.countProvided,
      receivedAt: ping.receivedAt,
      zeroAlert,
      rateRemaining: rate.remaining,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
