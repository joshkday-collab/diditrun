import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>DidItRun — push heartbeats. No API keys. Built by Josh.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/docs" className="hover:text-foreground">
            Week-1 stale rule
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <a
            href="mailto:jdenquiryautopilot@gmail.com"
            className="hover:text-foreground"
          >
            jdenquiryautopilot@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
