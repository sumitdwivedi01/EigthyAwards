"use client";

import Link from "next/link";
import { CalendarClockIcon, ClipboardCheckIcon } from "lucide-react";
import { Stat } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard as DashboardData, DashboardCycle } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { useApprovals, useDashboard } from "./use-judging";

/**
 * The leadership dashboard (spec §5.14): every department, award and edition (the leader), or
 * the head's own departments: applications by status, judging progress, rounds waiting for
 * approval and upcoming deadlines. Read-only, with a drill-down to each round.
 */
export function Dashboard({ roundHref }: { roundHref: (roundId: string) => string }) {
  const dashboard = useDashboard();
  if (dashboard.isPending) return <LoadingState label="Loading the dashboard" lines={6} />;
  if (dashboard.error) return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  return <DashboardView data={dashboard.data} roundHref={roundHref} />;
}

function DashboardView({ data, roundHref }: { data: DashboardData; roundHref: (roundId: string) => string }) {
  const { totals } = data;
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={totals.departments === 1 ? "department" : "departments"} value={totals.departments} />
        <Stat label="awards" value={totals.awards} />
        <Stat label="open for applications" value={totals.openCycles} tone="primary" />
        <Stat label="applications submitted" value={totals.submitted} />
        <Stat label="rounds being judged" value={totals.judging} />
        <Stat label="waiting for approval" value={totals.pendingApprovals} tone={totals.pendingApprovals > 0 ? "warning" : "neutral"} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheckIcon className="size-5 text-muted-foreground" aria-hidden />
              Waiting for approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting.</p>
            ) : (
              <ul className="grid gap-3">
                {data.pendingApprovals.map((p) => (
                  <li key={p.roundId} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="grid gap-0.5">
                      <Link href={roundHref(p.roundId)} className="font-semibold underline-offset-4 hover:underline">
                        {p.award}: {p.cycle}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {p.department} · sent {istDateTime(p.submittedAt)}
                      </span>
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={roundHref(p.roundId)}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClockIcon className="size-5 text-muted-foreground" aria-hidden />
              Deadlines in the next 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="grid gap-3">
                {data.upcomingDeadlines.map((d) => (
                  <li key={d.cycleId} className="grid gap-0.5">
                    <span className="font-semibold">
                      {d.award}: {d.cycle}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {d.department} · {istDateTime(d.deadlineAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {data.departments.map((department) => (
        <Card key={department.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {department.name}
              {department.externalOrganiser && <Badge variant="outline">External organiser</Badge>}
            </CardTitle>
            <CardDescription>
              {department.awards.length} {department.awards.length === 1 ? "award" : "awards"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {department.awards.every((a) => a.cycles.length === 0) ? (
              <EmptyState compact title="No editions yet" description="The department's staff create awards and their editions." />
            ) : (
              <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="py-2 pr-4 font-semibold">Award and edition</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 pr-4 font-semibold">Applications</th>
                      <th className="py-2 pr-4 font-semibold">Proof</th>
                      <th className="py-2 pr-4 font-semibold">Judging</th>
                      <th className="py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {department.awards.flatMap((award) => award.cycles.map((cycle) => <CycleRow key={cycle.id} award={award.name} cycle={cycle} roundHref={roundHref} />))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const STATE: Record<DashboardCycle["state"], { label: string; variant: "outline" | "info" | "success" | "secondary" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  SCHEDULED: { label: "Opens soon", variant: "info" },
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "secondary" },
};

function CycleRow({ award, cycle, roundHref }: { award: string; cycle: DashboardCycle; roundHref: (roundId: string) => string }) {
  const { applications: a, proof, round } = cycle;
  const state = cycle.status === "RESULTS_PUBLISHED" ? { label: "Results published", variant: "success" as const } : STATE[cycle.state];
  return (
    <tr className="border-b align-top last:border-0">
      <td className="py-3 pr-4">
        <span className="font-semibold">{award}</span> {cycle.label}
        <span className="block text-xs text-muted-foreground">deadline {istDateTime(cycle.deadlineAt)}</span>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={state.variant}>{state.label}</Badge>
      </td>
      <td className="py-3 pr-4 tabular-nums">
        <span className="font-semibold">{a.SUBMITTED}</span> submitted{cycle.maxEntries !== null && ` / ${cycle.maxEntries}`}
        <span className="block text-xs text-muted-foreground">
          {a.DRAFT} drafts · {a.NOT_SUBMITTED} not submitted · {a.RELEASED} released
        </span>
      </td>
      <td className="py-3 pr-4 tabular-nums">
        <span className="font-semibold">{proof.VERIFIED}</span> verified
        <span className="block text-xs text-muted-foreground">
          {proof.PENDING} to check · {proof.REJECTED} rejected
        </span>
      </td>
      <td className="py-3 pr-4">
        {round ? (
          <>
            {round.statusLabel}
            <span className="block text-xs text-muted-foreground tabular-nums">
              {round.evaluationsSubmitted} / {round.evaluationsAssigned} evaluations · {round.atMinimum} / {round.judged} at the minimum
            </span>
          </>
        ) : (
          "–"
        )}
      </td>
      <td className="py-3">
        {round && round.status !== "NOT_STARTED" && (
          <Button asChild size="sm" variant="outline">
            <Link href={roundHref(round.id)}>Open</Link>
          </Button>
        )}
      </td>
    </tr>
  );
}

/** The head's approval queue: rounds sent to them, and the ones they decided. */
export function ApprovalQueueCard() {
  const approvals = useApprovals();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheckIcon className="size-5 text-muted-foreground" aria-hidden />
          Approvals
        </CardTitle>
        <CardDescription>Rounds the award staff sent you. Approving locks every score for good.</CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.isPending ? (
          <LoadingState label="Loading the approvals" />
        ) : approvals.error ? (
          <ErrorState error={approvals.error} onRetry={() => void approvals.refetch()} />
        ) : approvals.data.pending.length === 0 && approvals.data.decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been sent to you yet.</p>
        ) : (
          <ul className="grid gap-3">
            {[...approvals.data.pending, ...approvals.data.decided.slice(0, 5)].map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {item.award.name}: {item.cycle.label}
                </span>
                <Badge variant={item.decision === "PENDING" ? "warning" : item.decision === "APPROVED" ? "success" : "secondary"}>
                  {item.decision === "PENDING" ? "Waiting for you" : item.decision === "APPROVED" ? "Approved" : "Sent back"}
                </Badge>
                <Button asChild size="sm" variant={item.decision === "PENDING" ? "default" : "outline"} className="ml-auto">
                  <Link href={`/department/rounds/${item.roundId}`}>{item.decision === "PENDING" ? "Review" : "Open"}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
