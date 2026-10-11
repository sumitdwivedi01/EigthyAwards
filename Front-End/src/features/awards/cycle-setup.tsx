"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2Icon, CircleAlertIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { AreaPage } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { CycleSetup } from "@/lib/api-types";
import { fromIstInput, istDateTime, paiseFromRupees, rupees, rupeesInput, toIstInput } from "@/lib/format";
import { showApiErrors } from "@/lib/forms";
import { QuestionBuilder } from "./question-builder";
import { ScoringSheetBuilder } from "./scoring-sheet-builder";
import { StateBadge } from "./state-badge";
import { awardKey, cycleKey, MY_AWARDS_KEY, useCycle } from "./use-awards";

/**
 * Setting up one edition of an award (spec §5.3–§5.5): its basics, categories, judging, questions
 * and scoring sheet, then publishing. The API decides what may change and what still blocks
 * publishing; this page shows it and sends the changes.
 */
export function CycleSetupPage({ cycleId }: { cycleId: string }) {
  return <AreaPage area="staff">{() => <CycleSetupScreen cycleId={cycleId} />}</AreaPage>;
}

/** "free" or "₹10,000". */
const feeText = (paise: number) => (paise === 0 ? "free" : rupees(paise));

/** Every change returns the whole setup, so the page shows the API's answer straight away. */
function useApplySetup(cycle: CycleSetup) {
  const queryClient = useQueryClient();
  return async (setup: CycleSetup) => {
    queryClient.setQueryData(cycleKey(cycle.id), setup);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: awardKey(cycle.award.id) }),
      queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY }),
    ]);
  };
}

