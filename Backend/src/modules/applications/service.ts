import { randomBytes } from "node:crypto";
import { isMemberOf, primaryRole, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { recordAudit } from "../audit/service.js";
import { queueEmail } from "../notifications/service.js";
import { checkAnswer, progressOf, questionsOf, type AnswerValue } from "./answers.js";
import { requireApplicantAccount, requireStarter } from "./access.js";
import {
  applicationSelect,
  enteredOf,
  entriesOf,
  feeOf,
  feeSettled,
  fileCounts,
  latestVersion,
  loadApplication,
  lockApplication,
  missingForSubmit,
  publishedResultsOf,
  requireBeforeDeadline,
  requireDraft,
  requireEditable,
  toRecord,
  versionFor,
  canReplaceProof,
  type ApplicationContext,
} from "./context.js";
import { istDateTime } from "./dates.js";
import { asJson, closeCycleIfDue, identitySnapshot } from "./lock.js";
import type { ChangeCategoryInput, SaveAnswersInput, StartApplicationInput } from "./schemas.js";
import { applicantStatus } from "./status.js";
import type { ApplicantApplicationView, ApplyInfoView, MyApplicationRow } from "./views.js";

/**
 * Applying (spec §5.2, §5.6, §5.20): one application per organisation per edition, blocked at the
 * start (ADR 0011); the demo fee unlocks the form; answers autosave by question key; submit checks
 * everything, the entry limit under a lock on the cycle, and takes the organisation's snapshot.
 * Only applicant accounts apply (ADR 0016), and only the person who started an application edits it.
 */

const ACTIVE_STATUSES = ["DRAFT", "SUBMITTED", "NOT_SUBMITTED"] as const;

function stateError(message: string, reason: string, extra: Record<string, string> = {}): StateError {
  return new StateError(message, { reason, ...extra });
}

// ── Views ──

async function applicantView(applicationId: string): Promise<ApplicantApplicationView> {
  const now = clock.now();
  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId }, select: applicationSelect });
  const version = await versionFor(db, application, now);
  const entered = await enteredOf(db, application.id);
  const open = now < application.cycle.deadlineAt;
  const isDraft = application.status === "DRAFT" && open;
  const canChangeCategory = isDraft && application.payment === null;

  // A draft shows the profile's proof; a submitted application the proof it records (spec §5.20).
  const owner = await db.user.findUniqueOrThrow({
    where: { id: application.createdById },
    select: { linkedinUrl: true, identityFile: { select: { fileName: true, createdAt: true } } },
  });
  const usedIdentity = application.identityFileId
    ? await db.fileAsset.findUnique({ where: { id: application.identityFileId }, select: { fileName: true, createdAt: true } })
    : null;
  const identity = application.status === "DRAFT" ? owner.identityFile : usedIdentity;
  const linkedinUrl = application.status === "DRAFT" ? owner.linkedinUrl : application.linkedinUrl;

  const sections = progressOf(version.definition, entered.answers, fileCounts(entered.files));
  const categories = canChangeCategory
    ? await db.entryCategory.findMany({ where: { cycleId: application.cycleId }, select: { id: true, name: true, feePaise: true }, orderBy: { name: "asc" } })
    : [];

  return {
    id: application.id,
    status: applicantStatus(application, application.cycle.deadlineAt, now, (await publishedResultsOf(db, [application.id])).get(application.id) ?? null),
    award: { name: application.cycle.award.name, slug: application.cycle.award.site?.slug ?? null },
    cycle: {
      id: application.cycle.id,
      label: application.cycle.label,
      opensAt: application.cycle.opensAt.toISOString(),
      deadlineAt: application.cycle.deadlineAt.toISOString(),
      blindJudging: application.cycle.blindJudging,
    },
    organisation: application.organisation,
    category: { id: application.category.id, name: application.category.name },
    categories: categories.map((c) => ({ id: c.id, name: c.name, feePaise: c.feePaise ?? application.cycle.feePaise })),
    canChangeCategory,
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
    profile: {
      identityDocument: identity ? { fileName: identity.fileName, uploadedAt: identity.createdAt.toISOString() } : null,
      linkedinUrl,
    },
    proof: {
      status: application.proofStatus,
      note: application.proofNote,
      checkedAt: application.proofCheckedAt?.toISOString() ?? null,
    },
    progress: {
      answered: sections.reduce((sum, s) => sum + s.answered, 0),
      total: sections.reduce((sum, s) => sum + s.total, 0),
      sections,
    },
    missing: isDraft ? await missingForSubmit(db, application, version, entered) : [],
    entries: await entriesOf(db, application.cycle),
    editable: isDraft && feeSettled(application),
    canReplaceProof: canReplaceProof(application, now),
    submittedAt: application.submittedAt?.toISOString() ?? null,
    lockedAt: application.lockedAt?.toISOString() ?? null,
  };
}

