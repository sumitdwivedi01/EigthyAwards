"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, PlusIcon, Trash2Icon, WandSparklesIcon } from "lucide-react";
import { FormNotice } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api-client";
import type { Indicator, IndicatorType, ScoringSection, ScoringSheet } from "@/lib/api-types";
import { addBalanced, balance, fromSaved, isEvenSplit, makeEqual, removeBalanced, setWeight, type Weighted } from "@/lib/weights";
import { BuilderErrorList, builderErrorsOf, FieldProblem, NO_ERRORS, type BuilderErrors } from "./builder-errors";
import { cycleKey, sheetKey, useScoringSheet } from "./use-awards";

/**
 * The scoring sheet (spec §5.5, ADR 0019): sections with whole-percent weights, each holding
 * indicators with their own weights, each scoring one question. Jurors mark each indicator 0 to
 * 10 (or Yes/No); applicants never see the sheet. Weights balance themselves (lib/weights.ts):
 * untouched ones share 100% equally, a typed one stays and the others adjust, so every total is
 * exactly 100 without any arithmetic. The API still checks the totals and the questions.
 */

const TYPE_LABELS: Record<IndicatorType, string> = { SCORE: "Score 0 to 10", YES_NO: "Yes / No" };

type LocalIndicator = Indicator & Weighted;
type LocalSection = Omit<ScoringSection, "indicators"> & Weighted & { indicators: LocalIndicator[] };

/** A saved sheet on screen: an evenly split group stays automatic, a hand-set one counts as typed. */
function toLocal(sections: ScoringSection[]): LocalSection[] {
  return fromSaved(sections).map((section) => ({ ...section, indicators: fromSaved(section.indicators) }));
}

/** After saving, the flags of what was typed carry over to the saved sheet (same order). */
function keepFlags(saved: ScoringSection[], local: LocalSection[]): LocalSection[] {
  const fresh = toLocal(saved);
  if (fresh.length !== local.length) return fresh;
  return fresh.map((section, s) => {
    const before = local[s];
    if (!before || before.indicators.length !== section.indicators.length) return section;
    return {
      ...section,
      manual: before.manual,
      indicators: section.indicators.map((indicator, i) => ({ ...indicator, manual: before.indicators[i]?.manual })),
    };
  });
}

const total = (items: { weight: number }[]) => items.reduce((sum, item) => sum + (Number.isFinite(item.weight) ? item.weight : 0), 0);

function payloadOf(sections: (ScoringSection | LocalSection)[]): { sections: ScoringSection[] } {
  return {
    sections: sections.map((s) => ({
      key: s.key,
      title: s.title,
      weight: s.weight,
      indicators: s.indicators.map((i) => ({ key: i.key, label: i.label, type: i.type, weight: i.weight, questionKey: i.questionKey })),
    })),
  };
}

const same = (a: (ScoringSection | LocalSection)[], b: (ScoringSection | LocalSection)[]) =>
  JSON.stringify(payloadOf(a)) === JSON.stringify(payloadOf(b));

/** Back to automatic: the item shares what is left with the other automatic ones. */
function makeAutomatic<T extends Weighted>(items: T[], index: number): T[] {
  return balance(items.map((item, i) => (i === index ? { ...item, manual: false } : item)));
}

export function ScoringSheetBuilder({ cycleId, roundId, blind }: { cycleId: string; roundId: string; blind: boolean }) {
  const sheet = useScoringSheet(roundId);
  if (sheet.isPending) return <LoadingState label="Loading the scoring sheet" lines={6} />;
  if (sheet.error) return <ErrorState error={sheet.error} onRetry={() => void sheet.refetch()} />;
  return <Builder cycleId={cycleId} roundId={roundId} sheet={sheet.data} blind={blind} />;
}

