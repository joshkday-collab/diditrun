import { dispatchAlert, metaCopy, overdueCopy } from "@/lib/alerts";
import { readyStore } from "@/lib/store";
import { isOverdue } from "@/lib/stale";

export async function evaluateOnce(now = new Date()) {
  const store = await readyStore();
  const fired: Array<{ type: string; checkId: string; name: string }> = [];

  const metaBefore = await store.getMeta();
  const metaCheck = await store.getCheck(metaBefore.checkId);
  if (
    metaCheck &&
    metaBefore.lastPingAt &&
    isOverdue({
      paused: false,
      periodSeconds: metaBefore.periodSeconds,
      graceSeconds: metaBefore.graceSeconds,
      lastOkPingAt: metaBefore.lastPingAt,
      createdAt: metaBefore.lastPingAt,
      now,
    })
  ) {
    const copy = metaCopy(metaCheck);
    await dispatchAlert({
      check: metaCheck,
      type: "meta",
      subject: copy.subject,
      text: copy.text,
      extra: { p0: true },
    });
    fired.push({ type: "meta", checkId: metaCheck.id, name: metaCheck.name });
  }

  await store.touchMeta(now);

  const due = await store.listDueChecks(now);
  for (const check of due) {
    if (await store.hasOpenOverdue(check.id)) continue;
    const copy = overdueCopy(check);
    await dispatchAlert({
      check,
      type: "overdue",
      subject: copy.subject,
      text: copy.text,
    });
    fired.push({ type: "overdue", checkId: check.id, name: check.name });
  }

  const metaAfter = await store.getMeta();
  return {
    evaluatedAt: now.toISOString(),
    fired,
    meta: metaAfter,
    dueCount: due.length,
  };
}
