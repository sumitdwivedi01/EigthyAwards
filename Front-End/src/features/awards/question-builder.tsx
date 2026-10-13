"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { FormNotice } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { FileType, FormBuilder, FormSection, FormVersionSummary, Question, QuestionType } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { BuilderErrorList, builderErrorsOf, FieldProblem, NO_ERRORS, type BuilderErrors } from "./builder-errors";
import { cycleKey, formKey, useFormBuilder } from "./use-awards";

/**
 * The question builder (spec §5.4, rule R4). Staff edit a draft and save it; publishing makes the
 * saved draft the next immutable version. What is published can't be removed or change type in
 * this edition: the API refuses it, and the builder hides those buttons so nobody tries.
 */

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short answer",
  LONG_TEXT: "Long answer",
  NUMBER: "Number",
  SINGLE_CHOICE: "One choice from a list",
  YES_NO: "Yes or no",
  FILE_UPLOAD: "File upload",
};

const FILE_LABELS: Record<FileType, string> = { pdf: "PDF", jpg: "JPG", png: "PNG", docx: "Word", xlsx: "Excel" };

function newQuestion(type: QuestionType = "SHORT_TEXT"): Question {
  return withType({ type, label: "", help: "", required: true }, type);
}

/** A question as its new type uses it: the old type's settings are dropped. */
function withType(question: Question, type: QuestionType): Question {
  const base: Question = { key: question.key, type, label: question.label, help: question.help, required: question.required };
  switch (type) {
    case "SHORT_TEXT":
    case "LONG_TEXT":
      return { ...base, maxLength: null };
    case "NUMBER":
      return { ...base, min: null, max: null };
    case "SINGLE_CHOICE":
      return { ...base, options: [{ label: "" }, { label: "" }] };
    case "YES_NO":
      return base;
    case "FILE_UPLOAD":
      return { ...base, maxFiles: 1, fileTypes: ["pdf", "jpg", "png"] };
  }
}

/** What is sent: only the fields the question's type uses (keys only for what already exists). */
function questionPayload(q: Question): Question {
  const base: Question = { key: q.key, type: q.type, label: q.label, help: q.help, required: q.required };
  switch (q.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT":
      return { ...base, maxLength: q.maxLength ?? null };
    case "NUMBER":
      return { ...base, min: q.min ?? null, max: q.max ?? null };
    case "SINGLE_CHOICE":
      return { ...base, options: (q.options ?? []).map((o) => ({ key: o.key, label: o.label })) };
    case "YES_NO":
      return base;
    case "FILE_UPLOAD":
      return { ...base, maxFiles: q.maxFiles ?? 1, fileTypes: q.fileTypes ?? [] };
  }
}

function payloadOf(sections: FormSection[]): { sections: FormSection[] } {
  return {
    sections: sections.map((s) => ({ key: s.key, title: s.title, description: s.description, questions: s.questions.map(questionPayload) })),
  };
}

const same = (a: FormSection[], b: FormSection[]) => JSON.stringify(payloadOf(a)) === JSON.stringify(payloadOf(b));

/** "" in a number box means "not set". */
function numberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function QuestionBuilder({ cycleId, blind }: { cycleId: string; blind: boolean }) {
  const form = useFormBuilder(cycleId);
  if (form.isPending) return <LoadingState label="Loading the questions" lines={6} />;
  if (form.error) return <ErrorState error={form.error} onRetry={() => void form.refetch()} />;
  return <Builder cycleId={cycleId} builder={form.data} blind={blind} />;
}

