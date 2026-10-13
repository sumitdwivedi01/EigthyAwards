import { isLeader, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { env } from "../../config/env.js";
import { ForbiddenError, StateError } from "../../lib/errors.js";
import { readLabels } from "../awards/service.js";
import { recordAudit } from "../audit/service.js";
import { queueEmail } from "../notifications/service.js";
import { requireDepartmentHeadOf, requireJudgingStaff } from "../judging/access.js";
import { ELIGIBLE, loadRound, lockRound, roundSheet, UNFINISHED } from "../judging/context.js";
import { computeRoundResults, judgingView } from "../judging/progress.js";
import type { JudgingView } from "../judging/views.js";
import type { ApproveInput } from "./schemas.js";
import type { ApprovalQueueView } from "./views.js";

/**
 * Approval of document review rounds (spec §5.11). Staff send the whole round to the head of the
 * award's department once every judged application has its minimum of submitted evaluations,
 * nothing is unfinished and no proof is still waiting to be checked (decided 11 Oct). The head
 * approves: the round locks for good, and each application's ΣP, n, final score and rank within
 * its category are stored (ADR 0019). Send back with a remark comes in Phase 2.
 */

/** The not-advancing result (e.g. Rejected), given to an application that wasn't judged. */
export function notAdvancingLabel(labels: { label: string; advances: boolean }[]): string | null {
  return (labels.find((l) => !l.advances) ?? labels[labels.length - 1])?.label ?? null;
}

export async function sendForApproval(actor: Actor, roundId: string): Promise<JudgingView> {
  const round = await loadRound(roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  if (round.type !== "DOCUMENT_REVIEW") throw new StateError("Only document review rounds go for approval.");
  await db.$transaction(async (tx) => {
    const status = await lockRound(tx, roundId);
    if (status !== "JUDGING") {
      throw new StateError(
        status === "NOT_STARTED" ? "No application has been assigned yet." : "This round has already been sent for approval.",
        { reason: "NOT_JUDGING" },
      );
    }
    // The same checks as the screen shows, read again under the round's lock.
    const issues: string[] = [];
    const pending = await tx.application.count({ where: { cycleId: round.cycleId, status: "SUBMITTED", proofStatus: "PENDING" } });
    if (pending > 0) issues.push(`${pending} ${pending === 1 ? "application's proof hasn't" : "applications' proof hasn't"} been checked yet.`);
    const judged = await tx.application.findMany({ where: { cycleId: round.cycleId, ...ELIGIBLE }, select: { id: true } });
    if (judged.length === 0) issues.push("No application with verified proof is being judged.");
    const submitted = await tx.evaluation.groupBy({ by: ["applicationId"], where: { roundId, status: "SUBMITTED" }, _count: { _all: true } });
    const below = judged.filter((a) => (submitted.find((s) => s.applicationId === a.id)?._count._all ?? 0) < round.juryMin).length;
    if (below > 0) issues.push(`${below} ${below === 1 ? "application has" : "applications have"} fewer than ${round.juryMin} submitted evaluations.`);
    const unfinished = await tx.evaluation.count({ where: { roundId, status: { in: UNFINISHED } } });
    if (unfinished > 0) issues.push(`${unfinished} ${unfinished === 1 ? "evaluation isn't" : "evaluations aren't"} submitted yet.`);
    if (issues.length > 0) throw new StateError("The round can't be sent for approval yet.", { reason: "SEND_BLOCKED", issues });

    const request = await tx.approvalRequest.create({ data: { roundId, submittedById: actor.userId }, select: { id: true } });
    await tx.round.update({ where: { id: roundId }, data: { status: "PENDING_APPROVAL" } });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "round.sent_for_approval",
      entityType: "round",
      entityId: roundId,
      cycleId: round.cycleId,
      after: { approvalRequestId: request.id, applications: judged.length },
    });
    const headRoles = await tx.roleAssignment.findMany({
      where: { role: "DEPT_HEAD", departmentId: round.cycle.award.departmentId, revokedAt: null },
      select: { userId: true },
    });
    const heads = await tx.user.findMany({
      where: { id: { in: headRoles.map((r) => r.userId) }, deactivatedAt: null },
      select: { name: true, email: true },
    });
    for (const user of heads) {
      await queueEmail(tx, {
        to: user.email,
        template: "round-sent-for-approval",
        payload: {
          name: user.name,
          awardName: round.cycle.award.name,
          cycleLabel: round.cycle.label,
          applications: judged.length,
          link: `${new URL(env.APP_URL).origin}/department/rounds/${roundId}`,
        },
      });
    }
  });
  return judgingView(actor, await loadRound(roundId));
}

