import type { Prisma } from "../../generated/prisma/client.js";

/** A person as the department's lists show them. Never the password hash or session data. */
export interface PersonView {
  id: string;
  name: string;
  email: string;
  /** Still on their temporary password: they haven't logged in and set their own yet. */
  waitingForFirstLogin: boolean;
}

export interface ListedPersonView extends PersonView {
  /** Staff: awards they work on in this department. Jury: applications assigned to them here. */
  workCount: number;
  /** Removing someone is allowed while they have no work in the department (ADR 0017). */
  canRemove: boolean;
}

export interface DepartmentSummaryView {
  id: string;
  name: string;
  externalOrganiser: boolean;
  colours: { primary: string; accent: string } | null;
  heads: PersonView[];
  counts: { staff: number; jury: number; awards: number };
}

export interface PeopleView {
  department: { id: string; name: string; externalOrganiser: boolean };
  heads: PersonView[];
  staff: ListedPersonView[];
  jury: ListedPersonView[];
}

/**
 * The answer to creating an account or issuing a new password. `temporaryPassword` is set only
 * when one was made now: the screen shows it once; it is never stored in plain text or logged.
 */
export interface PersonWithPasswordView {
  person: PersonView;
  temporaryPassword: string | null;
}

export interface CreatedDepartmentView {
  department: DepartmentSummaryView;
  head: PersonView;
  temporaryPassword: string | null;
}

export const personSelect = {
  id: true,
  name: true,
  email: true,
  mustChangePassword: true,
} satisfies Prisma.UserSelect;

type PersonRecord = Prisma.UserGetPayload<{ select: typeof personSelect }>;

export function personView(user: PersonRecord): PersonView {
  return { id: user.id, name: user.name, email: user.email, waitingForFirstLogin: user.mustChangePassword };
}

export const departmentSummaryInclude = {
  brandKit: { select: { primaryColour: true, accentColour: true } },
  roles: { where: { revokedAt: null }, select: { role: true, user: { select: personSelect } } },
  _count: { select: { awards: true } },
} satisfies Prisma.DepartmentInclude;

type DepartmentSummaryRecord = Prisma.DepartmentGetPayload<{ include: typeof departmentSummaryInclude }>;

export function departmentSummaryView(department: DepartmentSummaryRecord): DepartmentSummaryView {
  const count = (role: string) => department.roles.filter((r) => r.role === role).length;
  return {
    id: department.id,
    name: department.name,
    externalOrganiser: department.externalOrganiser,
    colours: department.brandKit
      ? { primary: department.brandKit.primaryColour, accent: department.brandKit.accentColour }
      : null,
    heads: department.roles.filter((r) => r.role === "DEPT_HEAD").map((r) => personView(r.user)),
    counts: { staff: count("DEPT_STAFF"), jury: count("JURY"), awards: department._count.awards },
  };
}
