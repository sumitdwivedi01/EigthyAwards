import type { ApplicationStatus, ProofStatus } from "../../generated/prisma/client.js";
import type { UploadLink } from "../../lib/storage/index.js";
import type { FormDefinition } from "../forms/schemas.js";
import type { AnswerValue, SectionProgress } from "./answers.js";
import type { IdentitySnapshot } from "./lock.js";
import type { ApplicantStatus } from "./status.js";

/**
 * What each person sees of an application (spec §3, §11). Views are built here, never returned as
 * database rows. A colleague sees the status only; the applicant who started it sees everything
 * they entered; the award's staff (and, to read, its department's head and the leader) see that
 * plus the organisation's identity and the proof documents. Jury views arrive with Step 1.4.
 */

export interface FileView {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EmploymentProofView extends FileView {
  /** The date printed on the document, "YYYY-MM-DD". */
  documentDate: string;
}

/** A problem that stops submitting, with where it belongs: "answers.<key>", "fee", "employmentProof", "profile.…". */
export interface Missing {
  path: string;
  message: string;
}

export interface ApplicantApplicationView {
  id: string;
  status: ApplicantStatus;
  award: { name: string; slug: string | null };
  cycle: { id: string; label: string; opensAt: string; deadlineAt: string; blindJudging: boolean };
  organisation: { id: string; legalName: string };
  category: { id: string; name: string };
  /** Shown to change the category, which is possible until the fee is paid. */
  categories: { id: string; name: string; feePaise: number }[];
  canChangeCategory: boolean;
  fee: { amountPaise: number; paid: boolean; paidAt: string | null; reference: string | null };
  /** The questions this application uses: the latest version while it is a draft, then its own (R4). */
  form: { version: number; sections: FormDefinition["sections"] };
  answers: Record<string, AnswerValue>;
  files: Record<string, FileView[]>;
  employmentProof: EmploymentProofView | null;
  /** The identity document and LinkedIn link from the profile (spec §5.20). */
  profile: { identityDocument: { fileName: string; uploadedAt: string } | null; linkedinUrl: string | null };
  proof: { status: ProofStatus; note: string | null; checkedAt: string | null };
  progress: { answered: number; total: number; sections: SectionProgress[] };
  /** What still stops submitting; empty when it can be submitted, and after submitting. */
  missing: Missing[];
  /** The live counter (spec §5.20). */
  entries: { submitted: number; limit: number | null };
  /** Answers and files can change: a draft, before the deadline, with the fee settled. */
  editable: boolean;
  /** A new employment proof can be added: while editable, or after a rejection until the deadline. */
  canReplaceProof: boolean;
  submittedAt: string | null;
  lockedAt: string | null;
}

/** A row of My applications. A colleague's row has the status only (spec §5.2): never the starter. */
export interface MyApplicationRow {
  id: string;
  /** The person asking started it, so they can open and edit it. */
  mine: boolean;
  award: { name: string; slug: string | null };
  cycle: { id: string; label: string; deadlineAt: string };
  organisation: { id: string; legalName: string };
  status: ApplicantStatus;
  /** Only on the applicant's own rows. */
  category: string | null;
  proof: ProofStatus | null;
}

/** Everything the start page needs: the categories with their fees and each organisation's position. */
export interface ApplyInfoView {
  award: { name: string; description: string; slug: string | null; department: string };
  cycle: { id: string; label: string; opensAt: string; deadlineAt: string; open: boolean; blindJudging: boolean };
  categories: { id: string; name: string; feePaise: number }[];
  entries: { submitted: number; limit: number | null };
  organisations: {
    id: string;
    legalName: string;
    /** Its active application in this edition, if any: status only, unless the asker started it. */
    existing: { status: ApplicantStatus; mine: boolean; applicationId: string | null } | null;
  }[];
}

export interface UploadView {
  fileId: string;
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string };
}

export function uploadView(fileId: string, link: UploadLink): UploadView {
  return {
    fileId,
    upload: { url: link.url, method: link.method, headers: link.headers, expiresAt: link.expiresAt.toISOString() },
  };
}

// ── Staff ──

export interface StaffApplicationRow {
  id: string;
  organisation: { id: string; legalName: string };
  startedBy: { name: string; email: string };
  category: { id: string; name: string };
  status: ApplicationStatus;
  statusLabel: string;
  /** Meaningful once submitted. */
  proofStatus: ProofStatus;
  /** The entry fee is due and not paid yet. */
  feeUnpaid: boolean;
  createdAt: string;
  submittedAt: string | null;
}

export interface StaffApplicationListView {
  cycle: { id: string; label: string; deadlineAt: string; award: { id: string; name: string } };
  entries: { submitted: number; limit: number | null };
  counts: {
    byStatus: Record<ApplicationStatus, number>;
    /** Of the submitted applications. */
    byProof: Record<ProofStatus, number>;
  };
  categories: { id: string; name: string }[];
  applications: StaffApplicationRow[];
}

export interface StaffApplicationView {
  id: string;
  status: ApplicationStatus;
  statusLabel: string;
  award: { id: string; name: string };
  cycle: { id: string; label: string; deadlineAt: string; blindJudging: boolean };
  /** The snapshot once submitted (frozen at the deadline), the live record before. */
  organisation: IdentitySnapshot & { id: string; fromSnapshot: boolean };
  startedBy: { name: string; email: string };
  category: { id: string; name: string };
  fee: { amountPaise: number; paid: boolean; paidAt: string | null; reference: string | null };
  form: { version: number; sections: FormDefinition["sections"] };
  answers: Record<string, AnswerValue>;
  files: Record<string, FileView[]>;
  employmentProof: EmploymentProofView | null;
  /** The identity document and LinkedIn link this application uses (spec §5.20). */
  identityDocument: FileView | null;
  linkedinUrl: string | null;
  proof: { status: ProofStatus; note: string | null; checkedAt: string | null; checkedBy: string | null };
  submittedAt: string | null;
  lockedAt: string | null;
  release: { releasedAt: string; reason: string } | null;
  /** Staff of the award check a submitted application's proof; heads and the leader only look. */
  canCheckProof: boolean;
  canRelease: boolean;
}

export interface DownloadView {
  url: string;
  fileName: string;
  contentType: string;
  expiresAt: string;
}
