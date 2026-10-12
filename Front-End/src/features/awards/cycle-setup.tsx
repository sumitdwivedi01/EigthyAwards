"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronRightIcon, CircleAlertIcon, CircleCheckIcon, ExternalLinkIcon, LockIcon, PlusIcon, RocketIcon, Trash2Icon } from "lucide-react";
import { FormError, FormField, FormNotice } from "@/components/form-field";
import { ListRow } from "@/components/layout/blocks";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
    await Promise.all([queryClient.invalidateQueries({ queryKey: awardKey(cycle.award.id) }), queryClient.invalidateQueries({ queryKey: MY_AWARDS_KEY })]);
  };
}

function CycleSetupScreen({ cycleId }: { cycleId: string }) {
  const cycle = useCycle(cycleId);
  if (cycle.isPending) return <LoadingState label="Loading the edition" lines={6} />;
  if (cycle.error) return <ErrorState error={cycle.error} onRetry={() => void cycle.refetch()} />;
  const c = cycle.data;
  const blockers = c.publishIssues.length;
  const draft = c.status === "DRAFT";
  return (
    <>
      <PageTitle
        back={{ href: `/staff/awards/${c.award.id}`, label: c.award.name }}
        eyebrow={c.award.department.name}
        title={`${c.award.name}: ${c.label}`}
        badges={<StateBadge state={c.state} />}
        description={`Applications ${istDateTime(c.opensAt)} to ${istDateTime(c.deadlineAt)}. ${draft ? "Work through the tabs in order; the Publish tab lists what is still missing." : "Published: the questions can still get a new version until the deadline."}`}
        actions={
          !draft && (
            <>
              <Button asChild variant="outline">
                <Link href={`/staff/cycles/${c.id}/applications`}>Applications</Link>
              </Button>
              <Button asChild>
                <Link href={`/staff/rounds/${c.round.id}`}>
                  Judging
                  <ChevronRightIcon aria-hidden />
                </Link>
              </Button>
            </>
          )
        }
      />
      {/* The builders keep unsaved work while another tab is open, so their tabs stay mounted. */}
      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="categories">Categories ({c.categories.length})</TabsTrigger>
          <TabsTrigger value="judging">Judging</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="scoring">Scoring sheet</TabsTrigger>
          <TabsTrigger value="publish">
            {draft ? (
              <>
                Publish
                {blockers > 0 && <Badge variant="warning">{blockers} to do</Badge>}
              </>
            ) : (
              "Published"
            )}
          </TabsTrigger>
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
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Basics</CardTitle>
        <CardDescription>
          {fixed
            ? "The edition is published, so its name, dates, fee and blind judging are fixed: applicants rely on them. The entry limit can still change."
            : "Times are India time. A category can have its own fee; otherwise it uses this one."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <FormError message={errors.root?.server?.message} />
          {fixed && (
            <Alert variant="info">
              <LockIcon />
              <AlertDescription>Fixed after publishing: name, dates, fee and blind judging.</AlertDescription>
            </Alert>
          )}
          <FormField label="Edition name" error={errors.label?.message}>
            {(control) => <Input {...control} readOnly={fixed} {...form.register("label")} />}
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Applications open" error={errors.opensAt?.message}>
              {(control) => <Input {...control} type="datetime-local" readOnly={fixed} {...form.register("opensAt")} />}
            </FormField>
            <FormField label="Deadline" error={errors.deadlineAt?.message}>
              {(control) => <Input {...control} type="datetime-local" readOnly={fixed} {...form.register("deadlineAt")} />}
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Fee per application (₹)" hint="Whole rupees, or rupees and paise. 0 means free." error={errors.fee?.message}>
              {(control) => <Input {...control} inputMode="decimal" readOnly={fixed} {...form.register("fee")} />}
            </FormField>
            <FormField label="Entry limit" optional hint="The most applications that can be submitted; the award page shows 499 / 500. Empty means no limit." error={errors.maxEntries?.message}>
              {(control) => <Input {...control} inputMode="numeric" {...form.register("maxEntries")} />}
            </FormField>
          </div>
          <div className="surface grid gap-2 p-4">
            <div className="flex items-start gap-3">
              <Controller
                control={form.control}
                name="blindJudging"
                render={({ field }) => <Checkbox id="blind-judging" checked={field.value} disabled={fixed} onCheckedChange={(value) => field.onChange(value === true)} className="mt-0.5" />}
              />
              <Label htmlFor="blind-judging" className="grid gap-0.5 leading-snug font-normal">
                <span className="font-semibold">Blind judging</span>
                <span className="text-sm text-muted-foreground">Jurors see the answers, never who applied, and no uploaded files. Applicants are asked not to name their organisation.</span>
              </Label>
            </div>
            {errors.blindJudging?.message && <p className="text-sm font-medium text-destructive">{errors.blindJudging.message}</p>}
          </div>
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
  const [adding, setAdding] = useState(false);
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Entry categories</CardTitle>
        <CardDescription>
          Applicants pick one category and compete with the others in it. A category&apos;s own fee replaces the edition&apos;s fee ({feeText(cycle.feePaise)}).
          {fixed && " The edition is published, so its categories are fixed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cycle.categories.length === 0 ? (
          <EmptyState compact title="No categories yet" description="Every edition needs at least one. If the award has no categories, add one named after the award." />
        ) : (
          <ul className="grid gap-2">
            {cycle.categories.map((category) =>
              editing === category.id ? (
                <li key={category.id}>
                  <CategoryForm cycle={cycle} category={category} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <ListRow key={category.id}>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-semibold">{category.name}</span>
                    <span className="text-sm text-muted-foreground">{category.feePaise === null ? `Edition fee (${feeText(cycle.feePaise)})` : feeText(category.feePaise)}</span>
                  </div>
                  {!fixed && (
                    <span className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(category.id)}>
                        Edit
                      </Button>
                      <RemoveCategory cycle={cycle} categoryId={category.id} name={category.name} />
                    </span>
                  )}
                </ListRow>
              ),
            )}
          </ul>
        )}
        {!fixed &&
          (adding || cycle.categories.length === 0 ? (
            <CategoryForm cycle={cycle} onDone={() => setAdding(false)} />
          ) : (
            <Button variant="outline" className="justify-self-start" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden />
              Add a category
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}

function CategoryForm({ cycle, category, onDone }: { cycle: CycleSetup; category?: CycleSetup["categories"][number]; onDone?: () => void }) {
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface grid gap-4 p-4" noValidate>
      <p className="font-semibold">{category ? "Edit the category" : "Add a category"}</p>
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="Category name" error={errors.name?.message}>
          {(control) => <Input {...control} {...form.register("name")} />}
        </FormField>
        <FormField label="Own fee (₹)" optional hint="Empty: the edition's fee." error={errors.fee?.message}>
          {(control) => <Input {...control} inputMode="decimal" {...form.register("fee")} />}
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {category ? "Save category" : "Add category"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {category ? "Cancel" : "Done"}
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
      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => void remove()} disabled={busy} aria-label={`Remove ${name}`}>
        <Trash2Icon aria-hidden />
        Remove
      </Button>
      {problem && <span className="basis-full text-sm font-medium text-destructive">{problem}</span>}
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
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Judging: round {round.number}, document review</CardTitle>
        <CardDescription>
          After the deadline, staff assign each application to jurors from the department&apos;s jury list. Each juror scores it alone; the application&apos;s score
          is the average of its jurors&apos; scores, rounded once at the end.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
          <FormError message={errors.root?.server?.message} />
          <Alert variant="info">
            <AlertDescription>
              The department&apos;s jury list has <strong>{round.juryAvailable}</strong> {round.juryAvailable === 1 ? "person" : "people"}: the most jurors an application can get.
            </AlertDescription>
          </Alert>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Jurors per application: at least" hint="Every application needs this many submitted scores before the round can be approved." error={errors.juryMin?.message}>
              {(control) => <Input {...control} inputMode="numeric" {...form.register("juryMin")} />}
            </FormField>
            <FormField label="At most" error={errors.juryMax?.message}>
              {(control) => <Input {...control} inputMode="numeric" {...form.register("juryMax")} />}
            </FormField>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-1 font-semibold">Results of this round</legend>
            <p className="-mt-2 text-sm text-muted-foreground">The names applicants see, such as Shortlisted and Rejected. Tick the ones that move on.</p>
            {labels.fields.map((field, index) => (
              <div key={field.id} className="grid gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Input aria-label={`Result ${index + 1}`} className="max-w-64" aria-invalid={Boolean(errors.resultLabels?.[index]?.label)} {...form.register(`resultLabels.${index}.label`)} />
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
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => labels.remove(index)} aria-label={`Remove result ${index + 1}`}>
                    <Trash2Icon aria-hidden />
                  </Button>
                </div>
                {errors.resultLabels?.[index]?.label?.message && <p className="text-sm font-medium text-destructive">{errors.resultLabels[index]?.label?.message}</p>}
              </div>
            ))}
            {errors.resultLabels?.message && <p className="text-sm font-medium text-destructive">{errors.resultLabels.message}</p>}
            {errors.resultLabels?.root?.message && <p className="text-sm font-medium text-destructive">{errors.resultLabels.root.message}</p>}
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
      <Card className="max-w-3xl">
        <CardHeader>
          <span className="mb-1 grid size-11 place-items-center rounded-full bg-success-soft text-success">
            <CircleCheckIcon className="size-6" aria-hidden />
          </span>
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
                <ExternalLinkIcon aria-hidden />
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
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Publish this edition</CardTitle>
        <CardDescription>
          Once published, it shows on Open awards from its opening date until its deadline. Its fee, dates, blind judging and categories are then fixed;
          questions can still get a new version until the deadline.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {ready ? (
          <Alert variant="success">
            <CircleCheckIcon />
            <AlertDescription>Everything is ready. You can publish now.</AlertDescription>
          </Alert>
        ) : (
          <div className="surface grid gap-3 p-4">
            <p className="font-semibold">Still to do before publishing</p>
            <ul className="grid gap-2">
              {cycle.publishIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2.5">
                  <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
        {problem && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              <p>{problem.message}</p>
              {problem.issues.length > 0 && (
                <ul className="list-disc pl-5">
                  {problem.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
        {confirming ? (
          <div className="surface grid gap-3 p-4">
            <p className="font-semibold">
              Publish {cycle.award.name}: {cycle.label}?
            </p>
            <p className="text-sm text-muted-foreground">
              The fee ({feeText(cycle.feePaise)}), the dates, blind judging ({cycle.blindJudging ? "on" : "off"}) and the {cycle.categories.length}{" "}
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
            <Button size="lg" onClick={() => setConfirming(true)} disabled={!ready}>
              <RocketIcon aria-hidden />
              Publish
            </Button>
            {page && <p className="text-sm text-muted-foreground">The award page goes live at {page} once published.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
