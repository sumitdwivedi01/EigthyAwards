import { z } from "zod";

/**
 * How staff give a round's results (spec §5.12): the top N of each category, everyone at or
 * above a cut-off score, or by hand. Top N and the cut-off give the "selected" result (by default
 * the one that advances, e.g. Shortlisted) and the "others" result (e.g. Rejected).
 */
const label = z.string().trim().min(1).max(40);

const choice = { selected: label.optional(), others: label.optional() };

export const decideResultsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("TOP_N"), n: z.number().int().min(1, "Pick at least 1.").max(1000), ...choice }),
  z.object({
    mode: z.literal("MIN_SCORE"),
    minScore: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/, "Give a score such as 70 or 70.50.")
      .refine((value) => Number(value) <= 100, "A score is at most 100."),
    ...choice,
  }),
  z.object({
    mode: z.literal("MANUAL"),
    labels: z.array(z.object({ applicationId: z.uuid(), label })).min(1, "Pick at least one result.").max(2000),
  }),
]);
export type DecideResultsInput = z.infer<typeof decideResultsSchema>;
