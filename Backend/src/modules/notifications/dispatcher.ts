import type { Db } from "../../lib/db.js";
import type { Mailer } from "../../lib/mailer/types.js";
import { logger } from "../../lib/logger.js";
import { clock } from "../../lib/clock.js";
import { templates as defaultTemplates, type TemplateRegistry } from "./templates.js";

export interface DispatchOptions {
  db: Db;
  mailer: Mailer;
  templates?: TemplateRegistry;
  /** How many pending emails to send in one pass. */
  batchSize?: number;
  /** After this many failed attempts an email is marked FAILED and no longer retried. */
  maxAttempts?: number;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  retrying: number;
}

/**
 * Sends pending emails from the outbox, oldest first. Every outcome is written back to EmailLog,
 * so the log always says what happened. Assumes one API instance (true on Render's single
 * instance); several instances would need row locking (FOR UPDATE SKIP LOCKED).
 */
export async function dispatchPendingEmails(options: DispatchOptions): Promise<DispatchResult> {
  const registry = options.templates ?? defaultTemplates;
  const maxAttempts = options.maxAttempts ?? 3;
  const pending = await options.db.emailLog.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: options.batchSize ?? 25,
  });

  const result: DispatchResult = { sent: 0, failed: 0, retrying: 0 };
  for (const email of pending) {
    try {
      const template = registry[email.template];
      if (!template) {
        throw new Error(`Unknown email template "${email.template}"`);
      }
      const rendered = template.render(template.payload.parse(email.payload));
      await options.mailer.send({ to: email.to, ...rendered });
      await options.db.emailLog.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: clock.now(), attempts: { increment: 1 }, lastError: null },
      });
      result.sent += 1;
    } catch (error) {
      const attempts = email.attempts + 1;
      const giveUp = attempts >= maxAttempts;
      await options.db.emailLog.update({
        where: { id: email.id },
        data: {
          attempts,
          status: giveUp ? "FAILED" : "PENDING",
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
      logger.warn({ emailId: email.id, attempts, giveUp, err: error }, "email send failed");
      if (giveUp) {
        result.failed += 1;
      } else {
        result.retrying += 1;
      }
    }
  }
  return result;
}

/** Runs the dispatcher every `intervalMs`. Returns a function that stops it. */
export function startEmailDispatcher(options: DispatchOptions & { intervalMs: number }): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    dispatchPendingEmails(options)
      .catch((error: unknown) => logger.error({ err: error }, "email dispatcher crashed"))
      .finally(() => {
        running = false;
      });
  }, options.intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