function Builder({ cycleId, builder, blind }: { cycleId: string; builder: FormBuilder; blind: boolean }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<FormSection[]>(builder.draft.sections);
  // The saved draft this screen started from; when the API's draft changes and nothing here is
  // unsaved, the screen follows it.
  const [base, setBase] = useState<FormSection[]>(builder.draft.sections);
  if (base !== builder.draft.sections) {
    if (same(sections, base)) setSections(builder.draft.sections);
    setBase(builder.draft.sections);
  }
  const [errors, setErrors] = useState<BuilderErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const published = new Set(builder.publishedKeys);
  const locked = builder.locked;
  const dirty = !same(sections, builder.draft.sections);

  const updateSection = (s: number, patch: Partial<FormSection>) =>
    setSections((all) => all.map((section, i) => (i === s ? { ...section, ...patch } : section)));
  const updateQuestion = (s: number, q: number, next: Question) =>
    setSections((all) =>
      all.map((section, i) => (i === s ? { ...section, questions: section.questions.map((question, j) => (j === q ? next : question)) } : section)),
    );

  async function save() {
    setSaving(true);
    setErrors(NO_ERRORS);
    setNotice(null);
    try {
      const saved = await api.put<FormBuilder>(`/cycles/${cycleId}/form-draft`, payloadOf(sections));
      setSections(saved.draft.sections);
      setBase(saved.draft.sections);
      queryClient.setQueryData(formKey(cycleId), saved);
      setNotice("Draft saved. Applicants see it once you publish it as a version.");
      await refreshOthers(queryClient, cycleId);
    } catch (error) {
      setErrors(builderErrorsOf(error));
    } finally {
      setSaving(false);
    }
  }

  const e = errors.byPath;
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {locked
              ? "The deadline has passed, so the questions are fixed."
              : "Build the application form in sections. Save the draft as you go; applicants only ever see a published version, and each application keeps the version it started with."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {builder.latestVersion === null ? (
            <Badge variant="outline">Nothing published yet</Badge>
          ) : (
            <Badge variant="success">Version {builder.latestVersion} is live</Badge>
          )}
          {dirty ? <Badge variant="warning">Unsaved changes</Badge> : builder.hasUnpublishedChanges && <Badge variant="secondary">Saved, not published</Badge>}
          {blind && (
            <p className="basis-full text-muted-foreground">
              This award is judged blind: jurors see the answers as typed, never who applied, and no uploaded files.
              File questions are for staff only. Applicants are asked not to name their organisation in their answers.
            </p>
          )}
        </CardContent>
      </Card>

      <BuilderErrorList errors={errors} title="The draft wasn't saved:" />

      {sections.map((section, s) => {
        const sectionPublished = section.key !== undefined && published.has(section.key);
        const path = `sections.${s}`;
        const domId = `form-${path}`;
        return (
          <Card key={section.key ?? `new-${s}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Section {s + 1}{section.title && `: ${section.title}`}</CardTitle>
                {sectionPublished && <Badge variant="secondary">Published</Badge>}
                {!locked && (
                  <div className="ml-auto flex gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => setSections((all) => move(all, s, s - 1))} disabled={s === 0} aria-label="Move section up">
                      <ArrowUpIcon aria-hidden />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setSections((all) => move(all, s, s + 1))}
                      disabled={s === sections.length - 1}
                      aria-label="Move section down"
                    >
                      <ArrowDownIcon aria-hidden />
                    </Button>
                    {!sectionPublished && (
                      <Button size="sm" variant="ghost" onClick={() => setSections((all) => all.filter((_, i) => i !== s))}>
                        <Trash2Icon aria-hidden />
                        Remove section
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
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
                <Label htmlFor={`${domId}-description`}>Introduction (optional)</Label>
                <Textarea
                  id={`${domId}-description`}
                  rows={2}
                  value={section.description}
                  readOnly={locked}
                  onChange={(event) => updateSection(s, { description: event.target.value })}
                />
              </div>
              <ol className="grid gap-3">
                {section.questions.map((question, q) => (
                  <QuestionEditor
                    key={question.key ?? `new-${q}`}
                    question={question}
                    blind={blind}
                    number={q + 1}
                    path={`${path}.questions.${q}`}
                    errors={e}
                    locked={locked}
                    published={published}
                    first={q === 0}
                    last={q === section.questions.length - 1}
                    onChange={(next) => updateQuestion(s, q, next)}
                    onMove={(by) => updateSection(s, { questions: move(section.questions, q, q + by) })}
                    onRemove={() => updateSection(s, { questions: section.questions.filter((_, j) => j !== q) })}
                  />
                ))}
              </ol>
              {!locked && (
                <div>
                  <Button size="sm" variant="outline" onClick={() => updateSection(s, { questions: [...section.questions, newQuestion()] })}>
                    <PlusIcon aria-hidden />
                    Add a question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!locked && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setSections((all) => [...all, { title: "", description: "", questions: [newQuestion()] }])}
          >
            <PlusIcon aria-hidden />
            Add a section
          </Button>
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setSections(builder.draft.sections)} disabled={saving}>
              Undo unsaved changes
            </Button>
          )}
          <FormNotice message={notice} />
        </div>
      )}

      <PublishVersion cycleId={cycleId} builder={builder} dirty={dirty} onPublished={() => setNotice(null)} />
      <Versions cycleId={cycleId} versions={builder.versions} />
    </div>
  );
}

/** The scoring sheet lists the form's questions, and the publish check reads both. */
async function refreshOthers(queryClient: ReturnType<typeof useQueryClient>, cycleId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: cycleKey(cycleId) }),
    queryClient.invalidateQueries({ queryKey: ["rounds"] }),
  ]);
}

function QuestionEditor({
  question,
  blind,
  number,
  path,
  errors,
  locked,
  published,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  question: Question;
  blind: boolean;
  number: number;
  path: string;
  errors: Record<string, string>;
  locked: boolean;
  published: ReadonlySet<string>;
  first: boolean;
  last: boolean;
  onChange: (next: Question) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const isPublished = question.key !== undefined && published.has(question.key);
  const set = (patch: Partial<Question>) => onChange({ ...question, ...patch });
  const id = (field: string) => `form-${path}-${field}`;
  const options = question.options ?? [];
  const fileTypes = question.fileTypes ?? [];

  return (
    <li className="surface grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Question {number}</span>
        {isPublished && <Badge variant="secondary">Published</Badge>}
        {!locked && (
          <div className="ml-auto flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => onMove(-1)} disabled={first} aria-label={`Move question ${number} up`}>
              <ArrowUpIcon aria-hidden />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => onMove(1)} disabled={last} aria-label={`Move question ${number} down`}>
              <ArrowDownIcon aria-hidden />
            </Button>
            {!isPublished && (
              <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label={`Remove question ${number}`}>
                <Trash2Icon aria-hidden />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor={id("label")}>Question</Label>
          <Input
            id={id("label")}
            value={question.label}
            readOnly={locked}
            aria-invalid={Boolean(errors[`${path}.label`])}
            onChange={(event) => set({ label: event.target.value })}
          />
          <FieldProblem message={errors[`${path}.label`]} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("type")}>Answer type</Label>
          <NativeSelect
            id={id("type")}
            value={question.type}
            disabled={locked || isPublished}
            onChange={(event) => onChange(withType(question, event.target.value as QuestionType))}
          >
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
          {isPublished && <p className="text-sm text-muted-foreground">Published, so its type is fixed in this edition.</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("help")}>Help text (optional)</Label>
        <Input id={id("help")} value={question.help} readOnly={locked} onChange={(event) => set({ help: event.target.value })} />
      </div>

      {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") && (
        <div className="grid max-w-60 gap-1.5">
          <Label htmlFor={id("maxLength")}>Most characters</Label>
          <Input
            id={id("maxLength")}
            type="number"
            min={1}
            value={question.maxLength ?? ""}
            readOnly={locked}
            placeholder="Standard limit"
            aria-invalid={Boolean(errors[`${path}.maxLength`])}
            onChange={(event) => set({ maxLength: numberOrNull(event.target.value) })}
          />
          <FieldProblem message={errors[`${path}.maxLength`]} />
        </div>
      )}

      {question.type === "NUMBER" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={id("min")}>Smallest value (optional)</Label>
            <Input id={id("min")} type="number" value={question.min ?? ""} readOnly={locked} onChange={(event) => set({ min: numberOrNull(event.target.value) })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("max")}>Largest value (optional)</Label>
            <Input
              id={id("max")}
              type="number"
              value={question.max ?? ""}
              readOnly={locked}
              aria-invalid={Boolean(errors[`${path}.max`])}
              onChange={(event) => set({ max: numberOrNull(event.target.value) })}
            />
            <FieldProblem message={errors[`${path}.max`]} />
          </div>
        </div>
      )}

      {question.type === "SINGLE_CHOICE" && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Choices</legend>
          {options.map((option, o) => {
            const optionPublished = option.key !== undefined && published.has(option.key);
            return (
              <div key={option.key ?? `new-${o}`} className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Choice ${o + 1}`}
                    value={option.label}
                    readOnly={locked}
                    aria-invalid={Boolean(errors[`${path}.options.${o}.label`])}
                    onChange={(event) => set({ options: options.map((item, k) => (k === o ? { ...item, label: event.target.value } : item)) })}
                  />
                  {!locked && !optionPublished && (
                    <Button size="icon-sm" variant="ghost" onClick={() => set({ options: options.filter((_, k) => k !== o) })} aria-label={`Remove choice ${o + 1}`}>
                      <Trash2Icon aria-hidden />
                    </Button>
                  )}
                </div>
                <FieldProblem message={errors[`${path}.options.${o}.label`]} />
              </div>
            );
          })}
          <FieldProblem message={errors[`${path}.options`]} />
          {!locked && (
            <div>
              <Button size="sm" variant="outline" onClick={() => set({ options: [...options, { label: "" }] })}>
                <PlusIcon aria-hidden />
                Add a choice
              </Button>
            </div>
          )}
        </fieldset>
      )}

      {question.type === "FILE_UPLOAD" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <div className="grid gap-2">
            <Label htmlFor={id("maxFiles")}>Most files</Label>
            <NativeSelect
              id={id("maxFiles")}
              value={question.maxFiles ?? 1}
              disabled={locked}
              onChange={(event) => set({ maxFiles: Number(event.target.value) })}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Kinds of file</legend>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(FILE_LABELS) as FileType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={id(`file-${type}`)}
                    checked={fileTypes.includes(type)}
                    disabled={locked}
                    onCheckedChange={(value) =>
                      set({ fileTypes: value === true ? [...fileTypes, type] : fileTypes.filter((t) => t !== type) })
                    }
                  />
                  <Label htmlFor={id(`file-${type}`)} className="font-normal">
                    {FILE_LABELS[type]}
                  </Label>
                </div>
              ))}
            </div>
            <FieldProblem message={errors[`${path}.fileTypes`]} />
          </fieldset>
          {blind && (
            <p className="text-sm font-medium text-warning sm:col-span-2">
              Blind award: only staff see these files; jurors won&apos;t.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox id={id("required")} checked={question.required} disabled={locked} onCheckedChange={(value) => set({ required: value === true })} />
        <Label htmlFor={id("required")} className="font-normal">
          An answer is required
        </Label>
      </div>
    </li>
  );
}

