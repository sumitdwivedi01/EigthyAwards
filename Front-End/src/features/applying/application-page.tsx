"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon, CircleCheckIcon, CloudOffIcon, EyeOffIcon, IndianRupeeIcon, LoaderCircleIcon } from "lucide-react";
import { Stepper, type StepItem } from "@/components/layout/stepper";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { Application, ApplicantStatus, FormSection, Question } from "@/lib/api-types";
import { istDateTime, rupees } from "@/lib/format";
import { toLocal, useAutosave, type LocalValue, type SaveState } from "./autosave";
import { FileAnswer } from "./file-answer";
import { ProofStep } from "./proof-step";
import { AnswerInput, answerText, QuestionShell } from "./question-field";
import { applicationKey, MY_APPLICATIONS_KEY, useApplication } from "./use-applying";

/**
 * One application (spec §5.6), for the applicant who started it: the fee, the form in steps with
 * autosave, the proof, and review and submit. Every rule (what is missing, what can change) comes
 * from the API; the page shows it and sends what the applicant types.
 */
export function ApplicationPage({ applicationId }: { applicationId: string }) {
  return <AreaPage area="applicant">{() => <ApplicationScreen applicationId={applicationId} />}</AreaPage>;
}

function ApplicationScreen({ applicationId }: { applicationId: string }) {
  const application = useApplication(applicationId);
  if (application.isPending) return <LoadingState label="Loading your application" lines={6} />;
  if (application.error) return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;
  return <ApplicationLoaded key={application.data.id} application={application.data} />;
}

const STATUS_VARIANT: Record<ApplicantStatus["code"], "warning" | "info" | "success" | "secondary"> = {
  PENDING: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  RESULT: "success",
  NOT_SUBMITTED: "secondary",
  WITHDRAWN: "secondary",
  CLOSED: "secondary",
};

export function StatusBadge({ status }: { status: ApplicantStatus }) {
  return <Badge variant={STATUS_VARIANT[status.code]}>{status.label}</Badge>;
}

function entriesText(entries: Application["entries"]): string {
  return entries.limit === null ? `${entries.submitted} submitted so far` : `${entries.submitted} / ${entries.limit} entries submitted`;
}

function initialValues(application: Application): Record<string, LocalValue> {
  const values: Record<string, LocalValue> = {};
  for (const section of application.form.sections) {
    for (const question of section.questions) {
      if (question.key) values[question.key] = toLocal(question, application.answers[question.key]);
    }
  }
  return values;
}

