import type { ApplicationStatus, Prisma } from "../../generated/prisma/client.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, StateError } from "../../lib/errors.js";
import type { FormDefinition } from "../forms/schemas.js";
import { readDefinition } from "../forms/service.js";
import { missingAnswers, type AnswerValue } from "./answers.js";
import { closeCycleIfDue } from "./lock.js";
import type { EmploymentProofView, FileView, Missing } from "./views.js";

/**
 * Loading an application with everything its rules need, shared by the applicant, staff and file
 * services. Reads take a client so the same code runs inside a transaction that holds the locks.
 */

export const applicationSelect = {
  id: true,
  status: true,
  cycleId: true,
  organisationId: true,
  createdById: true,
  categoryId: true,
  formVersionId: true,
  proofStatus: true,
  proofNote: true,
  proofCheckedAt: true,
  releasedAt: true,
  releaseReason: true,
  submittedAt: true,
  lockedAt: true,
  identityFileId: true,
  linkedinUrl: true,
  identitySnapshot: true,
  createdAt: true,
  cycle: {
    select: {
      id: true,
      label: true,
      status: true,
      opensAt: true,
      deadlineAt: true,
      feePaise: true,
      blindJudging: true,
      maxEntries: true,
      award: { select: { id: true, name: true, departmentId: true, site: { select: { slug: true } } } },
    },
  },
  category: { select: { id: true, name: true, feePaise: true } },
  organisation: { select: { id: true, legalName: true } },
  payment: { select: { amountPaise: true, reference: true, paidAt: true } },
} satisfies Prisma.ApplicationSelect;

export type ApplicationContext = Prisma.ApplicationGetPayload<{ select: typeof applicationSelect }>;

/** Loads an application after its cycle's deadline lock has run, so its status is current. */
export async function loadApplication(applicationId: string): Promise<ApplicationContext> {
  const found = await db.application.findUnique({ where: { id: applicationId }, select: { cycleId: true } });
  if (!found) throw new NotFoundError("Application not found.");
  await closeCycleIfDue(found.cycleId);
  return db.application.findUniqueOrThrow({ where: { id: applicationId }, select: applicationSelect });
}

/** The entry fee (spec §5.6): the category's own fee if it has one, otherwise the cycle's. */
export function feeOf(application: { category: { feePaise: number | null }; cycle: { feePaise: number } }): number {
  return application.category.feePaise ?? application.cycle.feePaise;
}

export function feeSettled(application: ApplicationContext): boolean {
  return feeOf(application) === 0 || application.payment !== null;
}

export function requireBeforeDeadline(cycle: { deadlineAt: Date }, now: Date): void {
  if (now >= cycle.deadlineAt) {
    throw new StateError("The deadline has passed, so this application can't change any more.", { reason: "DEADLINE_PASSED" });
  }
}

export function requireDraft(application: { status: ApplicationStatus }): void {
  if (application.status === "DRAFT") return;
  throw new StateError(
    application.status === "SUBMITTED"
      ? "This application is submitted, so its answers can't change."
      : "This application is closed, so it can't change.",
    { reason: "NOT_A_DRAFT" },
  );
}

/** Answers and files change only on a draft, before the deadline, once the fee is settled (spec §5.6). */
export function requireEditable(application: ApplicationContext, now: Date): void {
  requireBeforeDeadline(application.cycle, now);
  requireDraft(application);
  if (!feeSettled(application)) {
    throw new StateError("Pay the entry fee first: the form opens once it is paid.", { reason: "FEE_UNPAID" });
  }
}

/** A new employment proof: while the application is editable, or after staff rejected it, until the deadline. */
export function canReplaceProof(application: ApplicationContext, now: Date): boolean {
  if (now >= application.cycle.deadlineAt) return false;
  if (application.status === "DRAFT") return feeSettled(application);
  return application.status === "SUBMITTED" && application.proofStatus === "REJECTED";
}

/**
 * Locks the application's row for the rest of the transaction and returns its current status, so
 * two tabs (or a save and a submit) can't change it at the same moment.
 */
