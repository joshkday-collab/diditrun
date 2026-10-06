export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DIDITRUN_LOCAL_SCHEDULER === "0") return;

  // Local / long-lived Node process: tick the evaluator so overdue + meta
  // fire without waiting for Vercel Hobby's once-a-day cron.
  const intervalMs = Number(process.env.DIDITRUN_SCHEDULER_MS || 15_000);
  const { evaluateOnce } = await import("@/lib/scheduler");
  setInterval(() => {
    void evaluateOnce().catch((error) => {
      console.error("[diditrun:local-scheduler]", error);
    });
  }, Number.isFinite(intervalMs) ? intervalMs : 15_000);
}
