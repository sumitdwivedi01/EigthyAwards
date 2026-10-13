import { logger } from "../logger.js";
import type { Mailer } from "./types.js";

/**
 * Production in Phase 1 has no email provider (package 2.6 adds one): each email is written to the
 * server log, recipient and subject only, and the EmailLog keeps the full message. Setting
 * SMTP_HOST switches to real sending with no code change.
 */
export function createLogMailer(): Mailer {
  return {
    send(message) {
      logger.info({ to: message.to, subject: message.subject }, "email (not sent: no SMTP server configured)");
      return Promise.resolve();
    },
  };
}
