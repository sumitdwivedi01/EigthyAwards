/**
 * Who may set up awards (spec §3): a department's staff create its awards (the creator runs the
 * award); only an award's own staff configure its editions, questions, scoring sheet and page.
 * The checks live in ./context.ts (requireCycleStaff, requireRoundStaff), shared with the forms,
 * scoring and sites modules, and in src/lib/access.ts.
 */
export { isStaffOfDepartment, requireStaffOfAward } from "../../lib/access.js";
export { requireCycleStaff, requireRoundStaff } from "./context.js";
