"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { messageOf } from "@/lib/api-client";
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
  if (dashboard.isPending) return <p className="text-sm text-muted-foreground">Loading the dashboard…</p>;
  if (dashboard.error) return <p className="text-sm text-destructive">{messageOf(dashboard.error)}</p>;
  return <DashboardView data={dashboard.data} roundHref={roundHref} />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardView({ data, roundHref }: { data: DashboardData; roundHref: (roundId: string) => string }) {
  const { totals } = data;
  return (
    <div className="grid gap-6 md:col-span-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={totals.departments === 1 ? "department" : "departments"} value={totals.departments} />
        <Stat label="awards" value={totals.awards} />
        <Stat label="open for applications" value={totals.openCycles} />
        <Stat label="applications submitted" value={totals.submitted} />
        <Stat label="rounds being judged" value={totals.judging} />
        <Stat label="waiting for approval" value={totals.pendingApprovals} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waiting for approval</CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {data.pendingApprovals.map((p) => (
                  <li key={p.roundId} className="flex flex-wrap items-center gap-2">
                    <Link href={roundHref(p.roundId)} className="font-medium underline-offset-4 hover:underline">
                      {p.award}: {p.cycle}
                    </Link>
                    <span className="text-muted-foreground">
                      {p.department} · sent {istDateTime(p.submittedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deadlines in the next 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {data.upcomingDeadlines.map((d) => (
                  <li key={d.cycleId}>
                    <span className="font-medium">
                      {d.award}: {d.cycle}
                    </span>{" "}
                    <span className="text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">No editions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1 pr-3 font-medium">Award and edition</th>
                      <th className="py-1 pr-3 font-medium">Status</th>
                      <th className="py-1 pr-3 font-medium">Applications</th>
                      <th className="py-1 pr-3 font-medium">Proof</th>
                      <th className="py-1 pr-3 font-medium">Judging</th>
                      <th className="py-1 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {department.awards.flatMap((award) =>
                      award.cycles.map((cycle) => <CycleRow key={cycle.id} award={award.name} cycle={cycle} roundHref={roundHref} />),
                    )}
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

const STATE_LABELS: Record<DashboardCycle["state"], string> = { DRAFT: "Draft", SCHEDULED: "Opens soon", OPEN: "Open", CLOSED: "Closed" };

function CycleRow({ award, cycle, roundHref }: { award: string; cycle: DashboardCycle; roundHref: (roundId: string) => string }) {
  const { applications: a, proof, round } = cycle;
  return (
    <tr className="border-b align-top last:border-0">
      <td className="py-1.5 pr-3">
        <span className="font-medium">{award}</span> {cycle.label}
        <span className="block text-xs text-muted-foreground">deadline {istDateTime(cycle.deadlineAt)}</span>
      </td>
      <td className="py-1.5 pr-3">{cycle.status === "RESULTS_PUBLISHED" ? "Results published" : STATE_LABELS[cycle.state]}</td>
      <td className="py-1.5 pr-3 tabular-nums">
        {a.SUBMITTED} submitted{cycle.maxEntries !== null && ` / ${cycle.maxEntries}`}
        <span className="block text-xs text-muted-foreground">
          {a.DRAFT} drafts · {a.NOT_SUBMITTED} not submitted · {a.RELEASED} released
        </span>
      </td>
      <td className="py-1.5 pr-3 tabular-nums">
        {proof.VERIFIED} verified
        <span className="block text-xs text-muted-foreground">
          {proof.PENDING} to check · {proof.REJECTED} rejected
        </span>
      </td>
      <td className="py-1.5 pr-3">
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
      <td className="py-1.5">
        {round && round.status !== "NOT_STARTED" && (
          <Button asChild size="xs" variant="outline">
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
        <CardTitle>Approvals</CardTitle>
        <CardDescription>Written rounds the award staff sent you. Approving locks every score for good.</CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : approvals.error ? (
          <p className="text-sm text-destructive">{messageOf(approvals.error)}</p>
        ) : approvals.data.pending.length === 0 && approvals.data.decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been sent to you yet.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {[...approvals.data.pending, ...approvals.data.decided.slice(0, 5)].map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {item.award.name}: {item.cycle.label}
                </span>
                <Badge variant={item.decision === "PENDING" ? "default" : "secondary"}>
                  {item.decision === "PENDING" ? "Waiting for you" : item.decision === "APPROVED" ? "Approved" : "Sent back"}
                </Badge>
                <Button asChild size="xs" variant={item.decision === "PENDING" ? "default" : "outline"} className="ml-auto">
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
