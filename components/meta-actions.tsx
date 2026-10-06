"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MetaActions() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await fetch("/api/meta/silence", { method: "POST" });
          router.refresh();
        }}
      >
        Silence meta (demo)
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await fetch("/api/cron/evaluate", { method: "POST" });
          router.refresh();
        }}
      >
        Run evaluator
      </Button>
    </div>
  );
}
