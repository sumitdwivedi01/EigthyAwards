import { headsDepartment, isStaffOfAward, type Actor } from "../../lib/access.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { readLabels } from "../awards/service.js";
import { recordAudit } from "../audit/service.js";
import { evaluationScore, finalScore, rankResults, type FinalScore } from "../scoring/arithmetic.js";
import type { ScoringSection } from "../scoring/schemas.js";
import { requireJudgingReader, requireJudgingStaff } from "./access.js";
import { roundHeader } from "./assignment.js";
import {
  conflictPairs,
  entryReference,
  indicatorsOf,
  isEligible,
  loadRound,
  lockRound,
  marksOf,
  pairKey,
  pointsOf,
  roundSheet,
  UNFINISHED,
  type RoundContext,
} from "./context.js";
import { markIssue } from "./evaluations.js";
import type { ScoreChangeInput } from "./schemas.js";
import { sheetView, type JudgedApplication, type JudgingView } from "./views.js";

/**
 * Judging progress, the head's round review and the results, in one view (spec §5.9, §5.11, §5.12):
 * every jury member's marks, points and note next to the application's final score, the exact
 * average of its submitted evaluations (ADR 0019), live while judging and as stored once the round
 * is approved; ranks within each entry category, with ties shown. Staff correct a submitted
 * evaluation's marks with a reason until the head approves (rule R3, decided 11 Oct).
 */

export interface ComputedResult {
  applicationId: string;
  categoryId: string;
  judged: boolean;
  final: FinalScore | null;
  rank: number | null;
}

/**
 * The final score and rank of each submitted application in the round, from its submitted
 * evaluations (revoked ones never count). Flat reads, one at a time, so it can run inside the
 * approval transaction (GAPS G-K28).
 */
export async function computeRoundResults(client: Tx, round: { id: string; cycleId: string }, sections: readonly ScoringSection[]): Promise<ComputedResult[]> {
  const applications = await client.application.findMany({
    where: { cycleId: round.cycleId, status: "SUBMITTED" },
    select: { id: true, categoryId: true, status: true, proofStatus: true, disqualifiedAt: true },
    orderBy: { submittedAt: "asc" },
  });
  const evaluations = await client.evaluation.findMany({
    where: { roundId: round.id, status: "SUBMITTED" },
    select: { id: true, applicationId: true },
  });
  const scores = await client.indicatorScore.findMany({
    where: { evaluationId: { in: evaluations.map((e) => e.id) } },
    select: { evaluationId: true, indicatorKey: true, value: true },
  });
  const pointsByApplication = new Map<string, number[]>();
  for (const evaluation of evaluations) {
    const points = pointsOf(sections, marksOf(scores.filter((s) => s.evaluationId === evaluation.id)));
    if (points === null) continue;
    pointsByApplication.set(evaluation.applicationId, [...(pointsByApplication.get(evaluation.applicationId) ?? []), points]);
  }
  const results: ComputedResult[] = applications.map((a) => {
    const judged = isEligible(a);
    return { applicationId: a.id, categoryId: a.categoryId, judged, final: judged ? finalScore(pointsByApplication.get(a.id) ?? []) : null, rank: null };
  });
  // Ranks within each category: each category is its own competition (decided 11 Oct).
  for (const categoryId of new Set(results.map((r) => r.categoryId))) {
    const scored = results.filter((r) => r.categoryId === categoryId && r.final !== null).map((r) => ({ r, hundredths: r.final?.hundredths ?? 0 }));
    for (const ranked of rankResults(scored)) ranked.r.rank = ranked.rank;
  }
  return results;
}

/** What still stops staff from sending the round to the department's head (spec §5.11). */
async function sendBlockers(round: RoundContext, applications: JudgedApplication[]): Promise<string[]> {
  const blockers: string[] = [];
  if (round.status !== "JUDGING") {
    if (round.status === "NOT_STARTED") blockers.push("No application has been assigned yet.");
    return blockers;
  }
  const pending = await db.application.count({ where: { cycleId: round.cycleId, status: "SUBMITTED", proofStatus: "PENDING" } });
  if (pending > 0) blockers.push(`${pending} ${pending === 1 ? "application's proof hasn't" : "applications' proof hasn't"} been checked yet.`);
  const judged = applications.filter((a) => a.judged);
  if (judged.length === 0) blockers.push("No application with verified proof is being judged.");
  for (const application of judged) {
    const submitted = application.evaluations.filter((e) => e.status === "SUBMITTED").length;
    if (submitted < round.juryMin) {
      blockers.push(`${application.reference} has ${submitted} of the ${round.juryMin} submitted evaluations it needs.`);
    }
  }
  const unfinished = await db.evaluation.count({ where: { roundId: round.id, status: { in: UNFINISHED } } });
  if (unfinished > 0) blockers.push(`${unfinished} ${unfinished === 1 ? "evaluation isn't" : "evaluations aren't"} submitted yet.`);
  return blockers;
}

