"use client";

import { useState, type FormEvent } from "react";
import { FlagIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { AssignmentBoard, AssignmentProblem, BoardApplication } from "@/lib/api-types";
import { PROOF_LABELS } from "@/features/staff-applications/applications-list";
import { ReasonForm } from "./reason-form";
import { useBoard, useRefreshRound } from "./use-judging";

/**
 * The assignment board (spec §5.8): per application, its jury against the round's minimum and
 * maximum and "needs N more"; per juror, assigned, submitted and pending. Staff pick applications
 * and jury and assign them in one all-or-nothing action; a refusal lists each problem.
 */
export function AssignmentTab({ roundId }: { roundId: string }) {
  const board = useBoard(roundId);
  if (board.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (board.error) return <p className="text-sm text-destructive">{messageOf(board.error)}</p>;
  return <Board board={board.data} />;
}

const EVALUATION_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  SUBMITTED: "default",
  IN_PROGRESS: "secondary",
  ASSIGNED: "outline",
};

const STATUS_TEXT: Record<string, string> = { ASSIGNED: "not started", IN_PROGRESS: "in progress", SUBMITTED: "submitted", REDO: "sent back" };

function Board({ board }: { board: AssignmentBoard }) {
  const refresh = useRefreshRound(board.round.id);
  const [applications, setApplications] = useState<Set<string>>(new Set());
  const [jurors, setJurors] = useState<Set<string>>(new Set());
  const [problems, setProblems] = useState<AssignmentProblem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { round, can, counts } = board;

  const selectable = (a: BoardApplication) => can.assign && a.eligible && !a.full;
  const conflictedWithSelection = new Set(
    board.applications.filter((a) => applications.has(a.id)).flatMap((a) => a.conflictedJuryIds),
  );
  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  const assign = async () => {
    setBusy(true);
    setProblems([]);
    setMessage(null);
    try {
      await api.post(`/rounds/${round.id}/assignments`, { applicationIds: [...applications], juryUserIds: [...jurors] });
      setMessage(`Assigned ${applications.size} ${applications.size === 1 ? "application" : "applications"} to ${jurors.size} ${jurors.size === 1 ? "juror" : "jurors"}.`);
      setApplications(new Set());
      setJurors(new Set());
      refresh();
    } catch (error) {
      const details = error instanceof ApiError ? (error.details as { problems?: AssignmentProblem[] } | undefined) : undefined;
      setProblems(details?.problems ?? []);
      setMessage(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      {board.assignBlockedReason && can.assign === false && round.status !== "APPROVED" && (
        <Alert>
          <AlertDescription>{board.assignBlockedReason}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge>{counts.eligible} to judge</Badge>
        <Badge variant={counts.needMoreJury > 0 ? "destructive" : "secondary"}>{counts.needMoreJury} need more jury</Badge>
        <Badge variant="outline">{counts.proofPending} proofs to check</Badge>
        <Badge variant="outline">{counts.proofRejected} proofs rejected (not judged)</Badge>
        <Badge variant="outline">{board.juryOnList} on the jury list</Badge>
      </div>

      {can.changeJuryPerApplication && <JuryPerApplication board={board} onSaved={() => refresh()} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Each needs {round.juryMin === round.juryMax ? round.juryMin : `${round.juryMin} to ${round.juryMax}`} different{" "}
              {round.juryMax === 1 ? "juror" : "jurors"}. Pick applications and jury, then assign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {board.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submitted applications.</p>
            ) : (
              <ul className="grid gap-2">
                {board.applications.map((a) => (
                  <ApplicationRow
                    key={a.id}
                    application={a}
                    board={board}
                    selectable={selectable(a)}
                    selected={applications.has(a.id)}
                    onSelect={(on) => setApplications((s) => toggle(s, a.id, on))}
                    onChanged={() => refresh()}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jury list</CardTitle>
            <CardDescription>{board.round.department.name}: assigned, submitted and pending.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {board.jury.length === 0 ? (
              <p className="text-sm text-muted-foreground">The department has no jury yet: its head adds them.</p>
            ) : (
              <ul className="grid gap-2">
                {board.jury.map((j) => {
                  const conflicted = conflictedWithSelection.has(j.id);
                  return (
                    <li key={j.id} className="flex items-start gap-2 text-sm">
                      {can.assign && (
                        <Checkbox
                          id={`juror-${j.id}`}
                          checked={jurors.has(j.id)}
                          disabled={conflicted}
                          onCheckedChange={(on) => setJurors((s) => toggle(s, j.id, on === true))}
                          aria-label={`Pick ${j.name}`}
                        />
                      )}
                      <label htmlFor={`juror-${j.id}`} className="grid gap-0.5">
                        <span className="font-medium">{j.name}</span>
                        <span className="text-muted-foreground">
                          {j.assigned} assigned · {j.submitted} submitted · {j.pending} pending
                        </span>
                        {conflicted && <span className="text-destructive">Conflict with a picked organisation</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {can.assign && (
              <Button onClick={assign} disabled={busy || applications.size === 0 || jurors.size === 0}>
                {busy ? "Assigning…" : `Assign ${applications.size || ""} to ${jurors.size || ""} picked`}
              </Button>
            )}
            {message && <p className={`text-sm ${problems.length > 0 ? "text-destructive" : "text-emerald-700"}`}>{message}</p>}
            {problems.length > 0 && (
              <ul className="grid list-disc gap-1 pl-5 text-sm text-destructive">
                {problems.map((p, i) => (
                  <li key={i}>{p.message}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Conflicts board={board} onChanged={() => refresh()} />
    </div>
  );
}

function ApplicationRow({
  application: a,
  board,
  selectable,
  selected,
  onSelect,
  onChanged,
}: {
  application: BoardApplication;
  board: AssignmentBoard;
  selectable: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const { juryMin, juryMax } = board.round;
  return (
    <li className="grid gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {board.can.assign && (
          <Checkbox
            checked={selected}
            disabled={!selectable}
            onCheckedChange={(on) => onSelect(on === true)}
            aria-label={`Pick ${a.reference}`}
          />
        )}
        <span className="font-medium">{a.organisation.name}</span>
        <span className="text-muted-foreground">
          {a.reference} · {a.category.name}
        </span>
        {a.eligible ? (
          <>
            <Badge variant={a.needs > 0 ? "destructive" : "secondary"}>
              {a.assigned} / {juryMin === juryMax ? juryMax : `${juryMin}–${juryMax}`} jury
            </Badge>
            {a.needs > 0 && <span className="text-destructive">needs {a.needs} more</span>}
            {a.full && <span className="text-muted-foreground">full</span>}
            <span className="text-muted-foreground">{a.submitted} submitted</span>
          </>
        ) : (
          <Badge variant="outline">{PROOF_LABELS[a.proofStatus]}</Badge>
        )}
      </div>
      {!a.eligible && a.notEligibleReason && <p className="text-muted-foreground">{a.notEligibleReason}</p>}
      {a.evaluations.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {a.evaluations.map((e) => (
            <li key={e.evaluationId} className="flex items-center gap-1">
              <Badge variant={EVALUATION_BADGE[e.status] ?? "outline"} className="gap-1">
                {e.conflictFlagged && <FlagIcon className="size-3" aria-label="Conflict recorded after submitting" />}
                {e.juror.name}: {STATUS_TEXT[e.status] ?? e.status}
              </Badge>
              {e.canRevoke && revoking !== e.evaluationId && (
                <Button size="xs" variant="ghost" onClick={() => setRevoking(e.evaluationId)}>
                  Take back
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {a.evaluations.some((e) => e.conflictFlagged) && (
        <p className="text-xs text-muted-foreground">
          A conflict was recorded after this juror submitted. Their evaluation still counts; it is flagged for you.
        </p>
      )}
      {revoking && (
        <ReasonForm
          id={`revoke-${revoking}`}
          label="Why is this assignment taken back?"
          submitLabel="Take back"
          onCancel={() => setRevoking(null)}
          onSubmit={async (reason) => {
            await api.post(`/evaluations/${revoking}/revoke`, { reason });
            setRevoking(null);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

function JuryPerApplication({ board, onSaved }: { board: AssignmentBoard; onSaved: () => void }) {
  const [min, setMin] = useState(String(board.round.juryMin));
  const [max, setMax] = useState(String(board.round.juryMax));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/rounds/${board.round.id}`, { juryMin: Number(min), juryMax: Number(max) });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.fieldErrors.length > 0 ? e.fieldErrors.map((f) => f.message).join(" ") : messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jury per application</CardTitle>
        <CardDescription>
          At least 1, and at most the {board.juryOnList} on the jury list. It can change until the round is sent for approval
          {board.mostAssigned > 0 && `; the maximum can't go below ${board.mostAssigned}, which an application already has`}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="jury-min">Minimum</Label>
            <Input id="jury-min" type="number" min={1} max={20} value={min} onChange={(e) => setMin(e.target.value)} className="w-24" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="jury-max">Maximum</Label>
            <Input id="jury-max" type="number" min={1} max={20} value={max} onChange={(e) => setMax(e.target.value)} className="w-24" />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

/** Rule R2: "jury member X has a conflict with organisation Y", for every award. */
function Conflicts({ board, onChanged }: { board: AssignmentBoard; onChanged: () => void }) {
  const [juror, setJuror] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const record = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await api.post<{ revoked: number; flagged: number }>(`/cycles/${board.round.cycle.id}/conflicts`, {
        juryUserId: juror,
        organisationId: organisation,
        ...(note.trim() && { note: note.trim() }),
      });
      setResult(
        [
          "Conflict recorded.",
          outcome.revoked > 0 && `${outcome.revoked} unsubmitted ${outcome.revoked === 1 ? "assignment was" : "assignments were"} taken back.`,
          outcome.flagged > 0 && `${outcome.flagged} submitted ${outcome.flagged === 1 ? "evaluation is" : "evaluations are"} flagged.`,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setJuror("");
      setOrganisation("");
      setNote("");
      onChanged();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflicts of interest</CardTitle>
        <CardDescription>
          A recorded conflict applies to every award: the juror is never given that organisation&apos;s application.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {board.conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conflicts recorded for this edition&apos;s organisations.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {board.conflicts.map((c) => (
              <li key={c.id} className="grid gap-2 rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">
                    {c.juror.name} · {c.organisation.name}
                  </span>
                  <span className="text-muted-foreground">recorded by {c.recordedBy}</span>
                  {c.note && <span className="text-muted-foreground">“{c.note}”</span>}
                  {board.can.recordConflicts && removing !== c.id && (
                    <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setRemoving(c.id)}>
                      Remove
                    </Button>
                  )}
                </div>
                {removing === c.id && (
                  <ReasonForm
                    id={`remove-${c.id}`}
                    label="Why remove this conflict?"
                    submitLabel="Remove"
                    onCancel={() => setRemoving(null)}
                    onSubmit={async (reason) => {
                      await api.post(`/cycles/${board.round.cycle.id}/conflicts/${c.id}/remove`, { reason });
                      setRemoving(null);
                      onChanged();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {board.can.recordConflicts && (
          <form onSubmit={record} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="conflict-juror">Jury member</Label>
              <NativeSelect id="conflict-juror" value={juror} onChange={(e) => setJuror(e.target.value)} required>
                <option value="">Pick…</option>
                {board.jury.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="conflict-organisation">Organisation</Label>
              <NativeSelect id="conflict-organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} required>
                <option value="">Pick…</option>
                {board.organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="conflict-note">Note (optional)</Label>
              <Input id="conflict-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Former employee" />
            </div>
            <Button type="submit" disabled={busy || !juror || !organisation}>
              {busy ? "Recording…" : "Record"}
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-emerald-700">{result}</p>}
      </CardContent>
    </Card>
  );
}
