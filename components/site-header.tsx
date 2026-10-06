import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg tracking-tight">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-xs font-sans font-bold text-primary-foreground">
            ✓
          </span>
          DidItRun
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link href="/#wedge" className="hover:text-foreground">
            The wedge
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Stale rule
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Log in
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
