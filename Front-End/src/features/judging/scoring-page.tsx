"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, CircleCheckIcon, CloudOffIcon, DownloadIcon, EyeOffIcon, LoaderCircleIcon, LockIcon } from "lucide-react";
import { cn } from "cn";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { JuryEvaluation, JuryQuestion, SheetIndicator } from "@/lib/api-types";
import { downloadFile, fileSize } from "@/features/applying/use-applying";
import { evaluationKey, JURY_HOME_KEY, useJuryEvaluation } from "./use-judging";

/**
 * The scoring screen of a document round (spec §5.9): each question with its answer (and its
 * files when the award isn't blind), its indicators with their weights, an optional comment per
 * question and the required overall note. Marks save as the juror goes; submitting needs every
 * indicator and the note, then nothing changes. The juror never sees a total or anyone else's marks.
 */
export function ScoringPage({ evaluationId }: { evaluationId: string }) {
  return <AreaPage area="jury">{() => <ScoringScreen evaluationId={evaluationId} />}</AreaPage>;
}

function ScoringScreen({ evaluationId }: { evaluationId: string }) {
  const evaluation = useJuryEvaluation(evaluationId);
  if (evaluation.isPending) return <LoadingState label="Loading the application" lines={6} />;
  if (evaluation.error) return <ErrorState error={evaluation.error} onRetry={() => void evaluation.refetch()} />;
  return <Scoring key={evaluation.data.id} evaluation={evaluation.data} />;
}

type SaveState = { kind: "saved" } | { kind: "pending" } | { kind: "saving" } | { kind: "retrying"; message: string } | { kind: "stopped"; message: string };

interface Queued {
  scores: Record<string, number | null>;
  comments: Record<string, string>;
  overallNote?: string;
}

const SAVE_AFTER_MS = 1200;
const RETRY_AFTER_MS = 5000;

/** Draft marks are queued and sent shortly after the juror stops; a failed save keeps them and tries again. */
function useScoreAutosave(evaluationId: string, onSaved: (evaluation: JuryEvaluation) => void) {
  const [state, setState] = useState<SaveState>({ kind: "saved" });
  const queued = useRef<Queued>({ scores: {}, comments: {} });
  const saving = useRef(false);
  const stopped = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const hasQueued = () => {
    const q = queued.current;
    return Object.keys(q.scores).length > 0 || Object.keys(q.comments).length > 0 || q.overallNote !== undefined;
  };

  const schedule = useCallback((delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current || stopped.current || !hasQueued()) return;
    const batch = queued.current;
    queued.current = { scores: {}, comments: {} };
    saving.current = true;
    setState({ kind: "saving" });
    try {
      onSaved(await api.put<JuryEvaluation>(`/evaluations/${evaluationId}/scores`, batch));
      setState(hasQueued() ? { kind: "pending" } : { kind: "saved" });
    } catch (error) {
      // Put the batch back under anything typed meanwhile: nothing is lost.
      queued.current = {
        scores: { ...batch.scores, ...queued.current.scores },
        comments: { ...batch.comments, ...queued.current.comments },
        ...((queued.current.overallNote ?? batch.overallNote) !== undefined && { overallNote: queued.current.overallNote ?? batch.overallNote }),
      };
      if (error instanceof ApiError && [400, 401, 404, 409].includes(error.status)) {
        stopped.current = true;
        setState({ kind: "stopped", message: messageOf(error) });
      } else {
        setState({ kind: "retrying", message: messageOf(error) });
        schedule(RETRY_AFTER_MS);
      }
    } finally {
      saving.current = false;
      if (!stopped.current && hasQueued() && !timer.current) schedule(SAVE_AFTER_MS);
    }
  }, [evaluationId, onSaved, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasQueued() || saving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void flushRef.current();
    };
  }, []);

  const queue = useCallback(
    (change: (q: Queued) => void) => {
      change(queued.current);
      if (!stopped.current) {
        setState({ kind: "pending" });
        schedule(SAVE_AFTER_MS);
      }
    },
    [schedule],
  );

  return { state, queue, flush };
}

