import { z } from "zod";

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

/** Keeps the payload type inside the template while the registry holds templates of every shape. */
function template<Schema extends z.ZodType>(definition: EmailTemplate<Schema>): EmailTemplate {
  return definition as unknown as EmailTemplate;
}

/**
 * Every email the platform sends (spec §5.13). Templates arrive with the steps that send them;
 * all of them, sent through a real provider, come in package 2.6.
 */
export const templates: TemplateRegistry = {
  "password-changed": template({
    payload: z.object({ name: z.string() }),
    render: ({ name }) => ({
      subject: "Your password was changed",
      text: [
        `Hello ${name},`,
        "",
        "The password of your Awards Platform account was just changed.",
        "If you did this, there is nothing else to do.",
        "",
        "If you didn't, contact the award team straight away: someone else may know your password.",
      ].join("\n"),
    }),
  }),
};