function ApplicationLoaded({ application }: { application: Application }) {
  const queryClient = useQueryClient();
  const setApplication = useCallback(
    (next: Application) => {
      queryClient.setQueryData(applicationKey(next.id), next);
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATIONS_KEY });
    },
    [queryClient],
  );
  const [initial] = useState(() => initialValues(application));
  const autosave = useAutosave(application.id, initial, setApplication);
  const sections = application.form.sections;
  const draftOpen = application.status.code === "PENDING";

  const steps: StepItem[] = [
    ...sections.map((section, i) => {
      const progress = application.progress.sections.find((p) => p.key === section.key);
      return {
        key: section.key ?? `section-${i}`,
        title: section.title,
        detail: progress ? `${progress.answered} of ${progress.total} answered` : undefined,
        done: progress ? progress.total > 0 && progress.answered === progress.total : false,
      };
    }),
    { key: "proof", title: "Proof of employment", detail: application.employmentProof ? "Added" : "Needed before you submit", done: application.employmentProof !== null },
    { key: "submit", title: "Review and submit", detail: application.missing.length === 0 ? "Ready" : `${application.missing.length} to complete` },
  ];
  const [step, setStep] = useState(steps[0]?.key ?? "proof");
  const [showMissing, setShowMissing] = useState(false);

  const goTo = (key: string) => {
    void autosave.flush();
    setStep(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Header application={application} saveState={draftOpen && application.editable ? autosave.state : null} refused={Object.keys(autosave.problems).length} onUpdated={setApplication} />
      {draftOpen && application.fee.amountPaise > 0 && !application.fee.paid && <FeeCard application={application} onUpdated={setApplication} />}

      {draftOpen ? (
        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
          <Stepper steps={steps} current={step} onSelect={goTo} className="md:sticky md:top-6 md:self-start" />
          <div className="min-w-0">
            {sections.map((section, i) =>
              step === (section.key ?? `section-${i}`) ? (
                <SectionStep
                  key={step}
                  application={application}
                  section={section}
                  stepNumber={i + 1}
                  stepCount={steps.length}
                  firstNumber={sections.slice(0, i).reduce((sum, s) => sum + s.questions.length, 1)}
                  values={autosave.values}
                  problems={autosave.problems}
                  showMissing={showMissing}
                  onChange={autosave.change}
                  onBlur={() => void autosave.flush()}
                  onUpdated={setApplication}
                  next={steps[i + 1]}
                  previous={steps[i - 1]}
                  goTo={goTo}
                />
              ) : null,
            )}
            {step === "proof" && (
              <Card>
                <CardHeader>
                  <p className="text-eyebrow">
                    Step {steps.length - 1} of {steps.length}
                  </p>
                  <CardTitle>Proof of employment</CardTitle>
                  <CardDescription>Who you are, and that you work for {application.organisation.legalName}. The award team checks it; the jury never sees it.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <ProofStep application={application} onUpdated={setApplication} />
                  <StepFooter previous={steps[steps.length - 3]} next={steps[steps.length - 1]} goTo={goTo} />
                </CardContent>
              </Card>
            )}
            {step === "submit" && (
              <SubmitStep application={application} steps={steps} flush={autosave.flush} onUpdated={setApplication} onRefused={() => setShowMissing(true)} goTo={goTo} />
            )}
          </div>
        </div>
      ) : (
        <Summary application={application} onUpdated={setApplication} />
      )}
    </>
  );
}

