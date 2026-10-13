import type { ApplicationStatus, ProofStatus } from "../../generated/prisma/client.js";
import { isLeader, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { ForbiddenError } from "../../lib/errors.js";
import { cycleState } from "../awards/views.js";
import { ROUND_STATUS_LABELS } from "../judging/views.js";
import type { DashboardCycle, DashboardView } from "./views.js";

/**
 * The leadership dashboard (spec §5.14): every department, award and edition with its status,
 * applications by status, judging progress, rounds waiting for approval and upcoming deadlines.
 * The leader sees all of them; a department head the same view for their own departments. It is
 * read-only, and counts only: no application, score or person is listed here.
 */

const UPCOMING_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

const STATUSES: ApplicationStatus[] = ["DRAFT", "SUBMITTED", "NOT_SUBMITTED", "RELEASED", "WITHDRAWN"];
const PROOFS: ProofStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

export async function dashboard(actor: Actor): Promise<DashboardView> {
  const leader = isLeader(actor);
  const headed = actor.roles.filter((r) => r.role === "DEPT_HEAD" && r.departmentId).map((r) => r.departmentId as string);
  if (!leader && headed.length === 0) throw new ForbiddenError();
  const now = clock.now();

  const departments = await db.department.findMany({
    where: leader ? {} : { id: { in: headed } },
    select: {
      id: true,
      name: true,
      externalOrganiser: true,
      awards: {
        select: {
          id: true,
          name: true,
          cycles: {
            select: {
              id: true,
              label: true,
              status: true,
              opensAt: true,
              deadlineAt: true,
              maxEntries: true,
              rounds: { select: { id: true, number: true, status: true, juryMin: true, juryMax: true }, orderBy: { number: "asc" } },
            },
            orderBy: { opensAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  const cycleIds = departments.flatMap((d) => d.awards.flatMap((a) => a.cycles.map((c) => c.id)));
  const roundIds = departments.flatMap((d) => d.awards.flatMap((a) => a.cycles.flatMap((c) => c.rounds.map((r) => r.id))));

  const byStatus = await db.application.groupBy({ by: ["cycleId", "status"], where: { cycleId: { in: cycleIds } }, _count: { _all: true } });
  const byProof = await db.application.groupBy({
    by: ["cycleId", "proofStatus"],
    where: { cycleId: { in: cycleIds }, status: "SUBMITTED" },
    _count: { _all: true },
  });
  const evaluations = await db.evaluation.groupBy({
    by: ["roundId", "status"],
    where: { roundId: { in: roundIds }, status: { not: "REVOKED" } },
    _count: { _all: true },
  });
  const submittedPerApplication = await db.evaluation.groupBy({
    by: ["roundId", "applicationId"],
    where: { roundId: { in: roundIds }, status: "SUBMITTED" },
    _count: { _all: true },
  });
  const judged = await db.application.groupBy({
    by: ["cycleId"],
    where: { cycleId: { in: cycleIds }, status: "SUBMITTED", proofStatus: "VERIFIED", disqualifiedAt: null },
    _count: { _all: true },
  });
  const pending = await db.approvalRequest.findMany({
    where: { roundId: { in: roundIds }, decision: "PENDING" },
    select: { roundId: true, submittedAt: true },
  });

  const count = <T extends { _count: { _all: number } }>(rows: T[], match: (row: T) => boolean) =>
    rows.filter(match).reduce((sum, row) => sum + row._count._all, 0);

  const pendingApprovals: DashboardView["pendingApprovals"] = [];
  const upcomingDeadlines: DashboardView["upcomingDeadlines"] = [];

  const view = departments.map((department) => ({
    id: department.id,
    name: department.name,
    externalOrganiser: department.externalOrganiser,
    awards: department.awards.map((award) => ({
      id: award.id,
      name: award.name,
      cycles: award.cycles.map((cycle): DashboardCycle => {
        const round = cycle.rounds[0] ?? null;
        const state = cycleState(cycle, now);
        if (state === "OPEN" && cycle.deadlineAt.getTime() - now.getTime() <= UPCOMING_DAYS * DAY) {
          upcomingDeadlines.push({ cycleId: cycle.id, award: award.name, cycle: cycle.label, department: department.name, deadlineAt: cycle.deadlineAt.toISOString() });
        }
        const request = round ? pending.find((p) => p.roundId === round.id) : undefined;
        if (round && request) {
          pendingApprovals.push({
            roundId: round.id,
            award: award.name,
            cycle: cycle.label,
            department: department.name,
            submittedAt: request.submittedAt.toISOString(),
          });
        }
        return {
          id: cycle.id,
          label: cycle.label,
          status: cycle.status,
          state,
          deadlineAt: cycle.deadlineAt.toISOString(),
          maxEntries: cycle.maxEntries,
          applications: Object.fromEntries(
            STATUSES.map((s) => [s, count(byStatus, (r) => r.cycleId === cycle.id && r.status === s)]),
          ) as Record<ApplicationStatus, number>,
          proof: Object.fromEntries(PROOFS.map((p) => [p, count(byProof, (r) => r.cycleId === cycle.id && r.proofStatus === p)])) as Record<
            ProofStatus,
            number
          >,
          round: round
            ? {
                id: round.id,
                status: round.status,
                statusLabel: ROUND_STATUS_LABELS[round.status],
                juryMin: round.juryMin,
                juryMax: round.juryMax,
                evaluationsAssigned: count(evaluations, (r) => r.roundId === round.id),
                evaluationsSubmitted: count(evaluations, (r) => r.roundId === round.id && r.status === "SUBMITTED"),
                judged: count(judged, (r) => r.cycleId === cycle.id),
                atMinimum: submittedPerApplication.filter((r) => r.roundId === round.id && r._count._all >= round.juryMin).length,
                waitingForApproval: request !== undefined,
              }
            : null,
        };
      }),
    })),
  }));

  const cycles = view.flatMap((d) => d.awards.flatMap((a) => a.cycles));
  upcomingDeadlines.sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt));
  return {
    scope: leader ? "PLATFORM" : "DEPARTMENTS",
    totals: {
      departments: view.length,
      awards: view.reduce((sum, d) => sum + d.awards.length, 0),
      openCycles: cycles.filter((c) => c.state === "OPEN").length,
      submitted: cycles.reduce((sum, c) => sum + c.applications.SUBMITTED, 0),
      judging: cycles.filter((c) => c.round?.status === "JUDGING").length,
      pendingApprovals: pendingApprovals.length,
    },
    pendingApprovals,
    upcomingDeadlines,
    departments: view,
  };
}
