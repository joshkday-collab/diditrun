import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-heading text-lg">
              DidItRun
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">
                Checks
              </Link>
              <Link href="/dashboard/settings" className="hover:text-foreground">
                Alerts
              </Link>
              <Link href="/pricing" className="hover:text-foreground">
                Plan
              </Link>
              <Link href="/docs" className="hover:text-foreground">
                Stale rule
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
