import { randomUUID } from "node:crypto";
import { primaryRole, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { cleanFileName } from "../../lib/storage/file-names.js";
import { storage } from "../../lib/storage/index.js";
import { contentMatches, detectType, readHead } from "../../lib/storage/sniff.js";
import { recordAudit } from "../audit/service.js";
import type { FileType } from "../forms/schemas.js";
import { canReadAsOrganiser, isStarter, requireApplicantAccount, requireStarter } from "./access.js";
import { canReplaceProof, latestVersion, loadApplication, lockApplication, requireEditable } from "./context.js";
import { proofDateWindow, readableDate } from "./dates.js";
import { CONTENT_TYPES, type StartEvidenceUploadInput, type StartProofUploadInput } from "./schemas.js";
import { applicantView } from "./service.js";
import { uploadView, type ApplicantApplicationView, type DownloadView, type UploadView } from "./views.js";

/**
 * Files of an application (spec §5.6, §5.20): evidence answering a file question, and the recent
 * proof of employment. The browser uploads straight to storage through a short-lived link the API
 * issues after its checks (GAPS G-B03); the API then checks the bytes really are the declared
 * type before the file counts. Downloads work the same way: access first, then a short-lived link.
 */

const UPLOAD_LINK_SECONDS = 10 * 60;
const DOWNLOAD_LINK_SECONDS = 2 * 60;

const TYPE_NAMES: Record<FileType, string> = { pdf: "PDF", jpg: "JPG", png: "PNG", docx: "Word", xlsx: "Excel" };

function fieldIssue(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

async function loadOwn(actor: Actor, applicationId: string) {
  requireApplicantAccount(actor);
  const application = await loadApplication(applicationId);
  requireStarter(actor, application);
  return application;
}

/** The file question, from the latest questions (a draft follows them). */
async function fileQuestion(cycleId: string, questionKey: string) {
  const version = await latestVersion(db, cycleId);
  for (const section of version.definition.sections) {
    const question = section.questions.find((q) => q.key === questionKey);
    if (question) {
      if (question.type !== "FILE_UPLOAD") throw fieldIssue("questionKey", "This question doesn't take files.");
      return { ...question, maxFiles: question.maxFiles ?? 1, fileTypes: question.fileTypes ?? [] };
    }
  }
  throw fieldIssue("questionKey", "This question isn't in the form any more. Reload the page.");
}

async function countFiles(applicationId: string, questionKey: string): Promise<number> {
  return db.fileAsset.count({ where: { applicationId, questionKey, kind: "EVIDENCE", status: "READY", removedAt: null } });
}

/** Checks that what arrived in storage is the file that was declared, by its content. */
async function checkUploaded(file: { storageKey: string; mimeType: string }): Promise<number> {
  const stored = await storage.statObject(file.storageKey);
  if (!stored) throw new StateError("The file hasn't been uploaded yet.");
  if (stored.sizeBytes === 0) throw fieldIssue("fileId", "The file is empty.");
  const actual = detectType(await readHead(await storage.getObject(file.storageKey)));
  if (!contentMatches(file.mimeType, actual)) {
    throw fieldIssue("fileId", "The file's content doesn't match its type. Upload the real document.");
  }
  return stored.sizeBytes;
}

// ── Evidence ──

/** Step 1 of adding a file to a question: checks the question's rules, then issues the upload link. */
export async function startEvidenceUpload(actor: Actor, applicationId: string, input: StartEvidenceUploadInput): Promise<UploadView> {
  const application = await loadOwn(actor, applicationId);
  requireEditable(application, clock.now());
  const question = await fileQuestion(application.cycleId, input.questionKey);
  const allowed = question.fileTypes.map((type) => CONTENT_TYPES[type]);
  if (!allowed.includes(input.contentType)) {
    throw fieldIssue("contentType", `This question takes ${question.fileTypes.map((t) => TYPE_NAMES[t]).join(", ")} files.`);
  }
  if ((await countFiles(application.id, question.key)) >= question.maxFiles) {
    throw new StateError(`This question takes at most ${question.maxFiles} ${question.maxFiles === 1 ? "file" : "files"}; remove one first.`, {
      reason: "TOO_MANY_FILES",
    });
  }
  const fileId = randomUUID();
  const storageKey = `applications/${application.id}/${fileId}`;
  await db.fileAsset.create({
    data: {
      id: fileId,
      kind: "EVIDENCE",
      applicationId: application.id,
      questionKey: question.key,
      uploadedById: actor.userId,
      storageKey,
      fileName: cleanFileName(input.fileName),
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
    },
  });
  const link = await storage.createUploadLink(storageKey, {
    contentType: input.contentType,
    maxBytes: input.sizeBytes,
    expiresInSeconds: UPLOAD_LINK_SECONDS,
  });
  return uploadView(fileId, link);
}

/** Step 2: once uploaded and checked, the file answers its question. */
export async function confirmEvidenceUpload(actor: Actor, applicationId: string, fileId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireEditable(application, clock.now());
  const file = await db.fileAsset.findFirst({
    where: { id: fileId, applicationId: application.id, kind: "EVIDENCE", removedAt: null },
  });
  if (!file?.questionKey) throw new NotFoundError("File not found.");
  if (file.status === "READY") return applicantView(application.id);
  const question = await fileQuestion(application.cycleId, file.questionKey);
  const sizeBytes = await checkUploaded(file);
  await db.$transaction(async (tx) => {
    await lockApplication(tx, application.id);
    requireEditable(application, clock.now());
    const count = await tx.fileAsset.count({
      where: { applicationId: application.id, questionKey: question.key, kind: "EVIDENCE", status: "READY", removedAt: null },
    });
    if (count >= question.maxFiles) {
      throw new StateError(`This question takes at most ${question.maxFiles} ${question.maxFiles === 1 ? "file" : "files"}; remove one first.`, {
        reason: "TOO_MANY_FILES",
      });
    }
    await tx.fileAsset.update({ where: { id: file.id }, data: { status: "READY", sizeBytes } });
  });
  return applicantView(application.id);
}

/** Takes a file off a draft's answer. It is kept, marked removed: nothing an applicant produced is deleted. */
export async function removeEvidenceFile(actor: Actor, applicationId: string, fileId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireEditable(application, clock.now());
  const file = await db.fileAsset.findFirst({
    where: { id: fileId, applicationId: application.id, kind: "EVIDENCE", removedAt: null },
    select: { id: true },
  });
  if (!file) throw new NotFoundError("File not found.");
  await db.$transaction(async (tx) => {
    await lockApplication(tx, application.id);
    requireEditable(application, clock.now());
    await tx.fileAsset.update({ where: { id: file.id }, data: { removedAt: clock.now() } });
  });
  return applicantView(application.id);
}

// ── Employment proof ──

function requireProofReplaceable(application: Awaited<ReturnType<typeof loadOwn>>, now: Date): void {
  if (canReplaceProof(application, now)) return;
  if (now >= application.cycle.deadlineAt) {
    throw new StateError("The deadline has passed, so this application can't change any more.", { reason: "DEADLINE_PASSED" });
  }
  if (application.status === "DRAFT") {
    throw new StateError("Pay the entry fee first: the form opens once it is paid.", { reason: "FEE_UNPAID" });
  }
  throw new StateError("The proof can be changed only if the award's staff reject it.", { reason: "PROOF_FIXED" });
}

/**
 * Step 1 of adding the recent proof of employment (spec §5.20, ADR 0012): the date on the document
 * must be within the 3 months before today, and not in the future; consent is recorded.
 */
export async function startEmploymentProofUpload(actor: Actor, applicationId: string, input: StartProofUploadInput): Promise<UploadView> {
  const application = await loadOwn(actor, applicationId);
  const now = clock.now();
  requireProofReplaceable(application, now);
  const { earliest, latest } = proofDateWindow(now);
  if (input.documentDate > latest) throw fieldIssue("documentDate", "The date on the document can't be in the future.");
  if (input.documentDate < earliest) {
    throw fieldIssue(
      "documentDate",
      `The document must be dated within the last 3 months: on or after ${readableDate(earliest)}. Upload a more recent one.`,
    );
  }
  const fileId = randomUUID();
  const storageKey = `applications/${application.id}/${fileId}`;
  await db.fileAsset.create({
    data: {
      id: fileId,
      kind: "EMPLOYMENT_PROOF",
      applicationId: application.id,
      uploadedById: actor.userId,
      documentDate: new Date(`${input.documentDate}T00:00:00Z`),
      consentAt: now,
      storageKey,
      fileName: cleanFileName(input.fileName),
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
    },
  });
  const link = await storage.createUploadLink(storageKey, {
    contentType: input.contentType,
    maxBytes: input.sizeBytes,
    expiresInSeconds: UPLOAD_LINK_SECONDS,
  });
  return uploadView(fileId, link);
}

/**
 * Step 2: the uploaded proof becomes the application's current one; an earlier one is kept,
 * marked replaced. After a rejection, a new proof puts the check back to pending (spec §5.20).
 */
export async function setEmploymentProof(actor: Actor, applicationId: string, fileId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireProofReplaceable(application, clock.now());
  const file = await db.fileAsset.findFirst({
    where: { id: fileId, applicationId: application.id, kind: "EMPLOYMENT_PROOF", removedAt: null },
  });
  if (!file) throw new NotFoundError("File not found.");
  if (file.status === "READY") return applicantView(application.id);
  const sizeBytes = await checkUploaded(file);
  await db.$transaction(async (tx) => {
    await lockApplication(tx, application.id);
    const now = clock.now();
    const current = await tx.application.findUniqueOrThrow({
      where: { id: application.id },
      select: { status: true, proofStatus: true },
    });
    requireProofReplaceable({ ...application, ...current }, now);
    const replaced = await tx.fileAsset.updateMany({
      where: { applicationId: application.id, kind: "EMPLOYMENT_PROOF", status: "READY", removedAt: null },
      data: { removedAt: now },
    });
    await tx.fileAsset.update({ where: { id: file.id }, data: { status: "READY", sizeBytes } });
    const reopened = current.status === "SUBMITTED" && current.proofStatus === "REJECTED";
    if (reopened) {
      await tx.application.update({
        where: { id: application.id },
        data: { proofStatus: "PENDING", proofCheckedById: null, proofCheckedAt: null, proofNote: null },
      });
    }
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: replaced.count > 0 ? "application.employment_proof_replaced" : "application.employment_proof_added",
      entityType: "application",
      entityId: application.id,
      cycleId: application.cycleId,
      after: { fileId: file.id, documentDate: file.documentDate?.toISOString().slice(0, 10) ?? null, proofReopened: reopened },
    });
  });
  return applicantView(application.id);
}

