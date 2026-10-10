import { z } from "zod";
import { passwordSchema } from "../../lib/password.js";

const personName = z.string().trim().min(1, "Enter your name.").max(120);

export const registerSchema = z.object({
  name: personName,
  // Trimmed before the format check, so a pasted address with spaces is cleaned, not refused.
  email: z.string().trim().max(254).pipe(z.email({ error: "Enter a valid email address." })),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** My profile (§5.21). The email can't be changed for now. A null or empty phone removes it. */
export const updateProfileSchema = z
  .object({
    name: personName.optional(),
    phone: z.string().trim().max(20).nullable().optional(),
  })
  .refine((input) => input.name !== undefined || input.phone !== undefined, "Nothing to change.");
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** The applicant's LinkedIn profile link (§5.20); null removes it. */
export const linkedinSchema = z.object({
  url: z
    .url({
      protocol: /^https?$/,
      hostname: /^([a-z0-9-]+\.)*linkedin\.com$/,
      error: "Enter a link to a LinkedIn profile (https://www.linkedin.com/in/…).",
    })
    .max(300)
    .nullable(),
});
export type LinkedinInput = z.infer<typeof linkedinSchema>;

/** Proof documents are PDFs or photos, up to 10 MB (§5.6, §5.20). */
export const PROOF_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const startIdentityUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(PROOF_CONTENT_TYPES, { error: "Upload a PDF, JPG or PNG file." }),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES, "A file can be at most 10 MB."),
  // DPDP Act 2023: consent at every upload, with the purpose stated on screen (§5.20).
  consent: z.literal(true, { error: "Please agree to the platform keeping this document." }),
});
export type StartIdentityUploadInput = z.infer<typeof startIdentityUploadSchema>;

export const setIdentityDocumentSchema = z.object({ fileId: z.uuid() });
export type SetIdentityDocumentInput = z.infer<typeof setIdentityDocumentSchema>;
