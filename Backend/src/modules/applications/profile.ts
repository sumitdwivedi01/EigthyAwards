import { primaryRole, type Actor } from "../../lib/access.js";
import type { Tx } from "../../lib/db.js";
import { recordAudit } from "../audit/service.js";

/**
 * The profile proof an application uses follows the profile (spec §5.20): when the applicant
 * replaces their identity document or LinkedIn link, every submitted application of theirs whose
 * proof isn't verified yet, and whose deadline hasn't passed, takes the new one. A rejected check
 * goes back to pending, since the applicant fixed what was rejected. Runs inside the identity
 * service's transaction, so the profile and its applications never disagree.
 */
export async function followProfileProof(
  tx: Tx,
  actor: Actor,
  change: { identityFileId: string } | { linkedinUrl: string | null },
  now: Date,
): Promise<void> {
  const applications = await tx.application.findMany({
    where: {
      createdById: actor.userId,
      status: "SUBMITTED",
      proofStatus: { not: "VERIFIED" },
      lockedAt: null,
      cycle: { deadlineAt: { gt: now } },
    },
    select: { id: true, cycleId: true, proofStatus: true },
  });
  for (const application of applications) {
    await tx.application.update({
      where: { id: application.id },
      data: { ...change, proofStatus: "PENDING", proofCheckedById: null, proofCheckedAt: null, proofNote: null },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: "application.profile_proof_followed",
      entityType: "application",
      entityId: application.id,
      cycleId: application.cycleId,
      before: { proofStatus: application.proofStatus },
      after: { ...change, proofStatus: "PENDING" },
    });
  }
}
