import type { Role } from "../../generated/prisma/client.js";
import { headsDepartment, isLeader, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db, type Tx } from "../../lib/db.js";
import { ForbiddenError, NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { normalizeName } from "../../lib/normalize.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { recordAudit } from "../audit/service.js";
import { findOrCreatePlatformAccount, replaceWithTemporaryPassword, type PlatformAccount } from "../identity/accounts.js";
import { canIssuePasswordTo, requireDepartmentHead, requireDepartmentViewer, requireLeader } from "./access.js";
import { DEFAULT_THEME, type CreateDepartmentInput, type ListKind, type PersonInput, type ThemeInput } from "./schemas.js";
import {
  departmentSummaryInclude,
  departmentSummaryView,
  personSelect,
  personView,
  type CreatedDepartmentView,
  type DepartmentSummaryView,
  type ListedPersonView,
  type PeopleView,
  type PersonView,
  type PersonWithPasswordView,
  type ThemeView,
} from "./views.js";

/**
 * Departments and their people, created on screen (spec §5.3, ADR 0017). The leader creates a
 * department with its head and can then only look: the head adds and removes its staff and jury
 * and chooses its theme (ADR 0020). A new person gets a platform account with a temporary
 * password, returned once to whoever created them; an existing platform account is added by
 * email instead. Every change is audited, never with a password.
 */

const ROLE_OF: Record<ListKind, Role> = { staff: "DEPT_STAFF", jury: "JURY" };
const LIST_NAME: Record<ListKind, string> = { staff: "staff list", jury: "jury list" };
const DEFAULT_FONT = "inter";

function fieldIssue(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

function asPersonView(account: PlatformAccount, waitingForFirstLogin: boolean): PersonView {
  return { id: account.userId, name: account.name, email: account.email, waitingForFirstLogin };
}

async function requireDepartment(departmentId: string): Promise<{ id: string; name: string; externalOrganiser: boolean }> {
  const department = await db.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, externalOrganiser: true },
  });
  if (!department) throw new NotFoundError("Department not found.");
  return department;
}

/**
 * Refuses a combination of roles the platform doesn't allow (spec §3, ADR 0017): the leader is in
 * no department; on a department's jury list neither its head nor its staff (the head approves its
 * written rounds, and staff assign applications, so they could pick themselves); its head isn't
 * also its staff; and nobody is on the same list twice.
 */
async function refuseConflictingRoles(
  tx: Tx,
  userId: string,
  departmentId: string | null,
  joining: ListKind | "head",
  emailPath: string,
): Promise<void> {
  const roles = await tx.roleAssignment.findMany({
    where: { userId, revokedAt: null },
    select: { role: true, departmentId: true, award: { select: { departmentId: true } } },
  });
  if (roles.some((r) => r.role === "LEADER")) {
    throw fieldIssue(emailPath, "This is the leader's account, which works across the platform and joins no department.");
  }
  if (departmentId === null) return;
  const here = (role: Role) => roles.some((r) => r.role === role && r.departmentId === departmentId);
  const staffOfAnAwardHere = roles.some((r) => r.role === "AWARD_STAFF" && r.award?.departmentId === departmentId);
  if (joining === "jury" && (here("DEPT_HEAD") || here("DEPT_STAFF") || staffOfAnAwardHere)) {
    throw fieldIssue(emailPath, "The department's own head and staff can't be on its jury list.");
  }
  if (joining === "staff" && here("DEPT_HEAD")) {
    throw fieldIssue(emailPath, "The department's head can't also be its staff.");
  }
  if (joining === "staff" && here("JURY")) {
    throw fieldIssue(emailPath, "Someone on the department's jury list can't also be its staff.");
  }
  if (joining !== "head" && here(ROLE_OF[joining])) {
    throw fieldIssue(emailPath, `This person is already on the ${LIST_NAME[joining]}.`);
  }
}

async function recordAccountCreated(tx: Tx, actor: Actor, actorRole: Role, account: PlatformAccount): Promise<void> {
  await recordAudit(tx, {
    actorId: actor.userId,
    actorRole,
    action: "user.created",
    entityType: "user",
    entityId: account.userId,
    after: { email: account.email, name: account.name, accountType: "PLATFORM" },
  });
}

