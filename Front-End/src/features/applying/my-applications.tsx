"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileTextIcon, TrophyIcon } from "lucide-react";
import { ListRow } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { PublicAward } from "@/lib/api-types";
import { istDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "./application-page";
import { useMyApplications } from "./use-applying";

const PROOF: Record<string, { label: string; variant: "warning" | "success" | "destructive" }> = {
  PENDING: { label: "Proof not checked yet", variant: "warning" },
  VERIFIED: { label: "Proof verified", variant: "success" },
  REJECTED: { label: "Proof rejected", variant: "destructive" },
};

/** My applications (spec §12): each with its status; a colleague's shows the status only. */
export function MyApplications() {
  const applications = useMyApplications();
  return (
    <Card>
      <CardHeader>
        <CardTitle>My applications</CardTitle>
        <CardDescription>Your organisation&apos;s applications. Only the person who started one can open and change it.</CardDescription>
      </CardHeader>
      <CardContent>
        {applications.isPending ? (
          <LoadingState label="Loading your applications" />
        ) : applications.error ? (
          <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />
        ) : applications.data.length === 0 ? (
          <EmptyState compact icon={FileTextIcon} title="No applications yet" description="Pick an open award below to start one. It saves as you go, so you can come back any time." />
        ) : (
          <ul className="grid gap-3">
            {applications.data.map((row) => (
              <ListRow key={row.id} className="items-start">
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">
                      {row.award.name} {row.cycle.label}
                    </span>
                    <StatusBadge status={row.status} />
                    {row.proof && <Badge variant={PROOF[row.proof]?.variant ?? "secondary"}>{PROOF[row.proof]?.label}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.organisation.legalName}
                    {row.category && ` · ${row.category}`} · deadline {istDateTime(row.cycle.deadlineAt)}
                  </p>
                  <p className="text-sm">{row.status.message}</p>
                </div>
                {row.mine ? (
                  <Button asChild variant={row.status.code === "PENDING" ? "default" : "outline"}>
                    <Link href={`/applicant/applications/${row.id}`}>{row.status.code === "PENDING" ? "Continue" : "Open"}</Link>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">Started by a colleague</span>
                )}
              </ListRow>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** The awards open now, each with Apply (the public list, spec §5.6). */
export function OpenAwardsToApply() {
  const awards = useQuery({ queryKey: ["public", "awards"], queryFn: () => api.get<PublicAward[]>("/public/awards") });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Awards open now</CardTitle>
        <CardDescription>Awards taking applications at the moment. Read about one, or apply straight away.</CardDescription>
      </CardHeader>
      <CardContent>
        {awards.isPending ? (
          <LoadingState label="Loading the open awards" />
        ) : awards.error ? (
          <ErrorState error={awards.error} onRetry={() => void awards.refetch()} />
        ) : awards.data.length === 0 ? (
          <EmptyState compact icon={TrophyIcon} title="No award is open right now" description="Awards appear here between their opening date and their deadline." />
        ) : (
          <ul className="grid gap-3">
            {awards.data.map((award) => (
              <ListRow key={award.slug}>
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: award.department.colours.primary }} aria-hidden />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold">
                    {award.name} {award.cycle.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {award.department.name} · apply by {istDateTime(award.cycle.deadlineAt)} ·{" "}
                    {award.cycle.fee.toPaise === 0 ? "free" : `from ${rupees(award.cycle.fee.fromPaise)}`}
                  </span>
                </div>
                <span className="flex gap-2">
                  <Button asChild variant="ghost">
                    <Link href={`/awards/${award.slug}`}>About</Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/applicant/apply/${award.cycle.id}`}>Apply</Link>
                  </Button>
                </span>
              </ListRow>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
