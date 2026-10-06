import { z } from "zod";
import { Role } from "../../generated/prisma/client.js";

/**
 * One audit event. `action` is "<entity>.<verb>", e.g. "score.changed", "department.created".
 * `actorRole` is the role the actor acted in, so the leader can see what each PA did (ADR 0005).
 */
export const auditEventSchema = z.object({
  actorId: z.uuid().nullable(),
  actorRole: z.enum(Role).nullable(),
  action: z.string().regex(/^[a-z][a-z_]*(\.[a-z][a-z_]*)+$/, 'use "<entity>.<verb>"'),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  cycleId: z.uuid().nullable().default(null),
  before: z.json().optional(),
  after: z.json().optional(),
  reason: z.string().trim().min(1).optional(),
});

export type AuditEventInput = z.input<typeof auditEventSchema>;
