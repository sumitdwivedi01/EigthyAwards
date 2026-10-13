import { z } from "zod";

/** The head's approval may carry a remark for the record (spec §5.11). */
export const approveSchema = z.object({ remark: z.string().trim().max(2000, "Keep the remark under 2,000 characters.").optional() });
export type ApproveInput = z.infer<typeof approveSchema>;
