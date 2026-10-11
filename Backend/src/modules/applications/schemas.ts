import { z } from "zod";
import { keyPattern } from "../../lib/ids.js";
import type { FileType } from "../forms/schemas.js";

/** Files: up to 10 MB each (spec §5.6); the database refuses anything larger too. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** The content type each kind of file a question may accept is uploaded as. */
export const CONTENT_TYPES: Record<FileType, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** An employment proof is a PDF or a photo (spec §5.20), like the profile's identity document. */
export const PROOF_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export const idSchema = z.object({ id: z.uuid() });
export const fileParamsSchema = z.object({ id: z.uuid(), fileId: z.uuid() });

export const startApplicationSchema = z
  .object({
    categoryId: z.uuid({ error: "Pick an entry category." }),
    /** Needed only when the applicant belongs to more than one organisation. */
    organisationId: z.uuid().optional(),
  })
  .strict();
export type StartApplicationInput = z.infer<typeof startApplicationSchema>;

export const changeCategorySchema = z.object({ categoryId: z.uuid({ error: "Pick an entry category." }) }).strict();
export type ChangeCategoryInput = z.infer<typeof changeCategorySchema>;

/**
 * An autosave: the answers that changed, by question key; null clears one. Each value is checked
 * against its question in the service, so one wrong answer never stops the others from saving.
 */
export const saveAnswersSchema = z
  .object({
    answers: z
      .record(z.string().regex(keyPattern("q"), "Unknown question."), z.union([z.string().max(25_000), z.number(), z.boolean(), z.null()]))
      .refine((answers) => Object.keys(answers).length > 0, "Nothing to save.")
      .refine((answers) => Object.keys(answers).length <= 300, "Too many answers in one save."),
  })
  .strict();
export type SaveAnswersInput = z.infer<typeof saveAnswersSchema>;

const fileName = z.string().trim().min(1, "The file needs a name.").max(200);
const sizeBytes = z.number().int().positive("The file is empty.").max(MAX_FILE_BYTES, "A file can be at most 10 MB.");

export const startEvidenceUploadSchema = z
  .object({
    questionKey: z.string().regex(keyPattern("q"), "Unknown question."),
    fileName,
    contentType: z.string().trim().toLowerCase().min(1),
    sizeBytes,
  })
  .strict();
export type StartEvidenceUploadInput = z.infer<typeof startEvidenceUploadSchema>;

export const startProofUploadSchema = z
  .object({
    fileName,
    contentType: z.enum(PROOF_CONTENT_TYPES, { error: "Upload a PDF, JPG or PNG file." }),
    sizeBytes,
    /** The date printed on the document (ADR 0012): within the 3 months before the upload. */
    documentDate: z.iso.date({ error: "Enter the date on the document." }),
    // DPDP Act 2023: consent at every upload, with the purpose stated on screen (§5.20).
    consent: z.literal(true, { error: "Please agree to the platform keeping this document." }),
  })
  .strict();
export type StartProofUploadInput = z.infer<typeof startProofUploadSchema>;

export const setProofSchema = z.object({ fileId: z.uuid() }).strict();
export type SetProofInput = z.infer<typeof setProofSchema>;

const reason = z.string().trim().min(3, "Give a reason.").max(1000);

export const proofCheckSchema = z
  .discriminatedUnion("decision", [
    z.object({ decision: z.literal("VERIFIED"), note: z.string().trim().max(1000).optional() }).strict(),
    // A rejection names the document and why, so the applicant knows what to fix (spec §5.20).
    z.object({ decision: z.literal("REJECTED"), note: reason }).strict(),
  ]);
export type ProofCheckInput = z.infer<typeof proofCheckSchema>;

export const releaseSchema = z.object({ reason }).strict();
export type ReleaseInput = z.infer<typeof releaseSchema>;

export const STAFF_STATUS_FILTERS = ["DRAFT", "SUBMITTED", "NOT_SUBMITTED", "RELEASED", "WITHDRAWN"] as const;
export const PROOF_FILTERS = ["PENDING", "VERIFIED", "REJECTED"] as const;

export const listFiltersSchema = z.object({
  status: z.enum(STAFF_STATUS_FILTERS).optional(),
  categoryId: z.uuid().optional(),
  proof: z.enum(PROOF_FILTERS).optional(),
});
export type ListFilters = z.infer<typeof listFiltersSchema>;