export async function lockApplication(tx: Tx, applicationId: string): Promise<ApplicationStatus> {
  const rows = await tx.$queryRaw<{ status: ApplicationStatus }[]>`
    SELECT status FROM applications WHERE id = ${applicationId}::uuid FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new NotFoundError("Application not found.");
  return row.status;
}

export interface VersionRef {
  id: string;
  version: number;
  definition: FormDefinition;
}

/** The latest published version of a cycle's questions. A published cycle always has one. */
export async function latestVersion(client: Tx, cycleId: string): Promise<VersionRef> {
  const row = await client.formVersion.findFirst({
    where: { cycleId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, schema: true },
  });
  if (!row) throw new StateError("This award has no published questions yet.");
  return { id: row.id, version: row.version, definition: readDefinition(row.schema) };
}

/**
 * The questions an application uses (rule R4): the latest version while it is a draft before the
 * deadline, so it follows the staff's changes; its own pinned version from submitting on.
 */
export async function versionFor(client: Tx, application: ApplicationContext, now: Date): Promise<VersionRef> {
  const followsLatest = application.status === "DRAFT" && now < application.cycle.deadlineAt;
  if (followsLatest || !application.formVersionId) return latestVersion(client, application.cycleId);
  const row = await client.formVersion.findUniqueOrThrow({
    where: { id: application.formVersionId },
    select: { id: true, version: true, schema: true },
  });
  return { id: row.id, version: row.version, definition: readDefinition(row.schema) };
}

export async function entriesOf(client: Tx, cycle: { id: string; maxEntries: number | null }) {
  const submitted = await client.application.count({ where: { cycleId: cycle.id, status: "SUBMITTED" } });
  return { submitted, limit: cycle.maxEntries };
}

function fileView(file: { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: Date }): FileView {
  return { id: file.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, uploadedAt: file.createdAt.toISOString() };
}

const fileSelect = { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } as const;

/** What the applicant has entered: answers by question key, files by question, the current employment proof. */
export interface Entered {
  answers: Map<string, AnswerValue>;
  files: Map<string, FileView[]>;
  employmentProof: EmploymentProofView | null;
}

export async function enteredOf(client: Tx, applicationId: string): Promise<Entered> {
  // One query at a time: inside a transaction, queries share one connection (GAPS G-K28).
  const answers = await client.answer.findMany({ where: { applicationId }, select: { questionKey: true, value: true } });
  const files = await client.fileAsset.findMany({
    where: { applicationId, kind: "EVIDENCE", status: "READY", removedAt: null },
    select: { ...fileSelect, questionKey: true },
    orderBy: { createdAt: "asc" },
  });
  const proof = await currentEmploymentProof(client, applicationId);
  const byQuestion = new Map<string, FileView[]>();
  for (const file of files) {
    if (!file.questionKey) continue;
    byQuestion.set(file.questionKey, [...(byQuestion.get(file.questionKey) ?? []), fileView(file)]);
  }
  return {
    answers: new Map(answers.map((a) => [a.questionKey, a.value as AnswerValue])),
    files: byQuestion,
    employmentProof: proof,
  };
}

/** The application's current employment proof: the latest one uploaded and not replaced. */
export async function currentEmploymentProof(client: Tx, applicationId: string): Promise<EmploymentProofView | null> {
  const proof = await client.fileAsset.findFirst({
    where: { applicationId, kind: "EMPLOYMENT_PROOF", status: "READY", removedAt: null },
    select: { ...fileSelect, documentDate: true },
    orderBy: { createdAt: "desc" },
  });
  if (!proof) return null;
  return { ...fileView(proof), documentDate: proof.documentDate ? proof.documentDate.toISOString().slice(0, 10) : "" };
}

export function fileCounts(files: Map<string, FileView[]>): Map<string, number> {
  return new Map([...files].map(([key, list]) => [key, list.length]));
}

/**
 * Everything that still stops submitting (spec §5.6, §5.20): the fee, every required answer and
 * file, the employment proof, and the identity document and LinkedIn link on the profile.
 */
export async function missingForSubmit(
  client: Tx,
  application: ApplicationContext,
  version: VersionRef,
  entered: Entered,
): Promise<Missing[]> {
  const missing: Missing[] = [];
  if (!feeSettled(application)) missing.push({ path: "fee", message: "Pay the entry fee." });
  for (const item of missingAnswers(version.definition, entered.answers, fileCounts(entered.files))) {
    missing.push({ path: `answers.${item.questionKey}`, message: item.message });
  }
  if (!entered.employmentProof) {
    missing.push({ path: "employmentProof", message: "Upload a recent proof of employment at your organisation." });
  }
  const profile = await client.user.findUniqueOrThrow({
    where: { id: application.createdById },
    select: { identityFileId: true, linkedinUrl: true },
  });
  if (!profile.identityFileId) {
    missing.push({ path: "profile.identityDocument", message: "Add a photo identity document on My profile." });
  }
  if (!profile.linkedinUrl) {
    missing.push({ path: "profile.linkedinUrl", message: "Add your LinkedIn profile link on My profile." });
  }
  return missing;
}

export function toRecord<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map);
}
