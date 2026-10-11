import type { Prisma } from "../../generated/prisma/client.js";
import type { Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import { newKey, type KeyPrefix } from "../../lib/ids.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { recordAudit } from "../audit/service.js";
import { refuseAfterDeadline, requireCycleStaff } from "../awards/context.js";
import {
  formDefinitionSchema,
  formDraftSchema,
  TEXT_LIMITS,
  type FormDefinition,
  type FormDraft,
  type FormDraftInput,
  type PublishFormInput,
  type Question,
  type QuestionInput,
} from "./schemas.js";
import type { FormVersionView, FormView } from "./views.js";

/**
 * The questionnaire builder and its versions (spec §5.4, rule R4). Staff edit a draft; publishing
 * inserts an immutable FormVersion (the database refuses UPDATE and DELETE on it). Inside a cycle
 * a published question is never removed and never changes type, and a published choice is never
 * removed, because applicants may already have answered them. Keys are made here and never reused.
 */

interface Issue {
  path: string;
  message: string;
}

const EMPTY_DRAFT: FormDraft = { sections: [], usedKeys: [] };

export function readDraft(json: unknown): FormDraft {
  return json === null || json === undefined ? EMPTY_DRAFT : formDraftSchema.parse(json);
}

export function readDefinition(json: unknown): FormDefinition {
  return formDefinitionSchema.parse(json);
}

/** Every key a form holds: sections, questions and choices. */
export function keysOf(definition: FormDefinition): string[] {
  return definition.sections.flatMap((section) => [
    section.key,
    ...section.questions.flatMap((question) => [question.key, ...(question.options ?? []).map((o) => o.key)]),
  ]);
}

/** JSON with sorted object keys, so two forms compare equal whatever order the database returns. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameForm(a: FormDefinition, b: FormDefinition): boolean {
  return stableStringify(a.sections) === stableStringify(b.sections);
}

type KeyFor = (prefix: KeyPrefix, key: string | undefined, path: string) => string;

/** The stored question: only the fields its type uses, with defaults filled in. */
function canonicalQuestion(input: QuestionInput, key: string, path: string, keyFor: KeyFor, issues: Issue[]): Question {
  const base = { key, type: input.type, label: input.label, help: input.help, required: input.required };
  switch (input.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      const limit = TEXT_LIMITS[input.type];
      const maxLength = input.maxLength ?? limit.default;
      if (maxLength > limit.max) {
        issues.push({ path: `${path}.maxLength`, message: `An answer here can be at most ${limit.max} characters.` });
      }
      return { ...base, maxLength: Math.min(maxLength, limit.max) };
    }
    case "NUMBER":
      if (input.min !== null && input.max !== null && input.min > input.max) {
        issues.push({ path: `${path}.max`, message: "The largest value can't be below the smallest." });
      }
      return { ...base, min: input.min, max: input.max };
    case "SINGLE_CHOICE": {
      const options = input.options.map((option, j) => ({
        key: keyFor("opt", option.key, `${path}.options.${j}`),
        label: option.label,
      }));
      if (options.length < 2) {
        issues.push({ path: `${path}.options`, message: "A single-choice question needs at least two choices." });
      }
      if (new Set(options.map((o) => o.label.toLowerCase())).size !== options.length) {
        issues.push({ path: `${path}.options`, message: "Each choice needs different wording." });
      }
      return { ...base, options };
    }
    case "YES_NO":
      return base;
    case "FILE_UPLOAD":
      return { ...base, maxFiles: input.maxFiles, fileTypes: [...new Set(input.fileTypes)] };
  }
}

/**
 * Turns the builder's draft into the stored form. Items without a key are new and get one; a key
 * must be one the cycle already knows (only the server makes keys) and can appear only once.
 */
