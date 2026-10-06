import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="font-heading text-4xl">Three tiers. Assertions, not volume.</h1>
          <p className="mt-3 text-muted-foreground">
            Free exists so you can fire a <code>?count=0</code> alert this
            afternoon. Paid unlocks more checks and channels. Checkout is a
            placeholder until Josh unlocks Stripe or a merchant of record.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="font-heading text-3xl text-foreground">
                    {plan.priceLabel}
                  </span>
                  <span className="ml-2">{plan.checks} checks</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p>{plan.blurb}</p>
                <ul className="list-disc pl-4">
                  {plan.channels.map((channel) => (
                    <li key={channel}>{channel}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === "free" ? (
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className={cn(buttonVariants(), "w-full")}
                  >
                    {user ? "Go to dashboard" : "Create free account"}
                  </Link>
                ) : user ? (
                  <CheckoutButton plan={plan.id} />
                ) : (
                  <Link
                    href="/signup"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    Sign up first
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