function PublishVersion({
  cycleId,
  builder,
  dirty,
  onPublished,
}: {
  cycleId: string;
  builder: FormBuilder;
  dirty: boolean;
  onPublished: () => void;
}) {
  const queryClient = useQueryClient();
  const next = (builder.latestVersion ?? 0) + 1;
  const [summary, setSummary] = useState(next === 1 ? "First version" : "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<BuilderErrors>(NO_ERRORS);
  const [notice, setNotice] = useState<string | null>(null);

  if (builder.locked) return null;

  async function publish() {
    setBusy(true);
    setErrors(NO_ERRORS);
    setNotice(null);
    try {
      const saved = await api.post<FormBuilder>(`/cycles/${cycleId}/form-versions`, { changeSummary: summary });
      queryClient.setQueryData(formKey(cycleId), saved);
      setSummary("");
      setNotice(`Version ${saved.latestVersion ?? next} is published.`);
      onPublished();
      await refreshOthers(queryClient, cycleId);
    } catch (error) {
      setErrors(builderErrorsOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish version {next}</CardTitle>
        <CardDescription>
          Publishes the saved draft. A published version never changes; applications that started on an earlier version keep
          it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <BuilderErrorList errors={errors} title="The questions weren't published:" />
        <div className="grid max-w-xl gap-1.5">
          <Label htmlFor="change-summary">What changed</Label>
          <Input id="change-summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="For example: added the safety section" />
          <FieldProblem message={errors.byPath.changeSummary} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void publish()} disabled={busy || dirty || !builder.hasUnpublishedChanges}>
            {busy ? "Publishing…" : `Publish version ${next}`}
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Save the draft first.</span>}
          {!dirty && !builder.hasUnpublishedChanges && builder.latestVersion !== null && (
            <span className="text-sm text-muted-foreground">Nothing has changed since version {builder.latestVersion}.</span>
          )}
          <FormNotice message={notice} />
        </div>
      </CardContent>
    </Card>
  );
}

function Versions({ cycleId, versions }: { cycleId: string; versions: FormVersionSummary[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (versions.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Published versions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {[...versions].reverse().map((v) => (
            <li key={v.version} className="grid gap-2 rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">Version {v.version}</span>
                <span>{v.changeSummary}</span>
                <span className="text-muted-foreground">
                  {istDateTime(v.publishedAt)}
                  {v.publishedBy && `, ${v.publishedBy}`}
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(open === v.version ? null : v.version)}>
                  {open === v.version ? "Hide" : "View"}
                </Button>
              </div>
              {open === v.version && <VersionPreview cycleId={cycleId} version={v.version} />}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VersionPreview({ cycleId, version }: { cycleId: string; version: number }) {
  const query = useQuery({
    queryKey: [...formKey(cycleId), "versions", version],
    queryFn: () => api.get<FormVersionSummary & { definition: { sections: FormSection[] } }>(`/cycles/${cycleId}/form-versions/${version}`),
    staleTime: Infinity, // a published version never changes (R4)
  });
  if (query.isPending) return <LoadingState label="Loading the version" />;
  if (query.error) return <ErrorState error={query.error} />;
  return (
    <div className="grid gap-3 border-t pt-2">
      {query.data.definition.sections.map((section) => (
        <div key={section.key} className="grid gap-1">
          <p className="font-medium">{section.title}</p>
          {section.description && <p className="text-muted-foreground">{section.description}</p>}
          <ol className="list-decimal pl-5">
            {section.questions.map((question) => (
              <li key={question.key}>
                {question.label}{" "}
                <span className="text-muted-foreground">
                  ({TYPE_LABELS[question.type]}
                  {question.required ? ", required" : ", optional"})
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
