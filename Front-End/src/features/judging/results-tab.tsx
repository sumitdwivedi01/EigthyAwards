"use client";

import { useState, type FormEvent } from "react";
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
      <Alert>
        <AlertDescription>Results are given once the department&apos;s head approves the round.</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="grid gap-6">
      {can.decideResults && <DecideResults judging={judging} />}
      <ResultsList judging={judging} />
      {results.published ? (
        <Alert>
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
        <CardDescription>
          Applications are ranked within their category. Pick the top of each category, or everyone at or above a score; then
          adjust any one by hand below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="results-mode">How</Label>
            <NativeSelect id="results-mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="TOP_N">Top N of each category</option>
              <option value="MIN_SCORE">At or above a score</option>
            </NativeSelect>
          </div>
          {mode === "TOP_N" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="results-n">N</Label>
              <Input id="results-n" type="number" min={1} value={n} onChange={(e) => setN(e.target.value)} />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="results-min">Minimum final score</Label>
              <Input id="results-min" inputMode="decimal" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="70.00" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="results-selected">They get</Label>
            <NativeSelect id="results-selected" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {labels.map((l) => (
                <option key={l.label}>{l.label}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
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
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function ResultsList({ judging }: { judging: Judging }) {
  return (
    <div className="grid gap-4">
      {judging.categories.map((category) => {
        const rows = judging.applications
          .filter((a) => a.category.id === category.id)
          .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
        return (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle>{category.name}</CardTitle>
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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm">
      <span className="w-8 tabular-nums text-muted-foreground">{row.rank ? `#${row.rank}` : "–"}</span>
      <span className="font-medium">{row.organisation.name}</span>
      <span className="text-muted-foreground">{row.reference}</span>
      {row.tied && <Badge variant="outline">Tie</Badge>}
      <span className="tabular-nums">{row.final?.display ?? "Not judged"}</span>
      <span className="ml-auto">
        {editable ? (
          <NativeSelect
            aria-label={`Result for ${row.reference}`}
            value={row.result?.label ?? ""}
            onChange={(e) => void change(e.target.value)}
            className="w-44"
          >
            <option value="" disabled>
              No result yet
            </option>
            {judging.resultLabels.map((l) => (
              <option key={l.label}>{l.label}</option>
            ))}
          </NativeSelect>
        ) : (
          <Badge variant={row.result?.advances ? "default" : "secondary"}>{row.result?.label ?? "No result yet"}</Badge>
        )}
      </span>
      {error && <p className="w-full text-destructive">{error}</p>}
    </li>
  );
}

function Publish({ judging }: { judging: Judging }) {
  const refresh = useRefreshRound(judging.round.id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { results, can } = judging;
  if (!judging.can.decideResults) {
    return <p className="text-sm text-muted-foreground">The award&apos;s staff give and publish the results.</p>;
  }
  const publish = async () => {
    if (!window.confirm("Publish the results? Every applicant sees their result and is emailed.")) return;
    setBusy(true);
    setError(null);
    try {
      refresh(await api.post<Judging>(`/rounds/${judging.round.id}/publish-results`, {}));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish</CardTitle>
        <CardDescription>
          {results.decided} of {results.total} applications have a result. Applicants see nothing until you publish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => void publish()} disabled={busy || !can.publishResults}>
          {busy ? "Publishing…" : "Publish the results"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
