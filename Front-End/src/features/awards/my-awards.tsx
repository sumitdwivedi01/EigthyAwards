"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { messageOf } from "@/lib/api-client";
import { StateBadge } from "./state-badge";
import { useMyAwards } from "./use-awards";

/** The awards a staff member runs (one AWARD_STAFF role each), with their editions. */
export function MyAwards({ canCreate }: { canCreate: boolean }) {
  const awards = useMyAwards();
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Your awards</CardTitle>
          {canCreate && (
            <Button asChild size="sm" className="ml-auto">
              <Link href="/staff/awards/new">
                <PlusIcon aria-hidden />
                Create an award
              </Link>
            </Button>
          )}
        </div>
        <CardDescription>Set up each edition: its dates, fee, categories, questions and scoring sheet, then publish it.</CardDescription>
      </CardHeader>
      <CardContent>
        {awards.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : awards.error ? (
          <p className="text-sm text-destructive">{messageOf(awards.error)}</p>
        ) : awards.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canCreate ? "No awards yet. Create the first one." : "No awards yet: you aren't on a department's staff."}
          </p>
        ) : (
          <ul className="grid gap-3">
            {awards.data.map((award) => (
              <li key={award.id} className="grid gap-2 rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/staff/awards/${award.id}`} className="font-medium underline-offset-4 hover:underline">
                    {award.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">{award.department.name}</span>
                </div>
                {award.cycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No edition yet.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {award.cycles.map((cycle) => (
                      <li key={cycle.id}>
                        <Link href={`/staff/cycles/${cycle.id}`} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm hover:bg-muted">
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
