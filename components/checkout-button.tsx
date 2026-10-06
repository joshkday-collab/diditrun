"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/types";

export function CheckoutButton({
  plan,
}: {
  plan: Exclude<PlanId, "free">;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-2">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const res = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const json = (await res.json()) as { message?: string; error?: string };
          setMessage(json.message || json.error || "Checkout stub recorded.");
          setPending(false);
        }}
      >
        {pending ? "Opening stub…" : `Checkout ${plan === "solo" ? "Solo" : "Pro"}`}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
