"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Check } from "@/lib/types";

export function CheckActions({ check }: { check: Check }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const base = `${origin}/p/${check.id}`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/checks/${check.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) setMessage(json.error || "Update failed");
    router.refresh();
  }

  async function backdate() {
    const res = await fetch(`/api/checks/${check.id}/backdate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secondsAgo: check.periodSeconds + check.graceSeconds + 10,
      }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setMessage(
      json.ok
        ? "Last successful ping moved past period+grace. Run the evaluator."
        : json.error || "Backdate failed"
    );
    router.refresh();
  }

  async function evaluate() {
    const res = await fetch("/api/cron/evaluate", { method: "POST" });
    const json = (await res.json()) as {
      ok: boolean;
      fired?: Array<{ type: string; name: string }>;
    };
    setMessage(
      json.ok
        ? `Evaluator ran. Fired: ${json.fired?.length ? json.fired.map((f) => `${f.type}:${f.name}`).join(", ") : "none"}`
        : "Evaluate failed"
    );
    router.refresh();
  }

  async function destroy() {
    if (!confirm(`Delete ${check.name}?`)) return;
    await fetch(`/api/checks/${check.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy(`${base}?count=`)}>
          {copied ? "Copied" : "Copy ping URL"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => patch({ paused: !check.paused })}
        >
          {check.paused ? "Resume" : "Pause"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => patch({ assertZero: !check.assertZero })}
        >
          {check.assertZero ? "Disable zero assert" : "Enable zero assert"}
        </Button>
        <Button size="sm" variant="outline" onClick={backdate}>
          Simulate overdue
        </Button>
        <Button size="sm" variant="outline" onClick={evaluate}>
          Run evaluator
        </Button>
        <Button size="sm" variant="destructive" onClick={destroy}>
          Delete
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
