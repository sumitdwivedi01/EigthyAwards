"use client";

import { useState, type FormEvent } from "react";
import { CircleAlertIcon, CircleCheckIcon, FlagIcon, HistoryIcon, LockIcon, SendIcon } from "lucide-react";
import { EmptyState } from "@/components/layout/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { JudgedApplication, Judging, ScoredEvaluation, SheetSection } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { HistoryPanel } from "./history-panel";
import { useRefreshRound } from "./use-judging";

/**
 * Judging progress and the round review (spec §5.9, §5.11): each application's final score, the
 * exact average of its submitted evaluations with ΣP and n so it can be checked by hand (ADR
 * 0019), and every juror's marks and note. Staff correct a submitted mark with a reason (rule R3)
 * and send the round for approval; the department's head approves it.
 */
export function JudgingTab({ judging }: { judging: Judging }) {
  const byCategory = judging.categories.map((category) => ({
    category,
    applications: judging.applications
      .filter((a) => a.category.id === category.id)
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.reference.localeCompare(b.reference)),
  }));
  return (
    <div className="grid gap-6">
      <ApprovalCard judging={judging} />
      {judging.applications.length === 0 && <EmptyState title="No submitted applications yet" description="Scores appear here once jury are assigned and start marking." />}
      {byCategory.map(({ category, applications }) => (
        <section key={category.id} className="grid gap-3" aria-labelledby={`category-${category.id}`}>
          <h2 id={`category-${category.id}`} className="text-eyebrow">
            {category.name} · {applications.length} {applications.length === 1 ? "application" : "applications"}
          </h2>
          {applications.map((application) => (
            <ApplicationScores key={application.id} judging={judging} application={application} />
          ))}
        </section>
      ))}
    </div>
  );
}

