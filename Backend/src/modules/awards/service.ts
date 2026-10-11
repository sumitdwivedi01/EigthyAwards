import type { Prisma } from "../../generated/prisma/client.js";
import { isStaffOfDepartment, requireStaffOfAward, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { ForbiddenError, NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { normalizeName } from "../../lib/normalize.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { recordAudit } from "../audit/service.js";
import { latestPublishedForm } from "../forms/service.js";
import { roundSheetIssues } from "../scoring/service.js";
import { createSiteForAward } from "../sites/service.js";
import { requireCycleStaff, requireRoundStaff, type CycleContext } from "./context.js";
import {
  DEFAULT_RESULT_LABELS,
  type CategoryInput,
  type CreateAwardInput,
  type CreateCycleInput,
  type UpdateCategoryInput,
  type UpdateCycleInput,
  type UpdateRoundInput,
} from "./schemas.js";
import {
  awardInclude,
  awardView,
  cycleSetupInclude,
  cycleState,
  type AwardView,
  type CycleSetupRecord,
  type CycleSetupView,
  type ResultLabelView,
} from "./views.js";

/**
 * Awards and their editions (cycles), set up on screen by staff (spec §5.3): "an award is data,
 * not code". Every difference between awards (dates, fee, blind judging, categories, entry
 * limit, jury per application, result labels, questions, scoring) is a setting here; no code
 * names an award. Publishing checks that the edition is complete (the publish gate) and fixes
 * the fee, blind judging, dates and categories.
 */

function fieldIssue(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

type Scalar = string | number | boolean | null;

/** An audit event holds JSON, so fields that weren't sent are left out rather than undefined. */
function definedOnly(values: Record<string, Scalar | undefined>): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, Scalar] => entry[1] !== undefined));
}

function readLabels(json: Prisma.JsonValue): ResultLabelView[] {
  return Array.isArray(json)
    ? json.flatMap((item) =>
        item && typeof item === "object" && !Array.isArray(item) && typeof item["label"] === "string"
          ? [{ label: item["label"], advances: item["advances"] === true }]
          : [],
      )
    : [];
}

/** People on the department's jury list: the most jurors an application can get (ADR 0013, 0017). */
async function juryAvailable(departmentId: string): Promise<number> {
  return db.roleAssignment.count({ where: { departmentId, role: "JURY", revokedAt: null } });
}

/** Staff of a department create its awards (spec §3: "only staff create awards"). */
export async function createAward(actor: Actor, input: CreateAwardInput): Promise<AwardView> {
  if (!isStaffOfDepartment(actor, input.departmentId)) {
    throw new ForbiddenError("Only the department's staff create its awards.");
  }
  const domain = await db.awardDomain.findUnique({ where: { id: input.domainId }, select: { retiredAt: true } });
  if (!domain || domain.retiredAt) throw fieldIssue("domainId", "Pick a subject area from the list.");
  const name = normalizeName(input.name);
  try {
    const awardId = await db.$transaction(async (tx) => {
      const created = await tx.award.create({
        data: { departmentId: input.departmentId, name, domainId: input.domainId, description: input.description, createdById: actor.userId },
        select: { id: true },
      });
      // The creator runs the award (spec A4).
      await tx.roleAssignment.create({
        data: { userId: actor.userId, role: "AWARD_STAFF", awardId: created.id, grantedById: actor.userId },
      });
      const slug = await createSiteForAward(tx, created.id, name);
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: "DEPT_STAFF",
        action: "award.created",
        entityType: "award",
        entityId: created.id,
        after: { name, departmentId: input.departmentId, domainId: input.domainId, slug },
      });
      return created.id;
    });
    // The view is read after the commit: transactions only write (GAPS G-K28).
    const award = await db.award.findUniqueOrThrow({ where: { id: awardId }, include: awardInclude });
    return awardView(award, clock.now());
  } catch (error) {
    if (isUniqueViolation(error)) throw fieldIssue("name", "The department already has an award with this name.");
    throw error;
  }
}

