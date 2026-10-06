"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ alertEmail }: { alertEmail: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid max-w-md gap-3"
      action={async (formData) => {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            alertEmail: String(formData.get("alertEmail") ?? ""),
          }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        setMessage(json.ok ? "Alert email saved." : json.error || "Save failed");
        router.refresh();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="alertEmail">Alert email</Label>
        <Input
          id="alertEmail"
          name="alertEmail"
          type="email"
          required
          defaultValue={alertEmail}
        />
      </div>
      <Button type="submit" size="sm">
        Save channel
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
