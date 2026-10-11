"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, DownloadIcon, EyeOffIcon } from "lucide-react";
import { AreaPage } from "@/components/layout/app-shell";
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
  if (evaluation.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (evaluation.error) return <p className="text-sm text-destructive">{messageOf(evaluation.error)}</p>;
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

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/jury" className="text-muted-foreground underline underline-offset-4">
          My assignments
        </Link>
      </p>
      <div className="mb-6 grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{evaluation.organisation?.name ?? evaluation.reference}</h1>
          <Badge variant={evaluation.status === "SUBMITTED" ? "default" : "secondary"}>{evaluation.statusLabel}</Badge>
          {evaluation.cycle.blindJudging && (
            <Badge variant="outline" className="gap-1">
              <EyeOffIcon className="size-3" aria-hidden /> Blind
            </Badge>
          )}
          {editable && <SaveIndicator state={autosave.state} />}
        </div>
        <p className="text-muted-foreground">
          {evaluation.award.name} {evaluation.cycle.label} · {evaluation.category.name}
          {evaluation.organisation && ` · ${[evaluation.organisation.type, evaluation.organisation.city, evaluation.organisation.state].filter(Boolean).join(", ")}`}
          {evaluation.organisation && ` · ${evaluation.reference}`}
        </p>
      </div>

      {evaluation.cycle.blindJudging && (
        <Alert className="mb-4">
          <AlertDescription>
            This award is judged blind: you see the answers only, never who applied or their files. If an answer names the
            organisation, score it as usual.
          </AlertDescription>
        </Alert>
      )}
      {!editable && (
        <Alert className="mb-4">
          <AlertDescription>
            {evaluation.status === "SUBMITTED" ? "You submitted this evaluation: your marks are final." : "Judging has closed for this round."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {evaluation.sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && <CardDescription>{section.description}</CardDescription>}
            </CardHeader>
            <CardContent className="grid gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Overall note</CardTitle>
            <CardDescription>Required. Staff, the department head and the leader read it; other jury members never do.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea
              aria-label="Overall note"
              value={note}
              disabled={!editable}
              rows={4}
              maxLength={10000}
              onChange={(e) => {
                setNote(e.target.value);
                const text = e.target.value;
                autosave.queue((q) => {
                  q.overallNote = text;
                });
              }}
            />
            {editable && (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  {marked} of {allIndicators.length} indicators marked. Once you submit, your marks can&apos;t change.
                </p>
                <Button className="justify-self-start" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit my evaluation"}
                </Button>
                {submitError && (
                  <ul className="grid list-disc gap-1 pl-5 text-sm text-destructive">
                    {submitError.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "saved") {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden /> All changes saved
      </span>
    );
  }
  if (state.kind === "pending" || state.kind === "saving") return <span className="text-sm text-muted-foreground">Saving…</span>;
  return (
    <span className="flex items-center gap-1 text-sm text-destructive">
      <CircleAlertIcon className="size-4" aria-hidden /> {state.kind === "retrying" ? `Not saved yet, retrying: ${state.message}` : state.message}
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
    <div className="grid gap-3 border-b pb-6 last:border-0 last:pb-0">
      <div className="grid gap-1">
        <p className="font-medium">{question.label}</p>
        {question.help && <p className="text-sm text-muted-foreground">{question.help}</p>}
      </div>
      {question.type === "FILE_UPLOAD" ? (
        question.filesHidden ? (
          <p className="text-sm text-muted-foreground">Files aren&apos;t shown in a blind award.</p>
        ) : question.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No file uploaded.</p>
        ) : (
          <ul className="grid gap-1">
            {question.files.map((file) => (
              <li key={file.id}>
                <Button size="sm" variant="outline" onClick={() => void downloadFile(file.id)}>
                  <DownloadIcon aria-hidden /> {file.fileName} ({fileSize(file.sizeBytes)})
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm">{answerText(question)}</p>
      )}
      {question.indicators.map((indicator) => (
        <IndicatorInput key={indicator.key} indicator={indicator} value={scores[indicator.key]} editable={editable} onMark={onMark} />
      ))}
      {question.indicators.length > 0 &&
        (showComment || !editable ? (
          (editable || comment) && (
            <div className="grid gap-1.5">
              <Label htmlFor={`comment-${question.key}`}>Comment (optional)</Label>
              <Textarea id={`comment-${question.key}`} value={comment} disabled={!editable} rows={2} maxLength={5000} onChange={(e) => onComment(e.target.value)} />
            </div>
          )
        ) : (
          <Button size="xs" variant="ghost" className="justify-self-start" onClick={() => setShowComment(true)}>
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
  const options = indicator.type === "YES_NO" ? [{ value: 1, label: "Yes" }, { value: 0, label: "No" }] : Array.from({ length: 11 }, (_, v) => ({ value: v, label: String(v) }));
  return (
    <fieldset className="grid gap-2 rounded-md border px-3 py-2">
      <legend className="px-1 text-sm">
        <span className="font-medium">{indicator.label}</span>{" "}
        <span className="text-muted-foreground">· {indicator.type === "YES_NO" ? "Yes or No" : "0 to 10"} · weight {indicator.weight}%</span>
      </legend>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={indicator.label}>
        {options.map((option) => {
          const chosen = value === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={chosen ? "default" : "outline"}
              role="radio"
              aria-checked={chosen}
              disabled={!editable}
              className={indicator.type === "YES_NO" ? "min-w-14" : "min-w-9"}
              onClick={() => onMark(indicator, chosen ? null : option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
