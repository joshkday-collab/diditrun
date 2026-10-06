import { notFound, redirect } from "next/navigation";
import { CheckActions } from "@/components/check-actions";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { runtimeStatus } from "@/lib/check-status";
import { appUrl } from "@/lib/config";
import { readyStore } from "@/lib/store";
import { STALE_RULE_COPY } from "@/lib/stale";

export default async function CheckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const store = await readyStore();
  const check = await store.getCheck(id);
  if (!check || check.userId !== user.id) notFound();
  const [pings, alerts] = await Promise.all([
    store.listPings(check.id, 50),
    store.listCheckAlerts(check.id, 20),
  ]);
  const status = runtimeStatus(check);
  const origin = appUrl();
  const pingUrl = `${origin}/p/${check.id}`;

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl">{check.name}</h1>
          <StatusPill status={status} />
        </div>
        <p className="font-mono text-sm text-muted-foreground break-all">
          {pingUrl}?count=
        </p>
        <p className="text-sm text-muted-foreground">
          Period {check.periodSeconds}s · grace {check.graceSeconds}s · zero
          assert {check.assertZero ? "on" : "off"}. {STALE_RULE_COPY}
        </p>
        <CheckActions check={check} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to ping</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs">
          <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3">
{`# success heartbeat
curl -fsS "${pingUrl}"

# week-1 zero-records (fires alert if assert is on)
curl -fsS "${pingUrl}?count=0"

# explicit fail — received, not a success
curl -fsS "${pingUrl}/fail"`}
          </pre>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Last-ping timeline</h2>
        {pings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Waiting for the first ping. Empty is honest — a heartbeat-only
            product would fake this with uptime chrome.
          </p>
        ) : (
          <ol className="grid gap-2">
            {pings.map((ping) => (
              <li
                key={ping.id}
                className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-xs">
                  {new Date(ping.receivedAt).toLocaleString()}
                </span>
                <span>
                  {ping.status}
                  {ping.countProvided ? ` · count=${ping.count}` : " · no count"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Alerts for this check</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="grid gap-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <div className="font-medium">
                  {alert.type} · {alert.channel}
                </div>
                <div className="text-muted-foreground">
                  {new Date(alert.sentAt).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {String(alert.payload.subject ?? "")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
