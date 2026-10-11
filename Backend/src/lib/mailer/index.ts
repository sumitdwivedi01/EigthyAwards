import { env } from "../../config/env.js";
import { createSmtpMailer } from "./smtp.js";
import type { Mailer } from "./types.js";

export type { Mailer, MailMessage } from "./types.js";

export const mailer: Mailer = createSmtpMailer({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.MAIL_FROM,
});
