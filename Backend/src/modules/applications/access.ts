import type { Role } from "../../generated/prisma/client.js";
import { headsDepartment, isLeader, isStaffOfAward, type Actor } from "../../lib/access.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";

/**
 * Who may do what with applications (spec §3, §5.2):
 * - only an applicant account applies, for an organisation it belongs to (ADR 0016);
 * - only the person who started an application edits and submits it; their colleagues see its
 *   status, never who started it, and anyone else gets 404;
 * - the award's staff list applications, check proof and release; the department's head and the
 *   leader may read them, never change them.
 */
export { requireApplicantAccount } from "../../lib/access.js";

export function isStarter(actor: Actor, application: { createdById: string }): boolean {
  return actor.accountType === "APPLICANT" && application.createdById === actor.userId;
}

/** "Not found" for anyone but the starter, so another organisation's application stays hidden. */
export function requireStarter(actor: Actor, application: { createdById: string }): void {
  if (!isStarter(actor, application)) throw new NotFoundError("Application not found.");
}

type AwardScope = { id: string; departmentId: string };

/** The award's staff, its department's head or the leader: they may read its applications. */
export function canReadAsOrganiser(actor: Actor, award: AwardScope): boolean {
  return isStaffOfAward(actor, award.id) || headsDepartment(actor, award.departmentId) || isLeader(actor);
}

export function requireOrganiserReader(actor: Actor, award: AwardScope): void {
  if (!canReadAsOrganiser(actor, award)) throw new ForbiddenError();
}

/** Only the award's staff check proof and release applications (spec §3). */
export function requireAwardStaff(actor: Actor, award: AwardScope): Role {
  if (!isStaffOfAward(actor, award.id)) {
    throw new ForbiddenError("Only the award's staff can do this.");
  }
  return "AWARD_STAFF";
}
