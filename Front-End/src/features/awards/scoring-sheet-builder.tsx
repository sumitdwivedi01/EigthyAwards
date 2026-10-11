"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { BuilderErrorList, builderErrorsOf, FieldProblem, NO_ERRORS, type BuilderErrors } from "./builder-errors";
import { cycleKey, sheetKey, useScoringSheet } from "./use-awards";

/**
 * The scoring sheet (spec §5.5, ADR 0019): sections with whole-percent weights, each holding
 * indicators with their own weights, each scoring one question. Jurors mark each indicator 0 to
 * 10 (or Yes/No); applicants never see the sheet. The API checks that every total is 100 and
 * that every indicator scores a published question; the totals here only help while typing.
 */

const TYPE_LABELS: Record<IndicatorType, string> = { SCORE: "Score 0 to 10", YES_NO: "Yes / No" };

/** Whole percentages that add up to 100: 100 ÷ n, with the remainder spread over the first ones. */
function evenWeights(count: number): number[] {
  if (count === 0) return [];
  const each = Math.floor(100 / count);
  return Array.from({ length: count }, (_, i) => each + (i < 100 - each * count ? 1 : 0));
}

const total = (weights: number[]) => weights.reduce((sum, w) => sum + (Number.isFinite(w) ? w : 0), 0);

function payloadOf(sections: ScoringSection[]): { sections: ScoringSection[] } {
  return {
    sections: sections.map((s) => ({
      key: s.key,
      title: s.title,
      weight: s.weight,
      indicators: s.indicators.map((i) => ({ key: i.key, label: i.label, type: i.type, weight: i.weight, questionKey: i.questionKey })),
    })),
  };
}

const same = (a: ScoringSection[], b: ScoringSection[]) => JSON.stringify(payloadOf(a)) === JSON.stringify(payloadOf(b));

function weightOf(value: string): number {
  return value.trim() === "" ? 0 : Number(value);
}

export function ScoringSheetBuilder({ cycleId, roundId, blind }: { cycleId: string; roundId: string; blind: boolean }) {
  const sheet = useScoringSheet(roundId);
  if (sheet.isPending) return <LoadingState label="Loading the scoring sheet" lines={6} />;
  if (sheet.error) return <ErrorState error={sheet.error} onRetry={() => void sheet.refetch()} />;
  return <Builder cycleId={cycleId} roundId={roundId} sheet={sheet.data} blind={blind} />;
}

function Builder({ cycleId, roundId, sheet, blind }: { cycleId: string; roundId: string; sheet: ScoringSheet; blind: boolean }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<ScoringSection[]>(sheet.sections);
  // Follows the API's saved sheet while nothing here is unsaved (as in the question builder).
  const [base, setBase] = useState<ScoringSection[]>(sheet.sections);
  if (base !== sheet.sections) {
    if (same(sections, base)) setSections(sheet.sections);
    setBase(sheet.sections);
  }
  const [errors, setErrors] = useState<BuilderErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const locked = sheet.locked;
  const dirty = !same(sections, sheet.sections);
  const sectionTotal = total(sections.map((s) => s.weight));
  const e = errors.byPath;

  const updateSection = (s: number, patch: Partial<ScoringSection>) =>
    setSections((all) => all.map((section, i) => (i === s ? { ...section, ...patch } : section)));
  const updateIndicator = (s: number, i: number, patch: Partial<Indicator>) =>
    setSections((all) =>
      all.map((section, k) =>
        k === s ? { ...section, indicators: section.indicators.map((ind, j) => (j === i ? { ...ind, ...patch } : ind)) } : section,
      ),
    );
  const splitSections = () =>
    setSections((all) => {
      const w = evenWeights(all.length);
      return all.map((section, i) => ({ ...section, weight: w[i] ?? 0 }));
    });
  const splitIndicators = (s: number) =>
    setSections((all) =>
      all.map((section, k) => {
        if (k !== s) return section;
        const w = evenWeights(section.indicators.length);
        return { ...section, indicators: section.indicators.map((ind, j) => ({ ...ind, weight: w[j] ?? 0 })) };
      }),
    );

  async function save() {
    setSaving(true);
    setErrors(NO_ERRORS);
    setNotice(null);
    try {
      const saved = await api.put<ScoringSheet>(`/rounds/${roundId}/scoring-sheet`, payloadOf(sections));
      setSections(saved.sections);
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
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Scoring sheet</CardTitle>
          <CardDescription>
            {locked
              ? "Scoring has started, so the scoring sheet is locked."
              : "What the jury marks. Section weights add up to 100%, and inside each section the indicator weights add up to 100%. Each juror's score is out of 100; an application's score is the average of its jurors' scores."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Section weights: <strong>{sectionTotal}%</strong> of 100%
            </span>
            {!locked && sections.length > 1 && (
              <Button size="sm" variant="outline" onClick={splitSections}>
                Split evenly
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
        </CardContent>
      </Card>

      <BuilderErrorList errors={errors} title="The scoring sheet wasn't saved:" />

      {sections.map((section, s) => {
        const path = `sections.${s}`;
        const domId = `sheet-${path}`;
        const indicatorTotal = total(section.indicators.map((i) => i.weight));
        return (
          <Card key={section.key ?? `new-${s}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Section {s + 1}{section.title && `: ${section.title}`}</CardTitle>
                {!locked && (
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSections((all) => all.filter((_, i) => i !== s))}>
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
                <div className="grid gap-2">
                  <Label htmlFor={`${domId}-weight`}>Weight (%)</Label>
                  <Input
                    id={`${domId}-weight`}
                    type="number"
                    min={1}
                    max={100}
                    value={section.weight === 0 ? "" : section.weight}
                    readOnly={locked}
                    aria-invalid={Boolean(e[`${path}.weight`])}
                    onChange={(event) => updateSection(s, { weight: weightOf(event.target.value) })}
                  />
                  <FieldProblem message={e[`${path}.weight`]} />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">Indicators</span>
                  <span className="text-muted-foreground">weights: {indicatorTotal}% of 100%</span>
                  {!locked && section.indicators.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => splitIndicators(s)}>
                      Split evenly
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
                          <div className="grid gap-2">
                            <Label htmlFor={id("weight")}>Weight (%)</Label>
                            <Input
                              id={id("weight")}
                              type="number"
                              min={1}
                              max={100}
                              value={indicator.weight === 0 ? "" : indicator.weight}
                              readOnly={locked}
                              aria-invalid={Boolean(e[`${ipath}.weight`])}
                              onChange={(event) => updateIndicator(s, i, { weight: weightOf(event.target.value) })}
                            />
                            <FieldProblem message={e[`${ipath}.weight`]} />
                          </div>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateSection(s, { indicators: section.indicators.filter((_, j) => j !== i) })}
                            >
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
                        updateSection(s, {
                          indicators: [
                            ...section.indicators,
                            { label: "", type: "SCORE", weight: Math.max(1, 100 - indicatorTotal), questionKey: "" },
                          ],
                        })
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
          <Button
            variant="outline"
            onClick={() =>
              setSections((all) => [...all, { title: "", weight: Math.max(1, 100 - sectionTotal), indicators: [] }])
            }
          >
            <PlusIcon aria-hidden />
            Add a section
          </Button>
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save scoring sheet"}
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setSections(sheet.sections)} disabled={saving}>
              Undo unsaved changes
            </Button>
          )}
          <FormNotice message={notice} />
        </div>
      )}
    </div>
  );
}
