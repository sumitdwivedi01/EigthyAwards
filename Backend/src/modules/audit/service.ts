import type { Prisma } from "../../generated/prisma/client.js";
import type { Tx } from "../../lib/db.js";
import { auditEventSchema, type AuditEventInput } from "./schemas.js";

/**
 * Appends one audit event inside the caller's transaction (spec §5.15, rule 3). Because it shares
 * the transaction, a failed audit write rolls back the change it describes, and a rolled-back
 * change leaves no audit event behind. The table itself refuses UPDATE, DELETE and TRUNCATE.
 */
export async function recordAudit(tx: Tx, input: AuditEventInput): Promise<void> {
  const event = auditEventSchema.parse(input);
  await tx.auditEvent.create({
    data: {
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      cycleId: event.cycleId,
      before: event.before as Prisma.InputJsonValue | undefined,
      after: event.after as Prisma.InputJsonValue | undefined,
      reason: event.reason,
    },
  });
}
