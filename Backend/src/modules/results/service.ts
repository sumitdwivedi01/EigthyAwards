import type { Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { StateError, ValidationError } from "../../lib/errors.js";
import { notAdvancingLabel } from "../approval/service.js";
import { readLabels } from "../awards/service.js";
import { recordAudit } from "../audit/service.js";
import { resultMessage } from "../applications/status.js";
import { queueEmail } from "../notifications/service.js";
import { requireJudgingStaff } from "../judging/access.js";
import { loadRound, lockRound } from "../judging/context.js";
import { judgingView } from "../judging/progress.js";
import type { JudgingView } from "../judging/views.js";
import type { DecideResultsInput } from "./schemas.js";

/**
 * A round's results (spec §5.12). Only once its scores are locked (the head approved it), staff
 * give each judged application a result, by the top N of its category, a minimum final score or
 * by hand; ties are shown and settled by hand. An application that wasn't judged keeps the
 * not-advancing result it got at approval. Publishing shows each applicant their result and
 * emails them; after the cycle's last round it becomes Results published.
 */

function hundredths(display: string): number {
  const [whole = "0", fraction = ""] = display.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function requireLabel(labels: { label: string }[], label: string, path: string): string {
  const found = labels.find((l) => l.label.toLowerCase() === label.toLowerCase());
  if (!found) throw new ValidationError(`"${label}" isn't one of this round's results.`, [{ path, message: "Pick one of the round's results." }]);
  return found.label;
}

export async function decideResults(actor: Actor, roundId: string, input: DecideResultsInput): Promise<JudgingView> {
  const round = await loadRound(roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  const labels = readLabels(round.resultLabels);
  const now = clock.now();
  await db.$transaction(async (tx) => {
    const status = await lockRound(tx, roundId);
    if (status !== "APPROVED") {
      throw new StateError(
        status === "RESULTS_PUBLISHED" ? "The results are already published." : "Results are given once the department's head approves the round.",
        { reason: "NOT_APPROVED" },
      );
    }
    const rows = await tx.roundResult.findMany({
      where: { roundId },
      select: { id: true, applicationId: true, finalScore: true, rank: true, resultLabel: true },
    });
    const judged = rows.filter((r) => r.finalScore !== null);
    const updates = new Map<string, string>();
    if (input.mode === "MANUAL") {
      const byApplication = new Map(rows.map((r) => [r.applicationId, r]));
      input.labels.forEach((item, index) => {
        const row = byApplication.get(item.applicationId);
        if (!row) throw new ValidationError("This application isn't in the round.", [{ path: `labels.${index}.applicationId`, message: "Not in this round." }]);
        if (row.finalScore === null) {
          throw new ValidationError("This application wasn't judged, so its result is fixed.", [{ path: `labels.${index}.applicationId`, message: "Not judged." }]);
        }
        updates.set(row.id, requireLabel(labels, item.label, `labels.${index}.label`));
      });
    } else {
      const selected = input.selected
        ? requireLabel(labels, input.selected, "selected")
        : ((labels.find((l) => l.advances) ?? labels[0])?.label ?? null);
      const others = input.others ? requireLabel(labels, input.others, "others") : notAdvancingLabel(labels);
      if (!selected || !others) throw new StateError("The round needs at least two results.");
      if (selected === others) throw new ValidationError("Pick two different results.", [{ path: "others", message: "Pick a different result." }]);
      // The rank is within the category, so "top N" is the top N of each category (decided 11 Oct); ties at the cut all get in.
      const cut = input.mode === "MIN_SCORE" ? hundredths(input.minScore) : null;
      for (const row of judged) {
        const picked = input.mode === "TOP_N" ? (row.rank ?? Infinity) <= input.n : hundredths(row.finalScore?.toFixed(2) ?? "0") >= (cut ?? 0);
        updates.set(row.id, picked ? selected : others);
      }
    }
    for (const [id, resultLabel] of updates) {
      await tx.roundResult.update({ where: { id }, data: { resultLabel, decidedById: actor.userId, decidedAt: now } });
    }
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "results.decided",
      entityType: "round",
      entityId: roundId,
      cycleId: round.cycleId,
      after: {
        mode: input.mode,
        ...(input.mode === "TOP_N" && { n: input.n }),
        ...(input.mode === "MIN_SCORE" && { minScore: input.minScore }),
        changed: updates.size,
      },
    });
  });
  return judgingView(actor, await loadRound(roundId));
}

export async function publishResults(actor: Actor, roundId: string): Promise<JudgingView> {
  const round = await loadRound(roundId);
  const actorRole = requireJudgingStaff(actor, round.cycle.award);
  const labels = readLabels(round.resultLabels);
  const now = clock.now();
  await db.$transaction(async (tx) => {
    const status = await lockRound(tx, roundId);
    if (status !== "APPROVED") {
      throw new StateError(
        status === "RESULTS_PUBLISHED" ? "The results are already published." : "Results are published once the department's head approves the round.",
        { reason: "NOT_APPROVED" },
      );
    }
    const rows = await tx.roundResult.findMany({ where: { roundId }, select: { id: true, applicationId: true, resultLabel: true } });
    const missing = rows.filter((r) => r.resultLabel === null).length;
    if (rows.length === 0 || missing > 0) {
      throw new StateError(
        rows.length === 0 ? "There are no results to publish." : `${missing} ${missing === 1 ? "application has" : "applications have"} no result yet.`,
        { reason: "RESULTS_INCOMPLETE" },
      );
    }
    await tx.roundResult.updateMany({ where: { roundId }, data: { publishedAt: now } });
    await tx.round.update({ where: { id: roundId }, data: { status: "RESULTS_PUBLISHED" } });
    const last = await tx.round.findFirst({ where: { cycleId: round.cycleId }, orderBy: { number: "desc" }, select: { id: true } });
    if (last?.id === roundId) await tx.cycle.update({ where: { id: round.cycleId }, data: { status: "RESULTS_PUBLISHED" } });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole,
      action: "results.published",
      entityType: "round",
      entityId: roundId,
      cycleId: round.cycleId,
      after: { results: rows.length, byLabel: Object.fromEntries(labels.map((l) => [l.label, rows.filter((r) => r.resultLabel === l.label).length])) },
    });

    // The applicant and the organisation's official email (spec §5.13). Flat reads (GAPS G-K28).
    const applications = await tx.application.findMany({
      where: { id: { in: rows.map((r) => r.applicationId) } },
      select: { id: true, createdById: true, organisationId: true },
    });
    const people = new Map(
      (await tx.user.findMany({ where: { id: { in: applications.map((a) => a.createdById) } }, select: { id: true, name: true, email: true } })).map((u) => [u.id, u]),
    );
    const organisations = new Map(
      (await tx.organisation.findMany({ where: { id: { in: applications.map((a) => a.organisationId) } }, select: { id: true, legalName: true, officialEmail: true } })).map(
        (o) => [o.id, o],
      ),
    );
    for (const row of rows) {
      const application = applications.find((a) => a.id === row.applicationId);
      const person = application ? people.get(application.createdById) : undefined;
      const organisation = application ? organisations.get(application.organisationId) : undefined;
      if (!person || !organisation || !row.resultLabel) continue;
      const advances = labels.find((l) => l.label === row.resultLabel)?.advances ?? false;
      const payload = {
        awardName: round.cycle.award.name,
        cycleLabel: round.cycle.label,
        organisation: organisation.legalName,
        result: row.resultLabel,
        message: resultMessage(advances),
      };
      await queueEmail(tx, { to: person.email, template: "results-published", payload: { ...payload, name: person.name } });
      if (organisation.officialEmail.toLowerCase() !== person.email.toLowerCase()) {
        await queueEmail(tx, { to: organisation.officialEmail, template: "results-published", payload: { ...payload, name: null } });
      }
    }
  });
  return judgingView(actor, await loadRound(roundId));
}
