"use client";

import Link from "next/link";
import { ChevronRightIcon, PlusIcon, TrophyIcon } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StateBadge } from "./state-badge";
import { useMyAwards } from "./use-awards";

/**
 * The awards a staff member runs, with their editions: the one award of each award department
 * they are staff of (ADR 0021). "Create an award" shows while one of their departments has none.
 */
export function MyAwards({ departments }: { departments: { id: string; name: string }[] }) {
  const awards = useMyAwards();
  const canCreate = awards.data !== undefined && departments.some((d) => !awards.data.some((a) => a.department.id === d.id));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Awards you run</CardTitle>
        <CardDescription>Open an award to set up its editions: dates, fee, categories, questions and the scoring sheet.</CardDescription>
        {canCreate && (
          <CardAction>
            <Button asChild>
              <Link href="/staff/awards/new">
                <PlusIcon aria-hidden />
                Create an award
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {awards.isPending ? (
          <LoadingState label="Loading your awards" lines={4} />
        ) : awards.error ? (
          <ErrorState error={awards.error} onRetry={() => void awards.refetch()} />
        ) : awards.data.length === 0 ? (
          <EmptyState
            icon={TrophyIcon}
            title="No awards yet"
            description={canCreate ? "Create your award department's award. It lasts from year to year; each year gets its own edition." : "You aren't on an award department's staff yet, so there is nothing to run."}
            action={
              canCreate && (
                <Button asChild>
                  <Link href="/staff/awards/new">
                    <PlusIcon aria-hidden />
                    Create an award
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid gap-3">
            {awards.data.map((award) => (
              <li key={award.id} className="grid gap-3 rounded-lg border px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <Link href={`/staff/awards/${award.id}`} className="text-base font-semibold underline-offset-4 hover:underline">
                      {award.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">{award.department.name}</span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/staff/awards/${award.id}`}>
                      Open
                      <ChevronRightIcon aria-hidden />
                    </Link>
                  </Button>
                </div>
                {award.cycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No edition yet: open the award to create one.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {award.cycles.map((cycle) => (
                      <li key={cycle.id}>
                        <Link href={`/staff/cycles/${cycle.id}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">
                          {cycle.label}
                          <StateBadge state={cycle.state} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
