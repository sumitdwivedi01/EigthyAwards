import type { Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { recordAudit } from "../audit/service.js";
import { requireConflictRole } from "./access.js";
import { departmentJury, UNFINISHED } from "./context.js";
import type { ConflictView } from "./views.js";

/**
 * Conflicts of interest (spec §5.8, rule R2): "jury member X has a conflict with organisation Y",
 * recorded by the award's staff or its department's head. It applies to every award: the server
 * refuses that assignment anywhere, and the board leaves the juror out for that organisation.
 * Recorded after an assignment, it takes back every unsubmitted evaluation of that pair; a
 * submitted one is flagged for staff and still counts (decided 11 Oct). One recorded by mistake is
 * removed with a reason and kept.
 */

const LATE_CONFLICT_REASON = "A conflict of interest with this organisation was recorded.";

async function cycleScope(cycleId: string) {
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    select: { id: true, award: { select: { id: true, departmentId: true } } },
  });
  if (!cycle) throw new NotFoundError("Award edition not found.");
  return cycle;
}

function fieldIssue(path: string, message: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

/** Recording and assigning take the same lock per juror, so a conflict and an assignment can't cross. */
export async function lockJuror(tx: Tx, juryUserId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`juror:${juryUserId}`}, 0))`;
}

const conflictSelect = {
  id: true,
  note: true,
  createdAt: true,
  juryUser: { select: { id: true, name: true, email: true } },
  organisation: { select: { id: true, legalName: true } },
  recordedBy: { select: { name: true } },
} as const;

type ConflictRow = {
  id: string;
  note: string | null;
  createdAt: Date;
  juryUser: { id: string; name: string; email: string };
  organisation: { id: string; legalName: string };
  recordedBy: { name: string };
};

export function conflictView(row: ConflictRow): ConflictView {
  return {
    id: row.id,
    juror: row.juryUser,
    organisation: { id: row.organisation.id, name: row.organisation.legalName },
    note: row.note,
    recordedBy: row.recordedBy.name,
    recordedAt: row.createdAt.toISOString(),
  };
}

/** The active conflicts between this department's jury list and this edition's organisations. */
export async function cycleConflicts(cycleId: string, juryUserIds: string[]): Promise<ConflictView[]> {
  if (juryUserIds.length === 0) return [];
  const rows = await db.conflict.findMany({
    where: { removedAt: null, juryUserId: { in: juryUserIds }, organisation: { applications: { some: { cycleId } } } },
    select: conflictSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(conflictView);
}

export interface RecordConflictResult {
  conflict: ConflictView;
  /** Unsubmitted evaluations of this pair that were taken back. */
  revoked: number;
  /** Submitted evaluations of this pair, now flagged for staff. */
  flagged: number;
}

export async function recordConflict(
  actor: Actor,
  cycleId: string,
  input: { juryUserId: string; organisationId: string; note?: string | undefined },
): Promise<RecordConflictResult> {
  const cycle = await cycleScope(cycleId);
  const actorRole = requireConflictRole(actor, cycle.award);
  const jury = await departmentJury(db, cycle.award);
  if (!jury.some((j) => j.id === input.juryUserId)) {
    throw fieldIssue("juryUserId", "Pick a jury member on the department's jury list.");
  }
  const applied = await db.application.count({ where: { cycleId, organisationId: input.organisationId } });
  if (applied === 0) throw fieldIssue("organisationId", "Pick an organisation that applied to this edition.");

  const note = input.note && input.note.length > 0 ? input.note : null;
  const juror = await db.user.findUniqueOrThrow({ where: { id: input.juryUserId }, select: { name: true } });
  const organisation = await db.organisation.findUniqueOrThrow({ where: { id: input.organisationId }, select: { legalName: true } });
  let outcome: { id: string; revoked: number; flagged: number };
  try {
    // Flat reads and writes only inside the transaction (GAPS G-K28); the view is read after it.
    outcome = await db.$transaction(async (tx) => {
      await lockJuror(tx, input.juryUserId);
      const created = await tx.conflict.create({
        data: { juryUserId: input.juryUserId, organisationId: input.organisationId, note, recordedById: actor.userId },
        select: { id: true },
      });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole,
        action: "conflict.recorded",
        entityType: "conflict",
        entityId: created.id,
        cycleId,
        after: { juryUserId: input.juryUserId, juror: juror.name, organisationId: input.organisationId, organisation: organisation.legalName, note },
      });

      // Every award: unsubmitted work of this pair is taken back; submitted work is flagged.
      const open = await tx.evaluation.findMany({
        where: {
          juryUserId: input.juryUserId,
          status: { in: UNFINISHED },
          application: { organisationId: input.organisationId },
          round: { status: { in: ["NOT_STARTED", "JUDGING"] } },
        },
        select: { id: true, applicationId: true, cycleId: true, roundId: true },
      });
      const now = clock.now();
      for (const evaluation of open) {
        await tx.evaluation.update({
          where: { id: evaluation.id },
          data: { status: "REVOKED", revokedAt: now, revokedReason: LATE_CONFLICT_REASON },
        });
        await recordAudit(tx, {
          actorId: actor.userId,
          actorRole,
          action: "evaluation.revoked",
          entityType: "application",
          entityId: evaluation.applicationId,
          cycleId: evaluation.cycleId,
          before: { evaluationId: evaluation.id, juryUserId: input.juryUserId, juror: juror.name },
          after: { status: "REVOKED" },
          reason: LATE_CONFLICT_REASON,
        });
      }
      const flagged = await tx.evaluation.count({
        where: { juryUserId: input.juryUserId, status: "SUBMITTED", application: { organisationId: input.organisationId } },
      });
      return { id: created.id, revoked: open.length, flagged };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new StateError("This conflict is already recorded.", { reason: "ALREADY_RECORDED" });
    throw error;
  }
  const row = await db.conflict.findUniqueOrThrow({ where: { id: outcome.id }, select: conflictSelect });
  return { conflict: conflictView(row), revoked: outcome.revoked, flagged: outcome.flagged };
}

/** Takes back a conflict recorded by mistake: it is kept, marked removed with who and why. */
export async function removeConflict(actor: Actor, cycleId: string, conflictId: string, input: { reason: string }): Promise<void> {
  const cycle = await cycleScope(cycleId);
  const actorRole = requireConflictRole(actor, cycle.award);
  const conflict = await db.conflict.findUnique({
    where: { id: conflictId },
    select: { id: true, juryUserId: true, organisationId: true, removedAt: true, juryUser: { select: { name: true } }, organisation: { select: { legalName: true } } },
  });
  // Only a conflict this edition's people could have recorded: a juror on the list, an organisation that applied.
  const jury = await departmentJury(db, cycle.award);
  const applied = conflict ? await db.application.count({ where: { cycleId, organisationId: conflict.organisationId } }) : 0;
  if (!conflict || !jury.some((j) => j.id === conflict.juryUserId) || applied === 0) {
    throw new NotFoundError("Conflict not found.");
  }
  if (conflict.removedAt) throw new StateError("This conflict was already removed.", { reason: "ALREADY_REMOVED" });
  await db.$transaction(async (tx) => {
    await lockJuror(tx, conflict.juryUserId);
    const { count } = await tx.conflict.updateMany({
      where: { id: conflictId, removedAt: null },
      data: { removedAt: clock.now(), removedById: actor.userId, removeReason: input.reason },
    });
    if (count === 0) throw new StateError("This conflict was already removed.", { reason: "ALREADY_REMOVED" });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "conflict.removed",
      entityType: "conflict",
      entityId: conflictId,
      cycleId,
      before: { juryUserId: conflict.juryUserId, juror: conflict.juryUser.name, organisationId: conflict.organisationId, organisation: conflict.organisation.legalName },
      reason: input.reason,
    });
  });
}
