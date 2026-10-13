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

  // Step 1.3: to the applicant, and to the organisation's official email (name: null).
  "application-submitted": template({
    payload: z.object({
      name: z.string().nullable(),
      awardName: z.string(),
      cycleLabel: z.string(),
      organisationName: z.string(),
      categoryName: z.string(),
      submittedAt: z.string(),
    }),
    render: ({ name, awardName, cycleLabel, organisationName, categoryName, submittedAt }) => ({
      subject: `We received your application for ${awardName} ${cycleLabel}`,
      text: [
        name ? `Hello ${name},` : "Hello,",
        "",
        `${organisationName}'s application for ${awardName} ${cycleLabel} (category: ${categoryName}) was submitted on ${submittedAt}.`,
        "",
        "The award team will check the proof documents, and the jury will review the application after the deadline.",
        "You can follow its status under My applications.",
      ].join("\n"),
    }),
  }),

  // Step 1.3: to the applicant only, since it is about their own documents.
  "proof-rejected": template({
    payload: z.object({
      name: z.string(),
      awardName: z.string(),
      cycleLabel: z.string(),
      reason: z.string(),
      deadline: z.string(),
      canFix: z.boolean(),
    }),
    render: ({ name, awardName, cycleLabel, reason, deadline, canFix }) => ({
      subject: `Your proof for ${awardName} ${cycleLabel} needs attention`,
      text: [
        `Hello ${name},`,
        "",
        `The award team couldn't verify the proof on your application for ${awardName} ${cycleLabel}:`,
        "",
        reason,
        "",
        canFix
          ? `You can fix it until the deadline, ${deadline}: replace the identity document or LinkedIn link on My profile, or upload a new proof of employment on the application.`
          : "The deadline has passed. Contact the award team if you have questions.",
      ].join("\n"),
    }),
  }),

  // Step 1.4: one email per juror per assignment action, with how many new applications (spec §5.8).
  "jury-assigned": template({
    payload: z.object({ name: z.string(), count: z.number().int().min(1), awardName: z.string(), cycleLabel: z.string(), link: z.string() }),
    render: ({ name, count, awardName, cycleLabel, link }) => ({
      subject: `${count === 1 ? "A new application" : `${count} new applications`} to judge: ${awardName} ${cycleLabel}`,
      text: [
        `Hello ${name},`,
        "",
        `You have ${count === 1 ? "a new application" : `${count} new applications`} to judge for ${awardName} ${cycleLabel}.`,
        `Open My assignments to start: ${link}`,
        "",
        "Score each one on your own; your marks save as you go, and you submit when you're done.",
      ].join("\n"),
    }),
  }),

  // Step 1.4: to the head of the award's department.
  "round-sent-for-approval": template({
    payload: z.object({ name: z.string(), awardName: z.string(), cycleLabel: z.string(), applications: z.number().int(), link: z.string() }),
    render: ({ name, awardName, cycleLabel, applications, link }) => ({
      subject: `Waiting for your approval: ${awardName} ${cycleLabel}`,
      text: [
        `Hello ${name},`,
        "",
        `The award team has sent the judging of ${awardName} ${cycleLabel} (${applications} ${applications === 1 ? "application" : "applications"}) for your approval.`,
        `Review the scores and approve: ${link}`,
        "",
        "Once you approve, the scores are locked for good.",
      ].join("\n"),
    }),
  }),

  // Step 1.4: to the applicant, and to the organisation's official email (name: null).
  "results-published": template({
    payload: z.object({
      name: z.string().nullable(),
      awardName: z.string(),
      cycleLabel: z.string(),
      organisation: z.string(),
      result: z.string(),
      message: z.string(),
    }),
    render: ({ name, awardName, cycleLabel, organisation, result, message }) => ({
      subject: `Results of ${awardName} ${cycleLabel}: ${result}`,
      text: [
        name ? `Hello ${name},` : "Hello,",
        "",
        `The results of ${awardName} ${cycleLabel} are out. ${organisation}: ${result}.`,
        "",
        message,
      ].join("\n"),
    }),
  }),
};
