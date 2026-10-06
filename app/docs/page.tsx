import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { STALE_RULE_COPY } from "@/lib/stale";

export const metadata: Metadata = {
  title: "Week-1 stale rule",
};

export default function DocsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          In-product rule
        </p>
        <h1 className="mt-3 font-heading text-4xl">
          Stale / zero for week 1
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{STALE_RULE_COPY}</p>
        <div className="mt-8 grid gap-6 text-sm leading-relaxed">
          <section className="grid gap-2">
            <h2 className="font-heading text-2xl">Zero-records assertion</h2>
            <p>
              If the <code>count</code> query param (or JSON body field) is
              present <em>and</em> <code>count == 0</code>, DidItRun fires a{" "}
              <code>zero_count</code> alert. The ping itself is still a
              successful heartbeat — the workflow ran — but it processed
              nothing.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
{`# fires zero_count
curl -fsS "$APP/p/$UUID?count=0"

# does not — omitted count is a plain heartbeat
curl -fsS "$APP/p/$UUID"

# does not — work happened
curl -fsS "$APP/p/$UUID?count=17"`}
            </pre>
          </section>
          <section className="grid gap-2">
            <h2 className="font-heading text-2xl">Overdue / quiet</h2>
            <p>
              Separate rule. If no <em>successful</em> ping arrives within{" "}
              <code>period_seconds + grace_seconds</code>, the evaluator
              fires an <code>overdue</code> alert. An explicit{" "}
              <code>/p/&lt;uuid&gt;/fail</code> is a received ping but not a
              success, so it does not reset the quiet clock.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="font-heading text-2xl">Not this week</h2>
            <p>
              Unchanged count across N expected periods, freshness windows,
              Slack live delivery, SMS, Telegram bot, agency multi-tenant,
              and API-key polling are out. Polling other people&apos;s APIs
              is never the product.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
