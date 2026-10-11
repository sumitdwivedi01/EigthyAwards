import type { Area } from "./api-types";

/** Where each area of the app lives. Which areas a person may open comes from the API (/me). */
export const AREA_ROUTES: Record<Area, { href: string; label: string }> = {
  leader: { href: "/leader", label: "Leader" },
  department: { href: "/department", label: "Department" },
  staff: { href: "/staff", label: "Staff" },
  jury: { href: "/jury", label: "Jury" },
  applicant: { href: "/applicant", label: "Applying" },
};

/** Only an in-app path may follow a login (no "//evil.example" or full URLs). */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
