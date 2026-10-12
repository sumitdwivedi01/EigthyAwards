"use client";

import { HistoryIcon } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import type { Role } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { useHistory } from "./use-judging";

const ROLE_NAMES: Record<Role, string> = {
  LEADER: "leader",
  DEPT_HEAD: "department head",
  DEPT_STAFF: "staff",
  AWARD_STAFF: "staff",
  JURY: "jury",
};

/** An application's history (spec §5.15, rule R3): who did what, in which role, when, and why. */
export function HistoryPanel({ applicationId }: { applicationId: string }) {
  const history = useHistory(applicationId, true);
  if (history.isPending) return <LoadingState label="Loading the history" />;
  if (history.error) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  if (history.data.length === 0) return <EmptyState compact icon={HistoryIcon} title="Nothing recorded yet" />;
  return (
    <ol className="grid gap-4">
      {history.data.map((event) => (
        <li key={event.id} className="relative grid gap-1 border-l-2 pl-4">
          <span className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-primary" aria-hidden />
          <span className="font-medium">{event.summary}</span>
          <span className="text-sm text-muted-foreground">
            {istDateTime(event.at)}
            {event.actor && ` · ${event.actor}`}
            {event.actorRole && ` (${ROLE_NAMES[event.actorRole]})`}
          </span>
          {event.reason && <span className="text-sm">Reason: {event.reason}</span>}
        </li>
      ))}
    </ol>
  );
}
