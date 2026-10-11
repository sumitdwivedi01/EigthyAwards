"use client";

import { messageOf } from "@/lib/api-client";
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
  if (history.isPending) return <p className="text-sm text-muted-foreground">Loading the history…</p>;
  if (history.error) return <p className="text-sm text-destructive">{messageOf(history.error)}</p>;
  if (history.data.length === 0) return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  return (
    <ol className="grid gap-2 border-l pl-4 text-sm">
      {history.data.map((event) => (
        <li key={event.id} className="grid gap-0.5">
          <span>{event.summary}</span>
          <span className="text-xs text-muted-foreground">
            {istDateTime(event.at)}
            {event.actor && ` · ${event.actor}`}
            {event.actorRole && ` (${ROLE_NAMES[event.actorRole]})`}
          </span>
          {event.reason && <span className="text-xs">Reason: {event.reason}</span>}
        </li>
      ))}
    </ol>
  );
}
