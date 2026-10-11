"use client";

import Link from "next/link";
import { EyeOffIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { messageOf } from "@/lib/api-client";
import { useJuryHome } from "./use-judging";

/**
 * The jury member's assignments (spec §5.9): per department and award, with counts ("6
 * assigned, 2 submitted") and each application's state. Only their own; in a blind award an
 * application is a reference, never a name.
 */
export function JuryAssignments() {
  const home = useJuryHome();
  if (home.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (home.error) return <p className="text-sm text-destructive">{messageOf(home.error)}</p>;
  const { departments, totals } = home.data;
  if (totals.assigned === 0) {
    return (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>My assignments</CardTitle>
          <CardDescription>Nothing is assigned to you yet. After an award&apos;s deadline, its staff assign applications to you.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="grid gap-6 md:col-span-2">
      <p className="text-sm text-muted-foreground">
        {totals.assigned} assigned · {totals.submitted} submitted · {totals.assigned - totals.submitted} to do
      </p>
      {departments.map((department) => (
        <section key={department.id} className="grid gap-3" aria-labelledby={`dept-${department.id}`}>
          <h2 id={`dept-${department.id}`} className="text-lg font-semibold">
            {department.name}
          </h2>
          {department.cycles.map((group) => (
            <Card key={group.roundId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {group.award}: {group.cycle}
                  {group.blindJudging && (
                    <Badge variant="outline" className="gap-1">
                      <EyeOffIcon className="size-3" aria-hidden /> Blind
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
                  {group.items.map((item) => (
                    <li key={item.evaluationId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">{item.organisationName ?? item.reference}</span>
                      {item.organisationName && <span className="text-muted-foreground">{item.reference}</span>}
                      <span className="text-muted-foreground">{item.category}</span>
                      <Badge variant={item.status === "SUBMITTED" ? "default" : item.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                        {item.statusLabel}
                      </Badge>
                      <Button asChild size="sm" variant={item.status === "SUBMITTED" || group.closed ? "outline" : "default"} className="ml-auto">
                        <Link href={`/jury/evaluations/${item.evaluationId}`}>
                          {item.status === "SUBMITTED" || group.closed ? "View" : item.status === "IN_PROGRESS" ? "Continue" : "Start"}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
