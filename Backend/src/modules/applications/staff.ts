import type { ApplicationStatus, Prisma, ProofStatus } from "../../generated/prisma/client.js";
import { isStaffOfAward, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError } from "../../lib/errors.js";
import { recordAudit } from "../audit/service.js";
import { queueEmail } from "../notifications/service.js";
import { requireAwardStaff, requireOrganiserReader } from "./access.js";
import { applicationSelect, enteredOf, entriesOf, feeOf, loadApplication, lockApplication, toRecord, versionFor } from "./context.js";
import { istDateTime } from "./dates.js";
import { closeCycleIfDue, identitySnapshot, type IdentitySnapshot } from "./lock.js";
import type { ListFilters, ProofCheckInput, ReleaseInput } from "./schemas.js";
import { STAFF_STATUS_LABELS } from "./status.js";
import type { StaffApplicationListView, StaffApplicationView } from "./views.js";

/**
 * The award's side of applying (spec §5.20, §5.2): the applications list, each application with
 * its proof documents, the proof check (Verified, or Rejected with a reason) and releasing an
 * application with a reason. Staff of the award act; its department's head and the leader read.
 */

const STATUSES: ApplicationStatus[] = ["DRAFT", "SUBMITTED", "NOT_SUBMITTED", "RELEASED", "WITHDRAWN"];
const PROOFS: ProofStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