/** Two people changing the same list at the same moment: the unique indexes decide. */
function concurrentChange(): StateError {
  return new StateError("Someone else changed this at the same moment. Refresh and try again.");
}

/** The leader sees every department; a head sees the ones they head. */
export async function listDepartments(actor: Actor): Promise<DepartmentSummaryView[]> {
  if (!isLeader(actor) && !actor.roles.some((r) => r.role === "DEPT_HEAD")) {
    throw new ForbiddenError();
  }
  const rows = await db.department.findMany({
    where: isLeader(actor)
      ? {}
      : { roles: { some: { userId: actor.userId, role: "DEPT_HEAD", revokedAt: null } } },
    include: departmentSummaryInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(departmentSummaryView);
}

/**
 * The leader creates a department together with its head (ADR 0017): its name, whether it is an
 * external award organiser, and the head's account (new, with a temporary password, or an existing
 * platform account). Its theme starts with the default colours; the head chooses its own
 * (ADR 0020). One transaction: department, brand kit, role and audit events.
 */
export async function createDepartment(actor: Actor, input: CreateDepartmentInput): Promise<CreatedDepartmentView> {
  requireLeader(actor);
  const name = normalizeName(input.name);
  // Names compare without letter case; the message names the department as it is stored.
  const nameTaken = (stored: string) => fieldIssue("name", `A department called "${stored}" already exists.`);
  const existing = await db.department.findUnique({ where: { name }, select: { name: true } });
  if (existing) throw nameTaken(existing.name);
  try {
    const { departmentId, head } = await db.$transaction(async (tx) => {
      const head = await findOrCreatePlatformAccount(tx, input.head, "head.email");
      if (!head.temporaryPassword) await refuseConflictingRoles(tx, head.userId, null, "head", "head.email");
      const department = await tx.department.create({
        data: { name, externalOrganiser: input.externalOrganiser, createdById: actor.userId },
        select: { id: true },
      });
      await tx.brandKit.create({
        data: {
          departmentId: department.id,
          ...DEFAULT_THEME,
          fontKey: DEFAULT_FONT,
          footerText: name,
          socialLinks: [],
        },
      });
      await tx.roleAssignment.create({
        data: { userId: head.userId, role: "DEPT_HEAD", departmentId: department.id, grantedById: actor.userId },
      });
      if (head.temporaryPassword) await recordAccountCreated(tx, actor, "LEADER", head);
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: "LEADER",
        action: "department.created",
        entityType: "department",
        entityId: department.id,
        after: { name, externalOrganiser: input.externalOrganiser, headUserId: head.userId },
      });
      return { departmentId: department.id, head };
    });
    // The view is read after the commit: transactions only write (GAPS G-K28).
    const created = await db.department.findUniqueOrThrow({ where: { id: departmentId }, include: departmentSummaryInclude });
    return {
      department: departmentSummaryView(created),
      head: asPersonView(head, head.temporaryPassword !== null),
      temporaryPassword: head.temporaryPassword,
    };
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken(name);
    throw error;
  }
}

/** Work a person has in the department: staff count their awards, jury their assignments. */
async function workCounts(departmentId: string, kind: ListKind, userIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;
  if (kind === "staff") {
    const rows = await db.roleAssignment.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, role: "AWARD_STAFF", revokedAt: null, award: { departmentId } },
      _count: { _all: true },
    });
    for (const row of rows) counts.set(row.userId, row._count._all);
  } else {
    const rows = await db.evaluation.groupBy({
      by: ["juryUserId"],
      where: { juryUserId: { in: userIds }, round: { cycle: { award: { departmentId } } } },
      _count: { _all: true },
    });
    for (const row of rows) counts.set(row.juryUserId, row._count._all);
  }
  return counts;
}

