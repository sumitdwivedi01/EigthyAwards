import { z } from "zod";

const personName = z.string().trim().min(1, "Enter the person's name.").max(120);
// Trimmed before the format check, so a pasted address with spaces is cleaned, not refused.
const email = z.string().trim().max(254).pipe(z.email({ error: "Enter a valid email address." }));
const colour = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour such as #1F4FA8.")
  .transform((value) => value.toUpperCase());

/** A person to add: an existing platform account is found by email; the name is used for a new one. */
export const personSchema = z.object({ name: personName, email });
export type PersonInput = z.infer<typeof personSchema>;

/**
 * A department and its head, created together by the leader (spec §5.3, ADR 0017). The leader
 * doesn't choose its theme: the department starts with the default colours and its head picks
 * its own (ADR 0020). Unknown fields, such as colours, are refused rather than ignored.
 */
export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the department's name.").max(120),
    externalOrganiser: z.boolean().default(false),
    head: personSchema,
  })
  .strict();
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

/** A new department's colours until its head chooses its own. */
export const DEFAULT_THEME = { primaryColour: "#1F4FA8", accentColour: "#F2A900" } as const;

/** The department's theme on its award pages, chosen by its head (ADR 0020). */
export const themeSchema = z
  .object({
    primaryColour: colour,
    accentColour: colour,
    /** Shown at the foot of every award page; empty shows the department's name. */
    footerText: z.string().trim().max(200, "Keep the footer to 200 characters.").default(""),
  })
  .strict();
export type ThemeInput = z.infer<typeof themeSchema>;

export const departmentIdSchema = z.object({ id: z.uuid() });

export const personParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });

/** The two lists a department keeps: its staff and its jury. */
export const LIST_KINDS = ["staff", "jury"] as const;
export type ListKind = (typeof LIST_KINDS)[number];
