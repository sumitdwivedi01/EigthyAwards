import type { Role } from "../../generated/prisma/client.js";
import { headsDepartment, isLeader, isStaffOfAward, type Actor } from "../../lib/access.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";

/**
 * Who may do what in judging (spec §3):
 * - only the award's staff assign applications, take assignments back, correct scores with a
 *   reason, send the round for approval and decide and publish its results;
 * - the award's staff and its department's head record and remove conflicts;
 * - only the department's head approves its document rounds;
 * - a jury member sees and scores only their own evaluations ("not found" for anyone else's);
 * - the award's staff, its department's head and the leader read every score and decision; the
 *   leader never changes judging data.
 */

type AwardScope = { id: string; departmentId: string };

export function canReadJudging(actor: Actor, award: AwardScope): boolean {
  return isStaffOfAward(actor, award) || headsDepartment(actor, award.departmentId) || isLeader(actor);
}

export function requireJudgingReader(actor: Actor, award: AwardScope): void {
  if (!canReadJudging(actor, award)) throw new ForbiddenError();
}

export function requireJudgingStaff(actor: Actor, award: AwardScope): Role {
  if (!isStaffOfAward(actor, award)) throw new ForbiddenError("Only the award's staff can do this.");
  return "AWARD_STAFF";
}

/** The role a conflict is recorded or removed in: the award's staff, else its department's head. */
export function conflictRole(actor: Actor, award: AwardScope): Role | null {
  if (isStaffOfAward(actor, award)) return "AWARD_STAFF";
  if (headsDepartment(actor, award.departmentId)) return "DEPT_HEAD";
  return null;
}

export function requireConflictRole(actor: Actor, award: AwardScope): Role {
  const role = conflictRole(actor, award);
  if (!role) throw new ForbiddenError("Only the award's staff or its department's head can record conflicts.");
  return role;
}

export function requireDepartmentHeadOf(actor: Actor, award: AwardScope): Role {
  if (!headsDepartment(actor, award.departmentId)) {
    throw new ForbiddenError("Only the department's head approves its rounds.");
  }
  return "DEPT_HEAD";
}

/** Another jury member's evaluation answers "not found", so its existence isn't revealed. */
export function requireOwnEvaluation(actor: Actor, evaluation: { juryUserId: string }): void {
  if (evaluation.juryUserId !== actor.userId) throw new NotFoundError("Assignment not found.");
}
