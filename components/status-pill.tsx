import { Badge } from "@/components/ui/badge";
import { statusLabel, type runtimeStatus } from "@/lib/check-status";
import type { CheckRuntimeStatus } from "@/lib/types";

const variant: Record<
  CheckRuntimeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ok: "secondary",
  waiting: "outline",
  paused: "outline",
  fail: "destructive",
  overdue: "destructive",
  zero: "default",
};

export function StatusPill({
  status,
}: {
  status: ReturnType<typeof runtimeStatus>;
}) {
  return <Badge variant={variant[status]}>{statusLabel(status)}</Badge>;
}