/** Of these people, the ones who head any department (only the leader resets their password). */
async function headsOfAnyDepartment(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db.roleAssignment.findMany({
    where: { userId: { in: userIds }, role: "DEPT_HEAD", revokedAt: null },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/**
 * The department's head(s), staff list and jury list. Its head manages them; the leader only
 * sees them (ADR 0020). The view says which actions the caller may take, so the screens show
 * only those.
 */
export async function listPeople(actor: Actor, departmentId: string): Promise<PeopleView> {
  requireDepartmentViewer(actor, departmentId);
  const department = await requireDepartment(departmentId);
  const canManage = headsDepartment(actor, departmentId);
  const roles = await db.roleAssignment.findMany({
    where: { departmentId, revokedAt: null },
    select: { role: true, user: { select: personSelect } },
    orderBy: { user: { name: "asc" } },
  });
  const usersWith = (role: Role) => roles.filter((r) => r.role === role).map((r) => r.user);
  const heads = await headsOfAnyDepartment([...new Set(roles.map((r) => r.user.id))]);
  const passwordFor = (userId: string) => canIssuePasswordTo(actor, departmentId, { userId, headsADepartment: heads.has(userId) });
  const listed = async (kind: ListKind): Promise<ListedPersonView[]> => {
    const users = usersWith(ROLE_OF[kind]);
    const work = await workCounts(departmentId, kind, users.map((u) => u.id));
    return users.map((user) => {
      const workCount = work.get(user.id) ?? 0;
      return { ...personView(user), canIssuePassword: passwordFor(user.id), workCount, canRemove: canManage && workCount === 0 };
    });
  };
  return {
    department,
    canManage,
    heads: usersWith("DEPT_HEAD").map((user) => ({ ...personView(user), canIssuePassword: passwordFor(user.id) })),
    staff: await listed("staff"),
    jury: await listed("jury"),
  };
}

/**
 * Adds someone to the department's staff list or jury list (ADR 0017): a new platform account with
 * a temporary password, or an existing platform account found by email.
 */
export async function addPerson(
  actor: Actor,
  departmentId: string,
  kind: ListKind,
  input: PersonInput,
): Promise<PersonWithPasswordView> {
  requireDepartmentHead(actor, departmentId);
  await requireDepartment(departmentId);
  const actorRole: Role = "DEPT_HEAD";
  try {
    return await db.$transaction(async (tx) => {
      const account = await findOrCreatePlatformAccount(tx, input, "email");
      if (!account.temporaryPassword) await refuseConflictingRoles(tx, account.userId, departmentId, kind, "email");
      await tx.roleAssignment.create({
        data: { userId: account.userId, role: ROLE_OF[kind], departmentId, grantedById: actor.userId },
      });
      if (account.temporaryPassword) await recordAccountCreated(tx, actor, actorRole, account);
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole,
        action: kind === "staff" ? "department.staff_added" : "department.juror_added",
        entityType: "department",
        entityId: departmentId,
        after: { userId: account.userId },
      });
      const waiting = await tx.user.findUniqueOrThrow({ where: { id: account.userId }, select: { mustChangePassword: true } });
      return { person: asPersonView(account, waiting.mustChangePassword), temporaryPassword: account.temporaryPassword };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw concurrentChange();
    throw error;
  }
}

/**
 * Takes someone off the staff list or jury list while they have no work in the department yet.
 * People with work wait for deactivation and reassignment in package 2.3. Rows are kept: the
 * role is marked revoked.
 */
export async function removePerson(actor: Actor, departmentId: string, kind: ListKind, userId: string): Promise<void> {
  requireDepartmentHead(actor, departmentId);
  await requireDepartment(departmentId);
  const role = await db.roleAssignment.findFirst({
    where: { userId, role: ROLE_OF[kind], departmentId, revokedAt: null },
    select: { id: true },
  });
  if (!role) throw new NotFoundError(`This person isn't on the ${LIST_NAME[kind]}.`);
  const work = (await workCounts(departmentId, kind, [userId])).get(userId) ?? 0;
  if (work > 0) {
    throw new StateError(
      kind === "staff"
        ? "This person still works on awards in this department, so they can't be removed yet."
        : "This person already has applications assigned in this department, so they can't be removed yet.",
    );
  }
  await db.$transaction(async (tx) => {
    await tx.roleAssignment.update({
      where: { id: role.id },
      data: { revokedAt: clock.now(), revokedById: actor.userId },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: "DEPT_HEAD",
      action: kind === "staff" ? "department.staff_removed" : "department.juror_removed",
      entityType: "department",
      entityId: departmentId,
      before: { userId },
    });
  });
}

/**
 * A new temporary password for someone in the department, when theirs is lost or expired: the old
 * one stops working and their sessions end. The head does this for their staff and jury; for a
 * person who heads any department only the leader can (so one head never takes over another's
 * account), and the leader can do nothing else to a department's people (ADR 0020).
 */
export async function issueTemporaryPassword(
  actor: Actor,
  departmentId: string,
  userId: string,
): Promise<PersonWithPasswordView> {
  requireDepartmentViewer(actor, departmentId);
  await requireDepartment(departmentId);
  if (userId === actor.userId) {
    throw new StateError("Change your own password on My profile.");
  }
  const roles = await db.roleAssignment.findMany({
    where: { userId, revokedAt: null },
    select: { role: true, departmentId: true },
  });
  if (!roles.some((r) => r.departmentId === departmentId)) {
    throw new NotFoundError("This person isn't on this department's lists.");
  }
  const headsADepartment = roles.some((r) => r.role === "DEPT_HEAD");
  if (!canIssuePasswordTo(actor, departmentId, { userId, headsADepartment })) {
    throw new ForbiddenError(
      headsADepartment
        ? "Only the leader can issue a new password to a department head."
        : "Only the department's head can issue a new password to its staff and jury.",
    );
  }
  return db.$transaction(async (tx) => {
    const temporaryPassword = await replaceWithTemporaryPassword(tx, userId);
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: isLeader(actor) ? "LEADER" : "DEPT_HEAD",
      action: "user.temporary_password_issued",
      entityType: "user",
      entityId: userId,
      after: { departmentId },
    });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: personSelect });
    return { person: personView(user), temporaryPassword };
  });
}

