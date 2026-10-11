"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, messageOf } from "@/lib/api-client";
import type { PublicAward } from "@/lib/api-types";
import { istDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "./application-page";
import { useMyApplications } from "./use-applying";

const PROOF_TEXT = { PENDING: "Proof: not checked yet", VERIFIED: "Proof: verified", REJECTED: "Proof: rejected" } as const;

/** My applications (spec §12): each with its status; a colleague's shows the status only. */
export function MyApplications() {
  const applications = useMyApplications();
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>My applications</CardTitle>
        <CardDescription>Your organisation&apos;s applications. Only the person who started one can open and change it.</CardDescription>
      </CardHeader>
      <CardContent>
        {applications.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : applications.error ? (
          <p className="text-sm text-destructive">{messageOf(applications.error)}</p>
        ) : applications.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet. Pick an open award below to start.</p>
        ) : (
          <ul className="grid gap-2">
            {applications.data.map((row) => (
              <li key={row.id} className="grid gap-1 rounded-md border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">
                    {row.award.name} {row.cycle.label}
                  </span>
                  <StatusBadge status={row.status} />
                  {row.mine ? (
                    <Button asChild size="sm" variant="outline" className="ml-auto">
                      <Link href={`/applicant/applications/${row.id}`}>Open</Link>
                    </Button>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground">Started by a colleague</span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {row.organisation.legalName}
                  {row.category && ` · ${row.category}`} · deadline {istDateTime(row.cycle.deadlineAt)}
                  {row.proof && ` · ${PROOF_TEXT[row.proof]}`}
                </p>
                <p>{row.status.message}</p>
              </li>
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
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Open awards</CardTitle>
        <CardDescription>Awards taking applications now.</CardDescription>
      </CardHeader>
      <CardContent>
        {awards.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : awards.error ? (
          <p className="text-sm text-destructive">{messageOf(awards.error)}</p>
        ) : awards.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No award is open right now.</p>
        ) : (
          <ul className="grid gap-2">
            {awards.data.map((award) => (
              <li key={award.slug} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">
                  {award.name} {award.cycle.label}
                </span>
                <span className="text-muted-foreground">
                  {award.department.name} · apply by {istDateTime(award.cycle.deadlineAt)} ·{" "}
                  {award.cycle.fee.toPaise === 0 ? "free" : `from ${rupees(award.cycle.fee.fromPaise)}`}
                </span>
                <span className="ml-auto flex gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/awards/${award.slug}`}>About</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/applicant/apply/${award.cycle.id}`}>Apply</Link>
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