// ── Downloads ──

/**
 * A short-lived link to read a file, after the access check (GAPS G-B03). The applicant who started
 * the application reads its files; the award's staff, its department's head and the leader read
 * an application's files and the identity document it uses. Nobody else, and no jury (Step 1.4
 * adds evidence for jury in non-blind awards, never proof documents).
 */
export async function fileDownloadLink(actor: Actor, fileId: string): Promise<DownloadView> {
  const file = await db.fileAsset.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      kind: true,
      status: true,
      removedAt: true,
      purgedAt: true,
      ownerUserId: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      application: { select: { createdById: true, cycle: { select: { award: { select: { id: true, departmentId: true } } } } } },
    },
  });
  const notFound = new NotFoundError("File not found.");
  if (!file || file.status !== "READY" || file.purgedAt) throw notFound;

  let allowed = false;
  if (file.kind === "IDENTITY_PROOF") {
    allowed = file.ownerUserId === actor.userId;
    if (!allowed) {
      // Through an application that uses it, in an award the person may read.
      const using = await db.application.findMany({
        where: { identityFileId: file.id },
        select: { cycle: { select: { award: { select: { id: true, departmentId: true } } } } },
      });
      allowed = using.some((a) => canReadAsOrganiser(actor, a.cycle.award));
    }
  } else if (file.application && !file.removedAt) {
    allowed = isStarter(actor, file.application) || canReadAsOrganiser(actor, file.application.cycle.award);
  }
  if (!allowed) throw notFound;

  const url = await storage.createDownloadLink(file.storageKey, {
    expiresInSeconds: DOWNLOAD_LINK_SECONDS,
    fileName: file.fileName,
    contentType: file.mimeType,
  });
  return {
    url,
    fileName: file.fileName,
    contentType: file.mimeType,
    expiresAt: new Date(clock.now().getTime() + DOWNLOAD_LINK_SECONDS * 1000).toISOString(),
  };
}
