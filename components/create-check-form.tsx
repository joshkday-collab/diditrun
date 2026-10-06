"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCheckForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(payload: {
    name: string;
    periodSeconds: number;
    graceSeconds: number;
    assertZero: boolean;
  }) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/checks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      check?: { id: string };
    };
    setPending(false);
    if (!json.ok) {
      setError(json.error || "Could not create check.");
      return;
    }
    router.push(`/dashboard/checks/${json.check?.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 sm:grid-cols-2"
        action={(formData) =>
          create({
            name: String(formData.get("name") ?? ""),
            periodSeconds: Number(formData.get("periodSeconds")),
            graceSeconds: Number(formData.get("graceSeconds")),
            assertZero: formData.get("assertZero") === "on",
          })
        }
      >
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Check name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="n8n — invoice sync"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="periodSeconds">Period (seconds)</Label>
          <Input
            id="periodSeconds"
            name="periodSeconds"
            type="number"
            min={5}
            defaultValue={3600}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="graceSeconds">Grace (seconds)</Label>
          <Input
            id="graceSeconds"
            name="graceSeconds"
            type="number"
            min={0}
            defaultValue={300}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="assertZero"
            defaultChecked
            className="size-4 accent-primary"
          />
          Alert when a ping includes <code>?count=0</code> (week-1 stale rule)
        </label>
        {error ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create check"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              create({
                name: "Wedge demo",
                periodSeconds: 20,
                graceSeconds: 5,
                assertZero: true,
              })
            }
          >
            Create 20s wedge demo
          </Button>
        </div>
      </form>
    </div>
  );
}
