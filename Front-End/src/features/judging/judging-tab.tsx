"use client";

import { useState, type FormEvent } from "react";
import { FlagIcon } from "lucide-react";
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
      {judging.applications.length === 0 && <p className="text-sm text-muted-foreground">No submitted applications yet.</p>}
      {byCategory.map(({ category, applications }) => (
        <section key={category.id} className="grid gap-3" aria-labelledby={`category-${category.id}`}>
          <h2 id={`category-${category.id}`} className="text-lg font-semibold">
            {category.name}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval</CardTitle>
        <CardDescription>
          Staff send the whole round to the department&apos;s head once every application has its minimum of submitted
          evaluations. The head&apos;s approval locks every score for good.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {(round.status === "JUDGING" || round.status === "NOT_STARTED") && judging.sendBlockers.length > 0 && (
          <div className="grid gap-1">
            <p className="font-medium">Before it can be sent:</p>
            <ul className="grid list-disc gap-1 pl-5 text-muted-foreground">
              {judging.sendBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {can.sendForApproval && (
          <Button className="justify-self-start" disabled={busy} onClick={() => void act("send-for-approval", {})}>
            {busy ? "Sending…" : "Send for approval"}
          </Button>
        )}
        {round.status === "PENDING_APPROVAL" && !can.approve && (
          <Alert>
            <AlertDescription>Waiting for the department head&apos;s approval. Staff can still correct a mark, with a reason.</AlertDescription>
          </Alert>
        )}
        {can.approve && (
          <div className="grid gap-2">
            <Label htmlFor="approve-remark">Remark (optional)</Label>
            <Textarea id="approve-remark" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={2000} rows={2} />
            <Button className="justify-self-start" disabled={busy} onClick={() => void act("approve", remark.trim() ? { remark: remark.trim() } : {})}>
              {busy ? "Approving…" : "Approve and lock the scores"}
            </Button>
            <p className="text-muted-foreground">Sending back with a remark comes in Phase 2.</p>
          </div>
        )}
        {(round.status === "APPROVED" || round.status === "RESULTS_PUBLISHED") && (
          <Alert>
            <AlertDescription>Approved: the scores are locked and can never change.</AlertDescription>
          </Alert>
        )}
        {error && <p className="text-destructive">{error}</p>}
        {judging.approvals.length > 0 && (
          <ul className="grid gap-1 text-muted-foreground">
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
    <Card className="py-4">
      <CardContent className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {a.rank !== null && <Badge variant={a.rank === 1 ? "default" : "secondary"}>#{a.rank}</Badge>}
          <span className="font-medium">{a.organisation.name}</span>
          <span className="text-muted-foreground">{a.reference}</span>
          {a.tied && <Badge variant="outline">Tie: settle by hand</Badge>}
          {!a.judged && <Badge variant="outline">Not judged (proof not verified)</Badge>}
          {a.result?.label && <Badge>{a.result.label}</Badge>}
          <span className="ml-auto text-right">
            {a.final ? (
              <>
                <span className="text-base font-semibold">{a.final.display}</span>{" "}
                <span className="text-muted-foreground">
                  (ΣP {a.final.totalPoints.toLocaleString("en-IN")} ÷ ({a.final.count} × 1000))
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No final score yet</span>
            )}
          </span>
        </div>
        {a.judged && !a.minimumMet && (
          <p className="text-destructive">
            {submitted} of the {judging.round.juryMin} submitted evaluations it needs.
          </p>
        )}
        {a.evaluations.length > 0 && <EvaluationsTable sheet={judging.sheet} evaluations={a.evaluations} roundId={judging.round.id} />}
        <div>
          <Button size="xs" variant="ghost" onClick={() => setHistory((h) => !h)} aria-expanded={history}>
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
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-1 pr-3 font-medium">Juror</th>
              {indicators.map((i) => (
                <th key={i.key} className="py-1 pr-3 font-medium" title={`${i.section.title} (${i.section.weight}%) · weight ${i.weight}%`}>
                  {i.label}
                </th>
              ))}
              <th className="py-1 pr-3 font-medium">Score</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e) => (
              <tr key={e.id} className="border-b align-top last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-1">
                    {e.conflictFlagged && <FlagIcon className="size-3 text-destructive" aria-label="Conflict recorded after submitting" />}
                    {e.juror.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.status === "SUBMITTED" ? "submitted" : e.status === "IN_PROGRESS" ? "in progress" : "not started"}</span>
                </td>
                {indicators.map((i) => (
                  <td key={i.key} className="py-1.5 pr-3 tabular-nums">
                    {e.marks[i.key] === undefined ? "–" : i.type === "YES_NO" ? (e.marks[i.key] === 1 ? "Yes" : "No") : e.marks[i.key]}
                  </td>
                ))}
                <td className="py-1.5 pr-3 tabular-nums">
                  {e.score ?? "–"}
                  {e.points !== null && <span className="block text-xs text-muted-foreground">{e.points.toLocaleString("en-IN")} pts</span>}
                </td>
                <td className="py-1.5">
                  {e.canCorrect && correcting !== e.id && (
                    <Button size="xs" variant="outline" onClick={() => setCorrecting(e.id)}>
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
          <p key={e.id} className="text-muted-foreground">
            <span className="font-medium text-foreground">{e.juror.name}:</span> {e.overallNote}
          </p>
        ))}
      {correctingEvaluation && (
        <CorrectionForm roundId={roundId} sheet={sheet} evaluation={correctingEvaluation} onDone={() => setCorrecting(null)} />
      )}
    </div>
  );
}

/** Rule R3: a correction names its reason; who, when, the old and the new value are kept. */
function CorrectionForm({ roundId, sheet, evaluation, onDone }: { roundId: string; sheet: SheetSection[]; evaluation: ScoredEvaluation; onDone: () => void }) {
  const refresh = useRefreshRound(roundId);
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(evaluation.marks).map(([key, value]) => [key, String(value)])),
  );
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
    <form onSubmit={submit} className="grid gap-3 rounded-md border bg-muted/40 p-3">
      <p className="font-medium">Correct {evaluation.juror.name}&apos;s marks</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.key} className="grid gap-1.5">
            <Label htmlFor={`correct-${i.key}`}>{i.label}</Label>
            {i.type === "YES_NO" ? (
              <NativeSelect id={`correct-${i.key}`} value={marks[i.key] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [i.key]: e.target.value }))}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </NativeSelect>
            ) : (
              <Input
                id={`correct-${i.key}`}
                type="number"
                min={0}
                max={10}
                step={1}
                value={marks[i.key] ?? ""}
                onChange={(e) => setMarks((m) => ({ ...m, [i.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`correct-reason-${evaluation.id}`}>Why are the marks changed?</Label>
        <Input id={`correct-reason-${evaluation.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="The juror confirmed a typing slip by phone" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save the correction"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
