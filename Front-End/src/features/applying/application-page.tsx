"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, EyeOffIcon } from "lucide-react";
import { AreaPage } from "@/components/layout/app-shell";
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
  if (application.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (application.error) return <p className="text-sm text-destructive">{messageOf(application.error)}</p>;
  return <ApplicationLoaded key={application.data.id} application={application.data} />;
}

export function StatusBadge({ status }: { status: ApplicantStatus }) {
  const variant = status.code === "SUBMITTED" || status.code === "UNDER_REVIEW" ? "default" : status.code === "PENDING" ? "outline" : "secondary";
  return <Badge variant={variant}>{status.label}</Badge>;
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

type Step = { key: string; title: string; detail?: string };

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

  const steps: Step[] = [
    ...sections.map((section, i) => {
      const progress = application.progress.sections.find((p) => p.key === section.key);
      return { key: section.key ?? `section-${i}`, title: section.title, detail: progress ? `${progress.answered} / ${progress.total}` : undefined };
    }),
    { key: "proof", title: "Proof", detail: application.employmentProof ? "added" : undefined },
    { key: "submit", title: "Review and submit" },
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
      <p className="mb-2 text-sm">
        <Link href="/applicant" className="text-muted-foreground underline underline-offset-4">
          Applying
        </Link>
      </p>
      <Header
        application={application}
        saveState={draftOpen && application.editable ? autosave.state : null}
        refused={Object.keys(autosave.problems).length}
        onUpdated={setApplication}
      />
      {draftOpen && application.fee.amountPaise > 0 && !application.fee.paid && <FeeCard application={application} onUpdated={setApplication} />}

      {draftOpen ? (
        <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
          <nav aria-label="Steps of the application">
            <ol className="flex flex-wrap gap-1 md:flex-col">
              {steps.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => goTo(s.key)}
                    aria-current={step === s.key ? "step" : undefined}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      step === s.key ? "bg-secondary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    <span>
                      {i + 1}. {s.title}
                    </span>
                    {s.detail && <span className="text-xs text-muted-foreground">{s.detail}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="min-w-0">
            {sections.map((section, i) =>
              step === (section.key ?? `section-${i}`) ? (
                <SectionStep
                  key={step}
                  application={application}
                  section={section}
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
                  <CardTitle>Proof</CardTitle>
                  <CardDescription>Who you are, and that you work for {application.organisation.legalName}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProofStep application={application} onUpdated={setApplication} />
                </CardContent>
              </Card>
            )}
            {step === "submit" && (
              <SubmitStep
                application={application}
                steps={steps}
                flush={autosave.flush}
                onUpdated={setApplication}
                onRefused={() => setShowMissing(true)}
                goTo={goTo}
              />
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
  const text: Record<SaveState["kind"], string> = {
    saved: "All changes saved",
    pending: "Unsaved changes…",
    saving: "Saving…",
    retrying: "Couldn't save; trying again",
    stopped: "Not saved",
  };
  const message = state.kind === "retrying" || state.kind === "stopped" ? `: ${state.message}` : "";
  const time = state.kind === "saved" && state.at ? ` at ${state.at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "";
  // A wrong answer isn't saved: say so, rather than "all saved".
  if (state.kind === "saved" && refused > 0) {
    return (
      <p className="text-xs text-destructive" role="status">
        Saved, except {refused === 1 ? "1 answer" : `${refused} answers`} marked below that need a fix{time}
      </p>
    );
  }
  return (
    <p className={`text-xs ${state.kind === "retrying" || state.kind === "stopped" ? "text-destructive" : "text-muted-foreground"}`} role="status">
      {text[state.kind]}
      {time}
      {message}
    </p>
  );
}

function Header({
  application,
  saveState,
  refused,
  onUpdated,
}: {
  application: Application;
  saveState: SaveState | null;
  refused: number;
  onUpdated: (application: Application) => void;
}) {
  return (
    <div className="mb-6 grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {application.award.name} {application.cycle.label}
        </h1>
        <StatusBadge status={application.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {application.organisation.legalName} · deadline {istDateTime(application.cycle.deadlineAt)} · {entriesText(application.entries)}
      </p>
      <CategoryLine application={application} onUpdated={onUpdated} />
      {application.fee.paid && application.fee.paidAt && (
        <p className="text-sm text-muted-foreground">
          Fee {rupees(application.fee.amountPaise)} paid on {istDateTime(application.fee.paidAt)} · reference {application.fee.reference}
        </p>
      )}
      <p className="text-sm">{application.status.message}</p>
      {saveState && <SaveIndicator state={saveState} refused={refused} />}
    </div>
  );
}

function CategoryLine({ application, onUpdated }: { application: Application; onUpdated: (application: Application) => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  if (!application.canChangeCategory) {
    return <p className="text-sm">Category: {application.category.name}</p>;
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
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="category">Category:</label>
      <NativeSelect id="category" className="w-auto" value={application.category.id} onChange={(e) => void change(e.target.value)}>
        {application.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name} ({category.feePaise === 0 ? "free" : rupees(category.feePaise)})
          </option>
        ))}
      </NativeSelect>
      <span className="text-xs text-muted-foreground">You can change it until you pay.</span>
      {problem && <span className="text-xs text-destructive">{problem}</span>}
    </div>
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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Entry fee: {rupees(application.fee.amountPaise)}</CardTitle>
        <CardDescription>
          The form opens once the fee is paid. This is a demonstration payment: no money is taken, and fees are not refunded.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void pay()} disabled={busy}>
          {busy ? "Paying…" : `Pay ${rupees(application.fee.amountPaise)}`}
        </Button>
        {problem && (
          <p className="text-sm text-destructive" role="alert">
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

function SectionStep({
  application,
  section,
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
  firstNumber: number;
  values: Record<string, LocalValue>;
  problems: Record<string, string>;
  showMissing: boolean;
  onChange: (question: Question, value: LocalValue) => void;
  onBlur: () => void;
  onUpdated: (application: Application) => void;
  next: Step | undefined;
  previous: Step | undefined;
  goTo: (key: string) => void;
}) {
  const editable = application.editable;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        {section.description && <CardDescription className="whitespace-pre-line">{section.description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-6">
        {application.cycle.blindJudging && (
          <Alert>
            <EyeOffIcon />
            <AlertDescription>
              This award is judged blind: don&apos;t name your organisation or its people in your answers. The jury sees your
              answers, never who applied and never your files.
            </AlertDescription>
          </Alert>
        )}
        {!editable && <p className="text-sm text-muted-foreground">The form opens once the entry fee is paid.</p>}
        {section.questions.map((question, i) => {
          const key = question.key ?? "";
          const message = problems[key] ?? (showMissing ? missingFor(application, key) : undefined);
          return (
            <QuestionShell key={key} question={question} number={firstNumber + i} message={message}>
              {(ids) =>
                question.type === "FILE_UPLOAD" ? (
                  <FileAnswer
                    applicationId={application.id}
                    question={question}
                    files={application.files[key] ?? []}
                    editable={editable}
                    ids={ids}
                    onUpdated={onUpdated}
                  />
                ) : editable ? (
                  <AnswerInput question={question} value={values[key] ?? null} onChange={(value) => onChange(question, value)} onBlur={onBlur} ids={ids} />
                ) : (
                  <p className="text-sm text-muted-foreground">{answerText(question, application.answers[key])}</p>
                )
              }
            </QuestionShell>
          );
        })}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
          {previous ? (
            <Button type="button" variant="outline" onClick={() => goTo(previous.key)}>
              Previous: {previous.title}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button type="button" onClick={() => goTo(next.key)}>
              Next: {next.title}
            </Button>
          )}
        </div>
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
  steps: Step[];
  flush: () => Promise<void>;
  onUpdated: (application: Application) => void;
  onRefused: () => void;
  goTo: (key: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; items: string[] } | null>(null);

  // Where each missing item is fixed: the question's section, the proof step, the fee or My profile.
  function stepOf(path: string): Step | undefined {
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
        <CardTitle>Review and submit</CardTitle>
        <CardDescription>
          {entriesText(application.entries)}. After submitting, your answers can&apos;t be changed; the award team then checks your
          proof.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {ready ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
            Everything needed is there.
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Still needed:</p>
            <ul className="grid gap-1.5 text-sm">
              {application.missing.map((item) => {
                const target = stepOf(item.path);
                return (
                  <li key={item.path} className="flex items-start gap-2">
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      {item.message}{" "}
                      {item.path.startsWith("profile.") ? (
                        <Link href="/me" className="underline underline-offset-4">
                          My profile
                        </Link>
                      ) : target ? (
                        <button type="button" className="underline underline-offset-4" onClick={() => goTo(target.key)}>
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
          <div className="grid gap-1 text-sm text-destructive" role="alert">
            <p>{problem.message}</p>
            {problem.items.length > 0 && (
              <ul className="list-disc pl-5">
                {problem.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div>
          <Button onClick={() => void submit()} disabled={busy || !ready}>
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
          <CardDescription>Version {application.form.version} of the questions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {sections.map((section, s) => (
            <section key={section.key} className="grid gap-3">
              <h2 className="font-medium">{section.title}</h2>
              <dl className="grid gap-3">
                {section.questions.map((question, i) => {
                  const key = question.key ?? "";
                  return (
                    <div key={key} className="grid gap-1">
                      <dt className="text-sm text-muted-foreground">
                        {(firstNumbers[s] ?? 1) + i}. {question.label}
                      </dt>
                      <dd className="text-sm whitespace-pre-line">
                        {question.type === "FILE_UPLOAD"
                          ? (application.files[key] ?? []).map((f) => f.fileName).join(", ") || "No files"
                          : answerText(question, application.answers[key])}
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
