import type { Actor } from "../../lib/access.js";
import { db } from "../../lib/db.js";
import { NotFoundError } from "../../lib/errors.js";
import { requireOrganiserReader } from "./access.js";
import type { HistoryEventView } from "./views.js";

/**
 * An application's history (spec §5.15, rule R3): every recorded decision about it, newest first,
 * with who acted, in which role, when, the old and new values and the reason. The award's staff,
 * its department's head and the leader read it; jury and applicants never do.
 */

function text(value: unknown, key: string): string | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const found = (value as Record<string, unknown>)[key];
    if (typeof found === "string" || typeof found === "number") return String(found);
  }
  return null;
}

function summary(action: string, before: unknown, after: unknown): string {
  const juror = text(after, "juror") ?? text(before, "juror") ?? "a jury member";
  switch (action) {
    case "application.started":
      return "Application started";
    case "application.category_changed":
      return "Category changed";
    case "application.fee_paid":
      return "Entry fee paid";
    case "application.employment_proof_added":
      return "Proof of employment added";
    case "application.employment_proof_replaced":
      return "Proof of employment replaced";
    case "application.submitted":
      return "Application submitted";
    case "application.proof_checked":
      return `Proof marked ${(text(after, "proofStatus") ?? "").toLowerCase()}`;
    case "application.released":
      return "Application released";
    case "application.profile_proof_followed":
      return "Profile proof updated";
    case "evaluation.assigned":
      return `Assigned to ${juror}`;
    case "evaluation.revoked":
      return `Assignment of ${juror} taken back`;
    case "evaluation.submitted":
      return `${juror} submitted their evaluation`;
    case "score.changed":
      return `${text(after, "indicator") ?? "A mark"} for ${juror}: ${text(before, "value") ?? "none"} → ${text(after, "value") ?? "none"}`;
    default:
      return action;
  }
}

export async function applicationHistory(actor: Actor, applicationId: string): Promise<HistoryEventView[]> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, cycle: { select: { award: { select: { id: true, departmentId: true } } } } },
  });
  if (!application) throw new NotFoundError("Application not found.");
  requireOrganiserReader(actor, application.cycle.award);
  const events = await db.auditEvent.findMany({
    where: { entityType: "application", entityId: applicationId },
    select: { id: true, createdAt: true, action: true, actorRole: true, before: true, after: true, reason: true, actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return events.map((e) => ({
    id: e.id,
    at: e.createdAt.toISOString(),
    action: e.action,
    summary: summary(e.action, e.before, e.after),
    actor: e.actor?.name ?? null,
    actorRole: e.actorRole,
    reason: e.reason,
    before: e.before,
    after: e.after,
  }));
}