function buildDraft(input: FormDraftInput, known: ReadonlySet<string>, taken: Set<string>, issues: Issue[]): FormDefinition {
  const seen = new Set<string>();
  const keyFor: KeyFor = (prefix, key, path) => {
    if (key === undefined) {
      const fresh = newKey(prefix, taken);
      taken.add(fresh);
      return fresh;
    }
    if (!known.has(key)) issues.push({ path, message: "This item isn't part of the form. Reload the page and try again." });
    if (seen.has(key)) issues.push({ path, message: "This item appears twice." });
    seen.add(key);
    return key;
  };
  return {
    sections: input.sections.map((section, s) => {
      const sectionPath = `sections.${s}`;
      return {
        key: keyFor("sec", section.key, sectionPath),
        title: section.title,
        description: section.description,
        questions: section.questions.map((question, q) => {
          const path = `${sectionPath}.questions.${q}`;
          return canonicalQuestion(question, keyFor("q", question.key, path), path, keyFor, issues);
        }),
      };
    }),
  };
}

/** Inside a cycle nothing published is removed, and no published question changes type (spec §5.4). */
function refuseChangesToPublished(draft: FormDefinition, published: FormDefinition, issues: Issue[]): void {
  const sections = new Set(draft.sections.map((s) => s.key));
  const questions = new Map(draft.sections.flatMap((s) => s.questions).map((q) => [q.key, q]));
  for (const section of published.sections) {
    if (!sections.has(section.key)) {
      issues.push({ path: "sections", message: `The section "${section.title}" is published, so it can't be removed in this edition.` });
    }
    for (const question of section.questions) {
      const now = questions.get(question.key);
      if (!now) {
        issues.push({
          path: "sections",
          message: `The question "${question.label}" is published, so it can't be removed in this edition: applicants may already have answered it.`,
        });
        continue;
      }
      if (now.type !== question.type) {
        issues.push({ path: "sections", message: `The question "${question.label}" is published, so its type can't change in this edition.` });
      }
      const choices = new Set((now.options ?? []).map((o) => o.key));
      for (const option of question.options ?? []) {
        if (!choices.has(option.key)) {
          issues.push({ path: "sections", message: `The choice "${option.label}" is published, so it can't be removed in this edition.` });
        }
      }
    }
  }
}

async function versionsOf(cycleId: string) {
  return db.formVersion.findMany({
    where: { cycleId },
    select: { version: true, schema: true, changeSummary: true, publishedAt: true, publishedBy: { select: { name: true } } },
    orderBy: { version: "asc" },
  });
}

async function formView(cycleId: string, deadlineAt: Date): Promise<FormView> {
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, select: { draftFormSchema: true } });
  const versions = await versionsOf(cycleId);
  const draft = readDraft(cycle.draftFormSchema);
  const latest = versions.at(-1);
  const latestDefinition = latest ? readDefinition(latest.schema) : null;
  return {
    cycleId,
    draft: { sections: draft.sections },
    versions: versions.map(
      (v): FormVersionView => ({
        version: v.version,
        changeSummary: v.changeSummary,
        publishedAt: v.publishedAt.toISOString(),
        publishedBy: v.publishedBy?.name ?? null,
      }),
    ),
    latestVersion: latest?.version ?? null,
    hasUnpublishedChanges: latestDefinition ? !sameForm({ sections: draft.sections }, latestDefinition) : draft.sections.length > 0,
    publishedKeys: latestDefinition ? keysOf(latestDefinition) : [],
    locked: clock.now() >= deadlineAt,
  };
}

export async function getForm(actor: Actor, cycleId: string): Promise<FormView> {
  const context = await requireCycleStaff(actor, cycleId);
  return formView(context.cycleId, context.deadlineAt);
}

/** Saves the draft (not yet seen by applicants). Answers never depend on a draft. */
export async function saveFormDraft(actor: Actor, cycleId: string, input: FormDraftInput): Promise<FormView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseAfterDeadline(context, "the questions");
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, select: { draftFormSchema: true } });
  const versions = await versionsOf(cycleId);
  const stored = readDraft(cycle.draftFormSchema);
  const definitions = versions.map((v) => readDefinition(v.schema));
  const known = new Set([...stored.usedKeys, ...keysOf(stored), ...definitions.flatMap(keysOf)]);
  const taken = new Set(known);
  const issues: Issue[] = [];
  const draft = buildDraft(input, known, taken, issues);
  const latest = definitions.at(-1);
  if (latest) refuseChangesToPublished(draft, latest, issues);
  if (issues.length > 0) throw new ValidationError("Some parts of the form need attention.", issues);

  const saved: FormDraft = { sections: draft.sections, usedKeys: [...taken] };
  await db.cycle.update({ where: { id: cycleId }, data: { draftFormSchema: saved as unknown as Prisma.InputJsonValue } });
  return formView(cycleId, context.deadlineAt);
}

