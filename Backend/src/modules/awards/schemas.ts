import { z } from "zod";
import { isValidSlug } from "../../lib/slug.js";

const nonEmpty = (value: object) => Object.values(value).some((v) => v !== undefined);

export const createAwardSchema = z.object({
  departmentId: z.uuid({ error: "Pick the department that runs the award." }),
  name: z.string().trim().min(2, "Enter the award's name.").max(120),
  domainId: z.uuid({ error: "Pick the award's subject area." }),
  description: z.string().trim().min(1, "Describe the award in a sentence or two.").max(2000),
});
export type CreateAwardInput = z.infer<typeof createAwardSchema>;

export const idSchema = z.object({ id: z.uuid() });

/** Times arrive as ISO 8601 with their offset (the screens send India time, +05:30); stored in UTC. */
const dateTime = z.iso
  .datetime({ offset: true, error: "Enter a date and time." })
  .transform((value) => new Date(value));

const cycleLabel = z.string().trim().min(1, "Name this edition, for example 2026.").max(40);

export const createCycleSchema = z
  .object({ label: cycleLabel, opensAt: dateTime, deadlineAt: dateTime })
  .refine((value) => value.deadlineAt > value.opensAt, {
    path: ["deadlineAt"],
    message: "The deadline must be after the opening date.",
  });
export type CreateCycleInput = z.infer<typeof createCycleSchema>;

/** Money is whole paise (₹1 = 100 paise); 0 means free. */
const paise = z.number().int("Use whole rupees and paise.").min(0, "A fee can't be negative.").max(100_000_000, "That fee is too high.");

export const updateCycleSchema = z
  .object({
    label: cycleLabel.optional(),
    opensAt: dateTime.optional(),
    deadlineAt: dateTime.optional(),
    feePaise: paise.optional(),
    blindJudging: z.boolean().optional(),
    maxEntries: z.number().int().min(1, "An entry limit is at least 1.").max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine(nonEmpty, "Nothing to change.");
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;

const categoryName = z.string().trim().min(1, "Name the category.").max(120);

export const categorySchema = z.object({
  name: categoryName,
  /** null: the category uses the cycle's fee. */
  feePaise: paise.nullable().default(null),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const updateCategorySchema = z
  .object({ name: categoryName.optional(), feePaise: paise.nullable().optional() })
  .strict()
  .refine(nonEmpty, "Nothing to change.");
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryParamsSchema = z.object({ id: z.uuid(), categoryId: z.uuid() });

const resultLabel = z.object({
  label: z.string().trim().min(1, "Name the result.").max(40),
  /** This result moves the entry on to the next round, if the cycle has one. */
  advances: z.boolean().default(false),
});

export const updateRoundSchema = z
  .object({
    juryMin: z.number().int().min(1, "Every application needs at least 1 juror.").max(20).optional(),
    juryMax: z.number().int().min(1, "Every application needs at least 1 juror.").max(20).optional(),
    resultLabels: z
      .array(resultLabel)
      .min(2, "A round needs at least two results, such as Shortlisted and Rejected.")
      .max(6)
      .refine(
        (labels) => new Set(labels.map((l) => l.label.toLowerCase())).size === labels.length,
        "Each result needs a different name.",
      )
      .optional(),
  })
  .strict()
  .refine(nonEmpty, "Nothing to change.");
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;

export const awardPageSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Use 2 to 60 lower-case letters, digits and single hyphens, such as fpo-awards."),
});
export type AwardPageInput = z.infer<typeof awardPageSchema>;

export const DEFAULT_RESULT_LABELS = [{ label: "Shortlisted", advances: true }, { label: "Rejected", advances: false }];
