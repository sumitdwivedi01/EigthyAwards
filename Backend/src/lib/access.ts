import type { AccountType, Role } from "../generated/prisma/client.js";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "./errors.js";

/**
 * The acting user, as every service function receives it first (spec §11). Built from the
 * database on every request (src/middleware/actor.ts); the browser never decides permissions.
 * Module access.ts files combine these checks with the rows they protect.
 */
export interface ScopedRole {
  readonly role: Role;
  readonly departmentId: string | null;
  readonly awardId: string | null;
  readonly cycleId: string | null;
}

export interface Actor {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  /** An applicant account applies; a platform account holds roles (ADR 0016). */
  readonly accountType: AccountType;
  /** Active role assignments only (revoked ones are left out). Always empty for an applicant account. */
  readonly roles: readonly ScopedRole[];
  /** Organisations the user is a member of (applying on their behalf). Always empty for a platform account. */
  readonly organisationIds: readonly string[];
}

export function requireSignedIn(actor: Actor | null): Actor {
  if (!actor) {
    throw new UnauthenticatedError();
  }
  return actor;
}

function holds(actor: Actor, test: (role: ScopedRole) => boolean): boolean {
  return actor.roles.some(test);
}

export function isLeader(actor: Actor): boolean {
  return holds(actor, (r) => r.role === "LEADER");
}

export function headsDepartment(actor: Actor, departmentId: string): boolean {
  return holds(actor, (r) => r.role === "DEPT_HEAD" && r.departmentId === departmentId);
}

export function isStaffOfDepartment(actor: Actor, departmentId: string): boolean {
  return holds(actor, (r) => r.role === "DEPT_STAFF" && r.departmentId === departmentId);
}

export function isStaffOfAward(actor: Actor, awardId: string): boolean {
  return holds(actor, (r) => r.role === "AWARD_STAFF" && r.awardId === awardId);
}

export function isJuryOfCycle(actor: Actor, cycleId: string): boolean {
  return holds(actor, (r) => r.role === "JURY" && r.cycleId === cycleId);
}

export function isMemberOf(actor: Actor, organisationId: string): boolean {
  return actor.organisationIds.includes(organisationId);
}

/**
 * Organisations, applying and the profile proof belong to applicant accounts only (ADR 0016). The
 * leader, department heads, staff and jury use a platform account and apply from a separate one.
 */
export function requireApplicantAccount(actor: Actor): void {
  if (actor.accountType !== "APPLICANT") {
    throw new ForbiddenError(
      "Only applicant accounts can do this. To apply for an award, create a separate applicant account.",
    );
  }
}

export function requireLeader(actor: Actor): void {
  if (!isLeader(actor)) throw new ForbiddenError();
}

export function requireDeptHead(actor: Actor, departmentId: string): void {
  if (!headsDepartment(actor, departmentId)) throw new ForbiddenError();
}

export function requireStaffOfAward(actor: Actor, awardId: string): void {
  if (!isStaffOfAward(actor, awardId)) throw new ForbiddenError();
}

export function requireJuryOfCycle(actor: Actor, cycleId: string): void {
  if (!isJuryOfCycle(actor, cycleId)) throw new ForbiddenError();
}

/** Another organisation's data answers "not found", so its existence isn't revealed (spec §11). */
export function requireOrgMember(actor: Actor, organisationId: string): void {
  if (!isMemberOf(actor, organisationId)) throw new NotFoundError("Organisation not found.");
}

const ROLE_ORDER: readonly Role[] = ["LEADER", "DEPT_HEAD", "DEPT_STAFF", "AWARD_STAFF", "JURY"];

/**
 * The role recorded on the audit history for actions on a person's own account, which belong to
 * no scope: their highest role, or none for someone who only applies.
 */
export function primaryRole(actor: Actor): Role | null {
  return ROLE_ORDER.find((role) => holds(actor, (r) => r.role === role)) ?? null;
}
