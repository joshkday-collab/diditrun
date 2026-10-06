import { isOverdue, isWeek1ZeroCount } from "@/lib/stale";
import type { Check, CheckRuntimeStatus } from "@/lib/types";

export function runtimeStatus(check: Check, now = new Date()): CheckRuntimeStatus {
  if (check.paused) return "paused";
  if (
    isOverdue({
      paused: check.paused,
      periodSeconds: check.periodSeconds,
      graceSeconds: check.graceSeconds,
      lastOkPingAt: check.lastOkPingAt,
      createdAt: check.createdAt,
      now,
    })
  ) {
    return "overdue";
  }
  if (check.lastStatus === "fail") return "fail";
  if (
    check.lastStatus === "ok" &&
    isWeek1ZeroCount({
      countProvided: check.lastCountProvided,
      count: check.lastCount,
    })
  ) {
    return "zero";
  }
  if (check.lastOkPingAt) return "ok";
  return "waiting";
}

export function statusLabel(status: CheckRuntimeStatus): string {
  switch (status) {
    case "ok":
      return "Heard from";
    case "zero":
      return "Green, zero records";
    case "overdue":
      return "Quiet";
    case "fail":
      return "Explicit fail";
    case "paused":
      return "Paused";
    default:
      return "Waiting for first ping";
  }
}