/** Every award the person runs, across departments (spec §3: one staff member, many awards). */
export async function listMyAwards(actor: Actor): Promise<AwardView[]> {
  const awardIds = actor.roles.filter((r) => r.role === "AWARD_STAFF" && r.awardId).map((r) => r.awardId as string);
  const awards = await db.award.findMany({ where: { id: { in: awardIds } }, include: awardInclude, orderBy: { name: "asc" } });
  const now = clock.now();
  return awards.map((award) => awardView(award, now));
}

export async function getAward(actor: Actor, awardId: string): Promise<AwardView> {
  requireStaffOfAward(actor, awardId);
  const award = await db.award.findUnique({ where: { id: awardId }, include: awardInclude });
  if (!award) throw new NotFoundError("Award not found.");
  return awardView(award, clock.now());
}

/**
 * A new edition of the award, in draft: its dates, no fee, not blind, no entry limit, one written
 * round with 1 juror per application and the results Shortlisted / Rejected, an empty
 * questionnaire and an empty scoring sheet. Staff fill in the rest.
 */
export async function createCycle(actor: Actor, awardId: string, input: CreateCycleInput): Promise<CycleSetupView> {
  requireStaffOfAward(actor, awardId);
  try {
    const cycleId = await db.$transaction(async (tx) => {
      const cycle = await tx.cycle.create({
        data: {
          awardId,
          label: input.label,
          opensAt: input.opensAt,
          deadlineAt: input.deadlineAt,
          draftFormSchema: { sections: [], usedKeys: [] },
        },
        select: { id: true },
      });
      const round = await tx.round.create({
        data: { cycleId: cycle.id, number: 1, type: "DOCUMENT_REVIEW", resultLabels: DEFAULT_RESULT_LABELS, juryMin: 1, juryMax: 1 },
        select: { id: true },
      });
      await tx.scoringSheet.create({ data: { roundId: round.id, schema: { sections: [], usedKeys: [] } } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: "AWARD_STAFF",
        action: "cycle.created",
        entityType: "cycle",
        entityId: cycle.id,
        cycleId: cycle.id,
        after: { label: input.label, opensAt: input.opensAt.toISOString(), deadlineAt: input.deadlineAt.toISOString() },
      });
      return cycle.id;
    });
    return cycleSetup(cycleId);
  } catch (error) {
    if (isUniqueViolation(error)) throw fieldIssue("label", "This award already has an edition with this name.");
    throw error;
  }
}

/**
 * What still stops an edition from being published (spec §5.3), each as a sentence staff can act
 * on: categories, a future deadline, published questions, a complete scoring sheet, enough jury.
 */
export async function publishIssues(cycle: CycleSetupRecord, departmentId: string): Promise<string[]> {
  const issues: string[] = [];
  if (cycle.categories.length === 0) issues.push("Add at least one entry category.");
  if (cycle.deadlineAt <= clock.now()) issues.push("The deadline has already passed: set a later one.");
  const form = await latestPublishedForm(cycle.id);
  if (!form) issues.push("Publish the questions first: there is no published version yet.");
  const round = cycle.rounds[0];
  if (!round) {
    issues.push("Add a judging round.");
    return issues;
  }
  issues.push(...(await roundSheetIssues(cycle.id, round.id)).map((issue) => `Scoring sheet: ${issue}`));
  if (readLabels(round.resultLabels).length < 2) issues.push("The round needs at least two results.");
  const jury = await juryAvailable(departmentId);
  if (round.juryMax > jury) {
    issues.push(
      jury === 0
        ? "The department has no jury yet: ask its head to add them."
        : `Up to ${round.juryMax} jurors per application are needed, but the department's jury list has ${jury}.`,
    );
  }
  return issues;
}

