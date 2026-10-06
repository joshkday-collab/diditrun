import { resendFrom } from "@/lib/config";
import { readyStore } from "@/lib/store";
import type { AlertType, Check } from "@/lib/types";

export interface DispatchInput {
  check: Check;
  type: AlertType;
  subject: string;
  text: string;
  extra?: Record<string, unknown>;
}

export async function dispatchAlert(input: DispatchInput) {
  const store = await readyStore();
  const profile = await store.getProfile(input.check.userId);
  const to = profile?.alertEmail || profile?.email || "jdenquiryautopilot@gmail.com";
  const payload = {
    to,
    subject: input.subject,
    text: input.text,
    ...input.extra,
  };

  let channel: "email" | "log" = "log";
  let delivery: Record<string, unknown> = { mode: "stub" };

  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      const result = await resend.emails.send({
        from: resendFrom(),
        to,
        subject: input.subject,
        text: input.text,
      });
      channel = "email";
      delivery = { mode: "resend", id: result.data?.id ?? null, error: result.error };
    } catch (error) {
      delivery = {
        mode: "resend_failed",
        error: error instanceof Error ? error.message : "send failed",
      };
    }
  } else {
    console.info("[diditrun:alert:stub]", {
      type: input.type,
      checkId: input.check.id,
      name: input.check.name,
      to,
      subject: input.subject,
    });
  }

  const alert = await store.recordAlert({
    checkId: input.check.id,
    userId: input.check.userId,
    type: input.type,
    channel,
    payload: { ...payload, delivery },
  });
  return { alert, channel, delivery };
}

export function overdueCopy(check: Check) {
  const window = check.periodSeconds + check.graceSeconds;
  return {
    subject: `DidItRun: ${check.name} went quiet`,
    text: [
      `${check.name} missed its heartbeat.`,
      `No successful ping arrived within period (${check.periodSeconds}s) + grace (${check.graceSeconds}s) = ${window}s.`,
      `Check ID: ${check.id}`,
      "",
      "This is the quiet / overdue alert — separate from the week-1 zero-records rule.",
    ].join("\n"),
  };
}

export function zeroCopy(check: Check) {
  return {
    subject: `DidItRun: ${check.name} processed 0 records`,
    text: [
      `${check.name} finished green with count=0.`,
      "Week-1 stale/zero means the count query param was present and equalled 0.",
      "A green run that did nothing is the wedge — not a missed ping.",
      `Check ID: ${check.id}`,
    ].join("\n"),
  };
}

export function metaCopy(check: Check) {
  return {
    subject: "P0 — DidItRun meta-heartbeat is quiet",
    text: [
      "The monitor did not check itself in time.",
      "Missed self-check is P0: if DidItRun is quiet, every other check is untrusted.",
      `Meta check ID: ${check.id}`,
    ].join("\n"),
  };
}
