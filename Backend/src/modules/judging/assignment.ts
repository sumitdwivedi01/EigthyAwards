import type { ProofStatus } from "../../generated/prisma/client.js";
import { isStaffOfAward, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { env } from "../../config/env.js";
import { NotFoundError, StateError } from "../../lib/errors.js";
import { recordAudit } from "../audit/service.js";
import { queueEmail } from "../notifications/service.js";
import { conflictRole, requireJudgingReader, requireJudgingStaff } from "./access.js";
import { cycleConflicts, lockJuror } from "./conflicts.js";
import {
  ACTIVE,
  conflictPairs,
  departmentJury,
  entryReference,
  isEligible,
  loadRound,
  lockRound,
  pairKey,
  requireAssignable,
  UNFINISHED,
  type RoundContext,
} from "./context.js";
import type { AssignInput, RevokeInput } from "./schemas.js";
import { ROUND_STATUS_LABELS, type AssignmentProblem, type BoardView, type RoundHeader } from "./views.js";

/**
 * Assigning applications to jury by hand (spec §5.8, ADR 0013, ADR 0017). After the deadline,
 * staff give each application between the round's minimum and maximum of different jury from the
 * award's department list. One action is all or nothing: a conflict (R2), an unverified
 * application, a juror off the list, the same juror twice or going above the maximum refuses the
 * whole action and lists why. Counting and assigning lock each application, so two staff
 * assigning at the same moment can't overfill one.
 */

export function roundHeader(round: RoundContext): RoundHeader {
  return {
    id: round.id,
    number: round.number,
    type: round.type,
    status: round.status,
    statusLabel: ROUND_STATUS_LABELS[round.status],
    juryMin: round.juryMin,
    juryMax: round.juryMax,
    cycle: {
      id: round.cycle.id,
      label: round.cycle.label,
      deadlineAt: round.cycle.deadlineAt.toISOString(),
      blindJudging: round.cycle.blindJudging,
      deadlinePassed: clock.now() >= round.cycle.deadlineAt,
    },
    award: { id: round.cycle.award.id, name: round.cycle.award.name },
    department: { id: round.cycle.award.departmentId, name: round.cycle.award.department.name },
  };
}

function notEligibleReason(application: { status: string; proofStatus: ProofStatus; disqualifiedAt: Date | null }): string | null {
  if (application.status !== "SUBMITTED") return "It isn't a submitted application.";
  if (application.disqualifiedAt) return "It is disqualified.";
  if (application.proofStatus === "PENDING") return "Its proof hasn't been checked yet.";
  if (application.proofStatus === "REJECTED") return "Its proof was rejected, so it isn't judged.";
  return null;
}

function assignBlockedReason(round: RoundContext): string | null {
  if (round.type !== "DOCUMENT_REVIEW") return "On-site rounds come in Phase 2.";
  if (clock.now() < round.cycle.deadlineAt) return "Applications are assigned after the deadline.";
  if (round.status !== "NOT_STARTED" && round.status !== "JUDGING") return "The round has been sent for approval.";
  return null;
}

async function boardView(actor: Actor, round: RoundContext): Promise<BoardView> {
  const award = round.cycle.award;
  const jury = await departmentJury(db, award);
  const applications = await db.application.findMany({
    where: { cycleId: round.cycleId, status: "SUBMITTED" },
    select: {
      id: true,
      status: true,
      proofStatus: true,
      disqualifiedAt: true,
      submittedAt: true,
      organisation: { select: { id: true, legalName: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { submittedAt: "asc" }],
  });
  const evaluations = await db.evaluation.findMany({
    where: { roundId: round.id, ...ACTIVE },
    select: {
      id: true,
      applicationId: true,
      status: true,
      submittedAt: true,
      juryUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const organisationIds = [...new Set(applications.map((a) => a.organisation.id))];
  const allJurorIds = [...new Set([...jury.map((j) => j.id), ...evaluations.map((e) => e.juryUser.id)])];
  const conflicts = await conflictPairs(db, allJurorIds, organisationIds);
  const staff = isStaffOfAward(actor, award);
  const blocked = assignBlockedReason(round);
  const assignable = round.status === "NOT_STARTED" || round.status === "JUDGING";

  const rows = applications.map((application) => {
    const own = evaluations.filter((e) => e.applicationId === application.id);
    const submitted = own.filter((e) => e.status === "SUBMITTED").length;
    const eligible = isEligible(application);
    return {
      id: application.id,
      reference: entryReference(application.id),
      organisation: { id: application.organisation.id, name: application.organisation.legalName },
      category: application.category,
      proofStatus: application.proofStatus,
      eligible,
      notEligibleReason: notEligibleReason(application),
      assigned: own.length,
      submitted,
      needs: eligible ? Math.max(0, round.juryMin - own.length) : 0,
      full: own.length >= round.juryMax,
      evaluations: own.map((e) => ({
        evaluationId: e.id,
        juror: e.juryUser,
        status: e.status,
        submittedAt: e.submittedAt?.toISOString() ?? null,
        conflictFlagged: conflicts.has(pairKey(e.juryUser.id, application.organisation.id)),
        canRevoke: staff && assignable && UNFINISHED.includes(e.status),
      })),
      conflictedJuryIds: jury.filter((j) => conflicts.has(pairKey(j.id, application.organisation.id))).map((j) => j.id),
    };
  });

  const eligibleRows = rows.filter((r) => r.eligible);
  return {
    round: roundHeader(round),
    juryOnList: jury.length,
    mostAssigned: rows.reduce((most, r) => Math.max(most, r.assigned), 0),
    applications: rows,
    jury: jury.map((j) => {
      const own = evaluations.filter((e) => e.juryUser.id === j.id);
      const submitted = own.filter((e) => e.status === "SUBMITTED").length;
      return { ...j, assigned: own.length, submitted, pending: own.length - submitted };
    }),
    conflicts: await cycleConflicts(round.cycleId, jury.map((j) => j.id)),
    organisations: [...new Map(applications.map((a) => [a.organisation.id, { id: a.organisation.id, name: a.organisation.legalName }])).values()].sort(
      (a, b) => a.name.localeCompare(b.name),
    ),
    counts: {
      eligible: eligibleRows.length,
      needMoreJury: eligibleRows.filter((r) => r.needs > 0).length,
      proofPending: rows.filter((r) => r.proofStatus === "PENDING").length,
      proofRejected: rows.filter((r) => r.proofStatus === "REJECTED").length,
    },
    can: {
      assign: staff && blocked === null,
      changeJuryPerApplication: staff && assignable && !(await sentBefore(round.id)),
      recordConflicts: conflictRole(actor, award) !== null,
    },
    assignBlockedReason: blocked,
  };
}

/** The round was sent for approval at least once: its jury per application is fixed from then on. */
export async function sentBefore(roundId: string): Promise<boolean> {
  return (await db.approvalRequest.count({ where: { roundId } })) > 0;
}

export async function getAssignmentBoard(actor: Actor, roundId: string): Promise<BoardView> {
  const round = await loadRound(roundId);
  requireJudgingReader(actor, round.cycle.award);
  return boardView(actor, round);
}

function refused(problems: AssignmentProblem[]): StateError {
  return new StateError(
    problems.length === 1 ? `Nothing was assigned: ${problems[0]?.message ?? ""}` : `Nothing was assigned: ${problems.length} problems need attention.`,
    { reason: "ASSIGNMENT_REFUSED", problems },
  );
}

export async function assignApplications(actor: Actor, roundId: string, input: AssignInput): Promise<BoardView> {
  const round = await loadRound(roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  const blocked = assignBlockedReason(round);
  if (blocked) throw new StateError(blocked, { reason: "CANNOT_ASSIGN" });

  const applicationIds = [...new Set(input.applicationIds)].sort();
  const juryUserIds = [...new Set(input.juryUserIds)].sort();
  const jury = new Map((await departmentJury(db, round.cycle.award)).map((j) => [j.id, j]));
  const problems: AssignmentProblem[] = [];
  for (const id of juryUserIds) {
    if (!jury.has(id)) problems.push({ applicationId: null, juryUserId: id, message: "This person isn't on the department's jury list." });
  }
  if (problems.length > 0) throw refused(problems);

  const created = await db.$transaction(async (tx) => {
    requireAssignable(await lockRound(tx, roundId));
    for (const id of juryUserIds) await lockJuror(tx, id);
    const made: { evaluationId: string; applicationId: string; juryUserId: string }[] = [];
    const plans: { applicationId: string; organisationId: string; jurors: string[] }[] = [];
    for (const applicationId of applicationIds) {
      // One row at a time, in id order, so two staff locking the same applications never deadlock.
      const rows = await tx.$queryRaw<{ cycleId: string; status: string; proofStatus: ProofStatus; disqualifiedAt: Date | null; organisationId: string }[]>`
        SELECT "cycleId", status::text AS status, "proofStatus", "disqualifiedAt", "organisationId"
        FROM applications WHERE id = ${applicationId}::uuid FOR UPDATE`;
      const application = rows[0];
      if (!application || application.cycleId !== round.cycleId) {
        problems.push({ applicationId, juryUserId: null, message: "This application isn't part of this edition." });
        continue;
      }
      const reason = notEligibleReason(application);
      if (reason) {
        problems.push({ applicationId, juryUserId: null, message: `${entryReference(applicationId)}: ${reason}` });
        continue;
      }
      const current = await tx.evaluation.findMany({ where: { roundId, applicationId, ...ACTIVE }, select: { juryUserId: true } });
      const already = new Set(current.map((e) => e.juryUserId));
      const conflicts = await conflictPairs(tx, juryUserIds, [application.organisationId]);
      for (const juryUserId of juryUserIds) {
        const name = jury.get(juryUserId)?.name ?? "This juror";
        if (already.has(juryUserId)) {
          problems.push({ applicationId, juryUserId, message: `${name} already has ${entryReference(applicationId)}.` });
        } else if (conflicts.has(pairKey(juryUserId, application.organisationId))) {
          problems.push({ applicationId, juryUserId, message: `${name} has a recorded conflict with the organisation of ${entryReference(applicationId)}.` });
        }
      }
      const total = current.length + juryUserIds.filter((id) => !already.has(id)).length;
      if (total > round.juryMax) {
        problems.push({
          applicationId,
          juryUserId: null,
          message: `${entryReference(applicationId)} would have ${total} jury; the most is ${round.juryMax}.`,
        });
      }
      plans.push({ applicationId, organisationId: application.organisationId, jurors: juryUserIds });
    }
    if (problems.length > 0) throw refused(problems);

    for (const plan of plans) {
      for (const juryUserId of plan.jurors) {
        const evaluation = await tx.evaluation.create({
          data: { cycleId: round.cycleId, roundId, applicationId: plan.applicationId, juryUserId },
          select: { id: true },
        });
        made.push({ evaluationId: evaluation.id, applicationId: plan.applicationId, juryUserId });
        await recordAudit(tx, {
          actorId: actor.userId,
          actorRole,
          action: "evaluation.assigned",
          entityType: "application",
          entityId: plan.applicationId,
          cycleId: round.cycleId,
          after: { evaluationId: evaluation.id, roundId, juryUserId, juror: jury.get(juryUserId)?.name ?? null },
        });
      }
    }
    await tx.round.updateMany({ where: { id: roundId, status: "NOT_STARTED" }, data: { status: "JUDGING" } });

    // One email per juror per action, with how many new applications they have (spec §5.8).
    for (const juryUserId of juryUserIds) {
      const juror = jury.get(juryUserId);
      if (!juror) continue;
      await queueEmail(tx, {
        to: juror.email,
        template: "jury-assigned",
        payload: {
          name: juror.name,
          count: made.filter((m) => m.juryUserId === juryUserId).length,
          awardName: round.cycle.award.name,
          cycleLabel: round.cycle.label,
          link: `${new URL(env.APP_URL).origin}/jury`,
        },
      });
    }
    return made.length;
  });
  if (created === 0) throw new StateError("Nothing to assign.");
  return boardView(actor, await loadRound(roundId));
}

/**
 * Takes an assignment back before it is submitted, with a reason (spec §5.8). The evaluation is
 * kept as Revoked, with its draft marks; reassigning is taking back and assigning someone else.
 */
export async function revokeAssignment(actor: Actor, evaluationId: string, input: RevokeInput): Promise<BoardView> {
  const evaluation = await db.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, roundId: true, applicationId: true, juryUserId: true, juryUser: { select: { name: true } } },
  });
  if (!evaluation) throw new NotFoundError("Assignment not found.");
  const round = await loadRound(evaluation.roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  await db.$transaction(async (tx) => {
    requireAssignable(await lockRound(tx, round.id));
    const { count } = await tx.evaluation.updateMany({
      where: { id: evaluationId, status: { in: UNFINISHED } },
      data: { status: "REVOKED", revokedAt: clock.now(), revokedReason: input.reason },
    });
    if (count === 0) {
      throw new StateError("Only an assignment that isn't submitted yet can be taken back.", { reason: "NOT_REVOCABLE" });
    }
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "evaluation.revoked",
      entityType: "application",
      entityId: evaluation.applicationId,
      cycleId: round.cycleId,
      before: { evaluationId, juryUserId: evaluation.juryUserId, juror: evaluation.juryUser.name },
      after: { status: "REVOKED" },
      reason: input.reason,
    });
  });
  return boardView(actor, await loadRound(round.id));
}
