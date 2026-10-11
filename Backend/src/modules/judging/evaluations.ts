import type { EvaluationStatus, RoundStatus } from "../../generated/prisma/client.js";
import type { Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import type { AnswerValue } from "../applications/answers.js";
import { readDefinition } from "../forms/service.js";
import type { FormDefinition, Question } from "../forms/schemas.js";
import { recordAudit } from "../audit/service.js";
import { requireOwnEvaluation } from "./access.js";
import { entryReference, indicatorsOf, marksOf, pointsOf, roundSheet, UNFINISHED } from "./context.js";
import type { SaveScoresInput } from "./schemas.js";
import {
  EVALUATION_STATUS_LABELS,
  type JuryEvaluationView,
  type JuryHomeView,
  type JuryQuestion,
  type SheetIndicatorView,
} from "./views.js";

/**
 * The jury's side of a document round (spec §5.9): their assignments, the scoring screen, draft
 * marks saved as they go, and submitting. A jury member sees only their own evaluations, and the
 * view is an allow-list (rule R1, ADR 0018): in a blind award no organisation, applicant, file,
 * proof or payment; in any award never a total, an average or another juror's work.
 */

/** The answer types a jury member reads as typed. File answers are files; anything else stays out. */
const READABLE: readonly Question["type"][] = ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "SINGLE_CHOICE", "YES_NO"];

function roundOpen(status: RoundStatus): boolean {
  return status === "JUDGING";
}

function canEdit(evaluation: { status: EvaluationStatus }, roundStatus: RoundStatus): boolean {
  return roundOpen(roundStatus) && (evaluation.status === "ASSIGNED" || evaluation.status === "IN_PROGRESS");
}

