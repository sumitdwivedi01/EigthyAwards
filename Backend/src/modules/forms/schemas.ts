import { z } from "zod";
import { keyPattern } from "../../lib/ids.js";

/**
 * The questionnaire (spec §5.4): sections that contain questions. Phase 1 has six question types;
 * date, multiple choice and team members come in package 2.5. Keys are made by the server and
 * never reused (ids.ts); answers are stored by question key, so they carry across versions.
 */
export const QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "SINGLE_CHOICE", "YES_NO", "FILE_UPLOAD"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FILE_TYPES = ["pdf", "jpg", "png", "docx", "xlsx"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const TEXT_LIMITS = { SHORT_TEXT: { default: 300, max: 1000 }, LONG_TEXT: { default: 5000, max: 20000 } } as const;

// ── What the builder sends: keys only for items that already exist ──

const optionInput = z.object({
  key: z.string().regex(keyPattern("opt")).optional(),
  label: z.string().trim().min(1, "Every choice needs its wording.").max(200),
});

const questionInput = z.object({
  key: z.string().regex(keyPattern("q")).optional(),
  type: z.enum(QUESTION_TYPES, { error: "Pick a question type." }),
  label: z.string().trim().min(1, "Every question needs its wording.").max(500),
  help: z.string().trim().max(2000).default(""),
  required: z.boolean().default(true),
  /** SHORT_TEXT and LONG_TEXT: the most characters an answer may have. */
  maxLength: z.number().int().min(1).max(TEXT_LIMITS.LONG_TEXT.max).nullable().default(null),
  /** NUMBER: the smallest and largest accepted value. */
  min: z.number().finite().nullable().default(null),
  max: z.number().finite().nullable().default(null),
  /** SINGLE_CHOICE. */
  options: z.array(optionInput).max(30).default([]),
  /** FILE_UPLOAD: how many files, and which kinds. */
  maxFiles: z.number().int().min(1).max(10).default(1),
  fileTypes: z.array(z.enum(FILE_TYPES)).min(1, "Allow at least one kind of file.").default(["pdf", "jpg", "png"]),
});
export type QuestionInput = z.infer<typeof questionInput>;

const sectionInput = z.object({
  key: z.string().regex(keyPattern("sec")).optional(),
  title: z.string().trim().min(1, "Every section needs a title.").max(200),
  description: z.string().trim().max(2000).default(""),
  questions: z.array(questionInput).max(200),
});

export const formDraftInputSchema = z.object({ sections: z.array(sectionInput).max(50) });
export type FormDraftInput = z.infer<typeof formDraftInputSchema>;

export const publishFormSchema = z.object({
  changeSummary: z.string().trim().min(1, "Say in a few words what changed, for example \"First version\".").max(500),
});
export type PublishFormInput = z.infer<typeof publishFormSchema>;

export const versionParamsSchema = z.object({ id: z.uuid(), version: z.coerce.number().int().min(1) });

// ── What is stored: every key set, only the fields the question's type uses ──

export const storedQuestionSchema = z.object({
  key: z.string(),
  type: z.enum(QUESTION_TYPES),
  label: z.string(),
  help: z.string(),
  required: z.boolean(),
  maxLength: z.number().int().optional(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  options: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
  maxFiles: z.number().int().optional(),
  fileTypes: z.array(z.enum(FILE_TYPES)).optional(),
});
export type Question = z.infer<typeof storedQuestionSchema>;

export const storedSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  questions: z.array(storedQuestionSchema),
});
export type Section = z.infer<typeof storedSectionSchema>;

/** A published version's schema (FormVersion.schema), immutable once inserted. */
export const formDefinitionSchema = z.object({ sections: z.array(storedSectionSchema) });
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

/** The draft (Cycle.draftFormSchema), with every key the cycle has ever used, so none is reused. */
export const formDraftSchema = formDefinitionSchema.extend({ usedKeys: z.array(z.string()).default([]) });
export type FormDraft = z.infer<typeof formDraftSchema>;
