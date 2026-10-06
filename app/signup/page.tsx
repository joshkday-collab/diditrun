import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Start free",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Create a free account</CardTitle>
            <CardDescription>
              Up to 10 checks. The assertion demo is on by default — create a
              check, ping it with <code>?count=0</code>, and watch the alert
              land.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <AuthForm mode="signup" />
            <p className="text-sm text-muted-foreground">
              Already here?{" "}
              <Link href="/login" className="text-foreground underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
