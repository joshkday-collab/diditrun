import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STALE_RULE_COPY } from "@/lib/stale";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Silent success monitor
            </p>
            <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-6xl">
              Your n8n workflow ran but processed{" "}
              <em className="text-primary">0 records</em>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              DidItRun alerts you when automation goes quiet — or finishes
              green after doing nothing. Push heartbeats only. Catch green runs
              that did nothing, across tools, without handing over keys.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Start free — 10 checks
              </Link>
              <Link
                href="/docs"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Read the stale rule
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Free includes the zero-records assertion demo. Paid value is
              assertions and templates, not a ping-count race.
            </p>
          </div>
          <Card className="self-start">
            <CardHeader>
              <CardTitle>A green ping is not proof of work</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 font-mono text-xs leading-relaxed">
              <div className="rounded-lg bg-muted/60 p-3">
                GET /p/&lt;uuid&gt;
                <div className="mt-1 text-muted-foreground">
                  heartbeat only — “it ran”
                </div>
              </div>
              <div className="rounded-lg bg-primary/15 p-3 text-primary-foreground/90">
                GET /p/&lt;uuid&gt;?count=0
                <div className="mt-1 text-primary">
                  week-1 stale — alert. The run was green and empty.
                </div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                no ping inside period + grace
                <div className="mt-1 text-muted-foreground">
                  overdue quiet alert — the job went silent
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="wedge" className="border-y border-border/70 bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
            {[
              {
                title: "Zero-records assertion",
                body: STALE_RULE_COPY,
              },
              {
                title: "Quiet / overdue",
                body: "No successful ping within period + grace fires a quiet alert. Fail pings do not count as success.",
              },
              {
                title: "Push only",
                body: "n8n, Make, Zapier, GitHub Actions, cron. You ping us. We never ask for API keys and we never scrape the tool.",
              },
            ].map((item) => (
              <div key={item.title} className="grid gap-2">
                <h2 className="font-heading text-2xl">{item.title}</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16">
          <div>
            <h2 className="font-heading text-3xl">One URL. Two failure modes.</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Drop a heartbeat at the end of the workflow. Pass the record
              count you already have. If the count is zero, or the ping stops,
              Josh gets an email — or you do.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>n8n HTTP Request</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
{`GET {{ $env.DIDITRUN }}/p/{{ $env.CHECK }}?count={{ $json.count }}`}
                </pre>
                <p className="mt-3 text-sm text-muted-foreground">
                  Import{" "}
                  <code>templates/n8n-diditrun-heartbeat.json</code> and swap
                  the UUID.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>GitHub Action</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
{`curl -fsS "$DIDITRUN_URL/p/$CHECK_ID?count=$COUNT"`}
                </pre>
                <p className="mt-3 text-sm text-muted-foreground">
                  Recipe in <code>templates/github-action-diditrun.yml</code>.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t border-border/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-14 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-3xl">Free, Solo, Pro</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Free £0 ≤10 checks · Solo £5/mo 40 · Pro £12/mo 200. Billing
                checkout is a stub until payments unlock. Telegram is a stub
                until the bot token unlock.
              </p>
            </div>
            <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }))}>
              See pricing
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