export async function listCycleApplications(actor: Actor, cycleId: string, filters: ListFilters): Promise<StaffApplicationListView> {
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      label: true,
      deadlineAt: true,
      maxEntries: true,
      feePaise: true,
      award: { select: { id: true, name: true, departmentId: true } },
      categories: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      rounds: { select: { id: true }, orderBy: { number: "asc" }, take: 1 },
    },
  });
  if (!cycle) throw new NotFoundError("Award edition not found.");
  requireOrganiserReader(actor, cycle.award);
  await closeCycleIfDue(cycleId);

  const where: Prisma.ApplicationWhereInput = {
    cycleId,
    ...(filters.status && { status: filters.status }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    // The proof is checked once submitted, so its filter looks at submitted applications.
    ...(filters.proof && { proofStatus: filters.proof, status: "SUBMITTED" }),
  };
  const rows = await db.application.findMany({
    where,
    select: {
      id: true,
      status: true,
      proofStatus: true,
      createdAt: true,
      submittedAt: true,
      organisation: { select: { id: true, legalName: true } },
      createdBy: { select: { name: true, email: true } },
      category: { select: { id: true, name: true, feePaise: true } },
      payment: { select: { id: true } },
    },
    orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  const byStatus = await db.application.groupBy({ by: ["status"], where: { cycleId }, _count: { _all: true } });
  const byProof = await db.application.groupBy({ by: ["proofStatus"], where: { cycleId, status: "SUBMITTED" }, _count: { _all: true } });

  return {
    cycle: {
      id: cycle.id,
      label: cycle.label,
      deadlineAt: cycle.deadlineAt.toISOString(),
      award: { id: cycle.award.id, name: cycle.award.name },
      roundId: cycle.rounds[0]?.id ?? null,
    },
    entries: await entriesOf(db, cycle),
    counts: {
      byStatus: Object.fromEntries(STATUSES.map((s) => [s, byStatus.find((r) => r.status === s)?._count._all ?? 0])) as Record<ApplicationStatus, number>,
      byProof: Object.fromEntries(PROOFS.map((p) => [p, byProof.find((r) => r.proofStatus === p)?._count._all ?? 0])) as Record<ProofStatus, number>,
    },
    categories: cycle.categories,
    applications: rows.map((row) => ({
      id: row.id,
      organisation: row.organisation,
      startedBy: row.createdBy,
      category: { id: row.category.id, name: row.category.name },
      status: row.status,
      statusLabel: STAFF_STATUS_LABELS[row.status],
      proofStatus: row.proofStatus,
      feeUnpaid: (row.category.feePaise ?? cycle.feePaise) > 0 && row.payment === null,
      createdAt: row.createdAt.toISOString(),
      submittedAt: row.submittedAt?.toISOString() ?? null,
    })),
  };
}

function isSnapshot(value: unknown): value is IdentitySnapshot {
  return typeof value === "object" && value !== null && "legalName" in value && "pan" in value;
}

async function staffView(actor: Actor, applicationId: string): Promise<StaffApplicationView> {
  const now = clock.now();
  const application = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    select: {
      ...applicationSelect,
      createdBy: { select: { name: true, email: true, identityFileId: true, linkedinUrl: true } },
      proofCheckedBy: { select: { name: true } },
    },
  });
  const version = await versionFor(db, application, now);
  const entered = await enteredOf(db, application.id);
  // A draft has no snapshot yet: the organisation's record as it is now.
  const organisation = isSnapshot(application.identitySnapshot)
    ? { ...application.identitySnapshot, id: application.organisationId, fromSnapshot: true }
    : { ...(await identitySnapshot(db, application.organisationId, now)), id: application.organisationId, fromSnapshot: false };
  const draft = application.status === "DRAFT";
  const identityFileId = draft ? application.createdBy.identityFileId : application.identityFileId;
  const identity = identityFileId
    ? await db.fileAsset.findUnique({ where: { id: identityFileId }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } })
    : null;
  const staff = isStaffOfAward(actor, application.cycle.award);
  return {
    id: application.id,
    status: application.status,
    statusLabel: STAFF_STATUS_LABELS[application.status],
    award: { id: application.cycle.award.id, name: application.cycle.award.name },
    cycle: {
      id: application.cycle.id,
      label: application.cycle.label,
      deadlineAt: application.cycle.deadlineAt.toISOString(),
      blindJudging: application.cycle.blindJudging,
    },
    organisation,
    startedBy: { name: application.createdBy.name, email: application.createdBy.email },
    category: { id: application.category.id, name: application.category.name },
    fee: {
      amountPaise: feeOf(application),
      paid: application.payment !== null,
      paidAt: application.payment?.paidAt.toISOString() ?? null,
      reference: application.payment?.reference ?? null,
    },
    form: { version: version.version, sections: version.definition.sections },
    answers: toRecord(entered.answers),
    files: toRecord(entered.files),
    employmentProof: entered.employmentProof,
    identityDocument: identity
      ? { id: identity.id, fileName: identity.fileName, mimeType: identity.mimeType, sizeBytes: identity.sizeBytes, uploadedAt: identity.createdAt.toISOString() }
      : null,
    linkedinUrl: draft ? application.createdBy.linkedinUrl : application.linkedinUrl,
    proof: {
      status: application.proofStatus,
      note: application.proofNote,
      checkedAt: application.proofCheckedAt?.toISOString() ?? null,
      checkedBy: application.proofCheckedBy?.name ?? null,
    },
    submittedAt: application.submittedAt?.toISOString() ?? null,
    lockedAt: application.lockedAt?.toISOString() ?? null,
    release:
      application.releasedAt && application.releaseReason
        ? { releasedAt: application.releasedAt.toISOString(), reason: application.releaseReason }
        : null,
    canCheckProof: staff && application.status === "SUBMITTED",
    canRelease: staff && ["DRAFT", "SUBMITTED", "NOT_SUBMITTED"].includes(application.status),
  };
}

/** One application as the award's staff see it, with its proof documents (spec §5.20). */
export async function reviewApplication(actor: Actor, applicationId: string): Promise<StaffApplicationView> {
  const application = await loadApplication(applicationId);
  requireOrganiserReader(actor, application.cycle.award);
  return staffView(actor, application.id);
}

/**
 * The proof check (spec §5.20): staff mark a submitted application's proof Verified, or Rejected
 * with a reason that names the document. Verified fixes the identity document and LinkedIn link it
 * uses. A rejection emails the applicant, who can fix it until the deadline. Audited.
 */
