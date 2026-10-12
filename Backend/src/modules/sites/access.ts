import type { Role } from "../../generated/prisma/client.js";
import { headsDepartment, isStaffOfAward, type Actor } from "../../lib/access.js";
import { ForbiddenError } from "../../lib/errors.js";

/**
 * Award pages (spec §3, §5.19, ADR 0020): the award's staff and its department's head manage its
 * page; the leader only views it. The public pages need no login and show only published
 * editions, never people or applications.
 */
export function requirePageManager(actor: Actor, award: { id: string; departmentId: string }): Role {
  if (isStaffOfAward(actor, award)) return "AWARD_STAFF";
  if (headsDepartment(actor, award.departmentId)) return "DEPT_HEAD";
  throw new ForbiddenError("Only the award's staff and its department's head manage its page.");
}
