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

/** A person on a department's page, with what the API lets the viewer do (ADR 0020). */
export interface HeadPerson extends Person {
  canIssuePassword: boolean;
}

export interface ListedPerson extends HeadPerson {
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
  /** The viewer keeps the staff and jury lists: the department's head, never the leader. */
  canManage: boolean;
  heads: HeadPerson[];
  staff: ListedPerson[];
  jury: ListedPerson[];
}

/** A department's theme on its award pages, chosen by its head (ADR 0020). */
export interface DepartmentTheme {
  department: { id: string; name: string };
  primaryColour: string;
  accentColour: string;
  footerText: string;
  canEdit: boolean;
  awards: { id: string; name: string; slug: string | null; live: boolean }[];
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

// ── Award setup (Step 1.2) ──

export type CycleStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "RESULTS_PUBLISHED";
/** Worked out by the API from the status and the clock. */
export type CycleState = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";

export interface CycleSummary {
  id: string;
  label: string;
  status: CycleStatus;
  state: CycleState;
  opensAt: string;
  deadlineAt: string;
}

export interface AwardDetail {
  id: string;
  name: string;
  description: string;
  department: { id: string; name: string };
  domain: { id: string; name: string };
  siteSlug: string | null;
  cycles: CycleSummary[];
}

export interface ResultLabel {
  label: string;
  advances: boolean;
}

export interface CycleSetup {
  id: string;
  label: string;
  status: CycleStatus;
  state: CycleState;
  opensAt: string;
  deadlineAt: string;
  publishedAt: string | null;
  feePaise: number;
  blindJudging: boolean;
  maxEntries: number | null;
  award: { id: string; name: string; department: { id: string; name: string }; siteSlug: string | null };
  categories: { id: string; name: string; feePaise: number | null }[];
  round: {
    id: string;
    number: number;
    type: "DOCUMENT_REVIEW" | "ON_SITE";
    juryMin: number;
    juryMax: number;
    resultLabels: ResultLabel[];
    juryAvailable: number;
  };
  publishIssues: string[];
  settingsFixed: boolean;
}

export type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "SINGLE_CHOICE" | "YES_NO" | "FILE_UPLOAD";
export type FileType = "pdf" | "jpg" | "png" | "docx" | "xlsx";

/** A question as the API stores it; `key` is absent only for a new one not yet saved. */
export interface Question {
  key?: string;
  type: QuestionType;
  label: string;
  help: string;
  required: boolean;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  options?: { key?: string; label: string }[];
  maxFiles?: number;
  fileTypes?: FileType[];
}

export interface FormSection {
  key?: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface FormVersionSummary {
  version: number;
  changeSummary: string;
  publishedAt: string;
  publishedBy: string | null;
}

export interface FormBuilder {
  cycleId: string;
  draft: { sections: FormSection[] };
  versions: FormVersionSummary[];
  latestVersion: number | null;
  hasUnpublishedChanges: boolean;
  publishedKeys: string[];
  locked: boolean;
}

export type IndicatorType = "SCORE" | "YES_NO";

export interface Indicator {
  key?: string;
  label: string;
  type: IndicatorType;
  weight: number;
  questionKey: string;
}

export interface ScoringSection {
  key?: string;
  title: string;
  weight: number;
  indicators: Indicator[];
}

export interface ScoringSheet {
  roundId: string;
  sections: ScoringSection[];
  locked: boolean;
  totals: { sections: number; bySection: Record<string, number> };
  issues: string[];
  questions: { key: string; label: string; type: string; published: boolean }[];
}

/** An award as visitors see it: on Open awards and on its page. */
export interface PublicAward {
  slug: string;
  name: string;
  description: string;
  domain: string;
  department: { name: string; externalOrganiser: boolean; colours: { primary: string; accent: string }; footerText: string };
  cycle: {
    /** Where Apply starts an application. */
    id: string;
    label: string;
    opensAt: string;
    deadlineAt: string;
    state: CycleState;
    blindJudging: boolean;
    categories: { name: string; feePaise: number }[];
    fee: { fromPaise: number; toPaise: number };
    entries: { submitted: number; limit: number | null };
  };
}

// ── Applying (Step 1.3) ──

/** What an applicant sees of an application's state (spec §4). */
export interface ApplicantStatus {
  code: "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "NOT_SUBMITTED" | "WITHDRAWN" | "CLOSED";
  label: string;
  message: string;
}

export type ProofStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type ApplicationStatus = "DRAFT" | "SUBMITTED" | "WITHDRAWN" | "NOT_SUBMITTED" | "RELEASED";

/** An answer as stored: text, a number, a choice's option key, or yes/no. */
export type AnswerValue = string | number | boolean;

export interface FileView {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EmploymentProof extends FileView {
  documentDate: string;
}

/** Something that stops submitting, with where it belongs ("answers.<key>", "fee", "employmentProof", "profile.…"). */
export interface Missing {
  path: string;
  message: string;
}

export interface Application {
  id: string;
  status: ApplicantStatus;
  award: { name: string; slug: string | null };
  cycle: { id: string; label: string; opensAt: string; deadlineAt: string; blindJudging: boolean };
  organisation: { id: string; legalName: string };
  category: { id: string; name: string };
  categories: { id: string; name: string; feePaise: number }[];
  canChangeCategory: boolean;
  fee: { amountPaise: number; paid: boolean; paidAt: string | null; reference: string | null };
  form: { version: number; sections: FormSection[] };
  answers: Record<string, AnswerValue>;
  files: Record<string, FileView[]>;
  employmentProof: EmploymentProof | null;
  profile: { identityDocument: { fileName: string; uploadedAt: string } | null; linkedinUrl: string | null };
  proof: { status: ProofStatus; note: string | null; checkedAt: string | null };
  progress: { answered: number; total: number; sections: { key: string; answered: number; total: number }[] };
  missing: Missing[];
  entries: { submitted: number; limit: number | null };
  editable: boolean;
  canReplaceProof: boolean;
  submittedAt: string | null;
  lockedAt: string | null;
}

export interface SaveAnswersResult {
  application: Application;
  problems: { questionKey: string; message: string }[];
}

export interface MyApplicationRow {
  id: string;
  mine: boolean;
  award: { name: string; slug: string | null };
  cycle: { id: string; label: string; deadlineAt: string };
  organisation: { id: string; legalName: string };
  status: ApplicantStatus;
  category: string | null;
  proof: ProofStatus | null;
}

export interface ApplyInfo {
  award: { name: string; description: string; slug: string | null; department: string };
  cycle: { id: string; label: string; opensAt: string; deadlineAt: string; open: boolean; blindJudging: boolean };
  categories: { id: string; name: string; feePaise: number }[];
  entries: { submitted: number; limit: number | null };
  organisations: {
    id: string;
    legalName: string;
    existing: { status: ApplicantStatus; mine: boolean; applicationId: string | null } | null;
  }[];
}

export interface UploadStart {
  fileId: string;
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string };
}

export interface DownloadLink {
  url: string;
  fileName: string;
  contentType: string;
  expiresAt: string;
}

export interface StaffApplicationRow {
  id: string;
  organisation: { id: string; legalName: string };
  startedBy: { name: string; email: string };
  category: { id: string; name: string };
  status: ApplicationStatus;
  statusLabel: string;
  proofStatus: ProofStatus;
  feeUnpaid: boolean;
  createdAt: string;
  submittedAt: string | null;
}

export interface StaffApplicationList {
  cycle: { id: string; label: string; deadlineAt: string; award: { id: string; name: string } };
  entries: { submitted: number; limit: number | null };
  counts: { byStatus: Record<ApplicationStatus, number>; byProof: Record<ProofStatus, number> };
  categories: { id: string; name: string }[];
  applications: StaffApplicationRow[];
}

export interface OrganisationSnapshot {
  id: string;
  fromSnapshot: boolean;
  legalName: string;
  pan: string;
  gstin: string | null;
  addressLine: string;
  city: string;
  state: { code: string; name: string };
  pincode: string;
  officialEmail: string;
  phone: string;
  organisationType: string | null;
  cin: string | null;
  website: string | null;
}

export interface StaffApplication {
  id: string;
  status: ApplicationStatus;
  statusLabel: string;
  award: { id: string; name: string };
  cycle: { id: string; label: string; deadlineAt: string; blindJudging: boolean };
  organisation: OrganisationSnapshot;
  startedBy: { name: string; email: string };
  category: { id: string; name: string };
  fee: { amountPaise: number; paid: boolean; paidAt: string | null; reference: string | null };
  form: { version: number; sections: FormSection[] };
  answers: Record<string, AnswerValue>;
  files: Record<string, FileView[]>;
  employmentProof: EmploymentProof | null;
  identityDocument: FileView | null;
  linkedinUrl: string | null;
  proof: { status: ProofStatus; note: string | null; checkedAt: string | null; checkedBy: string | null };
  submittedAt: string | null;
  lockedAt: string | null;
  release: { releasedAt: string; reason: string } | null;
  canCheckProof: boolean;
  canRelease: boolean;
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