function CycleSetupScreen({ cycleId }: { cycleId: string }) {
  const cycle = useCycle(cycleId);
  if (cycle.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (cycle.error) return <p className="text-sm text-destructive">{messageOf(cycle.error)}</p>;
  const c = cycle.data;
  const blockers = c.publishIssues.length;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={`/staff/awards/${c.award.id}`} className="text-muted-foreground underline underline-offset-4">
          {c.award.name}
        </Link>
      </p>
      <div className="mb-6 grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {c.award.name}: {c.label}
          </h1>
          <StateBadge state={c.state} />
          {c.status !== "DRAFT" && (
            <span className="ml-auto flex gap-2">
              <Button asChild size="sm">
                <Link href={`/staff/cycles/${c.id}/applications`}>Applications</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/staff/rounds/${c.round.id}`}>Judging</Link>
              </Button>
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          {c.award.department.name} · applications {istDateTime(c.opensAt)} to {istDateTime(c.deadlineAt)}
        </p>
      </div>
      {/* The builders keep unsaved work while another tab is open, so their tabs stay mounted. */}
      <Tabs defaultValue="basics" className="gap-4">
        <TabsList className="flex-wrap group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="categories">Categories ({c.categories.length})</TabsTrigger>
          <TabsTrigger value="judging">Judging</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="scoring">Scoring sheet</TabsTrigger>
          <TabsTrigger value="publish">{c.status === "DRAFT" ? `Publish${blockers > 0 ? ` (${blockers} to do)` : ""}` : "Published"}</TabsTrigger>
        </TabsList>
        <TabsContent value="basics">
          <BasicsTab cycle={c} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab cycle={c} />
        </TabsContent>
        <TabsContent value="judging">
          <JudgingTab cycle={c} />
        </TabsContent>
        <TabsContent value="questions" forceMount className="data-[state=inactive]:hidden">
          <QuestionBuilder cycleId={c.id} blind={c.blindJudging} />
        </TabsContent>
        <TabsContent value="scoring" forceMount className="data-[state=inactive]:hidden">
          <ScoringSheetBuilder cycleId={c.id} roundId={c.round.id} blind={c.blindJudging} />
        </TabsContent>
        <TabsContent value="publish">
          <PublishTab cycle={c} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Basics ──

const basicsSchema = z.object({
  label: z.string().trim().min(1, "Name this edition, for example 2026."),
  opensAt: z.string().min(1, "Pick the opening date and time."),
  deadlineAt: z.string().min(1, "Pick the deadline."),
  fee: z.string(),
  blindJudging: z.boolean(),
  maxEntries: z.string(),
});
type BasicsValues = z.infer<typeof basicsSchema>;

function basicsOf(cycle: CycleSetup): BasicsValues {
  return {
    label: cycle.label,
    opensAt: toIstInput(cycle.opensAt),
    deadlineAt: toIstInput(cycle.deadlineAt),
    fee: rupeesInput(cycle.feePaise),
    blindJudging: cycle.blindJudging,
    maxEntries: cycle.maxEntries === null ? "" : String(cycle.maxEntries),
  };
}

function BasicsTab({ cycle }: { cycle: CycleSetup }) {
  const apply = useApplySetup(cycle);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<BasicsValues>({ resolver: zodResolver(basicsSchema), defaultValues: basicsOf(cycle) });
  const { errors, isSubmitting } = form.formState;
  const fixed = cycle.settingsFixed;
  // Read-only rather than disabled, so the form still holds their values.
  const fixedStyle = fixed ? "bg-muted/50 text-muted-foreground" : undefined;

  async function onSubmit(values: BasicsValues) {
    setNotice(null);
    const feePaise = paiseFromRupees(values.fee);
    if (feePaise === null) {
      form.setError("fee", { message: "Enter the fee in rupees, such as 10000 or 2500.50. Use 0 for free." });
      return;
    }
    const limit = values.maxEntries.trim();
    if (limit !== "" && !/^\d+$/.test(limit)) {
      form.setError("maxEntries", { message: "Enter a whole number, or leave it empty for no limit." });
      return;
    }
    const maxEntries = limit === "" ? null : Number(limit);
    const current = basicsOf(cycle);
    // Only what changed is sent: after publishing, only the entry limit may change.
    const changes: Record<string, unknown> = {};
    if (!fixed) {
      if (values.label !== current.label) changes.label = values.label;
      if (values.opensAt !== current.opensAt) changes.opensAt = fromIstInput(values.opensAt);
      if (values.deadlineAt !== current.deadlineAt) changes.deadlineAt = fromIstInput(values.deadlineAt);
      if (feePaise !== cycle.feePaise) changes.feePaise = feePaise;
      if (values.blindJudging !== cycle.blindJudging) changes.blindJudging = values.blindJudging;
    }
    if (maxEntries !== cycle.maxEntries) changes.maxEntries = maxEntries;
    if (Object.keys(changes).length === 0) {
      setNotice("Nothing has changed.");
      return;
    }
    try {
      const setup = await api.patch<CycleSetup>(`/cycles/${cycle.id}`, changes);
      await apply(setup);
      form.reset(basicsOf(setup));
      setNotice("Saved.");
    } catch (error) {
      showApiErrors(error, form.setError, ["label", "opensAt", "deadlineAt", "blindJudging", "maxEntries"], { feePaise: "fee" });
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Basics</CardTitle>
        <CardDescription>
          {fixed
            ? "The edition is published, so its name, dates, fee and blind judging are fixed: applicants rely on them. The entry limit can still change."
            : "Times are India time. A category can have its own fee; otherwise it uses this one."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <FormField label="Edition name" error={errors.label?.message}>
            {(control) => <Input {...control} readOnly={fixed} className={fixedStyle} {...form.register("label")} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Opens" error={errors.opensAt?.message}>
              {(control) => <Input {...control} type="datetime-local" readOnly={fixed} className={fixedStyle} {...form.register("opensAt")} />}
            </FormField>
            <FormField label="Deadline" error={errors.deadlineAt?.message}>
              {(control) => <Input {...control} type="datetime-local" readOnly={fixed} className={fixedStyle} {...form.register("deadlineAt")} />}
            </FormField>
          </div>
          <FormField label="Fee per application (₹)" hint="Whole rupees, or rupees and paise. 0 means free." error={errors.fee?.message}>
            {(control) => <Input {...control} inputMode="decimal" readOnly={fixed} className={fixedStyle} {...form.register("fee")} />}
          </FormField>
          <div className="grid gap-1.5">
            <div className="flex items-start gap-2">
              <Controller
                control={form.control}
                name="blindJudging"
                render={({ field }) => (
                  <Checkbox
                    id="blind-judging"
                    checked={field.value}
                    disabled={fixed}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    className="mt-0.5"
                  />
                )}
              />
              <Label htmlFor="blind-judging" className="leading-snug font-normal">
                Blind judging: jurors see the answers, never who applied, and no uploaded files.
              </Label>
            </div>
            {errors.blindJudging?.message && <p className="text-xs text-destructive">{errors.blindJudging.message}</p>}
          </div>
          <FormField
            label="Entry limit"
            hint="The most applications that can be submitted. Leave empty for no limit. The award page shows the count, such as 499 / 500."
            error={errors.maxEntries?.message}
          >
            {(control) => <Input {...control} inputMode="numeric" {...form.register("maxEntries")} />}
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save basics"}
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Categories ──

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name the category."),
  fee: z.string(),
});
type CategoryValues = z.infer<typeof categorySchema>;

/** "" means the category uses the edition's fee (null to the API). */
function categoryFee(value: string): number | null | "invalid" {
  if (value.trim() === "") return null;
  return paiseFromRupees(value) ?? "invalid";
}

function CategoriesTab({ cycle }: { cycle: CycleSetup }) {
  const fixed = cycle.settingsFixed;
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Entry categories</CardTitle>
          <CardDescription>
            Applicants pick one category; every category competes in this edition. A category&apos;s own fee replaces the
            edition&apos;s fee ({feeText(cycle.feePaise)}).
            {fixed && " The edition is published, so its categories are fixed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cycle.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet. Every edition needs at least one.</p>
          ) : (
            <ul className="grid gap-2">
              {cycle.categories.map((category) =>
                editing === category.id ? (
                  <li key={category.id}>
                    <CategoryForm cycle={cycle} category={category} onDone={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={category.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.feePaise === null ? `Edition fee (${feeText(cycle.feePaise)})` : feeText(category.feePaise)}
                    </span>
                    {!fixed && (
                      <span className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing(category.id)}>
                          Edit
                        </Button>
                        <RemoveCategory cycle={cycle} categoryId={category.id} name={category.name} />
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>
      {!fixed && (
        <Card>
          <CardHeader>
            <CardTitle>Add a category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm cycle={cycle} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryForm({
  cycle,
  category,
  onDone,
}: {
  cycle: CycleSetup;
  category?: CycleSetup["categories"][number];
  onDone?: () => void;
}) {
  const apply = useApplySetup(cycle);
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", fee: category?.feePaise == null ? "" : rupeesInput(category.feePaise) },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: CategoryValues) {
    const feePaise = categoryFee(values.fee);
    if (feePaise === "invalid") {
      form.setError("fee", { message: "Enter the fee in rupees, such as 10000, or leave it empty for the edition's fee." });
      return;
    }
    try {
      const setup = category
        ? await api.patch<CycleSetup>(`/cycles/${cycle.id}/categories/${category.id}`, { name: values.name, feePaise })
        : await api.post<CycleSetup>(`/cycles/${cycle.id}/categories`, { name: values.name, feePaise });
      await apply(setup);
      if (category) onDone?.();
      else form.reset({ name: "", fee: "" });
    } catch (error) {
      showApiErrors(error, form.setError, ["name"], { feePaise: "fee" });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 rounded-md border p-3" noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <FormField label="Category name" error={errors.name?.message}>
          {(control) => <Input {...control} {...form.register("name")} />}
        </FormField>
        <FormField label="Own fee (₹)" hint="Empty: the edition's fee." error={errors.fee?.message}>
          {(control) => <Input {...control} inputMode="decimal" {...form.register("fee")} />}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {category ? "Save category" : "Add category"}
        </Button>
        {category && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function RemoveCategory({ cycle, categoryId, name }: { cycle: CycleSetup; categoryId: string; name: string }) {
  const apply = useApplySetup(cycle);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setProblem(null);
    try {
      await apply(await api.delete<CycleSetup>(`/cycles/${cycle.id}/categories/${categoryId}`));
    } catch (error) {
      setProblem(messageOf(error));
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => void remove()} disabled={busy} aria-label={`Remove ${name}`}>
        <Trash2Icon aria-hidden />
        Remove
      </Button>
      {problem && <span className="basis-full text-xs text-destructive">{problem}</span>}
    </>
  );
}

// ── Judging ──

const judgingSchema = z.object({
  juryMin: z.string().regex(/^\d+$/, "Enter a whole number."),
  juryMax: z.string().regex(/^\d+$/, "Enter a whole number."),
  resultLabels: z.array(z.object({ label: z.string().trim().min(1, "Name the result."), advances: z.boolean() })),
});
type JudgingValues = z.infer<typeof judgingSchema>;

function judgingOf(cycle: CycleSetup): JudgingValues {
  return {
    juryMin: String(cycle.round.juryMin),
    juryMax: String(cycle.round.juryMax),
    resultLabels: cycle.round.resultLabels.map((r) => ({ label: r.label, advances: r.advances })),
  };
}

function JudgingTab({ cycle }: { cycle: CycleSetup }) {
  const apply = useApplySetup(cycle);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<JudgingValues>({ resolver: zodResolver(judgingSchema), defaultValues: judgingOf(cycle) });
  const labels = useFieldArray({ control: form.control, name: "resultLabels" });
  const { errors, isSubmitting } = form.formState;
  const { round } = cycle;

  async function onSubmit(values: JudgingValues) {
    setNotice(null);
    try {
      const setup = await api.patch<CycleSetup>(`/rounds/${round.id}`, {
        juryMin: Number(values.juryMin),
        juryMax: Number(values.juryMax),
        resultLabels: values.resultLabels,
      });
      await apply(setup);
      form.reset(judgingOf(setup));
      setNotice("Saved.");
    } catch (error) {
      showApiErrors(error, form.setError, ["juryMin", "juryMax", "resultLabels"]);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Judging: round {round.number}, document review</CardTitle>
        <CardDescription>
          After the deadline, staff assign each application to jurors from the department&apos;s jury list. Each juror scores
          it alone; the application&apos;s score is the average of its jurors&apos; scores, rounded once at the end.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <p className="text-sm">
            The department&apos;s jury list has <strong>{round.juryAvailable}</strong>{" "}
            {round.juryAvailable === 1 ? "person" : "people"}: the most jurors an application can get.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Jurors per application: at least"
              hint="Every application needs this many submitted scores before the round can be approved."
              error={errors.juryMin?.message}
            >
              {(control) => <Input {...control} inputMode="numeric" {...form.register("juryMin")} />}
            </FormField>
            <FormField label="At most" error={errors.juryMax?.message}>
              {(control) => <Input {...control} inputMode="numeric" {...form.register("juryMax")} />}
            </FormField>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Results of this round</legend>
            {labels.fields.map((field, index) => (
              <div key={field.id} className="grid gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    aria-label={`Result ${index + 1}`}
                    className="max-w-60"
                    aria-invalid={Boolean(errors.resultLabels?.[index]?.label)}
                    {...form.register(`resultLabels.${index}.label`)}
                  />
                  <Controller
                    control={form.control}
                    name={`resultLabels.${index}.advances`}
                    render={({ field: f }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox id={`advances-${field.id}`} checked={f.value} onCheckedChange={(v) => f.onChange(v === true)} />
                        <Label htmlFor={`advances-${field.id}`} className="font-normal">
                          Moves on to the next round
                        </Label>
                      </div>
                    )}
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => labels.remove(index)} aria-label={`Remove result ${index + 1}`}>
                    <Trash2Icon aria-hidden />
                  </Button>
                </div>
                {errors.resultLabels?.[index]?.label?.message && (
                  <p className="text-xs text-destructive">{errors.resultLabels[index]?.label?.message}</p>
                )}
              </div>
            ))}
            {errors.resultLabels?.message && <p className="text-xs text-destructive">{errors.resultLabels.message}</p>}
            {errors.resultLabels?.root?.message && <p className="text-xs text-destructive">{errors.resultLabels.root.message}</p>}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => labels.append({ label: "", advances: false })}>
                <PlusIcon aria-hidden />
                Add a result
              </Button>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save judging"}
            </Button>
            <FormNotice message={notice} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Publish ──

function PublishTab({ cycle }: { cycle: CycleSetup }) {
  const apply = useApplySetup(cycle);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);

  async function publish() {
    setBusy(true);
    setProblem(null);
    try {
      await apply(await api.post<CycleSetup>(`/cycles/${cycle.id}/publish`));
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      setConfirming(false);
    } catch (error) {
      setProblem({ message: messageOf(error), issues: error instanceof ApiError ? error.issues : [] });
      // The blockers may have changed since the page loaded: read them again.
      await queryClient.invalidateQueries({ queryKey: cycleKey(cycle.id) });
    } finally {
      setBusy(false);
    }
  }

  const page = cycle.award.siteSlug ? `/awards/${cycle.award.siteSlug}` : null;

  if (cycle.status !== "DRAFT") {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Published</CardTitle>
          <CardDescription>
            {cycle.publishedAt && `Published ${istDateTime(cycle.publishedAt)}. `}
            It shows on Open awards from {istDateTime(cycle.opensAt)} until the deadline, {istDateTime(cycle.deadlineAt)}.
          </CardDescription>
        </CardHeader>
        {page && (
          <CardContent>
            <Button asChild variant="outline">
              <Link href={page} target="_blank">
                Open the award page
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  const ready = cycle.publishIssues.length === 0;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Publish this edition</CardTitle>
        <CardDescription>
          Once published, it shows on Open awards from its opening date until its deadline. Its fee, dates, blind judging and
          categories are then fixed; questions can still get a new version until the deadline.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {ready ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
            Everything is ready.
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Still to do:</p>
            <ul className="grid gap-1.5 text-sm">
              {cycle.publishIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
        {problem && (
          <div className="grid gap-1 text-sm text-destructive" role="alert">
            <p>{problem.message}</p>
            {problem.issues.length > 0 && (
              <ul className="list-disc pl-5">
                {problem.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {confirming ? (
          <div className="grid gap-3 rounded-md border p-3">
            <p className="text-sm">
              Publish {cycle.award.name}: {cycle.label}? The fee ({feeText(cycle.feePaise)}), the dates, blind judging (
              {cycle.blindJudging ? "on" : "off"}) and the {cycle.categories.length}{" "}
              {cycle.categories.length === 1 ? "category" : "categories"} can&apos;t change afterwards.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => void publish()} disabled={busy}>
                {busy ? "Publishing…" : "Yes, publish"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setConfirming(true)} disabled={!ready}>
              Publish
            </Button>
            {page && <p className="text-sm text-muted-foreground">The award page goes live at {page} once published.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