/** The starter's own application, with its cycle's deadline lock applied. */
async function loadOwn(actor: Actor, applicationId: string): Promise<ApplicationContext> {
  requireApplicantAccount(actor);
  const application = await loadApplication(applicationId);
  requireStarter(actor, application);
  return application;
}

// ── Starting ──

/** The start page: the edition, its categories and fees, and where each of the user's organisations stands. */
export async function applyInfo(actor: Actor, cycleId: string): Promise<ApplyInfoView> {
  requireApplicantAccount(actor);
  await closeCycleIfDue(cycleId);
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      label: true,
      status: true,
      opensAt: true,
      deadlineAt: true,
      feePaise: true,
      blindJudging: true,
      maxEntries: true,
      award: { select: { name: true, description: true, site: { select: { slug: true } }, department: { select: { name: true } } } },
      categories: { select: { id: true, name: true, feePaise: true }, orderBy: { name: "asc" } },
    },
  });
  // Drafts are never public, so they are "not found" here too.
  if (!cycle || cycle.status === "DRAFT") throw new NotFoundError("Award not found.");
  const now = clock.now();
  const organisations = await db.organisation.findMany({
    where: { id: { in: [...actor.organisationIds] } },
    select: {
      id: true,
      legalName: true,
      applications: {
        where: { cycleId, status: { in: [...ACTIVE_STATUSES] } },
        select: { id: true, status: true, createdById: true, releaseReason: true },
      },
    },
    orderBy: { legalName: "asc" },
  });
  return {
    award: {
      name: cycle.award.name,
      description: cycle.award.description,
      slug: cycle.award.site?.slug ?? null,
      department: cycle.award.department.name,
    },
    cycle: {
      id: cycle.id,
      label: cycle.label,
      opensAt: cycle.opensAt.toISOString(),
      deadlineAt: cycle.deadlineAt.toISOString(),
      open: now >= cycle.opensAt && now < cycle.deadlineAt,
      blindJudging: cycle.blindJudging,
    },
    categories: cycle.categories.map((c) => ({ id: c.id, name: c.name, feePaise: c.feePaise ?? cycle.feePaise })),
    entries: await entriesOf(db, cycle),
    organisations: organisations.map((organisation) => {
      const existing = organisation.applications[0];
      const mine = existing?.createdById === actor.userId;
      return {
        id: organisation.id,
        legalName: organisation.legalName,
        existing: existing
          ? { status: applicantStatus(existing, cycle.deadlineAt, now), mine, applicationId: mine ? existing.id : null }
          : null,
      };
    }),
  };
}

/** "Your organisation already has an application for this award (Pending)." Status only, never who (spec §5.2). */
async function alreadyStarted(cycleId: string, organisationId: string, deadlineAt: Date): Promise<StateError> {
  const existing = await db.application.findFirst({
    where: { cycleId, organisationId, status: { in: [...ACTIVE_STATUSES] } },
    select: { status: true, releaseReason: true },
  });
  const label = existing ? applicantStatus(existing, deadlineAt, clock.now()).label : "Pending";
  return stateError(`Your organisation already has an application for this award (${label}).`, "ALREADY_STARTED", { status: label });
}

/**
 * Starts an application for one of the user's organisations, in a category of an open edition.
 * Once one is started, nobody else in the organisation can start another for the edition (ADR 0011):
 * the service checks, and the database's partial unique index decides when two start at once.
 */
