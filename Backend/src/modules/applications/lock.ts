import type { Prisma } from "../../generated/prisma/client.js";
import { clock } from "../../lib/clock.js";
import { db, type Tx } from "../../lib/db.js";
import { findState } from "../../lib/states.js";
import { recordAudit } from "../audit/service.js";

/**
 * The organisation's identity as the application keeps it (spec §5.18): taken at submit and taken
 * again, for the last time, when the deadline locks the application, so a later change to the
 * organisation's record never changes what was submitted.
 */
export type IdentitySnapshot = {
  legalName: string;
  pan: string;
  gstin: string | null;
  addressLine: string;
  city: string;
  state: { code: string; name: string };
  pincode: string;
  officialEmail: string;
  phone: string;
  organisationType: string | null;
  cin: string | null;
  website: string | null;
  takenAt: string;
};

export async function identitySnapshot(tx: Tx, organisationId: string, now: Date): Promise<IdentitySnapshot> {
  // Plain reads, one after the other: this runs inside transactions (GAPS G-K28).
  const organisation = await tx.organisation.findUniqueOrThrow({ where: { id: organisationId } });
  const orgType = organisation.orgTypeId
    ? await tx.organisationType.findUnique({ where: { id: organisation.orgTypeId }, select: { name: true } })
    : null;
  return {
    legalName: organisation.legalName,
    pan: organisation.pan,
    gstin: organisation.gstin,
    addressLine: organisation.addressLine,
    city: organisation.city,
    state: { code: organisation.stateCode, name: findState(organisation.stateCode)?.name ?? organisation.stateCode },
    pincode: organisation.pincode,
    officialEmail: organisation.officialEmail,
    phone: organisation.phone,
    organisationType: orgType?.name ?? null,
    cin: organisation.cin,
    website: organisation.website,
    takenAt: now.toISOString(),
  };
}

export function asJson(snapshot: IdentitySnapshot): Prisma.InputJsonObject {
  return snapshot as unknown as Prisma.InputJsonObject;
}

/**
 * The deadline lock (spec §5.6, §5.7). There is no scheduled job: the first use of the cycle after
 * its deadline closes it, once, in one transaction. Drafts become Not submitted; submitted
 * applications get their final identity snapshot and, unless staff already verified the proof,
 * the profile's current identity document and LinkedIn link (they follow the profile until the
 * deadline, spec §5.20). Every write also checks the clock itself, so nothing can change after the
 * deadline even before this has run.
 */
export async function closeCycleIfDue(cycleId: string): Promise<void> {
  const now = clock.now();
  const cycle = await db.cycle.findUnique({ where: { id: cycleId }, select: { status: true, deadlineAt: true } });
  if (!cycle || cycle.status !== "PUBLISHED" || now < cycle.deadlineAt) return;
  await db.$transaction(async (tx) => {
    // Only the first request closes it: a second one at the same moment finds it closed.
    const { count } = await tx.cycle.updateMany({ where: { id: cycleId, status: "PUBLISHED" }, data: { status: "CLOSED" } });
    if (count === 0) return;
    const drafts = await tx.application.updateMany({
      where: { cycleId, status: "DRAFT" },
      data: { status: "NOT_SUBMITTED", lockedAt: cycle.deadlineAt },
    });
    const submitted = await tx.application.findMany({
      where: { cycleId, status: "SUBMITTED" },
      select: { id: true, organisationId: true, proofStatus: true, createdById: true },
    });
    for (const application of submitted) {
      const followsProfile = application.proofStatus !== "VERIFIED";
      const profile = followsProfile
        ? await tx.user.findUniqueOrThrow({ where: { id: application.createdById }, select: { identityFileId: true, linkedinUrl: true } })
        : null;
      await tx.application.update({
        where: { id: application.id },
        data: {
          lockedAt: cycle.deadlineAt,
          identitySnapshot: asJson(await identitySnapshot(tx, application.organisationId, cycle.deadlineAt)),
          ...(profile && { identityFileId: profile.identityFileId, linkedinUrl: profile.linkedinUrl }),
        },
      });
    }
    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "cycle.closed",
      entityType: "cycle",
      entityId: cycleId,
      cycleId,
      after: { submitted: submitted.length, notSubmitted: drafts.count, closedAt: cycle.deadlineAt.toISOString() },
    });
  });
}
