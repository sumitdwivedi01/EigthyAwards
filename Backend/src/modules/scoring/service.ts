import type { Prisma } from "../../generated/prisma/client.js";
import type { Actor } from "../../lib/access.js";
import { db } from "../../lib/db.js";
import { StateError, ValidationError } from "../../lib/errors.js";
import { newKey, type KeyPrefix } from "../../lib/ids.js";
import { requireRoundStaff } from "../awards/context.js";
import { latestPublishedForm, questionsForScoring, readDefinition, readDraft } from "../forms/service.js";
import { storedSheetSchema, type ScoringSection, type ScoringSheetInput, type StoredSheet } from "./schemas.js";
import type { ScoringSheetView } from "./views.js";

/**
 * The scoring sheet of a round (spec §5.5). Staff can save it in any state while they build it;
 * the publish check then needs every weight total to be 100 and every indicator to point at a
 * published question. It can be edited until the first score is saved (lockedAt, Step 1.4).
 */

interface Issue {
  path: string;
  message: string;
}

export function readSheet(json: unknown): StoredSheet {
  return storedSheetSchema.parse(json ?? {});
}

/**
 * What still stops the sheet from being used (ADR 0019): every total must be exactly 100, and
 * every indicator must score a question of the published version. Pure, so it is tested alone.
 */
export function sheetIssues(sections: readonly ScoringSection[], publishedQuestions: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  if (sections.length === 0) return ["The scoring sheet needs at least one section with an indicator."];
  const sectionTotal = sections.reduce((sum, s) => sum + s.weight, 0);
  if (sectionTotal !== 100) issues.push(`The section weights add up to ${sectionTotal}%, not 100%.`);
  for (const section of sections) {
    if (section.indicators.length === 0) {
      issues.push(`The section "${section.title}" has no indicators.`);
      continue;
    }
    const total = section.indicators.reduce((sum, i) => sum + i.weight, 0);
    if (total !== 100) issues.push(`In "${section.title}", the indicator weights add up to ${total}%, not 100%.`);
    for (const indicator of section.indicators) {
      if (!publishedQuestions.has(indicator.questionKey)) {
        issues.push(`"${indicator.label}" scores a question that isn't in the published questions.`);
      }
    }
  }
  return issues;
}

async function publishedQuestionKeys(cycleId: string): Promise<Set<string>> {
  const latest = await latestPublishedForm(cycleId);
  return new Set(latest ? latest.definition.sections.flatMap((s) => s.questions.map((q) => q.key)) : []);
}

/** The scoring-sheet problems of a cycle's round, for the publish check. */
export async function roundSheetIssues(cycleId: string, roundId: string): Promise<string[]> {
  const sheet = await db.scoringSheet.findUnique({ where: { roundId }, select: { schema: true } });
  return sheetIssues(readSheet(sheet?.schema).sections, await publishedQuestionKeys(cycleId));
}

async function sheetView(roundId: string, cycleId: string): Promise<ScoringSheetView> {
  const sheet = await db.scoringSheet.findUnique({ where: { roundId }, select: { schema: true, lockedAt: true } });
  const questions = await questionsForScoring(cycleId);
  const published = await publishedQuestionKeys(cycleId);
  const stored = readSheet(sheet?.schema);
  return {
    roundId,
    sections: stored.sections,
    locked: sheet?.lockedAt !== null && sheet?.lockedAt !== undefined,
    totals: {
      sections: stored.sections.reduce((sum, s) => sum + s.weight, 0),
      bySection: Object.fromEntries(stored.sections.map((s) => [s.key, s.indicators.reduce((sum, i) => sum + i.weight, 0)])),
    },
    issues: sheetIssues(stored.sections, published),
    questions,
  };
}

export async function getScoringSheet(actor: Actor, roundId: string): Promise<ScoringSheetView> {
  const context = await requireRoundStaff(actor, roundId);
  return sheetView(roundId, context.cycleId);
}

/** Saves the sheet; the server makes the keys. Totals may be off while staff work; the publish check needs them right. */
export async function saveScoringSheet(actor: Actor, roundId: string, input: ScoringSheetInput): Promise<ScoringSheetView> {
  const context = await requireRoundStaff(actor, roundId);
  const sheet = await db.scoringSheet.findUnique({ where: { roundId }, select: { schema: true, lockedAt: true } });
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: context.cycleId }, select: { draftFormSchema: true } });
  const versions = await db.formVersion.findMany({ where: { cycleId: context.cycleId }, select: { schema: true } });
  if (sheet?.lockedAt) {
    throw new StateError("Scoring has started in this round, so the scoring sheet is locked.");
  }
  const stored = readSheet(sheet?.schema);
  const questionKeys = new Set(
    [readDraft(cycle.draftFormSchema), ...versions.map((v) => readDefinition(v.schema))].flatMap((form) =>
      form.sections.flatMap((s) => s.questions.map((q) => q.key)),
    ),
  );
  const known = new Set([
    ...stored.usedKeys,
    ...stored.sections.flatMap((s) => [s.key, ...s.indicators.map((i) => i.key)]),
  ]);
  const taken = new Set(known);
  const seen = new Set<string>();
  const issues: Issue[] = [];
  const keyFor = (prefix: KeyPrefix, key: string | undefined, path: string): string => {
    if (key === undefined) {
      const fresh = newKey(prefix, taken);
      taken.add(fresh);
      return fresh;
    }
    if (!known.has(key)) issues.push({ path, message: "This item isn't part of the sheet. Reload the page and try again." });
    if (seen.has(key)) issues.push({ path, message: "This item appears twice." });
    seen.add(key);
    return key;
  };

  const sections: ScoringSection[] = input.sections.map((section, s) => ({
    key: keyFor("area", section.key, `sections.${s}`),
    title: section.title,
    weight: section.weight,
    indicators: section.indicators.map((indicator, i) => {
      const path = `sections.${s}.indicators.${i}`;
      if (!questionKeys.has(indicator.questionKey)) {
        issues.push({ path: `${path}.questionKey`, message: "This question isn't in the form. Pick one of the form's questions." });
      }
      return {
        key: keyFor("ind", indicator.key, path),
        label: indicator.label,
        type: indicator.type,
        weight: indicator.weight,
        questionKey: indicator.questionKey,
      };
    }),
  }));
  if (issues.length > 0) throw new ValidationError("Some parts of the scoring sheet need attention.", issues);

  const usedKeys = [...new Set([...known, ...sections.flatMap((s) => [s.key, ...s.indicators.map((i) => i.key)])])];
  const schema = { sections, usedKeys } satisfies StoredSheet;
  await db.scoringSheet.upsert({
    where: { roundId },
    update: { schema: schema as unknown as Prisma.InputJsonValue },
    create: { roundId, schema: schema as unknown as Prisma.InputJsonValue },
  });
  return sheetView(roundId, context.cycleId);
}
