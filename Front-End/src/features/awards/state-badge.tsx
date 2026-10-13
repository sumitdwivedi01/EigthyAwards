import { Badge } from "@/components/ui/badge";
import type { CycleState } from "@/lib/api-types";

const LABELS: Record<CycleState, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Published, opens soon",
  OPEN: "Open for applications",
  CLOSED: "Closed",
};

const VARIANTS: Record<CycleState, "success" | "info" | "outline" | "secondary"> = {
  DRAFT: "outline",
  SCHEDULED: "info",
  OPEN: "success",
  CLOSED: "secondary",
};

/** Where an edition stands, as the API worked it out. */
export function StateBadge({ state }: { state: CycleState }) {
  return <Badge variant={VARIANTS[state]}>{LABELS[state]}</Badge>;
}