/** The head's approval queue (the leader sees every department's, read-only). */
export async function approvalQueue(actor: Actor): Promise<ApprovalQueueView> {
  const headed = actor.roles.filter((r) => r.role === "DEPT_HEAD" && r.departmentId).map((r) => r.departmentId as string);
  const leader = isLeader(actor);
  if (!leader && headed.length === 0) throw new ForbiddenError();
  const requests = await db.approvalRequest.findMany({
    where: leader ? {} : { round: { cycle: { award: { departmentId: { in: headed } } } } },
    select: {
      id: true,
      submittedAt: true,
      decision: true,
      decidedAt: true,
      submittedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
      round: {
        select: {
          id: true,
          number: true,
          cycle: { select: { id: true, label: true, award: { select: { id: true, name: true, department: { select: { id: true, name: true } } } } } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });
  const view = requests.map((r) => ({
    id: r.id,
    roundId: r.round.id,
    roundNumber: r.round.number,
    award: { id: r.round.cycle.award.id, name: r.round.cycle.award.name },
    cycle: { id: r.round.cycle.id, label: r.round.cycle.label },
    department: r.round.cycle.award.department,
    submittedAt: r.submittedAt.toISOString(),
    submittedBy: r.submittedBy.name,
    decision: r.decision,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    decidedBy: r.decidedBy?.name ?? null,
  }));
  return { pending: view.filter((r) => r.decision === "PENDING"), decided: view.filter((r) => r.decision !== "PENDING") };
}

/**
 * The head approves: in one transaction under the round's lock, the results are stored (final
 * score F₂ with ΣP and n, the rank within the category), the request is decided and the round
 * locks. From then on no score can change: the services refuse, and so does the database.
 */
export async function approveRound(actor: Actor, roundId: string, input: ApproveInput): Promise<JudgingView> {
  const round = await loadRound(roundId);
  const actorRole = requireDepartmentHeadOf(actor, round.cycle.award);
  const now = clock.now();
  const remark = input.remark && input.remark.length > 0 ? input.remark : null;
  await db.$transaction(async (tx) => {
    const status = await lockRound(tx, roundId);
    if (status !== "PENDING_APPROVAL") {
      throw new StateError(status === "APPROVED" ? "This round is already approved." : "This round isn't waiting for approval.", {
        reason: "NOT_PENDING",
      });
    }
    const request = await tx.approvalRequest.findFirst({ where: { roundId, decision: "PENDING" }, select: { id: true } });
    if (!request) throw new StateError("This round isn't waiting for approval.", { reason: "NOT_PENDING" });

    const sections = await roundSheet(tx, roundId);
    const results = await computeRoundResults(tx, round, sections);
    const fallback = notAdvancingLabel(readLabels(round.resultLabels));
    for (const result of results) {
      if (result.judged && !result.final) {
        throw new StateError("An application has no submitted evaluation, so the round can't be approved.", { reason: "UNSCORED" });
      }
      await tx.roundResult.create({
        data: {
          cycleId: round.cycleId,
          roundId,
          applicationId: result.applicationId,
          finalScore: result.final?.display ?? null,
          totalPoints: result.final?.totalPoints ?? null,
          evaluationCount: result.final?.count ?? null,
          rank: result.rank,
          // Not judged (its proof was rejected): the not-advancing result, fixed now.
          ...(!result.judged && { resultLabel: fallback, decidedAt: now }),
        },
      });
    }
    await tx.approvalRequest.update({ where: { id: request.id }, data: { decision: "APPROVED", decidedById: actor.userId, decidedAt: now, remark } });
    await tx.round.update({ where: { id: roundId }, data: { status: "APPROVED" } });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "round.approved",
      entityType: "round",
      entityId: roundId,
      cycleId: round.cycleId,
      after: { approvalRequestId: request.id, judged: results.filter((r) => r.judged).length, notJudged: results.filter((r) => !r.judged).length, remark },
    });
  });
  return judgingView(actor, await loadRound(roundId));
}
