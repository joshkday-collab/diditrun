import Link from "next/link";
import { CreateCheckForm } from "@/components/create-check-form";
import { MetaActions } from "@/components/meta-actions";
import { StatusPill } from "@/components/status-pill";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { runtimeStatus } from "@/lib/check-status";
import { appUrl } from "@/lib/config";
import { checkLimit } from "@/lib/plans";
import { readyStore } from "@/lib/store";
import { STALE_RULE_COPY } from "@/lib/stale";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = await readyStore();
  const [checks, alerts, meta] = await Promise.all([
    store.listChecks(user.id),
    store.listAlerts(user.id, 8),
    store.getMeta(),
  ]);
  const limit = checkLimit(user.plan);
  const origin = appUrl();

  return (
    <div className="grid gap-8">
      {meta.p0 ? (
        <Alert variant="destructive">
          <AlertTitle>P0 — meta-heartbeat is quiet</AlertTitle>
          <AlertDescription>
            The monitor missed its own self-check. Every other signal is
            untrusted until the evaluator runs again.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl">Checks</h1>
          <p className="text-sm text-muted-foreground">
            {user.plan} plan · {checks.length}/{limit} checks · {STALE_RULE_COPY}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta-heartbeat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="text-muted-foreground">
            DidItRun pings itself whenever the evaluator runs. Last self-check:{" "}
            {meta.lastPingAt
              ? new Date(meta.lastPingAt).toLocaleString()
              : "never"}
            . Period {meta.periodSeconds}s + grace {meta.graceSeconds}s.
            Status:{" "}
            <strong>{meta.p0 ? "P0 quiet" : "watching itself"}</strong>.
          </p>
          <MetaActions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New check</CardTitle>
        </CardHeader>
        <CardContent>
          {checks.length >= limit ? (
            <p className="text-sm text-muted-foreground">
              Plan limit reached. Pause or delete a check, or open the Solo /
              Pro checkout stub.
            </p>
          ) : (
            <CreateCheckForm />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Your checks</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checks yet. Create one, then ping{" "}
            <code>{origin}/p/&lt;uuid&gt;?count=0</code> to prove the wedge.
          </p>
        ) : (
          <ul className="grid gap-3">
            {checks.map((check) => {
              const status = runtimeStatus(check);
              return (
                <li key={check.id}>
                  <Link
                    href={`/dashboard/checks/${check.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium">{check.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {origin}/p/{check.id}
                        {check.assertZero ? "?count=" : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <StatusPill status={status} />
                      <span>
                        last count{" "}
                        {check.lastCountProvided ? check.lastCount : "—"}
                      </span>
                      <span>
                        {check.lastPingAt
                          ? new Date(check.lastPingAt).toLocaleString()
                          : "no ping yet"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Recent alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts yet. A zero-count ping or a missed period will show up
            here and in the email stub log.
          </p>
        ) : (
          <ul className="grid gap-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <span className="font-medium">{alert.type}</span>
                <span className="mx-2 text-muted-foreground">
                  {new Date(alert.sentAt).toLocaleString()}
                </span>
                <span className="text-muted-foreground">{alert.channel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
