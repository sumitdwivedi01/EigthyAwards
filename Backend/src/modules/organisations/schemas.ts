import { z } from "zod";

/** Raw text from the form; the service normalises and checks it (spec §5.2, §5.18). */
const text = (max: number) => z.string().trim().min(1, "This field is required.").max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const email = z.string().trim().max(254).pipe(z.email({ error: "Enter a valid email address." }));

const profileFields = {
  legalName: text(200),
  gstin: optionalText(25),
  addressLine: text(300),
  city: text(100),
  stateCode: z.string().regex(/^[0-9]{2}$/, "Pick a state from the list."),
  pincode: text(10),
  officialEmail: email,
  phone: text(20),
  orgTypeId: z.uuid().nullable().optional(),
  cin: optionalText(30),
  website: z.url({ protocol: /^https?$/, error: "Enter a full web address (https://…)." }).max(300).nullable().optional(),
};

export const createOrganisationSchema = z.object({ pan: text(20), ...profileFields });
export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

/**
 * Members edit the profile, never the PAN: it identifies the organisation, so a wrong one is
 * corrected by the leader with a reason (spec §5.2). Unknown fields, the PAN among them, are refused.
 */
export const updateOrganisationSchema = z
  .object(profileFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, "Nothing to change.");
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;

/** Joining needs the PAN and the GSTIN, or the PAN and the official email when there's no GSTIN. */
export const joinOrganisationSchema = z
  .object({ pan: text(20), gstin: optionalText(25), officialEmail: email.nullable().optional() })
  .refine((input) => Boolean(input.gstin) || Boolean(input.officialEmail), {
    message: "Enter the GSTIN, or the official email if the organisation has no GSTIN.",
    path: ["gstin"],
  });
export type JoinOrganisationInput = z.infer<typeof joinOrganisationSchema>;

export const organisationIdSchema = z.object({ id: z.uuid() });