async function cycleSetup(cycleId: string): Promise<CycleSetupView> {
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, include: cycleSetupInclude });
  const departmentId = cycle.award.departmentId;
  const round = cycle.rounds[0];
  if (!round) throw new Error("A cycle without a round");
  return {
    id: cycle.id,
    label: cycle.label,
    status: cycle.status,
    state: cycleState(cycle, clock.now()),
    opensAt: cycle.opensAt.toISOString(),
    deadlineAt: cycle.deadlineAt.toISOString(),
    publishedAt: cycle.publishedAt?.toISOString() ?? null,
    feePaise: cycle.feePaise,
    blindJudging: cycle.blindJudging,
    maxEntries: cycle.maxEntries,
    award: {
      id: cycle.award.id,
      name: cycle.award.name,
      department: cycle.award.department,
      siteSlug: cycle.award.site?.slug ?? null,
    },
    categories: cycle.categories,
    round: {
      id: round.id,
      number: round.number,
      type: round.type,
      juryMin: round.juryMin,
      juryMax: round.juryMax,
      resultLabels: readLabels(round.resultLabels),
      juryAvailable: await juryAvailable(departmentId),
    },
    publishIssues: cycle.status === "DRAFT" ? await publishIssues(cycle, departmentId) : [],
    settingsFixed: cycle.status !== "DRAFT",
  };
}

export async function getCycleSetup(actor: Actor, cycleId: string): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  return cycleSetup(context.cycleId);
}

/** Once published, everything an applicant relies on is fixed; only the entry limit may still change. */
function refuseFixedSettings(context: CycleContext, input: UpdateCycleInput): void {
  if (context.status === "DRAFT") return;
  const fixed: (keyof UpdateCycleInput)[] = ["label", "opensAt", "deadlineAt", "feePaise", "blindJudging"];
  const changed = fixed.filter((field) => input[field] !== undefined);
  if (changed.length > 0) {
    throw new StateError(
      "The award is published, so its name, dates, fee and blind judging are fixed. Only the entry limit can still change.",
      { reason: "SETTINGS_FIXED" },
    );
  }
}

export async function updateCycle(actor: Actor, cycleId: string, input: UpdateCycleInput): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseFixedSettings(context, input);
  const before = await db.cycle.findUniqueOrThrow({
    where: { id: cycleId },
    select: { label: true, opensAt: true, deadlineAt: true, feePaise: true, blindJudging: true, maxEntries: true },
  });
  const opensAt = input.opensAt ?? before.opensAt;
  const deadlineAt = input.deadlineAt ?? before.deadlineAt;
  if (deadlineAt <= opensAt) throw fieldIssue("deadlineAt", "The deadline must be after the opening date.");
  if (input.maxEntries !== undefined && input.maxEntries !== null) {
    const submitted = await db.application.count({ where: { cycleId, status: "SUBMITTED" } });
    if (input.maxEntries < submitted) {
      throw fieldIssue("maxEntries", `${submitted} applications are already submitted, so the limit can't be lower.`);
    }
  }
  try {
    await db.$transaction(async (tx) => {
      await tx.cycle.update({ where: { id: cycleId }, data: input });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: "AWARD_STAFF",
        action: "cycle.updated",
        entityType: "cycle",
        entityId: cycleId,
        cycleId,
        before: definedOnly({
          ...before,
          opensAt: before.opensAt.toISOString(),
          deadlineAt: before.deadlineAt.toISOString(),
        }),
        after: definedOnly({
          ...input,
          opensAt: input.opensAt?.toISOString(),
          deadlineAt: input.deadlineAt?.toISOString(),
        }),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw fieldIssue("label", "This award already has an edition with this name.");
    throw error;
  }
  return cycleSetup(cycleId);
}

function refuseOncePublished(context: CycleContext, what: string): void {
  if (context.status !== "DRAFT") {
    throw new StateError(`The award is published, so ${what} can't change any more.`, { reason: "SETTINGS_FIXED" });
  }
}

/** Entry categories (spec §5.3): at least one; a category's fee overrides the cycle's; fixed once published. */
export async function addCategory(actor: Actor, cycleId: string, input: CategoryInput): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseOncePublished(context, "the categories");
  const name = normalizeName(input.name);
  try {
    await db.entryCategory.create({ data: { cycleId, name, feePaise: input.feePaise } });
  } catch (error) {
    if (isUniqueViolation(error)) throw fieldIssue("name", "This edition already has a category with this name.");
    throw error;
  }
  return cycleSetup(cycleId);
}

