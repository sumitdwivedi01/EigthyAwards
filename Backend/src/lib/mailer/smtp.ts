import nodemailer from "nodemailer";
import type { Mailer } from "./types.js";

export interface SmtpOptions {
  host: string;
  port: number;
  user: string | undefined;
  pass: string | undefined;
  from: string;
}

export function createSmtpMailer(options: SmtpOptions): Mailer {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.port === 465,
    auth: options.user ? { user: options.user, pass: options.pass ?? "" } : undefined,
  });

  return {
    async send(message) {
      await transport.sendMail({ from: options.from, ...message });
    },
  };
}
