/**
 * The shapes the API returns (docs/API.md is the contract; GAPS G-B10). The frontend only shows
 * them: every rule and permission is decided by the API.
 */

export type Area = "leader" | "department" | "staff" | "jury" | "applicant";
/** An applicant account applies; a platform account (leader, head, staff, jury) holds roles. */
export type AccountType = "APPLICANT" | "PLATFORM";
export type Role = "LEADER" | "DEPT_HEAD" | "DEPT_STAFF" | "AWARD_STAFF" | "JURY";

export interface RoleView {
  role: Role;
  department: { id: string; name: string } | null;
  award: { id: string; name: string } | null;
}

export interface Me {
  id: string;
  email: string;
  accountType: AccountType;
  name: string;
  phone: string | null;
  passwordChangedAt: string | null;
  /** Signed in with a temporary password: they must set their own before anything else. */
  mustChangePassword: boolean;
  linkedinUrl: string | null;
  identityDocument: { fileName: string; uploadedAt: string } | null;
  roles: RoleView[];
  organisations: { id: string; legalName: string }[];
  areas: Area[];
  /** Null for a platform account with no role yet (a juror before joining an award's jury). */
  home: Area | null;
}

/** A person on a department's lists. */
export interface Person {
  id: string;
  name: string;
  email: string;
  /** Still on a temporary password: they haven't logged in and chosen their own yet. */
  waitingForFirstLogin: boolean;
}

export interface ListedPerson extends Person {
  /** Staff: awards they work on here. Jury: applications assigned to them here. */
  workCount: number;
  canRemove: boolean;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  externalOrganiser: boolean;
  colours: { primary: string; accent: string } | null;
  heads: Person[];
  counts: { staff: number; jury: number; awards: number };
}

export interface People {
  department: { id: string; name: string; externalOrganiser: boolean };
  heads: Person[];
  staff: ListedPerson[];
  jury: ListedPerson[];
}

/** temporaryPassword is set only when one was made now; it is shown once and never again. */
export interface PersonWithPassword {
  person: Person;
  temporaryPassword: string | null;
}

export interface CreatedDepartment {
  department: DepartmentSummary;
  head: Person;
  temporaryPassword: string | null;
}

export interface Organisation {
  id: string;
  legalName: string;
  pan: string;
  gstin: string | null;
  addressLine: string;
  city: string;
  state: { code: string; name: string };
  pincode: string;
  officialEmail: string;
  phone: string;
  organisationType: { id: string; name: string } | null;
  cin: string | null;
  website: string | null;
}

export interface OrganisationResult {
  organisation: Organisation;
  warnings: string[];
}

export interface ListItem {
  id: string;
  name: string;
}

export interface IndianState {
  code: string;
  name: string;
}

export interface IdentityUpload {
  fileId: string;
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string };
}
