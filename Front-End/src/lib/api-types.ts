/**
 * The shapes the API returns (docs/API.md is the contract; GAPS G-B10). The frontend only shows
 * them: every rule and permission is decided by the API.
 */

export type Area = "leader" | "department" | "staff" | "jury" | "applicant";
export type Role = "LEADER" | "DEPT_HEAD" | "DEPT_STAFF" | "AWARD_STAFF" | "JURY";

export interface RoleView {
  role: Role;
  department: { id: string; name: string } | null;
  award: { id: string; name: string } | null;
  cycle: { id: string; label: string; awardName: string } | null;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  passwordChangedAt: string | null;
  linkedinUrl: string | null;
  identityDocument: { fileName: string; uploadedAt: string } | null;
  roles: RoleView[];
  organisations: { id: string; legalName: string }[];
  areas: Area[];
  home: Area;
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