function Builder({ cycleId, roundId, sheet, blind }: { cycleId: string; roundId: string; sheet: ScoringSheet; blind: boolean }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<LocalSection[]>(() => toLocal(sheet.sections));
  // Follows the API's saved sheet while nothing here is unsaved (as in the question builder).
  const [base, setBase] = useState<ScoringSection[]>(sheet.sections);
  if (base !== sheet.sections) {
    if (same(sections, base)) setSections(toLocal(sheet.sections));
    setBase(sheet.sections);
  }
  const [errors, setErrors] = useState<BuilderErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const locked = sheet.locked;
  const dirty = !same(sections, sheet.sections);
  const sectionTotal = total(sections);
  const e = errors.byPath;

  const updateSection = (s: number, patch: Partial<LocalSection>) =>
    setSections((all) => all.map((section, i) => (i === s ? { ...section, ...patch } : section)));
  const updateIndicators = (s: number, change: (indicators: LocalIndicator[]) => LocalIndicator[]) =>
    setSections((all) => all.map((section, i) => (i === s ? { ...section, indicators: change(section.indicators) } : section)));
  const updateIndicator = (s: number, i: number, patch: Partial<LocalIndicator>) =>
    updateIndicators(s, (indicators) => indicators.map((ind, j) => (j === i ? { ...ind, ...patch } : ind)));

  /** A sheet that mirrors the form: one section per form section, one indicator per question, all equal. */
  function startFromQuestions() {
    const groups = new Map<string, { title: string; questions: ScoringSheet["questions"] }>();
    for (const question of sheet.questions) {
      // A blind award never shows files to the jury (ADR 0018), so they can't be judged.
      if (blind && question.type === "FILE_UPLOAD") continue;
      const group = groups.get(question.section.key) ?? { title: question.section.title, questions: [] };
      group.questions.push(question);
      groups.set(question.section.key, group);
    }
    const built = [...groups.values()].map((group) => ({
      title: group.title || "Section",
      weight: 0,
      indicators: makeEqual(
        group.questions.map((q) => ({
          label: (q.label || "Question").slice(0, 300),
          type: (q.type === "YES_NO" ? "YES_NO" : "SCORE") as IndicatorType,
          weight: 0,
          questionKey: q.key,
        })),
      ),
    }));
    setSections(makeEqual(built));
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setErrors(NO_ERRORS);
    setNotice(null);
    try {
      const saved = await api.put<ScoringSheet>(`/rounds/${roundId}/scoring-sheet`, payloadOf(sections));
      setSections((local) => keepFlags(saved.sections, local));
      setBase(saved.sections);
      queryClient.setQueryData(sheetKey(roundId), saved);
      setNotice("Scoring sheet saved.");
      await queryClient.invalidateQueries({ queryKey: cycleKey(cycleId) });
    } catch (error) {
      setErrors(builderErrorsOf(error));
    } finally {
      setSaving(false);
    }
  }

  const questions = sheet.questions;
  const scorable = questions.filter((q) => !(blind && q.type === "FILE_UPLOAD"));
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Scoring sheet</CardTitle>
          <CardDescription>
            {locked
              ? "Scoring has started, so the scoring sheet is locked."
              : "What the jury marks. Each juror's score is out of 100; an application's score is the average of its jurors' scores. Weights balance themselves: they start equal and always add up to 100%. Type a weight only if one part should count more; the others adjust."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TotalBadge label="Section weights" value={sectionTotal} />
            {!locked && sections.length > 1 && !isEvenSplit(sections.map((s) => s.weight)) && (
              <Button size="sm" variant="outline" onClick={() => setSections((all) => makeEqual(all))}>
                Make equal
              </Button>
            )}
            {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          </div>
          {!dirty && sheet.issues.length > 0 && (
            <ul className="grid gap-2">
              {sheet.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          )}
          {questions.length === 0 && (
            <p className="text-muted-foreground">Add questions first: every indicator scores one of the form&apos;s questions.</p>
          )}
          {!locked && sections.length === 0 && scorable.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">Start from the questions:</span> one section per form section and one indicator per
                question, all weighted equally. Rename, remove or reweight anything afterwards.
                {blind && " File questions are left out: the jury of a blind award doesn't see files."}
              </p>
              <Button onClick={startFromQuestions}>
                <WandSparklesIcon aria-hidden />
                Start from the questions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BuilderErrorList errors={errors} title="The scoring sheet wasn't saved:" />

      {sections.map((section, s) => {
        const path = `sections.${s}`;
        const domId = `sheet-${path}`;
        const indicatorTotal = total(section.indicators);
        return (
          <Card key={section.key ?? `new-${s}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  Section {s + 1}
                  {section.title && `: ${section.title}`}
                </CardTitle>
                {!locked && (
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSections((all) => removeBalanced(all, s))}>
                    <Trash2Icon aria-hidden />
                    Remove section
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
                <div className="grid gap-2">
                  <Label htmlFor={`${domId}-title`}>Section title</Label>
                  <Input
                    id={`${domId}-title`}
                    value={section.title}
                    readOnly={locked}
                    aria-invalid={Boolean(e[`${path}.title`])}
                    onChange={(event) => updateSection(s, { title: event.target.value })}
                  />
                  <FieldProblem message={e[`${path}.title`]} />
                </div>
                <WeightField
                  id={`${domId}-weight`}
                  item={section}
                  alone={sections.length === 1}
                  locked={locked}
                  error={e[`${path}.weight`]}
                  onSet={(value) => setSections((all) => setWeight(all, s, value))}
                  onAutomatic={() => setSections((all) => makeAutomatic(all, s))}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">Indicators</span>
                  {section.indicators.length > 0 && <TotalBadge label="Weights" value={indicatorTotal} small />}
                  {!locked && section.indicators.length > 1 && !isEvenSplit(section.indicators.map((i) => i.weight)) && (
                    <Button size="sm" variant="ghost" onClick={() => updateIndicators(s, (indicators) => makeEqual(indicators))}>
                      Make equal
                    </Button>
                  )}
                </div>
                <ol className="grid gap-3">
                  {section.indicators.map((indicator, i) => {
                    const ipath = `${path}.indicators.${i}`;
                    const id = (field: string) => `sheet-${ipath}-${field}`;
                    return (
                      <li key={indicator.key ?? `new-${i}`} className="surface grid gap-4 p-4 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
                          <div className="grid gap-2">
                            <Label htmlFor={id("label")}>Indicator {i + 1}</Label>
                            <Input
                              id={id("label")}
                              value={indicator.label}
                              readOnly={locked}
                              placeholder="For example: Reduction in accidents"
                              aria-invalid={Boolean(e[`${ipath}.label`])}
                              onChange={(event) => updateIndicator(s, i, { label: event.target.value })}
                            />
                            <FieldProblem message={e[`${ipath}.label`]} />
                          </div>
                          <WeightField
                            id={id("weight")}
                            item={indicator}
                            alone={section.indicators.length === 1}
                            locked={locked}
                            error={e[`${ipath}.weight`]}
                            onSet={(value) => updateIndicators(s, (indicators) => setWeight(indicators, i, value))}
                            onAutomatic={() => updateIndicators(s, (indicators) => makeAutomatic(indicators, i))}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
                          <div className="grid gap-2">
                            <Label htmlFor={id("question")}>Scores the answer to</Label>
                            <NativeSelect
                              id={id("question")}
                              value={indicator.questionKey}
                              disabled={locked}
                              aria-invalid={Boolean(e[`${ipath}.questionKey`])}
                              onChange={(event) => updateIndicator(s, i, { questionKey: event.target.value })}
                            >
                              <option value="">Pick a question</option>
                              {questions.map((q) => (
                                <option key={q.key} value={q.key}>
                                  {q.label || "(question without wording)"}
                                  {q.published ? "" : " (not published yet)"}
                                </option>
                              ))}
                            </NativeSelect>
                            <FieldProblem message={e[`${ipath}.questionKey`]} />
                            {blind && questions.find((q) => q.key === indicator.questionKey)?.type === "FILE_UPLOAD" && (
                              <p className="text-sm font-medium text-warning">
                                Blind award: jurors won&apos;t see this file, so they can&apos;t judge it. Score a written answer
                                instead.
                              </p>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={id("type")}>Marked as</Label>
                            <NativeSelect
                              id={id("type")}
                              value={indicator.type}
                              disabled={locked}
                              onChange={(event) => updateIndicator(s, i, { type: event.target.value as IndicatorType })}
                            >
                              {(Object.keys(TYPE_LABELS) as IndicatorType[]).map((type) => (
                                <option key={type} value={type}>
                                  {TYPE_LABELS[type]}
                                </option>
                              ))}
                            </NativeSelect>
                          </div>
                        </div>
                        {!locked && (
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => updateIndicators(s, (indicators) => removeBalanced(indicators, i))}>
                              <Trash2Icon aria-hidden />
                              Remove indicator
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {!locked && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateIndicators(s, (indicators) => addBalanced(indicators, { label: "", type: "SCORE", weight: 0, questionKey: "" }))
                      }
                    >
                      <PlusIcon aria-hidden />
                      Add an indicator
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!locked && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setSections((all) => addBalanced(all, { title: "", weight: 0, indicators: [] }))}>
            <PlusIcon aria-hidden />
            Add a section
          </Button>
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save scoring sheet"}
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setSections(toLocal(sheet.sections))} disabled={saving}>
              Undo unsaved changes
            </Button>
          )}
          <FormNotice message={notice} />
        </div>
      )}
    </div>
  );
}

/** "Section weights: 100%" with a tick, or the off total in amber (only a sheet saved before auto-balancing can be off). */
function TotalBadge({ label, value, small = false }: { label: string; value: number; small?: boolean }) {
  const right = value === 100;
  return (
    <span className={`flex items-center gap-1.5 ${small ? "text-muted-foreground" : ""}`}>
      {right ? <CheckCircle2Icon className="size-4 text-success" aria-hidden /> : <CircleAlertIcon className="size-4 text-warning" aria-hidden />}
      {label}: <strong className={right ? "" : "text-warning"}>{value}%</strong>
      {!right && " of 100%"}
    </span>
  );
}

/**
 * A weight that balances with its group. Every whole number from 1 to 100 typed is applied at once
 * and the others adjust, so the field shows the balanced weight (98 when 100 can't fit). Only
 * half-typed text (an emptied field, say) is kept on screen, until the weight changes some other
 * way ("Make equal", "automatic") or the field is left. A typed weight says so, with a way back.
 */
function WeightField({
  id,
  item,
  alone,
  locked,
  error,
  onSet,
  onAutomatic,
}: {
  id: string;
  item: Weighted;
  alone: boolean;
  locked: boolean;
  error: string | undefined;
  onSet: (value: number) => void;
  onAutomatic: () => void;
}) {
  // Half-typed text, and the weight it was typed over: shown only while that weight still stands.
  const [draft, setDraft] = useState<{ text: string; over: number } | null>(null);
  const shown = draft && draft.over === item.weight ? draft.text : item.weight === 0 ? "" : String(item.weight);
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>Weight (%)</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        step={1}
        value={shown}
        readOnly={locked || alone}
        title={alone ? "The only one here, so it counts for 100%." : undefined}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const text = event.target.value;
          const value = Number(text);
          if (text.trim() !== "" && Number.isInteger(value) && value >= 1 && value <= 100) {
            setDraft(null);
            onSet(value);
          } else {
            setDraft({ text, over: item.weight });
          }
        }}
        onBlur={() => setDraft(null)}
      />
      <FieldProblem message={error} />
      {!locked && !alone && (
        <p className="text-xs text-muted-foreground">
          {item.manual ? (
            <>
              Set by you ·{" "}
              <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={onAutomatic}>
                automatic
              </button>
            </>
          ) : (
            "Automatic"
          )}
        </p>
      )}
      {alone && !locked && <p className="text-xs text-muted-foreground">The only one: 100%</p>}
    </div>
  );
}