function ApprovalCard({ judging }: { judging: Judging }) {
  const refresh = useRefreshRound(judging.round.id);
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { round, can } = judging;

  const act = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      refresh(await api.post<Judging>(`/rounds/${round.id}/${path}`, body));
    } catch (e) {
      setError(e instanceof ApiError && e.issues.length > 0 ? `${e.message} ${e.issues.join(" ")}` : messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const judgingNow = round.status === "JUDGING" || round.status === "NOT_STARTED";
  return (
    <Card className={can.approve ? "border-warning/40" : undefined}>
      <CardHeader>
        <CardTitle>{can.approve ? "Your approval" : "Approval"}</CardTitle>
        <CardDescription>
          Staff send the whole round to the department&apos;s head once every application has its minimum of submitted evaluations. The head&apos;s
          approval locks every score for good.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {judgingNow && judging.sendBlockers.length > 0 && (
          <div className="surface grid gap-2 p-4">
            <p className="font-semibold">Before it can be sent</p>
            <ul className="grid gap-1.5">
              {judging.sendBlockers.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {judgingNow && judging.sendBlockers.length === 0 && can.sendForApproval && (
          <Alert variant="success">
            <CircleCheckIcon />
            <AlertDescription>Every application has enough submitted evaluations. The round can be sent to the head.</AlertDescription>
          </Alert>
        )}
        {can.sendForApproval && (
          <Button size="lg" className="justify-self-start" disabled={busy} onClick={() => void act("send-for-approval", {})}>
            <SendIcon aria-hidden />
            {busy ? "Sending…" : "Send for approval"}
          </Button>
        )}
        {round.status === "PENDING_APPROVAL" && !can.approve && (
          <Alert variant="info">
            <AlertDescription>Waiting for the department head&apos;s approval. Staff can still correct a mark, with a reason.</AlertDescription>
          </Alert>
        )}
        {can.approve && (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="approve-remark">Remark (optional)</Label>
              <Textarea id="approve-remark" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={2000} rows={2} placeholder="Anything you want on record with your approval." />
            </div>
            <Button size="lg" className="justify-self-start" disabled={busy} onClick={() => void act("approve", remark.trim() ? { remark: remark.trim() } : {})}>
              <LockIcon aria-hidden />
              {busy ? "Approving…" : "Approve and lock the scores"}
            </Button>
            <p className="text-sm text-muted-foreground">Check the ranked list below first. Sending back with a remark comes in Phase 2.</p>
          </div>
        )}
        {(round.status === "APPROVED" || round.status === "RESULTS_PUBLISHED") && (
          <Alert variant="success">
            <LockIcon />
            <AlertDescription>Approved: the scores are locked and can never change.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {judging.approvals.length > 0 && (
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {judging.approvals.map((a) => (
              <li key={a.id}>
                Sent by {a.submittedBy} on {istDateTime(a.submittedAt)}
                {a.decidedAt && ` · ${a.decision === "APPROVED" ? "approved" : "sent back"} by ${a.decidedBy ?? "the head"} on ${istDateTime(a.decidedAt)}`}
                {a.remark && ` · “${a.remark}”`}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationScores({ judging, application: a }: { judging: Judging; application: JudgedApplication }) {
  const [history, setHistory] = useState(false);
  const submitted = a.evaluations.filter((e) => e.status === "SUBMITTED").length;
  return (
    <Card size="sm">
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {a.rank !== null && (
            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums ${a.rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} aria-label={`Rank ${a.rank}`}>
              {a.rank}
            </span>
          )}
          <span className="text-base font-semibold">{a.organisation.name}</span>
          <span className="text-sm text-muted-foreground">{a.reference}</span>
          {a.tied && <Badge variant="warning">Tie: settle by hand</Badge>}
          {!a.judged && <Badge variant="outline">Not judged (proof not verified)</Badge>}
          {a.result?.label && <Badge variant={a.result.advances ? "success" : "secondary"}>{a.result.label}</Badge>}
          <span className="ml-auto text-right">
            {a.final ? (
              <>
                <span className="text-2xl font-semibold tabular-nums">{a.final.display}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  ΣP {a.final.totalPoints.toLocaleString("en-IN")} ÷ ({a.final.count} × 1,000)
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No final score yet</span>
            )}
          </span>
        </div>
        {a.judged && !a.minimumMet && (
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <CircleAlertIcon className="size-4" aria-hidden />
            {submitted} of the {judging.round.juryMin} submitted evaluations it needs.
          </p>
        )}
        {a.evaluations.length > 0 && <EvaluationsTable sheet={judging.sheet} evaluations={a.evaluations} roundId={judging.round.id} />}
        <div>
          <Button size="sm" variant="ghost" onClick={() => setHistory((h) => !h)} aria-expanded={history}>
            <HistoryIcon aria-hidden />
            {history ? "Hide history" : "History"}
          </Button>
        </div>
        {history && <HistoryPanel applicationId={a.id} />}
      </CardContent>
    </Card>
  );
}

function EvaluationsTable({ sheet, evaluations, roundId }: { sheet: SheetSection[]; evaluations: ScoredEvaluation[]; roundId: string }) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const indicators = sheet.flatMap((s) => s.indicators.map((i) => ({ ...i, section: s })));
  const correctingEvaluation = evaluations.find((e) => e.id === correcting);
  return (
    <div className="grid gap-4">
      <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-4 font-semibold">Juror</th>
              {indicators.map((i) => (
                <th key={i.key} className="py-2 pr-4 font-semibold normal-case" title={`${i.section.title} (${i.section.weight}%) · weight ${i.weight}%`}>
                  {i.label}
                </th>
              ))}
              <th className="py-2 pr-4 font-semibold">Score</th>
              <th className="py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <tr key={e.id} className="border-b align-top last:border-0">
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-1 font-medium">
                    {e.conflictFlagged && <FlagIcon className="size-3.5 text-destructive" aria-label="Conflict recorded after submitting" />}
                    {e.juror.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.status === "SUBMITTED" ? "submitted" : e.status === "IN_PROGRESS" ? "in progress" : "not started"}</span>
                </td>
                {indicators.map((i) => (
                  <td key={i.key} className="py-2.5 pr-4 tabular-nums">
                    {e.marks[i.key] === undefined ? "–" : i.type === "YES_NO" ? (e.marks[i.key] === 1 ? "Yes" : "No") : e.marks[i.key]}
                  </td>
                ))}
                <td className="py-2.5 pr-4 tabular-nums">
                  <span className="font-semibold">{e.score ?? "–"}</span>
                  {e.points !== null && <span className="block text-xs text-muted-foreground">{e.points.toLocaleString("en-IN")} pts</span>}
                </td>
                <td className="py-2.5">
                  {e.canCorrect && correcting !== e.id && (
                    <Button size="sm" variant="outline" onClick={() => setCorrecting(e.id)}>
                      Correct
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {evaluations
        .filter((e) => e.overallNote)
        .map((e) => (
          <p key={e.id} className="rounded-lg bg-muted/40 px-4 py-2.5 text-sm">
            <span className="font-semibold">{e.juror.name}:</span> {e.overallNote}
          </p>
        ))}
      {correctingEvaluation && <CorrectionForm roundId={roundId} sheet={sheet} evaluation={correctingEvaluation} onDone={() => setCorrecting(null)} />}
    </div>
  );
}

/** Rule R3: a correction names its reason; who, when, the old and the new value are kept. */
function CorrectionForm({ roundId, sheet, evaluation, onDone }: { roundId: string; sheet: SheetSection[]; evaluation: ScoredEvaluation; onDone: () => void }) {
  const refresh = useRefreshRound(roundId);
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(evaluation.marks).map(([key, value]) => [key, String(value)])));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const indicators = sheet.flatMap((s) => s.indicators);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const changes = indicators
      .filter((i) => marks[i.key] !== undefined && marks[i.key] !== "" && Number(marks[i.key]) !== evaluation.marks[i.key])
      .map((i) => ({ indicatorKey: i.key, value: Number(marks[i.key]) }));
    if (changes.length === 0) {
      setError("Change at least one mark.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Give a reason for the change.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      refresh(await api.post<Judging>(`/evaluations/${evaluation.id}/score-changes`, { changes, reason: reason.trim() }));
      onDone();
    } catch (e) {
      setError(e instanceof ApiError && e.fieldErrors.length > 0 ? e.fieldErrors.map((f) => f.message).join(" ") : messageOf(e));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="surface grid gap-4 p-4 sm:p-5">
      <div className="grid gap-0.5">
        <p className="font-semibold">Correct {evaluation.juror.name}&apos;s marks</p>
        <p className="text-sm text-muted-foreground">The old and new values, who changed them, when and why are kept in the history.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.key} className="grid gap-2">
            <Label htmlFor={`correct-${i.key}`}>{i.label}</Label>
            {i.type === "YES_NO" ? (
              <NativeSelect id={`correct-${i.key}`} value={marks[i.key] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [i.key]: e.target.value }))}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </NativeSelect>
            ) : (
              <Input id={`correct-${i.key}`} type="number" min={0} max={10} step={1} value={marks[i.key] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [i.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`correct-reason-${evaluation.id}`}>Why are the marks changed?</Label>
        <Input id={`correct-reason-${evaluation.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="For example: the juror confirmed a typing slip by phone" />
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save the correction"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