async function themeView(actor: Actor, departmentId: string): Promise<ThemeView> {
  const department = await db.department.findUnique({
    where: { id: departmentId },
    select: {
      id: true,
      name: true,
      brandKit: { select: { primaryColour: true, accentColour: true, footerText: true } },
      awards: { select: { id: true, name: true, site: { select: { slug: true, status: true } } }, orderBy: { name: "asc" } },
    },
  });
  if (!department) throw new NotFoundError("Department not found.");
  return {
    department: { id: department.id, name: department.name },
    primaryColour: department.brandKit?.primaryColour ?? DEFAULT_THEME.primaryColour,
    accentColour: department.brandKit?.accentColour ?? DEFAULT_THEME.accentColour,
    footerText: department.brandKit?.footerText ?? "",
    canEdit: headsDepartment(actor, departmentId),
    awards: department.awards.map((award) => ({
      id: award.id,
      name: award.name,
      slug: award.site?.slug ?? null,
      live: award.site?.status === "PUBLISHED",
    })),
  };
}

/** The department's theme and its award pages, for its head, or for the leader to look (ADR 0020). */
export async function getTheme(actor: Actor, departmentId: string): Promise<ThemeView> {
  requireDepartmentViewer(actor, departmentId);
  return themeView(actor, departmentId);
}

/**
 * The head chooses the department's theme: the colours and footer of every one of its award pages
 * (ADR 0020). The pages read it live, so a change shows at once; audited with before and after.
 */
export async function updateTheme(actor: Actor, departmentId: string, input: ThemeInput): Promise<ThemeView> {
  requireDepartmentHead(actor, departmentId);
  await requireDepartment(departmentId);
  const before = await db.brandKit.findUnique({
    where: { departmentId },
    select: { primaryColour: true, accentColour: true, footerText: true },
  });
  await db.$transaction(async (tx) => {
    await tx.brandKit.upsert({
      where: { departmentId },
      update: input,
      create: { departmentId, ...input, fontKey: DEFAULT_FONT, socialLinks: [] },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: "DEPT_HEAD",
      action: "department.theme_changed",
      entityType: "department",
      entityId: departmentId,
      ...(before && { before }),
      after: input,
    });
  });
  return themeView(actor, departmentId);
}
