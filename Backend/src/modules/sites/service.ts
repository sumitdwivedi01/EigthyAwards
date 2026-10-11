import type { Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db, type Tx } from "../../lib/db.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { slugify } from "../../lib/slug.js";
import { recordAudit } from "../audit/service.js";
import { cycleState } from "../awards/views.js";
import type { AwardPageInput } from "../awards/schemas.js";
import { requirePageManager } from "./access.js";
import { publicCycleInclude, type PublicAwardCardView, type PublicAwardView, publicAwardCardView, publicAwardView } from "./views.js";

/**
 * Award pages, simple for Phase 1 (PLAN.md): one public page per award at /awards/<slug>, in its
 * department's colours, with the deadline, categories, fees and the entry counter filled in from
 * the live cycle, never copied into page content (spec §5.19). Staff choose only the address.
 * The full site builder (sections, versions, images) is package 2.2.
 */

/** A free address for a new award: its name as a slug, with "-2", "-3"… if that is taken. */
export async function createSiteForAward(tx: Tx, awardId: string, awardName: string): Promise<string> {
  const base = slugify(awardName).slice(0, 56);
  const taken = new Set(
    (await tx.awardSite.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((s) => s.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  await tx.awardSite.create({ data: { awardId, slug } });
  return slug;
}

/**
 * The award's staff, or its department's head, change its page's address (spec §5.19, ADR 0020).
 * Addresses are unique, ignoring letter case.
 */
export async function setAwardPageAddress(actor: Actor, awardId: string, input: AwardPageInput): Promise<{ slug: string }> {
  const award = await db.award.findUnique({ where: { id: awardId }, select: { id: true, departmentId: true } });
  if (!award) throw new NotFoundError("Award not found.");
  const actorRole = requirePageManager(actor, award);
  const site = await db.awardSite.findUnique({ where: { awardId }, select: { id: true, slug: true } });
  if (!site) throw new NotFoundError("Award page not found.");
  if (site.slug === input.slug) return { slug: site.slug };
  try {
    await db.$transaction(async (tx) => {
      await tx.awardSite.update({ where: { id: site.id }, data: { slug: input.slug } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole,
        action: "site.address_changed",
        entityType: "award_site",
        entityId: site.id,
        before: { slug: site.slug },
        after: { slug: input.slug },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ValidationError("This address is taken.", [{ path: "slug", message: "Another award already uses this address." }]);
    }
    throw error;
  }
  return { slug: input.slug };
}

async function submittedCounts(cycleIds: string[]): Promise<Map<string, number>> {
  if (cycleIds.length === 0) return new Map();
  const rows = await db.application.groupBy({
    by: ["cycleId"],
    where: { cycleId: { in: cycleIds }, status: "SUBMITTED" },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.cycleId, r._count._all]));
}

/** Open awards (spec §5.3): published cycles from their opening date until their deadline. */
export async function listOpenAwards(): Promise<PublicAwardCardView[]> {
  const now = clock.now();
  const cycles = await db.cycle.findMany({
    where: { status: { not: "DRAFT" }, opensAt: { lte: now }, deadlineAt: { gt: now } },
    include: publicCycleInclude,
    orderBy: { deadlineAt: "asc" },
  });
  const counts = await submittedCounts(cycles.map((c) => c.id));
  return cycles
    .filter((cycle) => cycle.award.site !== null)
    .map((cycle) => publicAwardCardView(cycle, counts.get(cycle.id) ?? 0, now));
}

/**
 * The award's public page: its open cycle, or else its most recent published one (so a closed
 * award still shows its dates). Drafts are never public.
 */
export async function getPublicAward(slug: string): Promise<PublicAwardView> {
  const now = clock.now();
  const site = await db.awardSite.findUnique({ where: { slug: slug.toLowerCase() }, select: { awardId: true } });
  if (!site) throw new NotFoundError("Award not found.");
  const cycles = await db.cycle.findMany({
    where: { awardId: site.awardId, status: { not: "DRAFT" } },
    include: publicCycleInclude,
    orderBy: { opensAt: "desc" },
  });
  const cycle = cycles.find((c) => cycleState(c, now) === "OPEN") ?? cycles[0];
  if (!cycle) throw new NotFoundError("Award not found.");
  const counts = await submittedCounts([cycle.id]);
  return publicAwardView(cycle, counts.get(cycle.id) ?? 0, now);
}