export async function startApplication(actor: Actor, cycleId: string, input: StartApplicationInput): Promise<ApplicantApplicationView> {
  requireApplicantAccount(actor);
  if (actor.organisationIds.length === 0) {
    throw stateError("Add your organisation first, on My organisation.", "NO_ORGANISATION");
  }
  const organisationId = input.organisationId ?? (actor.organisationIds.length === 1 ? actor.organisationIds[0] : undefined);
  if (!organisationId) {
    throw new ValidationError("Choose the organisation you are applying for.", [
      { path: "organisationId", message: "Choose the organisation you are applying for." },
    ]);
  }
  if (!isMemberOf(actor, organisationId)) throw new NotFoundError("Organisation not found.");

  await closeCycleIfDue(cycleId);
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: { id: true, status: true, opensAt: true, deadlineAt: true },
  });
  if (!cycle || cycle.status === "DRAFT") throw new NotFoundError("Award not found.");
  const now = clock.now();
  if (now < cycle.opensAt) {
    throw stateError(`Applications for this award open on ${istDateTime(cycle.opensAt)}.`, "NOT_OPEN_YET");
  }
  if (now >= cycle.deadlineAt) throw stateError("Applications for this award are closed.", "DEADLINE_PASSED");
  const category = await db.entryCategory.findFirst({ where: { id: input.categoryId, cycleId }, select: { id: true } });
  if (!category) {
    throw new ValidationError("Pick one of this award's categories.", [
      { path: "categoryId", message: "Pick one of this award's categories." },
    ]);
  }
  if (await db.application.findFirst({ where: { cycleId, organisationId, status: { in: [...ACTIVE_STATUSES] } }, select: { id: true } })) {
    throw await alreadyStarted(cycleId, organisationId, cycle.deadlineAt);
  }
  const version = await latestVersion(db, cycleId);
  let applicationId: string;
  try {
    applicationId = await db.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: { cycleId, organisationId, createdById: actor.userId, categoryId: category.id, formVersionId: version.id },
        select: { id: true },
      });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: primaryRole(actor),
        action: "application.started",
        entityType: "application",
        entityId: created.id,
        cycleId,
        after: { organisationId, categoryId: category.id },
      });
      return created.id;
    });
  } catch (error) {
    // Two colleagues pressing Start at the same moment: the index lets one through.
    if (isUniqueViolation(error)) throw await alreadyStarted(cycleId, organisationId, cycle.deadlineAt);
    throw error;
  }
  return applicantView(applicationId);
}

// ── Reading ──

/**
 * My applications: every application of the user's organisations. The user's own can be opened;
 * a colleague's shows its status only, and only while it is active (spec §5.2).
 */