function SaveIndicator({ state, refused }: { state: SaveState; refused: number }) {
  const time = state.kind === "saved" && state.at ? ` at ${state.at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "";
  // A wrong answer isn't saved: say so, rather than "all saved".
  if (state.kind === "saved" && refused > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning" role="status">
        <CircleAlertIcon className="size-4" aria-hidden />
        Saved, except {refused === 1 ? "1 answer" : `${refused} answers`} marked below{time}
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <CircleCheckIcon className="size-4 text-success" aria-hidden />
        All changes saved{time}
      </span>
    );
  }
  if (state.kind === "pending" || state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive" role="status">
      <CloudOffIcon className="size-4" aria-hidden />
      {state.kind === "retrying" ? "Couldn't save; trying again" : "Not saved"}: {state.message}
    </span>
  );
}

function Header({ application, saveState, refused, onUpdated }: { application: Application; saveState: SaveState | null; refused: number; onUpdated: (application: Application) => void }) {
  return (
    <>
      <PageTitle
        back={{ href: "/applicant", label: "My applications" }}
        eyebrow={application.organisation.legalName}
        title={`${application.award.name} ${application.cycle.label}`}
        badges={<StatusBadge status={application.status} />}
        description={application.status.message}
        actions={saveState && <SaveIndicator state={saveState} refused={refused} />}
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground sm:-mt-5">
        <span>Deadline {istDateTime(application.cycle.deadlineAt)}</span>
        <span>{entriesText(application.entries)}</span>
        <CategoryLine application={application} onUpdated={onUpdated} />
        {application.fee.paid && application.fee.paidAt && (
          <span>
            Fee {rupees(application.fee.amountPaise)} paid on {istDateTime(application.fee.paidAt)} · reference {application.fee.reference}
          </span>
        )}
      </div>
    </>
  );
}

function CategoryLine({ application, onUpdated }: { application: Application; onUpdated: (application: Application) => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  if (!application.canChangeCategory) {
    return <span>Category: {application.category.name}</span>;
  }
  async function change(categoryId: string) {
    setProblem(null);
    try {
      onUpdated(await api.patch<Application>(`/applications/${application.id}`, { categoryId }));
    } catch (error) {
      setProblem(messageOf(error));
    }
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <label htmlFor="category">Category:</label>
      <NativeSelect id="category" className="h-9 w-auto text-sm" value={application.category.id} onChange={(e) => void change(e.target.value)}>
        {application.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name} ({category.feePaise === 0 ? "free" : rupees(category.feePaise)})
          </option>
        ))}
      </NativeSelect>
      <span className="text-xs">You can change it until you pay.</span>
      {problem && <span className="text-xs text-destructive">{problem}</span>}
    </span>
  );
}

function FeeCard({ application, onUpdated }: { application: Application; onUpdated: (application: Application) => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  async function pay() {
    setBusy(true);
    setProblem(null);
    try {
      onUpdated(await api.post<Application>(`/applications/${application.id}/payment`));
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader>
        <span className="mb-1 grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
          <IndianRupeeIcon className="size-5" aria-hidden />
        </span>
        <CardTitle>Entry fee: {rupees(application.fee.amountPaise)}</CardTitle>
        <CardDescription>The form opens once the fee is paid. This is a demonstration payment: no money is taken, and fees are not refunded.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void pay()} disabled={busy}>
          {busy ? "Paying…" : `Pay ${rupees(application.fee.amountPaise)}`}
        </Button>
        {problem && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {problem}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function missingFor(application: Application, questionKey: string | undefined): string | undefined {
  return application.missing.find((m) => m.path === `answers.${questionKey}`)?.message;
}

function StepFooter({ previous, next, goTo }: { previous: StepItem | undefined; next: StepItem | undefined; goTo: (key: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      {previous ? (
        <Button type="button" variant="outline" onClick={() => goTo(previous.key)}>
          <ArrowLeftIcon aria-hidden />
          {previous.title}
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button type="button" onClick={() => goTo(next.key)}>
          {next.key === "submit" ? "Review and submit" : `Next: ${next.title}`}
          <ArrowRightIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}

function SectionStep({
  application,
  section,
  stepNumber,
  stepCount,
  firstNumber,
  values,
  problems,
  showMissing,
  onChange,
  onBlur,
  onUpdated,
  next,
  previous,
  goTo,
}: {
  application: Application;
  section: FormSection;
  stepNumber: number;
  stepCount: number;
  firstNumber: number;
  values: Record<string, LocalValue>;
  problems: Record<string, string>;
  showMissing: boolean;
  onChange: (question: Question, value: LocalValue) => void;
  onBlur: () => void;
  onUpdated: (application: Application) => void;
  next: StepItem | undefined;
  previous: StepItem | undefined;
  goTo: (key: string) => void;
}) {
  const editable = application.editable;
  return (
    <Card>
      <CardHeader>
        <p className="text-eyebrow">
          Step {stepNumber} of {stepCount}
        </p>
        <CardTitle className="text-xl">{section.title}</CardTitle>
        {section.description && <CardDescription className="whitespace-pre-line">{section.description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-7">
        {application.cycle.blindJudging && (
          <Alert variant="info">
            <EyeOffIcon />
            <AlertDescription>
              This award is judged blind: please don&apos;t name your organisation or its people in your answers. The jury sees your answers, never who
              applied and never your files.
            </AlertDescription>
          </Alert>
        )}
        {!editable && (
          <Alert variant="warning">
            <CircleAlertIcon />
            <AlertDescription>The form opens once the entry fee is paid.</AlertDescription>
          </Alert>
        )}
        {section.questions.map((question, i) => {
          const key = question.key ?? "";
          const message = problems[key] ?? (showMissing ? missingFor(application, key) : undefined);
          return (
            <QuestionShell key={key} question={question} number={firstNumber + i} message={message}>
              {(ids) =>
                question.type === "FILE_UPLOAD" ? (
                  <FileAnswer applicationId={application.id} question={question} files={application.files[key] ?? []} editable={editable} ids={ids} onUpdated={onUpdated} />
                ) : editable ? (
                  <AnswerInput question={question} value={values[key] ?? null} onChange={(value) => onChange(question, value)} onBlur={onBlur} ids={ids} />
                ) : (
                  <p className="text-muted-foreground">{answerText(question, application.answers[key])}</p>
                )
              }
            </QuestionShell>
          );
        })}
        <StepFooter previous={previous} next={next} goTo={goTo} />
      </CardContent>
    </Card>
  );
}

function SubmitStep({
  application,
  steps,
  flush,
  onUpdated,
  onRefused,
  goTo,
}: {
  application: Application;
  steps: StepItem[];
  flush: () => Promise<void>;
  onUpdated: (application: Application) => void;
  onRefused: () => void;
  goTo: (key: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; items: string[] } | null>(null);

  // Where each missing item is fixed: the question's section, the proof step, the fee or My profile.
  function stepOf(path: string): StepItem | undefined {
    if (path.startsWith("answers.")) {
      const key = path.slice("answers.".length);
      const index = application.form.sections.findIndex((s) => s.questions.some((q) => q.key === key));
      return steps[index];
    }
    if (path === "employmentProof" || path.startsWith("profile.")) return steps.find((s) => s.key === "proof");
    return undefined;
  }

  async function submit() {
    setBusy(true);
    setProblem(null);
    try {
      await flush();
      onUpdated(await api.post<Application>(`/applications/${application.id}/submit`));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) onRefused();
      setProblem({
        message: messageOf(error),
        items: error instanceof ApiError ? error.fieldErrors.map((item) => item.message) : [],
      });
    } finally {
      setBusy(false);
    }
  }

  const ready = application.missing.length === 0;
  return (
    <Card>
      <CardHeader>
        <p className="text-eyebrow">
          Step {steps.length} of {steps.length}
        </p>
        <CardTitle className="text-xl">Review and submit</CardTitle>
        <CardDescription>
          {entriesText(application.entries)}. After submitting, your answers can&apos;t be changed; the award team then checks your proof.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {ready ? (
          <Alert variant="success">
            <CircleCheckIcon />
            <AlertDescription>Everything needed is there. You can submit now.</AlertDescription>
          </Alert>
        ) : (
          <div className="surface grid gap-3 p-4">
            <p className="font-semibold">Still needed before you can submit</p>
            <ul className="grid gap-2">
              {application.missing.map((item) => {
                const target = stepOf(item.path);
                return (
                  <li key={item.path} className="flex items-start gap-2.5">
                    <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span>{item.message}</span>
                      {item.path.startsWith("profile.") ? (
                        <Link href="/me?tab=proof" className="font-semibold text-primary underline-offset-4 hover:underline">
                          Go to My profile
                        </Link>
                      ) : target ? (
                        <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => goTo(target.key)}>
                          Go to {target.title}
                        </button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {problem && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>
              <p>{problem.message}</p>
              {problem.items.length > 0 && (
                <ul className="list-disc pl-5">
                  {problem.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={() => goTo("proof")}>
            <ArrowLeftIcon aria-hidden />
            Proof of employment
          </Button>
          <Button size="lg" onClick={() => void submit()} disabled={busy || !ready}>
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** After submitting, or once the deadline closed it: what was sent, the proof check, and a fix if rejected. */
function Summary({ application, onUpdated }: { application: Application; onUpdated: (application: Application) => void }) {
  const sections = application.form.sections;
  const firstNumbers = sections.map((_, i) => sections.slice(0, i).reduce((sum, s) => sum + s.questions.length, 1));
  return (
    <div className="grid gap-6">
      {application.submittedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Proof</CardTitle>
            <CardDescription>Submitted on {istDateTime(application.submittedAt)}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProofStep application={application} onUpdated={onUpdated} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Your answers</CardTitle>
          <CardDescription>Version {application.form.version} of the questions, as you submitted them.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8">
          {sections.map((section, s) => (
            <section key={section.key} className="grid gap-4">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <dl className="grid gap-4">
                {section.questions.map((question, i) => {
                  const key = question.key ?? "";
                  return (
                    <div key={key} className="grid gap-1 border-l-2 pl-4">
                      <dt className="text-sm text-muted-foreground">
                        {(firstNumbers[s] ?? 1) + i}. {question.label}
                      </dt>
                      <dd className="whitespace-pre-line">
                        {question.type === "FILE_UPLOAD" ? (application.files[key] ?? []).map((f) => f.fileName).join(", ") || "No files" : answerText(question, application.answers[key])}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