async function requireCategory(cycleId: string, categoryId: string): Promise<void> {
  const category = await db.entryCategory.findFirst({ where: { id: categoryId, cycleId }, select: { id: true } });
  if (!category) throw new NotFoundError("Category not found.");
}

export async function updateCategory(
  actor: Actor,
  cycleId: string,
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseOncePublished(context, "the categories");
  await requireCategory(cycleId, categoryId);
  try {
    await db.entryCategory.update({
      where: { id: categoryId },
      data: { ...(input.name !== undefined && { name: normalizeName(input.name) }), ...(input.feePaise !== undefined && { feePaise: input.feePaise }) },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw fieldIssue("name", "This edition already has a category with this name.");
    throw error;
  }
  return cycleSetup(cycleId);
}

/** Only in a draft, before anyone could apply: nothing an applicant produced is ever deleted. */
export async function removeCategory(actor: Actor, cycleId: string, categoryId: string): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseOncePublished(context, "the categories");
  await requireCategory(cycleId, categoryId);
  await db.entryCategory.delete({ where: { id: categoryId } });
  return cycleSetup(cycleId);
}

/**
 * The round's jury per application (ADR 0013) and its result names. The minimum is at least 1 and
 * never above the maximum; the publish check compares the maximum with the department's jury list.
 */
export async function updateRound(actor: Actor, roundId: string, input: UpdateRoundInput): Promise<CycleSetupView> {
  const context = await requireRoundStaff(actor, roundId);
  const round = await db.round.findUniqueOrThrow({
    where: { id: roundId },
    select: { status: true, juryMin: true, juryMax: true, resultLabels: true },
  });
  if (round.status !== "NOT_STARTED") throw new StateError("Judging has started in this round, so its settings are fixed.");
  const juryMin = input.juryMin ?? round.juryMin;
  const juryMax = input.juryMax ?? round.juryMax;
  if (juryMin > juryMax) throw fieldIssue("juryMin", "The minimum can't be above the maximum.");
  await db.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: roundId },
      data: { juryMin, juryMax, ...(input.resultLabels && { resultLabels: input.resultLabels }) },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: "AWARD_STAFF",
      action: "round.updated",
      entityType: "round",
      entityId: roundId,
      cycleId: context.cycleId,
      before: { juryMin: round.juryMin, juryMax: round.juryMax, resultLabels: readLabels(round.resultLabels) },
      after: { juryMin, juryMax, resultLabels: input.resultLabels ?? readLabels(round.resultLabels) },
    });
  });
  return cycleSetup(context.cycleId);
}

/**
 * Publishes the edition once nothing blocks it (spec §5.3). From then on it shows on Open awards
 * between its opening date and its deadline, and its fee, blind judging, dates and categories are
 * fixed. The refusal lists every issue at once, so staff fix them in one go.
 */
export async function publishCycle(actor: Actor, cycleId: string): Promise<CycleSetupView> {
  const context = await requireCycleStaff(actor, cycleId);
  if (context.status !== "DRAFT") throw new StateError("This edition is already published.");
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, include: cycleSetupInclude });
  const issues = await publishIssues(cycle, context.departmentId);
  if (issues.length > 0) {
    throw new StateError("This edition can't be published yet.", { reason: "PUBLISH_BLOCKED", issues });
  }
  const now = clock.now();
  await db.$transaction(async (tx) => {
    // Only a draft is published: two staff pressing at the same moment publish it once.
    const { count } = await tx.cycle.updateMany({ where: { id: cycleId, status: "DRAFT" }, data: { status: "PUBLISHED", publishedAt: now } });
    if (count === 0) throw new StateError("This edition is already published.");
    await tx.awardSite.updateMany({
      where: { awardId: context.awardId, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: "AWARD_STAFF",
      action: "cycle.published",
      entityType: "cycle",
      entityId: cycleId,
      cycleId,
    });
  });
  return cycleSetup(cycleId);
}
