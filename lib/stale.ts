/**
 * Week-1 stale / zero-records rule.
 *
 * stale/zero for week 1 means count==0 on a ping; unchanged-count-across-N-periods is week 2+.
 *
 * A ping is a zero-records assertion when:
 *   1. the `count` query param (or JSON body field) is present, AND
 *   2. Number(count) === 0
 *
 * Omitting `count` is a plain heartbeat (ok, no zero alert).
 * `count=5` is a green run with work done (ok, no zero alert).
 * Overdue / quiet is a separate rule: no successful ping within period+grace.
 */
export function isWeek1ZeroCount(input: {
  countProvided: boolean;
  count: number | null;
}): boolean {
  return input.countProvided && input.count === 0;
}

export function parseCountParam(
  raw: string | null | undefined
): { count: number | null; countProvided: boolean; invalid?: string } {
  if (raw === null || raw === undefined || raw === "") {
    return { count: null, countProvided: false };
  }
  if (!/^-?\d+$/.test(raw)) {
    return {
      count: null,
      countProvided: true,
      invalid: "count must be an integer",
    };
  }
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count < 0) {
    return {
      count: null,
      countProvided: true,
      invalid: "count must be a non-negative integer",
    };
  }
  return { count, countProvided: true };
}

export function isOverdue(input: {
  paused: boolean;
  periodSeconds: number;
  graceSeconds: number;
  lastOkPingAt: string | null;
  createdAt: string;
  now?: Date;
}): boolean {
  if (input.paused) return false;
  const now = input.now ?? new Date();
  const last = input.lastOkPingAt ?? input.createdAt;
  const deadline =
    new Date(last).getTime() +
    (input.periodSeconds + input.graceSeconds) * 1000;
  return now.getTime() > deadline;
}

export const STALE_RULE_COPY =
  "stale/zero for week 1 means count==0 on a ping; unchanged-count-across-N-periods is week 2+.";