export async function listMyApplications(actor: Actor): Promise<MyApplicationRow[]> {
  requireApplicantAccount(actor);
  const where = {
    organisationId: { in: [...actor.organisationIds] },
    OR: [{ createdById: actor.userId }, { status: { in: [...ACTIVE_STATUSES] } }],
  };
  const cycleIds = await db.application.findMany({ where, select: { cycleId: true }, distinct: ["cycleId"] });
  for (const { cycleId } of cycleIds) await closeCycleIfDue(cycleId);
  const rows = await db.application.findMany({
    where,
    select: {
      id: true,
      status: true,
      createdById: true,
      releaseReason: true,
      proofStatus: true,
      category: { select: { name: true } },
      organisation: { select: { id: true, legalName: true } },
      cycle: { select: { id: true, label: true, deadlineAt: true, award: { select: { name: true, site: { select: { slug: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const now = clock.now();
  const results = await publishedResultsOf(db, rows.map((r) => r.id));
  return rows.map((row) => {
    const mine = row.createdById === actor.userId;
    return {
      id: row.id,
      mine,
      award: { name: row.cycle.award.name, slug: row.cycle.award.site?.slug ?? null },
      cycle: { id: row.cycle.id, label: row.cycle.label, deadlineAt: row.cycle.deadlineAt.toISOString() },
      organisation: row.organisation,
      status: applicantStatus(row, row.cycle.deadlineAt, now, results.get(row.id) ?? null),
      category: mine ? row.category.name : null,
      proof: mine && row.status !== "DRAFT" ? row.proofStatus : null,
    };
  });
}

export async function getMyApplication(actor: Actor, applicationId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  return applicantView(application.id);
}

// ── Changing a draft ──

/** A wrong category can be changed until the fee is paid; then it is fixed (the fee depends on it). */
export async function changeCategory(actor: Actor, applicationId: string, input: ChangeCategoryInput): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireBeforeDeadline(application.cycle, clock.now());
  requireDraft(application);
  if (application.payment) {
    throw stateError("The fee is paid, so the category is fixed. If it is wrong, ask the award's staff.", "FEE_PAID");
  }
  const category = await db.entryCategory.findFirst({ where: { id: input.categoryId, cycleId: application.cycleId }, select: { id: true } });
  if (!category) {
    throw new ValidationError("Pick one of this award's categories.", [{ path: "categoryId", message: "Pick one of this award's categories." }]);
  }
  if (category.id !== application.categoryId) {
    await db.$transaction(async (tx) => {
      const status = await lockApplication(tx, application.id);
      if (status !== "DRAFT") requireDraft({ status });
      if (await tx.payment.findUnique({ where: { applicationId: application.id }, select: { id: true } })) {
        throw stateError("The fee is paid, so the category is fixed. If it is wrong, ask the award's staff.", "FEE_PAID");
      }
      await tx.application.update({ where: { id: application.id }, data: { categoryId: category.id } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: primaryRole(actor),
        action: "application.category_changed",
        entityType: "application",
        entityId: application.id,
        cycleId: application.cycleId,
        before: { categoryId: application.categoryId },
        after: { categoryId: category.id },
      });
    });
  }
  return applicantView(application.id);
}

/** The demo payment (spec §5.6): records the fee with a made-up reference and opens the form. */
export async function payFee(actor: Actor, applicationId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireBeforeDeadline(application.cycle, clock.now());
  requireDraft(application);
  const amountPaise = feeOf(application);
  if (amountPaise === 0) throw stateError("This award is free: there is nothing to pay.", "FREE");
  if (application.payment) throw stateError("The fee is already paid.", "ALREADY_PAID");
  const reference = `DEMO-${randomBytes(5).toString("hex").toUpperCase()}`;
  try {
    await db.$transaction(async (tx) => {
      const status = await lockApplication(tx, application.id);
      if (status !== "DRAFT") requireDraft({ status });
      await tx.payment.create({ data: { applicationId: application.id, amountPaise, status: "PAID", reference } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: primaryRole(actor),
        action: "application.fee_paid",
        entityType: "application",
        entityId: application.id,
        cycleId: application.cycleId,
        after: { amountPaise, reference },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw stateError("The fee is already paid.", "ALREADY_PAID");
    throw error;
  }
  return applicantView(application.id);
}

export interface SaveAnswersResult {
  application: ApplicantApplicationView;
  /** Answers that weren't saved, each with the message to show next to its question. */
  problems: { questionKey: string; message: string }[];
}

/**
 * Autosave (spec §5.6): saves the answers that changed. Each one is checked against its question,
 * and a wrong one is reported without stopping the others, so nothing typed is lost. A draft
 * follows the latest published questions until it is submitted.
 */
export async function saveAnswers(actor: Actor, applicationId: string, input: SaveAnswersInput): Promise<SaveAnswersResult> {
  const application = await loadOwn(actor, applicationId);
  requireEditable(application, clock.now());
  const version = await latestVersion(db, application.cycleId);
  const questions = new Map(questionsOf(version.definition).map((q) => [q.key, q]));
  const problems: SaveAnswersResult["problems"] = [];
  const toSave: { questionKey: string; value: AnswerValue }[] = [];
  const toClear: string[] = [];
  for (const [questionKey, raw] of Object.entries(input.answers)) {
    const question = questions.get(questionKey);
    if (!question) {
      problems.push({ questionKey, message: "This question isn't in the form any more. Reload the page." });
      continue;
    }
    const check = checkAnswer(question, raw);
    if (!check.ok) problems.push({ questionKey, message: check.message });
    else if (check.value === null) toClear.push(questionKey);
    else toSave.push({ questionKey, value: check.value });
  }
  await db.$transaction(async (tx) => {
    const status = await lockApplication(tx, application.id);
    if (status !== "DRAFT") requireDraft({ status });
    requireEditable(application, clock.now());
    for (const { questionKey, value } of toSave) {
      await tx.answer.upsert({
        where: { applicationId_questionKey: { applicationId: application.id, questionKey } },
        create: { applicationId: application.id, questionKey, value },
        update: { value },
      });
    }
    if (toClear.length > 0) {
      await tx.answer.deleteMany({ where: { applicationId: application.id, questionKey: { in: toClear } } });
    }
    // Touches the application too, so its "last saved" time moves, and it follows the latest questions.
    await tx.application.update({ where: { id: application.id }, data: { formVersionId: version.id } });
  });
  return { application: await applicantView(application.id), problems };
}

// ── Submitting ──

/**
 * Submits (spec §5.6, §5.20): everything required must be there; the entry limit is checked and
 * the application submitted in one transaction that locks the cycle, so two applicants can't
 * both take the last place. Records the questions version (R4), the organisation's snapshot and
 * the profile proof it uses, and queues the confirmation emails.
 */
export async function submitApplication(actor: Actor, applicationId: string): Promise<ApplicantApplicationView> {
  const application = await loadOwn(actor, applicationId);
  requireBeforeDeadline(application.cycle, clock.now());
  requireDraft(application);
  await db.$transaction(async (tx) => {
    // The cycle first, then the application: the same order as the deadline lock.
    const cycles = await tx.$queryRaw<{ maxEntries: number | null }[]>`
      SELECT "maxEntries" FROM cycles WHERE id = ${application.cycleId}::uuid FOR UPDATE`;
    const status = await lockApplication(tx, application.id);
    if (status !== "DRAFT") requireDraft({ status });
    const now = clock.now();
    requireBeforeDeadline(application.cycle, now);

    // The category and the payment as they are now, with plain reads (GAPS G-K28).
    const { categoryId } = await tx.application.findUniqueOrThrow({ where: { id: application.id }, select: { categoryId: true } });
    const category = await tx.entryCategory.findUniqueOrThrow({ where: { id: categoryId }, select: { id: true, name: true, feePaise: true } });
    const payment = await tx.payment.findUnique({
      where: { applicationId: application.id },
      select: { amountPaise: true, reference: true, paidAt: true },
    });
    const current = { ...application, categoryId, category, payment };
    const version = await latestVersion(tx, application.cycleId);
    const entered = await enteredOf(tx, application.id);
    const missing = await missingForSubmit(tx, current, version, entered);
    if (missing.length > 0) throw new ValidationError("Your application isn't ready to submit yet.", missing);

    const limit = cycles[0]?.maxEntries ?? null;
    if (limit !== null) {
      const submitted = await tx.application.count({ where: { cycleId: application.cycleId, status: "SUBMITTED" } });
      if (submitted >= limit) throw stateError("This award has reached its entry limit.", "ENTRY_LIMIT");
    }

    const profile = await tx.user.findUniqueOrThrow({
      where: { id: actor.userId },
      select: { name: true, email: true, identityFileId: true, linkedinUrl: true },
    });
    const snapshot = await identitySnapshot(tx, application.organisationId, now);
    await tx.application.update({
      where: { id: application.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        formVersionId: version.id,
        identitySnapshot: asJson(snapshot),
        identityFileId: profile.identityFileId,
        linkedinUrl: profile.linkedinUrl,
        proofStatus: "PENDING",
      },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: "application.submitted",
      entityType: "application",
      entityId: application.id,
      cycleId: application.cycleId,
      after: { formVersion: version.version, categoryId: current.categoryId },
    });
    const payload = {
      awardName: application.cycle.award.name,
      cycleLabel: application.cycle.label,
      organisationName: snapshot.legalName,
      categoryName: current.category.name,
      submittedAt: istDateTime(now),
    };
    // The applicant, and the organisation's official email (spec §5.2, §5.13).
    await queueEmail(tx, { to: profile.email, template: "application-submitted", payload: { ...payload, name: profile.name } });
    if (snapshot.officialEmail.toLowerCase() !== profile.email.toLowerCase()) {
      await queueEmail(tx, { to: snapshot.officialEmail, template: "application-submitted", payload: { ...payload, name: null } });
    }
  });
  return applicantView(application.id);
}

export { applicantView };
