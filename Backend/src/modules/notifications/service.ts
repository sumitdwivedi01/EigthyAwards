import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Tx } from "../../lib/db.js";
import { normalizeEmail } from "../../lib/normalize.js";

const queuedEmailSchema = z.object({
  to: z.email(),
  template: z.string().min(1),
  payload: z.record(z.string(), z.json()),
});

export type QueuedEmail = z.input<typeof queuedEmailSchema>;

/**
 * Queues an email inside the caller's transaction (GAPS G-C03: EmailLog is an outbox).
 * If the business change rolls back, the email is never sent. The dispatcher sends it after commit.
 */
export async function queueEmail(tx: Tx, input: QueuedEmail): Promise<void> {
  const email = queuedEmailSchema.parse(input);
  await tx.emailLog.create({
    data: {
      to: normalizeEmail(email.to),
      template: email.template,
      payload: email.payload as Prisma.InputJsonObject,
    },
  });
}