function Scoring({ evaluation }: { evaluation: JuryEvaluation }) {
  const queryClient = useQueryClient();
  const onSaved = useCallback(
    (next: JuryEvaluation) => {
      queryClient.setQueryData(evaluationKey(next.id), next);
      void queryClient.invalidateQueries({ queryKey: JURY_HOME_KEY });
    },
    [queryClient],
  );
  const autosave = useScoreAutosave(evaluation.id, onSaved);
  const [scores, setScores] = useState<Record<string, number>>(evaluation.scores);
  const [comments, setComments] = useState<Record<string, string>>(evaluation.comments);
  const [note, setNote] = useState(evaluation.overallNote);
  const [submitError, setSubmitError] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editable = evaluation.canEdit;

  const setMark = (indicator: SheetIndicator, value: number | null) => {
    setScores((s) => {
      const next = { ...s };
      if (value === null) delete next[indicator.key];
      else next[indicator.key] = value;
      return next;
    });
    autosave.queue((q) => {
      q.scores[indicator.key] = value;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await autosave.flush();
      onSaved(await api.post<JuryEvaluation>(`/evaluations/${evaluation.id}/submit`, {}));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError(e instanceof ApiError && e.fieldErrors.length > 0 ? e.fieldErrors.map((f) => f.message) : [messageOf(e)]);
    } finally {
      setSubmitting(false);
    }
  };

  const allIndicators = [...evaluation.sections.flatMap((s) => s.questions.flatMap((q) => q.indicators)), ...evaluation.otherIndicators];
  const marked = allIndicators.filter((i) => scores[i.key] !== undefined).length;
  const complete = marked === allIndicators.length && note.trim().length > 0;
  const details = evaluation.organisation
    ? [evaluation.organisation.type, evaluation.organisation.city, evaluation.organisation.state].filter(Boolean).join(", ")
    : null;

  return (
    <>
      <PageTitle
        back={{ href: "/jury", label: "My assignments" }}
        eyebrow={`${evaluation.award.name} ${evaluation.cycle.label} · ${evaluation.category.name}`}
        title={evaluation.organisation?.name ?? evaluation.reference}
        badges={
          <>
            <Badge variant={evaluation.status === "SUBMITTED" ? "success" : "info"}>{evaluation.statusLabel}</Badge>
            {evaluation.cycle.blindJudging && (
              <Badge variant="outline">
                <EyeOffIcon aria-hidden /> Blind
              </Badge>
            )}
          </>
        }
        description={details ? `${details} · ${evaluation.reference}` : undefined}
        actions={editable && <SaveIndicator state={autosave.state} />}
      />

      {evaluation.cycle.blindJudging && (
        <Alert variant="info" className="mb-6">
          <EyeOffIcon />
          <AlertDescription>
            This award is judged blind: you see the answers only, never who applied or their files. If an answer names the organisation, score it as
            usual.
          </AlertDescription>
        </Alert>
      )}
      {!editable && (
        <Alert variant="success" className="mb-6">
          <LockIcon />
          <AlertDescription>{evaluation.status === "SUBMITTED" ? "You submitted this evaluation: your marks are final." : "Judging has closed for this round."}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <div className="grid min-w-0 gap-6">
          {evaluation.sections.map((section) => (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                {section.description && <CardDescription>{section.description}</CardDescription>}
              </CardHeader>
              <CardContent className="grid gap-8">
                {section.questions.map((question) => (
                  <QuestionBlock
                    key={question.key}
                    question={question}
                    scores={scores}
                    comment={comments[question.key] ?? ""}
                    editable={editable}
                    onMark={setMark}
                    onComment={(text) => {
                      setComments((c) => ({ ...c, [question.key]: text }));
                      autosave.queue((q) => {
                        q.comments[question.key] = text;
                      });
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
          {evaluation.otherIndicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Other indicators</CardTitle>
                <CardDescription>These score questions this application&apos;s version of the form didn&apos;t have.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {evaluation.otherIndicators.map((indicator) => (
                  <IndicatorInput key={indicator.key} indicator={indicator} value={scores[indicator.key]} editable={editable} onMark={setMark} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card id="overall-note">
            <CardHeader>
              <CardTitle>Overall note</CardTitle>
              <CardDescription>Required. Staff, the department head and the leader read it; other jury members never do.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Textarea
                aria-label="Overall note"
                value={note}
                disabled={!editable}
                rows={5}
                maxLength={10000}
                placeholder="Your overall view of this application, in a few sentences."
                onChange={(e) => {
                  setNote(e.target.value);
                  const text = e.target.value;
                  autosave.queue((q) => {
                    q.overallNote = text;
                  });
                }}
              />
              {editable && (
                <div className="grid gap-3">
                  {submitError && (
                    <Alert variant="destructive">
                      <CircleAlertIcon />
                      <AlertDescription>
                        <ul className="grid gap-1">
                          {submitError.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="lg" onClick={() => void submit()} disabled={submitting}>
                      {submitting ? "Submitting…" : "Submit my evaluation"}
                    </Button>
                    <p className="text-sm text-muted-foreground">Once you submit, your marks can&apos;t change.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Your progress</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">Indicators marked</span>
                  <span className="tabular-nums">
                    {marked} / {allIndicators.length}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={allIndicators.length} aria-valuenow={marked}>
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${allIndicators.length ? (marked / allIndicators.length) * 100 : 0}%` }} />
                </div>
              </div>
              <ul className="grid gap-1.5 text-sm">
                {evaluation.sectionWeights.map((s) => (
                  <li key={s.key} className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-muted-foreground">{s.title}</span>
                    <span className="shrink-0 tabular-nums">{s.weight}%</span>
                  </li>
                ))}
              </ul>
              <p className={cn("flex items-start gap-1.5 text-sm", note.trim() ? "text-success" : "text-muted-foreground")}>
                {note.trim() ? <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />}
                Overall note {note.trim() ? "written" : "still to write"}
              </p>
              {editable && (
                <Button variant={complete ? "default" : "outline"} onClick={() => document.getElementById("overall-note")?.scrollIntoView({ behavior: "smooth" })}>
                  {complete ? "Ready to submit" : "Go to the note and submit"}
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <CircleCheckIcon className="size-4 text-success" aria-hidden /> All marks saved
      </span>
    );
  }
  if (state.kind === "pending" || state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden /> Saving…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive" role="status">
      <CloudOffIcon className="size-4" aria-hidden /> {state.kind === "retrying" ? `Not saved yet, retrying: ${state.message}` : state.message}
    </span>
  );
}

function answerText(question: JuryQuestion): string {
  if (question.answer === null) return "No answer";
  if (question.type === "YES_NO") return question.answer === true ? "Yes" : "No";
  if (question.type === "SINGLE_CHOICE") return question.options.find((o) => o.key === question.answer)?.label ?? String(question.answer);
  return String(question.answer);
}

function QuestionBlock({
  question,
  scores,
  comment,
  editable,
  onMark,
  onComment,
}: {
  question: JuryQuestion;
  scores: Record<string, number>;
  comment: string;
  editable: boolean;
  onMark: (indicator: SheetIndicator, value: number | null) => void;
  onComment: (text: string) => void;
}) {
  const [showComment, setShowComment] = useState(comment.length > 0);
  return (
    <div className="grid gap-4 border-b pb-8 last:border-0 last:pb-0">
      <div className="grid gap-1">
        <p className="text-base font-semibold">{question.label}</p>
        {question.help && <p className="text-sm text-muted-foreground">{question.help}</p>}
      </div>
      {question.type === "FILE_UPLOAD" ? (
        question.filesHidden ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOffIcon className="size-4" aria-hidden /> Files aren&apos;t shown in a blind award.
          </p>
        ) : question.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No file uploaded.</p>
        ) : (
          <ul className="grid gap-2">
            {question.files.map((file) => (
              <li key={file.id}>
                <Button variant="outline" onClick={() => void downloadFile(file.id)}>
                  <DownloadIcon aria-hidden /> {file.fileName} ({fileSize(file.sizeBytes)})
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <blockquote className="rounded-lg border-l-4 border-primary/30 bg-muted/40 px-4 py-3 leading-relaxed whitespace-pre-wrap">{answerText(question)}</blockquote>
      )}
      {question.indicators.map((indicator) => (
        <IndicatorInput key={indicator.key} indicator={indicator} value={scores[indicator.key]} editable={editable} onMark={onMark} />
      ))}
      {question.indicators.length > 0 &&
        (showComment || !editable ? (
          (editable || comment) && (
            <div className="grid gap-2">
              <Label htmlFor={`comment-${question.key}`}>Comment (optional)</Label>
              <Textarea id={`comment-${question.key}`} value={comment} disabled={!editable} rows={2} maxLength={5000} onChange={(e) => onComment(e.target.value)} />
            </div>
          )
        ) : (
          <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setShowComment(true)}>
            Add a comment
          </Button>
        ))}
    </div>
  );
}

function IndicatorInput({
  indicator,
  value,
  editable,
  onMark,
}: {
  indicator: SheetIndicator;
  value: number | undefined;
  editable: boolean;
  onMark: (indicator: SheetIndicator, value: number | null) => void;
}) {
  const yesNo = indicator.type === "YES_NO";
  const options = yesNo ? [{ value: 1, label: "Yes" }, { value: 0, label: "No" }] : Array.from({ length: 11 }, (_, v) => ({ value: v, label: String(v) }));
  const marked = value !== undefined;
  return (
    <fieldset className={cn("grid gap-3 rounded-lg border px-4 py-3", marked ? "border-success/30 bg-success-soft/30" : "bg-card")}>
      <legend className="px-1 text-sm">
        <span className="font-semibold">{indicator.label}</span> <span className="text-muted-foreground">· {yesNo ? "Yes or No" : "0 to 10"} · weight {indicator.weight}%</span>
      </legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={indicator.label}>
        {options.map((option) => {
          const chosen = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={!editable}
              onClick={() => onMark(indicator, chosen ? null : option.value)}
              className={cn(
                "grid h-11 place-items-center rounded-lg border text-base font-semibold tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                yesNo ? "min-w-20 px-4" : "w-11",
                chosen ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-input/70 bg-card hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {!yesNo && editable && <p className="text-xs text-muted-foreground">0 is the lowest mark, 10 the highest. Tap a mark again to clear it.</p>}
    </fieldset>
  );
}