const LOCKED = new Set(["APPROVED", "CLOSED", "RESULTS_PUBLISHED"]);

export async function judgingView(actor: Actor, round: RoundContext): Promise<JudgingView> {
  const award = round.cycle.award;
  const sections = await roundSheet(db, round.id);
  const indicators = indicatorsOf(sections);
  const staff = isStaffOfAward(actor, award);
  const locked = LOCKED.has(round.status);
  const correctable = round.status === "JUDGING" || round.status === "PENDING_APPROVAL";

  const applications = await db.application.findMany({
    where: { cycleId: round.cycleId, status: "SUBMITTED" },
    select: {
      id: true,
      status: true,
      proofStatus: true,
      disqualifiedAt: true,
      organisation: { select: { id: true, legalName: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { submittedAt: "asc" }],
  });
  const evaluations = await db.evaluation.findMany({
    where: { roundId: round.id, status: { not: "REVOKED" } },
    select: {
      id: true,
      applicationId: true,
      status: true,
      submittedAt: true,
      overallNote: true,
      juryUser: { select: { id: true, name: true, email: true } },
      scores: { select: { indicatorKey: true, value: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const stored = await db.roundResult.findMany({
    where: { roundId: round.id },
    select: { applicationId: true, finalScore: true, totalPoints: true, evaluationCount: true, rank: true, resultLabel: true, publishedAt: true },
  });
  const storedBy = new Map(stored.map((r) => [r.applicationId, r]));
  const live = locked ? [] : await computeRoundResults(db, round, sections);
  const liveBy = new Map(live.map((r) => [r.applicationId, r]));
  const conflicts = await conflictPairs(
    db,
    [...new Set(evaluations.map((e) => e.juryUser.id))],
    applications.map((a) => a.organisation.id),
  );
  const labels = readLabels(round.resultLabels);

  const rows: JudgedApplication[] = applications.map((application) => {
    const own = evaluations.filter((e) => e.applicationId === application.id);
    const result = storedBy.get(application.id);
    const computed = liveBy.get(application.id);
    const final =
      locked && result?.totalPoints != null && result.evaluationCount != null && result.finalScore != null
        ? { totalPoints: result.totalPoints, count: result.evaluationCount, display: result.finalScore.toFixed(2) }
        : computed?.final
          ? { totalPoints: computed.final.totalPoints, count: computed.final.count, display: computed.final.display }
          : null;
    const submitted = own.filter((e) => e.status === "SUBMITTED").length;
    const label = result?.resultLabel ?? null;
    return {
      id: application.id,
      reference: entryReference(application.id),
      organisation: { id: application.organisation.id, name: application.organisation.legalName },
      category: application.category,
      judged: locked ? result?.finalScore != null : isEligible(application),
      evaluations: own.map((e) => {
        const marks = marksOf(e.scores);
        const points = pointsOf(sections, marks);
        return {
          id: e.id,
          juror: e.juryUser,
          status: e.status,
          submittedAt: e.submittedAt?.toISOString() ?? null,
          points,
          score: points === null ? null : evaluationScore(points),
          marks: Object.fromEntries([...marks].filter(([key]) => indicators.has(key))),
          overallNote: e.overallNote,
          conflictFlagged: conflicts.has(pairKey(e.juryUser.id, application.organisation.id)),
          canCorrect: staff && correctable && e.status === "SUBMITTED",
        };
      }),
      final,
      rank: locked ? (result?.rank ?? null) : (computed?.rank ?? null),
      tied: false,
      minimumMet: submitted >= round.juryMin,
      result: result ? { label, advances: label === null ? null : (labels.find((l) => l.label === label)?.advances ?? false), publishedAt: result.publishedAt?.toISOString() ?? null } : null,
    };
  });
  for (const row of rows) {
    row.tied = row.final !== null && rows.some((other) => other !== row && other.category.id === row.category.id && other.final?.display === row.final?.display);
  }

  const approvals = await db.approvalRequest.findMany({
    where: { roundId: round.id },
    select: {
      id: true,
      submittedAt: true,
      decision: true,
      decidedAt: true,
      remark: true,
      submittedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  const blockers = await sendBlockers(round, rows);
  const labelled = stored.filter((r) => r.resultLabel !== null).length;
  const categories = [...new Map(applications.map((a) => [a.category.id, a.category])).values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    round: roundHeader(round),
    sheet: sheetView(sections),
    applications: rows,
    categories,
    approvals: approvals.map((a) => ({
      id: a.id,
      submittedAt: a.submittedAt.toISOString(),
      submittedBy: a.submittedBy.name,
      decision: a.decision,
      decidedAt: a.decidedAt?.toISOString() ?? null,
      decidedBy: a.decidedBy?.name ?? null,
      remark: a.remark,
    })),
    sendBlockers: blockers,
    resultLabels: labels,
    results: { decided: labelled, total: stored.length, published: round.status === "RESULTS_PUBLISHED" },
    can: {
      correctScores: staff && correctable,
      sendForApproval: staff && round.status === "JUDGING" && blockers.length === 0,
      approve: headsDepartment(actor, award.departmentId) && round.status === "PENDING_APPROVAL",
      decideResults: staff && round.status === "APPROVED",
      publishResults: staff && round.status === "APPROVED" && stored.length > 0 && labelled === stored.length,
    },
  };
}

export async function getJudging(actor: Actor, roundId: string): Promise<JudgingView> {
  const round = await loadRound(roundId);
  requireJudgingReader(actor, round.cycle.award);
  return judgingView(actor, round);
}

/**
 * Staff correct a submitted evaluation's marks (rule R3): each change is written in the same
 * transaction as its audit event (who, when, old value, new value and why), so neither exists
 * without the other. Allowed while judging and while the round waits for the head, never after
 * approval (decided 11 Oct; the database refuses it too).
 */
export async function correctScores(actor: Actor, evaluationId: string, input: ScoreChangeInput): Promise<JudgingView> {
  const evaluation = await db.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, roundId: true, applicationId: true, juryUserId: true, juryUser: { select: { name: true } } },
  });
  if (!evaluation) throw new NotFoundError("Evaluation not found.");
  const round = await loadRound(evaluation.roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  const indicators = indicatorsOf(await roundSheet(db, round.id));
  const issues: { path: string; message: string }[] = [];
  input.changes.forEach((change, index) => {
    const indicator = indicators.get(change.indicatorKey);
    if (!indicator) {
      issues.push({ path: `changes.${index}.indicatorKey`, message: "This indicator isn't on the scoring sheet." });
      return;
    }
    const issue = markIssue(indicator.type, change.value);
    if (issue) issues.push({ path: `changes.${index}.value`, message: issue });
  });
  if (new Set(input.changes.map((c) => c.indicatorKey)).size !== input.changes.length) {
    issues.push({ path: "changes", message: "Each indicator can be changed once per correction." });
  }
  if (issues.length > 0) throw new ValidationError("Some changes need attention.", issues);

  await db.$transaction(async (tx) => {
    const status = await lockRound(tx, round.id);
    if (status !== "JUDGING" && status !== "PENDING_APPROVAL") {
      throw new StateError("The round is approved, so its scores can't change any more.", { reason: "ROUND_LOCKED" });
    }
    const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status::text AS status FROM evaluations WHERE id = ${evaluationId}::uuid FOR UPDATE`;
    if (rows[0]?.status !== "SUBMITTED") {
      throw new StateError("Only a submitted evaluation is corrected; the jury member is still working on this one.", { reason: "NOT_SUBMITTED" });
    }
    const current = marksOf(await tx.indicatorScore.findMany({ where: { evaluationId }, select: { indicatorKey: true, value: true } }));
    let changed = 0;
    for (const change of input.changes) {
      const before = current.get(change.indicatorKey);
      if (before === change.value) continue;
      changed += 1;
      await tx.indicatorScore.upsert({
        where: { evaluationId_indicatorKey: { evaluationId, indicatorKey: change.indicatorKey } },
        update: { value: change.value },
        create: { evaluationId, indicatorKey: change.indicatorKey, value: change.value },
      });
      const label = indicators.get(change.indicatorKey)?.label ?? change.indicatorKey;
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole,
        action: "score.changed",
        entityType: "application",
        entityId: evaluation.applicationId,
        cycleId: round.cycleId,
        before: { evaluationId, juryUserId: evaluation.juryUserId, juror: evaluation.juryUser.name, indicatorKey: change.indicatorKey, indicator: label, value: before ?? null },
        after: { evaluationId, juryUserId: evaluation.juryUserId, juror: evaluation.juryUser.name, indicatorKey: change.indicatorKey, indicator: label, value: change.value },
        reason: input.reason,
      });
    }
    if (changed === 0) throw new ValidationError("These are already the marks: nothing changed.", [{ path: "changes", message: "Nothing changed." }]);
  });
  return judgingView(actor, await loadRound(round.id));
}

