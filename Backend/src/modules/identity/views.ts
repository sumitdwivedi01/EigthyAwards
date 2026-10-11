import type { AccountType, Prisma, Role } from "../../generated/prisma/client.js";
import type { UploadLink } from "../../lib/storage/index.js";

/** What the API loads to describe the signed-in user to themselves. */
export const meInclude = {
  identityFile: { select: { fileName: true, createdAt: true } },
  roles: {
    where: { revokedAt: null },
    select: {
      role: true,
      department: { select: { id: true, name: true } },
      award: { select: { id: true, name: true } },
      cycle: { select: { id: true, label: true, award: { select: { name: true } } } },
    },
  },
  memberships: {
    select: { organisation: { select: { id: true, legalName: true } } },
    orderBy: { joinedAt: "asc" },
  },
} satisfies Prisma.UserInclude;

export type MeRecord = Prisma.UserGetPayload<{ include: typeof meInclude }>;

/** The parts of the app a user may open. The frontend only shows these; it decides nothing. */
export type Area = "leader" | "department" | "staff" | "jury" | "applicant";

export interface RoleView {
  role: Role;
  department: { id: string; name: string } | null;
  award: { id: string; name: string } | null;
  cycle: { id: string; label: string; awardName: string } | null;
}

export interface MeView {
  id: string;
  email: string;
  accountType: AccountType;
  name: string;
  phone: string | null;
  passwordChangedAt: string | null;
  linkedinUrl: string | null;
  identityDocument: { fileName: string; uploadedAt: string } | null;
  roles: RoleView[];
  organisations: { id: string; legalName: string }[];
  areas: Area[];
  /**
   * Where the user lands after logging in: null for a platform account with no role yet (a juror
   * before staff add them to a cycle's pool).
   */
  home: Area | null;
}

/** An applicant account only applies; a platform account gets an area for each kind of role (ADR 0016). */
function areasOf(accountType: AccountType, roles: readonly { role: Role }[]): Area[] {
  if (accountType === "APPLICANT") return ["applicant"];
  const has = (...wanted: Role[]) => roles.some((r) => wanted.includes(r.role));
  const areas: Area[] = [];
  if (has("LEADER")) areas.push("leader");
  if (has("DEPT_HEAD")) areas.push("department");
  if (has("DEPT_STAFF", "AWARD_STAFF")) areas.push("staff");
  if (has("JURY")) areas.push("jury");
  return areas;
}

/** The signed-in user's own view. Never includes the password hash or the session version. */
export function meView(user: MeRecord): MeView {
  const areas = areasOf(user.accountType, user.roles);
  return {
    id: user.id,
    email: user.email,
    accountType: user.accountType,
    name: user.name,
    phone: user.phone,
    passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
    linkedinUrl: user.linkedinUrl,
    identityDocument: user.identityFile
      ? { fileName: user.identityFile.fileName, uploadedAt: user.identityFile.createdAt.toISOString() }
      : null,
    roles: user.roles.map((r) => ({
      role: r.role,
      department: r.department,
      award: r.award,
      cycle: r.cycle ? { id: r.cycle.id, label: r.cycle.label, awardName: r.cycle.award.name } : null,
    })),
    organisations: user.memberships.map((m) => m.organisation),
    areas,
    home: areas[0] ?? null,
  };
}

export interface IdentityUploadView {
  fileId: string;
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string };
}

export function identityUploadView(fileId: string, link: UploadLink): IdentityUploadView {
  return {
    fileId,
    upload: { url: link.url, method: link.method, headers: link.headers, expiresAt: link.expiresAt.toISOString() },
  };
}
