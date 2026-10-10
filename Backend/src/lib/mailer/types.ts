export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends one email. SMTP locally (Mailpit catches everything); in production an HTTP email API
 * may replace it behind this same interface (GAPS G-B06).
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
