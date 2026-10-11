"use client";

import Link from "next/link";
import { EyeOffIcon } from "lucide-react";
import { AreaPage } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { messageOf } from "@/lib/api-client";
import type { Area, RoundHeader } from "@/lib/api-types";
import { istDateTime } from "@/lib/format";
import { AssignmentTab } from "./assignment-tab";
import { JudgingTab } from "./judging-tab";
import { ResultsTab } from "./results-tab";
import { useJudging } from "./use-judging";

/**
 * One judging round (spec §5.8–§5.12), in three tabs: assignment (the board, jury per
 * application, conflicts), judging (every juror's marks next to the exact average, corrections
 * with a reason, sending for approval and approving) and results. The same page serves the
 * award's staff, its department's head and the leader: what each may do comes from the API.
 */
export function RoundPage({ roundId, area }: { roundId: string; area: Area }) {
  return <AreaPage area={area}>{() => <RoundScreen roundId={roundId} area={area} />}</AreaPage>;
}

const BACK: Partial<Record<Area, { href: (round: RoundHeader) => string; label: (round: RoundHeader) => string }>> = {
  staff: { href: (r) => `/staff/cycles/${r.cycle.id}`, label: (r) => `${r.award.name}: ${r.cycle.label}` },
  department: { href: () => "/department", label: () => "Department" },
  leader: { href: () => "/leader", label: () => "Dashboard" },
};

function RoundScreen({ roundId, area }: { roundId: string; area: Area }) {
  const judging = useJudging(roundId);
  if (judging.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (judging.error) return <p className="text-sm text-destructive">{messageOf(judging.error)}</p>;
  const { round } = judging.data;
  const back = BACK[area];
  const locked = ["APPROVED", "RESULTS_PUBLISHED", "CLOSED"].includes(round.status);
  return (
    <>
      {back && (
        <p className="mb-2 text-sm">
          <Link href={back.href(round)} className="text-muted-foreground underline underline-offset-4">
            {back.label(round)}
          </Link>
        </p>
      )}
      <div className="mb-6 grid gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Judging: {round.award.name} {round.cycle.label}
          </h1>
          <Badge variant={locked ? "secondary" : "default"}>{round.statusLabel}</Badge>
          {round.cycle.blindJudging && (
            <Badge variant="outline" className="gap-1">
              <EyeOffIcon className="size-3" aria-hidden /> Blind
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {round.department.name} · deadline {istDateTime(round.cycle.deadlineAt)} · {round.juryMin === round.juryMax ? round.juryMin : `${round.juryMin} to ${round.juryMax}`}{" "}
          {round.juryMax === 1 ? "juror" : "jurors"} per application
        </p>
      </div>
      <Tabs defaultValue={locked ? "results" : "judging"} className="gap-4">
        <TabsList className="flex-wrap group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="judging">Judging</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="assignment">
          <AssignmentTab roundId={roundId} />
        </TabsContent>
        <TabsContent value="judging">
          <JudgingTab judging={judging.data} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab judging={judging.data} />
        </TabsContent>
      </Tabs>
    </>
  );
}
