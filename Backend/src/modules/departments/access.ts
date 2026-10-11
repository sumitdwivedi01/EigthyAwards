import { headsDepartment, isLeader, type Actor } from "../../lib/access.js";
import { ForbiddenError } from "../../lib/errors.js";

/**
 * Who may do what with departments and their people (spec §3, ADR 0017, changed by ADR 0020).
 * A department runs itself; the leader only brings it onto the platform and watches:
 * - the leader creates a department together with its head, and sees every department, its
 *   people and its theme, but changes none of them;
 * - only the department's head keeps its staff and jury lists and chooses its theme;
 * - a new temporary password: the head issues it to their staff and jury; for anyone who heads
 *   a department only the leader can, as their one way back in until email reset (package 2.3).
 */
export { requireLeader } from "../../lib/access.js";

/** The leader, or one of the department's heads. */
export function canViewDepartment(actor: Actor, departmentId: string): boolean {
  return isLeader(actor) || headsDepartment(actor, departmentId);
}

export function requireDepartmentViewer(actor: Actor, departmentId: string): void {
  if (!canViewDepartment(actor, departmentId)) throw new ForbiddenError();
}

/** Only the department's own head changes its people and its theme. */
export function requireDepartmentHead(actor: Actor, departmentId: string): void {
  if (!headsDepartment(actor, departmentId)) {
    throw new ForbiddenError("Only the department's head can change its people and its theme.");
  }
}

/**
 * Whether the actor may issue a new temporary password to someone in the department: a head is
 * reset only by the leader; staff and jury only by their department's head; never oneself.
 */
export function canIssuePasswordTo(actor: Actor, departmentId: string, target: { userId: string; headsADepartment: boolean }): boolean {
  if (target.userId === actor.userId) return false;
  return target.headsADepartment ? isLeader(actor) : headsDepartment(actor, departmentId);
}