export async function checkProof(actor: Actor, applicationId: string, input: ProofCheckInput): Promise<StaffApplicationView> {
  const application = await loadApplication(applicationId);
  const actorRole = requireAwardStaff(actor, application.cycle.award);
  if (application.status !== "SUBMITTED") {
    throw new StateError("Only a submitted application's proof is checked.", { reason: "NOT_SUBMITTED" });
  }
  const now = clock.now();
  await db.$transaction(async (tx) => {
    const status = await lockApplication(tx, application.id);
    if (status !== "SUBMITTED") throw new StateError("Only a submitted application's proof is checked.", { reason: "NOT_SUBMITTED" });
    // Once judging has started for it, or its round has gone for approval, the check is fixed (Step 1.4).
    const judging = await tx.evaluation.count({ where: { applicationId: application.id, status: { not: "REVOKED" } } });
    const sent = await tx.round.count({ where: { cycleId: application.cycleId, status: { notIn: ["NOT_STARTED", "JUDGING"] } } });
    if (judging > 0 || sent > 0) {
      throw new StateError("Judging has started for this application, so its proof check can't change.", { reason: "JUDGING_STARTED" });
    }
    const before = await tx.application.findUniqueOrThrow({ where: { id: application.id }, select: { proofStatus: true, proofNote: true } });
    const note = input.note && input.note.length > 0 ? input.note : null;
    await tx.application.update({
      where: { id: application.id },
      data: { proofStatus: input.decision, proofNote: note, proofCheckedById: actor.userId, proofCheckedAt: now },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "application.proof_checked",
      entityType: "application",
      entityId: application.id,
      cycleId: application.cycleId,
      before: { proofStatus: before.proofStatus, note: before.proofNote },
      after: { proofStatus: input.decision, note },
    });
    if (input.decision === "REJECTED") {
      const applicant = await tx.user.findUniqueOrThrow({ where: { id: application.createdById }, select: { name: true, email: true } });
      // To the applicant only: it is about their own documents (spec §5.13).
      await queueEmail(tx, {
        to: applicant.email,
        template: "proof-rejected",
        payload: {
          name: applicant.name,
          awardName: application.cycle.award.name,
          cycleLabel: application.cycle.label,
          reason: input.note,
          deadline: istDateTime(application.cycle.deadlineAt),
          canFix: now < application.cycle.deadlineAt,
        },
      });
    }
  });
  return staffView(actor, application.id);
}

/**
 * Releases an application that is from the wrong person, fake or abandoned (spec §5.2, ADR 0011):
 * kept, with the reason, and the organisation can start a new one. One transaction with its audit
 * event. Not once judging has started (Step 1.4).
 */
export async function releaseApplication(actor: Actor, applicationId: string, input: ReleaseInput): Promise<StaffApplicationView> {
  const application = await loadApplication(applicationId);
  const actorRole = requireAwardStaff(actor, application.cycle.award);
  const releasable: ApplicationStatus[] = ["DRAFT", "SUBMITTED", "NOT_SUBMITTED"];
  if (!releasable.includes(application.status)) {
    throw new StateError("This application is already closed.", { reason: "NOT_ACTIVE" });
  }
  await db.$transaction(async (tx) => {
    const status = await lockApplication(tx, application.id);
    if (!releasable.includes(status)) throw new StateError("This application is already closed.", { reason: "NOT_ACTIVE" });
    if ((await tx.evaluation.count({ where: { applicationId: application.id } })) > 0) {
      throw new StateError("Judging has started for this application, so it can't be released.", { reason: "JUDGING_STARTED" });
    }
    await tx.application.update({
      where: { id: application.id },
      data: { status: "RELEASED", releasedAt: clock.now(), releasedById: actor.userId, releaseReason: input.reason },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "application.released",
      entityType: "application",
      entityId: application.id,
      cycleId: application.cycleId,
      before: { status },
      after: { status: "RELEASED" },
      reason: input.reason,
    });
  });
  return staffView(actor, application.id);
}
