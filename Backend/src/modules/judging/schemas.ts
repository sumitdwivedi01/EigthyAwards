import { z } from "zod";
import { keyPattern } from "../../lib/ids.js";

/** Inputs of assignment, conflicts and scoring (spec §5.8, §5.9, rule R3). */

export const idSchema = z.object({ id: z.uuid() });
export const conflictParamsSchema = z.object({ id: z.uuid(), conflictId: z.uuid() });

const reason = z
  .string({ error: "Give a reason." })
  .trim()
  .min(3, "Give a reason, in a few words.")
  .max(1000, "Keep the reason under 1,000 characters.");

export const assignSchema = z.object({
  applicationIds: z.array(z.uuid()).min(1, "Pick at least one application.").max(200),
  juryUserIds: z.array(z.uuid()).min(1, "Pick at least one jury member.").max(20),
});
export type AssignInput = z.infer<typeof assignSchema>;

export const revokeSchema = z.object({ reason });
export type RevokeInput = z.infer<typeof revokeSchema>;

export const recordConflictSchema = z.object({
  juryUserId: z.uuid({ error: "Pick a jury member." }),
  organisationId: z.uuid({ error: "Pick an organisation." }),
  note: z.string().trim().max(1000).optional(),
});
export type RecordConflictInput = z.infer<typeof recordConflictSchema>;

export const removeConflictSchema = z.object({ reason });
export type RemoveConflictInput = z.infer<typeof removeConflictSchema>;

const mark = z.number({ error: "A mark is a whole number." }).int("A mark is a whole number.").min(0).max(10);

/**
 * A draft save from the scoring screen: marks by indicator key (null clears one), comments by
 * question key (empty clears one) and the overall note. Only what is sent changes.
 */
export const saveScoresSchema = z
  .object({
    scores: z.record(z.string().regex(keyPattern("ind")), mark.nullable()).default({}),
    comments: z.record(z.string().regex(keyPattern("q")), z.string().max(5000, "Keep a comment under 5,000 characters.")).default({}),
    overallNote: z.string().max(10000, "Keep the overall note under 10,000 characters.").optional(),
  })
  .strict();
export type SaveScoresInput = z.infer<typeof saveScoresSchema>;

/** Staff correct a submitted evaluation's marks; one reason covers the changes (rule R3). */
export const scoreChangeSchema = z.object({
  changes: z
    .array(z.object({ indicatorKey: z.string().regex(keyPattern("ind")), value: mark }))
    .min(1, "Change at least one mark.")
    .max(300),
  reason,
});
export type ScoreChangeInput = z.infer<typeof scoreChangeSchema>;
