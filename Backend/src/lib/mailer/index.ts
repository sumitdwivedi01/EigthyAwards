import { env } from "../../config/env.js";
import { createLogMailer } from "./log.js";
import { createSmtpMailer } from "./smtp.js";
import type { Mailer } from "./types.js";

export type { Mailer, MailMessage } from "./types.js";

/** SMTP when a server is set (Mailpit locally, a provider later); otherwise the server log. */
export const mailer: Mailer = env.SMTP_HOST
  ? createSmtpMailer({ host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, pass: env.SMTP_PASS, from: env.MAIL_FROM })
  : createLogMailer();
