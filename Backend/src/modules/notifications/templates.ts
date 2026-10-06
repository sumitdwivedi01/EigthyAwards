import type { z } from "zod";

export interface RenderedEmail {
  subject: string;
  text: string;
}

/** One email template: a schema for its payload and a render function. */
export interface EmailTemplate<Schema extends z.ZodType = z.ZodType> {
  payload: Schema;
  render(payload: z.infer<Schema>): RenderedEmail;
}

export type TemplateRegistry = Readonly<Record<string, EmailTemplate>>;

/**
 * Every email the platform sends (spec §5.13). Templates arrive with the phases that send them:
 * account invite and password reset in Phase 2, and the rest from Phase 6 onwards.
 */
export const templates: TemplateRegistry = {};