export async function juryHome(actor: Actor): Promise<JuryHomeView> {
  const evaluations = await db.evaluation.findMany({
    where: { juryUserId: actor.userId, status: { not: "REVOKED" } },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      applicationId: true,
      round: {
        select: {
          id: true,
          status: true,
          cycle: {
            select: { label: true, blindJudging: true, award: { select: { name: true, department: { select: { id: true, name: true } } } } },
          },
        },
      },
      application: { select: { category: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  // Organisation names only for awards that aren't blind, read separately so a blind one never loads them.
  const openIds = evaluations.filter((e) => !e.round.cycle.blindJudging).map((e) => e.applicationId);
  const names = new Map(
    (
      await db.application.findMany({ where: { id: { in: openIds } }, select: { id: true, organisation: { select: { legalName: true } } } })
    ).map((a) => [a.id, a.organisation.legalName]),
  );

  const departments = new Map<string, JuryHomeView["departments"][number]>();
  for (const evaluation of evaluations) {
    const { cycle } = evaluation.round;
    const department = departments.get(cycle.award.department.id) ?? { id: cycle.award.department.id, name: cycle.award.department.name, cycles: [] };
    departments.set(department.id, department);
    let group = department.cycles.find((c) => c.roundId === evaluation.round.id);
    if (!group) {
      group = {
        roundId: evaluation.round.id,
        award: cycle.award.name,
        cycle: cycle.label,
        blindJudging: cycle.blindJudging,
        roundStatus: evaluation.round.status,
        closed: !roundOpen(evaluation.round.status),
        assigned: 0,
        submitted: 0,
        items: [],
      };
      department.cycles.push(group);
    }
    group.assigned += 1;
    if (evaluation.status === "SUBMITTED") group.submitted += 1;
    group.items.push({
      evaluationId: evaluation.id,
      reference: entryReference(evaluation.applicationId),
      organisationName: cycle.blindJudging ? null : (names.get(evaluation.applicationId) ?? null),
      category: evaluation.application.category.name,
      status: evaluation.status,
      statusLabel: EVALUATION_STATUS_LABELS[evaluation.status],
      submittedAt: evaluation.submittedAt?.toISOString() ?? null,
    });
  }
  const list = [...departments.values()];
  return {
    departments: list,
    totals: {
      assigned: evaluations.length,
      submitted: evaluations.filter((e) => e.status === "SUBMITTED").length,
    },
  };
}

const evaluationSelect = {
  id: true,
  status: true,
  submittedAt: true,
  overallNote: true,
  juryUserId: true,
  roundId: true,
  applicationId: true,
  round: {
    select: {
      status: true,
      cycle: { select: { label: true, blindJudging: true, award: { select: { name: true, department: { select: { name: true } } } } } },
    },
  },
  application: { select: { formVersionId: true, cycleId: true, category: { select: { name: true } } } },
} as const;

/** The jury member's own, active evaluation; anyone else's (or a taken-back one) is "not found". */
async function ownEvaluation(client: Tx, actor: Actor, evaluationId: string) {
  const evaluation = await client.evaluation.findUnique({ where: { id: evaluationId }, select: evaluationSelect });
  if (!evaluation || evaluation.status === "REVOKED") throw new NotFoundError("Assignment not found.");
  requireOwnEvaluation(actor, evaluation);
  return evaluation;
}

/** The questions the application was submitted with (rule R4). */
async function pinnedForm(client: Tx, application: { formVersionId: string | null; cycleId: string }): Promise<FormDefinition> {
  const version = application.formVersionId
    ? await client.formVersion.findUnique({ where: { id: application.formVersionId }, select: { schema: true } })
    : await client.formVersion.findFirst({ where: { cycleId: application.cycleId }, orderBy: { version: "desc" }, select: { schema: true } });
  return readDefinition(version?.schema ?? { sections: [] });
}

function indicatorView(indicator: SheetIndicatorView): SheetIndicatorView {
  return { key: indicator.key, label: indicator.label, type: indicator.type, weight: indicator.weight, questionKey: indicator.questionKey };
}

function missingFor(sections: Awaited<ReturnType<typeof roundSheet>>, marks: Map<string, number>, note: string | null): string[] {
  const missing: string[] = [];
  for (const section of sections) {
    for (const indicator of section.indicators) {
      if (!marks.has(indicator.key)) missing.push(`Give a mark for "${indicator.label}".`);
    }
  }
  if (!note || note.trim().length === 0) missing.push("Write the overall note.");
  return missing;
}

/**
 * The scoring screen's data, assembled field by field. Whether the award is blind decides what is
 * read at all: a blind award never loads the organisation's record or the evidence files.
 */
export async function juryEvaluationView(actor: Actor, evaluationId: string): Promise<JuryEvaluationView> {
  const evaluation = await ownEvaluation(db, actor, evaluationId);
  const blind = evaluation.round.cycle.blindJudging;
  const form = await pinnedForm(db, evaluation.application);
  const sections = await roundSheet(db, evaluation.roundId);
  const scores = await db.indicatorScore.findMany({ where: { evaluationId }, select: { indicatorKey: true, value: true } });
  const comments = await db.questionComment.findMany({ where: { evaluationId }, select: { questionKey: true, comment: true } });
  const answers = new Map(
    (await db.answer.findMany({ where: { applicationId: evaluation.applicationId }, select: { questionKey: true, value: true } })).map((a) => [
      a.questionKey,
      a.value as AnswerValue,
    ]),
  );
  const files = blind
    ? []
    : await db.fileAsset.findMany({
        where: { applicationId: evaluation.applicationId, kind: "EVIDENCE", status: "READY", removedAt: null },
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true, questionKey: true },
        orderBy: { createdAt: "asc" },
      });
  const snapshot = blind
    ? null
    : ((await db.application.findUniqueOrThrow({ where: { id: evaluation.applicationId }, select: { identitySnapshot: true } }))
        .identitySnapshot as { legalName?: unknown; organisationType?: unknown; city?: unknown; state?: { name?: unknown } } | null);

  const indicators = [...indicatorsOf(sections).values()];
  const asked = new Set(form.sections.flatMap((s) => s.questions.map((q) => q.key)));
  const marks = marksOf(scores);
  const questionView = (question: Question): JuryQuestion => {
    const isFile = question.type === "FILE_UPLOAD";
    const answer = READABLE.includes(question.type) ? (answers.get(question.key) ?? null) : null;
    return {
      key: question.key,
      type: question.type,
      label: question.label,
      help: question.help,
      options: question.type === "SINGLE_CHOICE" ? (question.options ?? []).map((o) => ({ key: o.key, label: o.label })) : [],
      answer,
      files: isFile && !blind
        ? files.filter((f) => f.questionKey === question.key).map((f) => ({ id: f.id, fileName: f.fileName, mimeType: f.mimeType, sizeBytes: f.sizeBytes }))
        : [],
      filesHidden: isFile && blind,
      indicators: indicators.filter((i) => i.questionKey === question.key).map(indicatorView),
    };
  };

  return {
    id: evaluation.id,
    reference: entryReference(evaluation.applicationId),
    status: evaluation.status,
    statusLabel: EVALUATION_STATUS_LABELS[evaluation.status],
    submittedAt: evaluation.submittedAt?.toISOString() ?? null,
    canEdit: canEdit(evaluation, evaluation.round.status),
    award: { name: evaluation.round.cycle.award.name },
    cycle: { label: evaluation.round.cycle.label, blindJudging: blind },
    department: { name: evaluation.round.cycle.award.department.name },
    category: { name: evaluation.application.category.name },
    organisation:
      snapshot && typeof snapshot.legalName === "string"
        ? {
            name: snapshot.legalName,
            type: typeof snapshot.organisationType === "string" ? snapshot.organisationType : null,
            city: typeof snapshot.city === "string" ? snapshot.city : "",
            state: typeof snapshot.state?.name === "string" ? snapshot.state.name : "",
          }
        : null,
    sections: form.sections.map((s) => ({ key: s.key, title: s.title, description: s.description, questions: s.questions.map(questionView) })),
    otherIndicators: indicators.filter((i) => !asked.has(i.questionKey)).map(indicatorView),
    sectionWeights: sections.map((s) => ({ key: s.key, title: s.title, weight: s.weight })),
    scores: Object.fromEntries(marks),
    comments: Object.fromEntries(comments.map((c) => [c.questionKey, c.comment])),
    overallNote: evaluation.overallNote ?? "",
    missing: missingFor(sections, marks, evaluation.overallNote),
  };
}

async function lockEvaluation(tx: Tx, evaluationId: string): Promise<EvaluationStatus> {
  const rows = await tx.$queryRaw<{ status: EvaluationStatus }[]>`
    SELECT status FROM evaluations WHERE id = ${evaluationId}::uuid FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new NotFoundError("Assignment not found.");
  return row.status;
}

function requireJuryEditable(status: EvaluationStatus, roundStatus: RoundStatus): void {
  if (!roundOpen(roundStatus)) {
    throw new StateError("This round is no longer being judged, so its marks can't change.", { reason: "ROUND_CLOSED" });
  }
  if (status === "SUBMITTED") {
    throw new StateError("You submitted this evaluation, so its marks can't change.", { reason: "SUBMITTED" });
  }
  if (!UNFINISHED.includes(status) || status === "REDO") {
    throw new StateError("This evaluation can't change.", { reason: "NOT_EDITABLE" });
  }
}

/** Checks a mark against its indicator: 0 to 10 for a score, 1 (Yes) or 0 (No) for Yes/No. */
export function markIssue(type: "SCORE" | "YES_NO", value: number): string | null {
  if (type === "YES_NO" && value !== 0 && value !== 1) return "Choose Yes or No.";
  if (type === "SCORE" && (value < 0 || value > 10)) return "Give a whole number from 0 to 10.";
  return null;
}

/** Draft marks, comments and the note, saved as the jury member goes (not audited, spec §5.15). */
export async function saveScores(actor: Actor, evaluationId: string, input: SaveScoresInput): Promise<JuryEvaluationView> {
  const evaluation = await ownEvaluation(db, actor, evaluationId);
  requireJuryEditable(evaluation.status, evaluation.round.status);
  const sections = await roundSheet(db, evaluation.roundId);
  const indicators = indicatorsOf(sections);
  const form = await pinnedForm(db, evaluation.application);
  const questions = new Set(form.sections.flatMap((s) => s.questions.map((q) => q.key)));
  const issues: { path: string; message: string }[] = [];
  for (const [key, value] of Object.entries(input.scores)) {
    const indicator = indicators.get(key);
    if (!indicator) {
      issues.push({ path: `scores.${key}`, message: "This indicator isn't on the scoring sheet." });
    } else if (value !== null) {
      const issue = markIssue(indicator.type, value);
      if (issue) issues.push({ path: `scores.${key}`, message: issue });
    }
  }
  for (const key of Object.keys(input.comments)) {
    if (!questions.has(key)) issues.push({ path: `comments.${key}`, message: "This question isn't in the application." });
  }
  if (issues.length > 0) throw new ValidationError("Some marks need attention.", issues);

  const now = clock.now();
  await db.$transaction(async (tx) => {
    const status = await lockEvaluation(tx, evaluationId);
    const round = await tx.round.findUniqueOrThrow({ where: { id: evaluation.roundId }, select: { status: true } });
    requireJuryEditable(status, round.status);
    let marked = false;
    for (const [indicatorKey, value] of Object.entries(input.scores)) {
      if (value === null) {
        await tx.indicatorScore.deleteMany({ where: { evaluationId, indicatorKey } });
      } else {
        marked = true;
        await tx.indicatorScore.upsert({
          where: { evaluationId_indicatorKey: { evaluationId, indicatorKey } },
          update: { value },
          create: { evaluationId, indicatorKey, value },
        });
      }
    }
    for (const [questionKey, text] of Object.entries(input.comments)) {
      const comment = text.trim();
      if (comment.length === 0) {
        await tx.questionComment.deleteMany({ where: { evaluationId, questionKey } });
      } else {
        await tx.questionComment.upsert({
          where: { evaluationId_questionKey: { evaluationId, questionKey } },
          update: { comment },
          create: { evaluationId, questionKey, comment },
        });
      }
    }
    await tx.evaluation.update({
      where: { id: evaluationId },
      data: { status: "IN_PROGRESS", ...(input.overallNote !== undefined && { overallNote: input.overallNote }) },
    });
    // The first mark in the round fixes its scoring sheet (spec §5.5).
    if (marked) await tx.scoringSheet.updateMany({ where: { roundId: evaluation.roundId, lockedAt: null }, data: { lockedAt: now } });
  });
  return juryEvaluationView(actor, evaluationId);
}

/** Submitting needs every indicator marked and the overall note written; then the marks are final. */
export async function submitEvaluation(actor: Actor, evaluationId: string): Promise<JuryEvaluationView> {
  const evaluation = await ownEvaluation(db, actor, evaluationId);
  requireJuryEditable(evaluation.status, evaluation.round.status);
  const sections = await roundSheet(db, evaluation.roundId);
  await db.$transaction(async (tx) => {
    const status = await lockEvaluation(tx, evaluationId);
    const round = await tx.round.findUniqueOrThrow({ where: { id: evaluation.roundId }, select: { status: true } });
    requireJuryEditable(status, round.status);
    const current = await tx.evaluation.findUniqueOrThrow({ where: { id: evaluationId }, select: { overallNote: true } });
    const marks = marksOf(await tx.indicatorScore.findMany({ where: { evaluationId }, select: { indicatorKey: true, value: true } }));
    const missing = missingFor(sections, marks, current.overallNote);
    if (missing.length > 0) {
      throw new ValidationError(
        missing.length === 1 ? (missing[0] ?? "Something is missing.") : `${missing.length} things are still missing.`,
        missing.map((message) => ({ path: message.startsWith("Write") ? "overallNote" : "scores", message })),
      );
    }
    await tx.evaluation.update({ where: { id: evaluationId }, data: { status: "SUBMITTED", submittedAt: clock.now() } });
    // The submitted marks, so every later change has its "before" (rule R3).
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: "JURY",
      action: "evaluation.submitted",
      entityType: "application",
      entityId: evaluation.applicationId,
      cycleId: evaluation.application.cycleId,
      after: { evaluationId, juryUserId: actor.userId, juror: actor.name, marks: Object.fromEntries(marks), points: pointsOf(sections, marks) },
    });
  });
  return juryEvaluationView(actor, evaluationId);
}
