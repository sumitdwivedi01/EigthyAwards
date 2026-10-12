"use client";

import { useState, type FormEvent } from "react";
import { CircleAlertIcon, CircleCheckIcon, MegaphoneIcon } from "lucide-react";
import { ListRow } from "@/components/layout/blocks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, api, messageOf } from "@/lib/api-client";
import type { JudgedApplication, Judging } from "@/lib/api-types";
import { useRefreshRound } from "./use-judging";

/**
 * A round's results (spec §5.12), once the head has approved it: staff give the results by the
 * top N of each category, a minimum final score or by hand (ties are shown), then publish; each
 * applicant then sees their result and is emailed.
 */
export function ResultsTab({ judging }: { judging: Judging }) {
  const { round, can, results } = judging;
  if (round.status !== "APPROVED" && round.status !== "RESULTS_PUBLISHED") {
    return (
      <Alert variant="info">
        <CircleAlertIcon />
        <AlertDescription>Results are given once the department&apos;s head approves the round.</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="grid gap-6">
      {can.decideResults && <DecideResults judging={judging} />}
      <ResultsList judging={judging} />
      {results.published ? (
        <Alert variant="success">
          <CircleCheckIcon />
          <AlertDescription>Published: every applicant sees their result.</AlertDescription>
        </Alert>
      ) : (
        <Publish judging={judging} />
      )}
    </div>
  );
}

type Mode = "TOP_N" | "MIN_SCORE";

function DecideResults({ judging }: { judging: Judging }) {
  const refresh = useRefreshRound(judging.round.id);
  const labels = judging.resultLabels;
  const [mode, setMode] = useState<Mode>("TOP_N");
  const [n, setN] = useState("3");
  const [minScore, setMinScore] = useState("70");
  const [selected, setSelected] = useState(labels.find((l) => l.advances)?.label ?? labels[0]?.label ?? "");
  const [others, setOthers] = useState(labels.find((l) => !l.advances)?.label ?? labels[labels.length - 1]?.label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === "TOP_N" ? { mode, n: Number(n), selected, others } : { mode, minScore, selected, others };
      refresh(await api.put<Judging>(`/rounds/${judging.round.id}/results`, body));
    } catch (e) {
      setError(e instanceof ApiError && e.fieldErrors.length > 0 ? e.fieldErrors.map((f) => f.message).join(" ") : messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Give the results</CardTitle>
        <CardDescription>Applications are ranked within their category. Pick the top of each category, or everyone at or above a score; then adjust any one by hand below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={apply} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="results-mode">How</Label>
            <NativeSelect id="results-mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="TOP_N">Top N of each category</option>
              <option value="MIN_SCORE">At or above a score</option>
            </NativeSelect>
          </div>
          {mode === "TOP_N" ? (
            <div className="grid gap-2">
              <Label htmlFor="results-n">How many (N)</Label>
              <Input id="results-n" type="number" min={1} value={n} onChange={(e) => setN(e.target.value)} />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="results-min">Minimum final score</Label>
              <Input id="results-min" inputMode="decimal" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="70.00" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="results-selected">They get</Label>
            <NativeSelect id="results-selected" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {labels.map((l) => (
                <option key={l.label}>{l.label}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="results-others">The others get</Label>
            <NativeSelect id="results-others" value={others} onChange={(e) => setOthers(e.target.value)}>
              {labels.map((l) => (
                <option key={l.label}>{l.label}</option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Applying…" : "Apply"}
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsList({ judging }: { judging: Judging }) {
  return (
    <div className="grid gap-4">
      {judging.categories.map((category) => {
        const rows = judging.applications.filter((a) => a.category.id === category.id).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
        return (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle>{category.name}</CardTitle>
              <CardDescription>
                {rows.length} {rows.length === 1 ? "application" : "applications"}, ranked by final score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {rows.map((row) => (
                  <ResultRow key={row.id} judging={judging} row={row} />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ResultRow({ judging, row }: { judging: Judging; row: JudgedApplication }) {
  const refresh = useRefreshRound(judging.round.id);
  const [error, setError] = useState<string | null>(null);
  const editable = judging.can.decideResults && row.judged;

  const change = async (label: string) => {
    setError(null);
    try {
      refresh(await api.put<Judging>(`/rounds/${judging.round.id}/results`, { mode: "MANUAL", labels: [{ applicationId: row.id, label }] }));
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <ListRow>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums ${row.rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} aria-label={row.rank ? `Rank ${row.rank}` : "No rank"}>
        {row.rank ?? "–"}
      </span>
      <div className="grid min-w-40 flex-1 gap-0.5">
        <span className="font-semibold">{row.organisation.name}</span>
        <span className="text-sm text-muted-foreground">
          {row.reference}
          {row.tied && " · tie"}
        </span>
      </div>
      {row.tied && <Badge variant="warning">Tie</Badge>}
      <span className="text-lg font-semibold tabular-nums">{row.final?.display ?? <span className="text-sm font-normal text-muted-foreground">Not judged</span>}</span>
      <span>
        {editable ? (
          <NativeSelect aria-label={`Result for ${row.reference}`} value={row.result?.label ?? ""} onChange={(e) => void change(e.target.value)} className="h-10 w-48">
            <option value="" disabled>
              No result yet
            </option>
            {judging.resultLabels.map((l) => (
              <option key={l.label}>{l.label}</option>
            ))}
          </NativeSelect>
        ) : (
          <Badge variant={row.result?.advances ? "success" : row.result ? "secondary" : "outline"}>{row.result?.label ?? "No result yet"}</Badge>
        )}
      </span>
      {error && (
        <p className="w-full text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </ListRow>
  );
}

function Publish({ judging }: { judging: Judging }) {
  const refresh = useRefreshRound(judging.round.id);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { results, can } = judging;
  if (!judging.can.decideResults) {
    return <p className="text-sm text-muted-foreground">The award&apos;s staff give and publish the results.</p>;
  }
  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      refresh(await api.post<Judging>(`/rounds/${judging.round.id}/publish-results`, {}));
      setConfirming(false);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const ready = results.decided === results.total;
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MegaphoneIcon className="size-5 text-muted-foreground" aria-hidden />
          Publish the results
        </CardTitle>
        <CardDescription>
          {results.decided} of {results.total} applications have a result. Applicants see nothing until you publish; then every applicant sees their
          result and is emailed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {confirming ? (
          <div className="surface grid gap-3 p-4">
            <p className="font-semibold">Publish the results now?</p>
            <p className="text-sm text-muted-foreground">Every applicant will see their result straight away and receive an email. This can&apos;t be undone.</p>
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
            <Button size="lg" onClick={() => setConfirming(true)} disabled={!can.publishResults}>
              Publish the results
            </Button>
            {!ready && <p className="text-sm text-muted-foreground">Give every application a result first.</p>}
          </div>
        )}
        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
