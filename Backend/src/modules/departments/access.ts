import type { Role } from "../../generated/prisma/client.js";
import { headsDepartment, isLeader, type Actor } from "../../lib/access.js";
import { ForbiddenError } from "../../lib/errors.js";

/**
 * Who may do what with departments and their people (spec §3, ADR 0017):
 * - only the leader creates a department, together with its head;
 * - a department's staff and jury lists are kept by its head, or by the leader in any department;
 * - only the leader issues a new temporary password to someone who heads a department.
 */
export { requireLeader } from "../../lib/access.js";

export function canManagePeople(actor: Actor, departmentId: string): boolean {
  return isLeader(actor) || headsDepartment(actor, departmentId);
}

export function requirePeopleManager(actor: Actor, departmentId: string): void {
  if (!canManagePeople(actor, departmentId)) {
    throw new ForbiddenError("Only the department's head, or the leader, manages its people.");
  }
}

/** The role the audit history records for a change to a department's people. */
export function managerRole(actor: Actor): Role {
  return isLeader(actor) ? "LEADER" : "DEPT_HEAD";
}
