"use client";

import Link from "next/link";
import { EyeOffIcon, ScaleIcon } from "lucide-react";
import { ListRow, Stat } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJuryHome } from "./use-judging";

const STATUS_VARIANT: Record<string, "success" | "info" | "outline" | "warning"> = {
  SUBMITTED: "success",
  IN_PROGRESS: "info",
  ASSIGNED: "outline",
  REDO: "warning",
};

/**
 * The jury member's assignments (spec §5.9): per department and award, with counts ("6
 * assigned, 2 submitted") and each application's state. Only their own; in a blind award an
 * application is a reference, never a name.
 */
export function JuryAssignments() {
  const home = useJuryHome();
  if (home.isPending) return <LoadingState label="Loading your assignments" lines={5} />;
  if (home.error) return <ErrorState error={home.error} onRetry={() => void home.refetch()} />;
  const { departments, totals } = home.data;
  if (totals.assigned === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={ScaleIcon} title="Nothing is assigned to you yet" description="After an award's deadline, its staff assign applications to you. They appear here, and you'll be emailed." />
        </CardContent>
      </Card>
    );
  }
  const todo = totals.assigned - totals.submitted;
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="assigned to you" value={totals.assigned} />
        <Stat label="submitted" value={totals.submitted} tone="success" />
        <Stat label="still to score" value={todo} tone={todo > 0 ? "warning" : "neutral"} />
      </div>
      {departments.map((department) => (
        <section key={department.id} className="grid gap-4" aria-labelledby={`dept-${department.id}`}>
          <h2 id={`dept-${department.id}`} className="text-eyebrow">
            {department.name}
          </h2>
          {department.cycles.map((group) => (
            <Card key={group.roundId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {group.award}: {group.cycle}
                  {group.blindJudging && (
                    <Badge variant="outline">
                      <EyeOffIcon aria-hidden /> Blind
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {group.assigned} assigned, {group.submitted} submitted
                  {group.closed && " · judging has closed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {group.items.map((item) => {
                    const done = item.status === "SUBMITTED" || group.closed;
                    return (
                      <ListRow key={item.evaluationId}>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <span className="font-semibold">{item.organisationName ?? item.reference}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.organisationName && `${item.reference} · `}
                            {item.category}
                          </span>
                        </div>
                        <Badge variant={STATUS_VARIANT[item.status] ?? "outline"}>{item.statusLabel}</Badge>
                        <Button asChild variant={done ? "outline" : "default"}>
                          <Link href={`/jury/evaluations/${item.evaluationId}`}>{done ? "View" : item.status === "IN_PROGRESS" ? "Continue scoring" : "Start scoring"}</Link>
                        </Button>
                      </ListRow>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
