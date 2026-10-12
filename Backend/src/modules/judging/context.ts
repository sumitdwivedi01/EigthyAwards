import type { EvaluationStatus, Prisma, RoundStatus } from "../../generated/prisma/client.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, StateError } from "../../lib/errors.js";
import { closeCycleIfDue } from "../applications/lock.js";
import { evaluationPoints, type SheetSection } from "../scoring/arithmetic.js";
import { readSheet } from "../scoring/service.js";
import type { ScoringSection } from "../scoring/schemas.js";

/**
 * The facts every judging rule needs about a round, its cycle and award, read once per request.
 * Reads take a client, so the same code runs inside a transaction that holds the locks.
 */

export const roundSelect = {
  id: true,
  number: true,
  type: true,
  status: true,
  juryMin: true,
  juryMax: true,
  resultLabels: true,
  cycleId: true,
  cycle: {
    select: {
      id: true,
      label: true,
      status: true,
      deadlineAt: true,
      blindJudging: true,
      award: { select: { id: true, name: true, departmentId: true, department: { select: { name: true } } } },
    },
  },
} satisfies Prisma.RoundSelect;

export type RoundContext = Prisma.RoundGetPayload<{ select: typeof roundSelect }>;

/** Loads a round after its cycle's deadline lock has run, so the applications' statuses are current. */
export async function loadRound(roundId: string): Promise<RoundContext> {
  const found = await db.round.findUnique({ where: { id: roundId }, select: { cycleId: true } });
  if (!found) throw new NotFoundError("Round not found.");
  await closeCycleIfDue(found.cycleId);
  return db.round.findUniqueOrThrow({ where: { id: roundId }, select: roundSelect });
}

/** Locks the round's row for the rest of the transaction and returns its current status. */
export async function lockRound(tx: Tx, roundId: string): Promise<RoundStatus> {
  const rows = await tx.$queryRaw<{ status: RoundStatus }[]>`
    SELECT status FROM rounds WHERE id = ${roundId}::uuid FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new NotFoundError("Round not found.");
  return row.status;
}

/** Assignments can change only while the round is being judged (not yet sent for approval). */
export function requireAssignable(status: RoundStatus): void {
  if (status !== "NOT_STARTED" && status !== "JUDGING") {
    throw new StateError("This round has been sent for approval, so its assignments can't change.", { reason: "ROUND_SENT" });
  }
}

export const ACTIVE: Prisma.EvaluationWhereInput = { status: { not: "REVOKED" } };
export const UNFINISHED: EvaluationStatus[] = ["ASSIGNED", "IN_PROGRESS", "REDO"];

/** Judged applications: submitted, proof verified, not disqualified (spec §5.8). */
export const ELIGIBLE: Prisma.ApplicationWhereInput = { status: "SUBMITTED", proofStatus: "VERIFIED", disqualifiedAt: null };

export function isEligible(application: { status: string; proofStatus: string; disqualifiedAt: Date | null }): boolean {
  return application.status === "SUBMITTED" && application.proofStatus === "VERIFIED" && application.disqualifiedAt === null;
}

export interface Juror {
  id: string;
  name: string;
  email: string;
}

/**
 * The award's department jury list (ADR 0017): active JURY roles of active accounts. Anyone who
 * also runs the award (its staff, the department's staff or head) is left out: they never judge
 * their own department's document rounds (spec §3), whatever the list says.
 */
export async function departmentJury(client: Tx, award: { id: string; departmentId: string }): Promise<Juror[]> {
  const roles = await client.roleAssignment.findMany({
    where: { departmentId: award.departmentId, role: "JURY", revokedAt: null, user: { deactivatedAt: null } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  const organisers = await client.roleAssignment.findMany({
    where: {
      revokedAt: null,
      OR: [
        { role: { in: ["DEPT_HEAD", "DEPT_STAFF"] }, departmentId: award.departmentId },
        { role: "AWARD_STAFF", awardId: award.id },
      ],
    },
    select: { userId: true },
  });
  const excluded = new Set(organisers.map((r) => r.userId));
  return roles
    .map((r) => r.user)
    .filter((u) => !excluded.has(u.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The scoring sheet as the arithmetic reads it. */
export function sheetSections(sections: readonly ScoringSection[]): SheetSection[] {
  return sections.map((s) => ({ key: s.key, weight: s.weight, indicators: s.indicators.map((i) => ({ key: i.key, type: i.type, weight: i.weight })) }));
}

export async function roundSheet(client: Tx, roundId: string): Promise<ScoringSection[]> {
  const sheet = await client.scoringSheet.findUnique({ where: { roundId }, select: { schema: true } });
  return readSheet(sheet?.schema).sections;
}

export function indicatorsOf(sections: readonly ScoringSection[]): Map<string, ScoringSection["indicators"][number]> {
  return new Map(sections.flatMap((s) => s.indicators.map((i) => [i.key, i] as const)));
}

/** One juror's points P, or null while an indicator still has no mark. */
export function pointsOf(sections: readonly ScoringSection[], marks: ReadonlyMap<string, number>): number | null {
  const all = sections.every((s) => s.indicators.every((i) => marks.has(i.key)));
  return all ? evaluationPoints(sheetSections(sections), marks) : null;
}

export function marksOf(scores: readonly { indicatorKey: string; value: number }[]): Map<string, number> {
  return new Map(scores.map((s) => [s.indicatorKey, s.value]));
}

/** Active conflicts as "juror|organisation" pairs, for the given jurors and organisations. */
export async function conflictPairs(client: Tx, juryUserIds: string[], organisationIds: string[]): Promise<Set<string>> {
  if (juryUserIds.length === 0 || organisationIds.length === 0) return new Set();
  const rows = await client.conflict.findMany({
    where: { juryUserId: { in: juryUserIds }, organisationId: { in: organisationIds }, removedAt: null },
    select: { juryUserId: true, organisationId: true },
  });
  return new Set(rows.map((r) => pairKey(r.juryUserId, r.organisationId)));
}

export function pairKey(juryUserId: string, organisationId: string): string {
  return `${juryUserId}|${organisationId}`;
}

/** A short, stable reference that names no one: what a jury member calls an application. */
export function entryReference(applicationId: string): string {
  return `Entry ${applicationId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
