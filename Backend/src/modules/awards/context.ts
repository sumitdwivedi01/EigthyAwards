import type { CycleStatus } from "../../generated/prisma/client.js";
import { requireStaffOfAward, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError } from "../../lib/errors.js";

/**
 * The cycle an award-setup request is about, with the facts every setup rule needs. Shared by
 * the awards, forms, scoring and sites modules, so "staff of this award" is checked one way.
 */
export interface CycleContext {
  cycleId: string;
  awardId: string;
  departmentId: string;
  status: CycleStatus;
  opensAt: Date;
  deadlineAt: Date;
}

const contextSelect = {
  id: true,
  awardId: true,
  status: true,
  opensAt: true,
  deadlineAt: true,
  award: { select: { departmentId: true } },
} as const;

/** Only the award's own staff configure its cycles (spec §3); another award's staff get 403. */
export async function requireCycleStaff(actor: Actor, cycleId: string): Promise<CycleContext> {
  const cycle = await db.cycle.findUnique({ where: { id: cycleId }, select: contextSelect });
  if (!cycle) throw new NotFoundError("Award edition not found.");
  requireStaffOfAward(actor, cycle.awardId);
  return {
    cycleId: cycle.id,
    awardId: cycle.awardId,
    departmentId: cycle.award.departmentId,
    status: cycle.status,
    opensAt: cycle.opensAt,
    deadlineAt: cycle.deadlineAt,
  };
}

export async function requireRoundStaff(actor: Actor, roundId: string): Promise<CycleContext & { roundId: string }> {
  const round = await db.round.findUnique({ where: { id: roundId }, select: { id: true, cycleId: true } });
  if (!round) throw new NotFoundError("Round not found.");
  return { ...(await requireCycleStaff(actor, round.cycleId)), roundId: round.id };
}

/** After the deadline every application is locked, so the questions are fixed too (spec §5.4). */
export function refuseAfterDeadline(context: CycleContext, what: string): void {
  if (clock.now() >= context.deadlineAt) {
    throw new StateError(`The deadline has passed, so ${what} can't change any more.`);
  }
}