/**
 * Publishes the draft as the next immutable version, with a short change summary (spec §5.4). An
 * application always opens with the version it is pinned to (R4), so old versions stay as they are.
 */
export async function publishFormVersion(actor: Actor, cycleId: string, input: PublishFormInput): Promise<FormView> {
  const context = await requireCycleStaff(actor, cycleId);
  refuseAfterDeadline(context, "the questions");
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, select: { draftFormSchema: true } });
  const versions = await versionsOf(cycleId);
  const draft: FormDefinition = { sections: readDraft(cycle.draftFormSchema).sections };
  const issues: Issue[] = [];
  if (draft.sections.length === 0) issues.push({ path: "sections", message: "Add at least one section with a question." });
  for (const section of draft.sections) {
    if (section.questions.length === 0) {
      issues.push({ path: "sections", message: `The section "${section.title}" has no questions yet.` });
    }
  }
  const latest = versions.at(-1);
  const latestDefinition = latest ? readDefinition(latest.schema) : null;
  if (latestDefinition) refuseChangesToPublished(draft, latestDefinition, issues);
  if (issues.length > 0) throw new ValidationError("The questions can't be published yet.", issues);
  if (latest && latestDefinition && sameForm(draft, latestDefinition)) {
    throw new StateError(`Nothing has changed since version ${latest.version}.`);
  }

  const version = (latest?.version ?? 0) + 1;
  try {
    await db.$transaction(async (tx) => {
      await tx.formVersion.create({
        data: {
          cycleId,
          version,
          schema: draft as unknown as Prisma.InputJsonValue,
          changeSummary: input.changeSummary,
          publishedById: actor.userId,
        },
      });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: "AWARD_STAFF",
        action: "form.version_published",
        entityType: "cycle",
        entityId: cycleId,
        cycleId,
        after: { version, changeSummary: input.changeSummary },
      });
    });
  } catch (error) {
    // Two staff publishing at the same moment: the unique (cycle, version) index decides.
    if (isUniqueViolation(error)) throw new StateError("Someone else published the questions at the same moment. Reload and check.");
    throw error;
  }
  return formView(cycleId, context.deadlineAt);
}

export async function getFormVersion(
  actor: Actor,
  cycleId: string,
  version: number,
): Promise<FormVersionView & { definition: FormDefinition }> {
  await requireCycleStaff(actor, cycleId);
  const row = await db.formVersion.findUnique({
    where: { cycleId_version: { cycleId, version } },
    select: { version: true, schema: true, changeSummary: true, publishedAt: true, publishedBy: { select: { name: true } } },
  });
  if (!row) throw new NotFoundError("Version not found.");
  return {
    version: row.version,
    changeSummary: row.changeSummary,
    publishedAt: row.publishedAt.toISOString(),
    publishedBy: row.publishedBy?.name ?? null,
    definition: readDefinition(row.schema),
  };
}

/** The latest published questions of a cycle, for the publish check and the scoring sheet. */
export async function latestPublishedForm(cycleId: string): Promise<{ version: number; definition: FormDefinition } | null> {
  const latest = await db.formVersion.findFirst({
    where: { cycleId },
    select: { version: true, schema: true },
    orderBy: { version: "desc" },
  });
  return latest ? { version: latest.version, definition: readDefinition(latest.schema) } : null;
}

/** Every question the staff can point an indicator at: the draft's, and whether each is published. */
export async function questionsForScoring(cycleId: string): Promise<{ key: string; label: string; type: string; published: boolean }[]> {
  const cycle = await db.cycle.findUniqueOrThrow({ where: { id: cycleId }, select: { draftFormSchema: true } });
  const latest = await latestPublishedForm(cycleId);
  const published = new Set(latest ? latest.definition.sections.flatMap((s) => s.questions.map((q) => q.key)) : []);
  return readDraft(cycle.draftFormSchema).sections.flatMap((section) =>
    section.questions.map((q) => ({ key: q.key, label: q.label, type: q.type, published: published.has(q.key) })),
  );
}
