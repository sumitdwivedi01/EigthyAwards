import { z } from "zod";
import { keyPattern } from "../../lib/ids.js";
import { INDICATOR_TYPES } from "./arithmetic.js";

/**
 * A round's scoring sheet (spec §5.5, ADR 0019): sections with whole-percent weights, each with
 * indicators that have their own whole-percent weight and point at the question they score.
 * Indicators are jury-only: applicants never see them.
 */

const weight = z
  .number({ error: "Enter a weight." })
  .int("Use a whole percentage.")
  .min(1, "A weight is at least 1%.")
  .max(100, "A weight is at most 100%.");

const indicatorInput = z.object({
  key: z.string().regex(keyPattern("ind")).optional(),
  label: z.string().trim().min(1, "Every indicator needs a name.").max(300),
  type: z.enum(INDICATOR_TYPES, { error: "Pick Score (0 to 10) or Yes/No." }),
  weight,
  questionKey: z.string().regex(keyPattern("q"), "Pick the question this indicator scores."),
});

const sectionInput = z.object({
  key: z.string().regex(keyPattern("area")).optional(),
  title: z.string().trim().min(1, "Every section needs a title.").max(200),
  weight,
  indicators: z.array(indicatorInput).max(300),
});

export const scoringSheetInputSchema = z.object({ sections: z.array(sectionInput).max(50) });
export type ScoringSheetInput = z.infer<typeof scoringSheetInputSchema>;

const storedIndicator = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(INDICATOR_TYPES),
  weight: z.number().int(),
  questionKey: z.string(),
});
export type Indicator = z.infer<typeof storedIndicator>;

const storedSection = z.object({
  key: z.string(),
  title: z.string(),
  weight: z.number().int(),
  indicators: z.array(storedIndicator),
});
export type ScoringSection = z.infer<typeof storedSection>;

/** ScoringSheet.schema, with every key the sheet has ever used, so none is reused. */
export const storedSheetSchema = z.object({
  sections: z.array(storedSection).default([]),
  usedKeys: z.array(z.string()).default([]),
});
export type StoredSheet = z.infer<typeof storedSheetSchema>;
