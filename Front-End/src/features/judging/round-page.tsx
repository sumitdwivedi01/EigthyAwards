"use client";

import { EyeOffIcon } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { AreaPage, PageTitle } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Area, RoundHeader, RoundStatus } from "@/lib/api-types";
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
  department: { href: () => "/department", label: () => "Your department" },
  leader: { href: () => "/leader", label: () => "Across the platform" },
};

const STATUS_VARIANT: Record<RoundStatus, "outline" | "info" | "warning" | "success" | "secondary"> = {
  NOT_STARTED: "outline",
  JUDGING: "info",
  PENDING_APPROVAL: "warning",
  SENT_BACK: "warning",
  APPROVED: "success",
  CLOSED: "secondary",
  RESULTS_PUBLISHED: "success",
};

/** Where the round stands, in one line, so the person knows what happens next. */
const NEXT_STEP: Record<RoundStatus, string> = {
  NOT_STARTED: "After the deadline, assign each application to jury from the Assignment tab.",
  JUDGING: "Jury are scoring. Follow their progress under Judging; send the round for approval once every application has enough submitted scores.",
  PENDING_APPROVAL: "Waiting for the department head to approve. Staff can still correct a mark, with a reason.",
  SENT_BACK: "The head sent the round back.",
  APPROVED: "Approved: the scores are locked. Staff give and publish the results under Results.",
  CLOSED: "This round is closed.",
  RESULTS_PUBLISHED: "Results are published: every applicant can see theirs.",
};

function RoundScreen({ roundId, area }: { roundId: string; area: Area }) {
  const judging = useJudging(roundId);
  if (judging.isPending) return <LoadingState label="Loading the round" lines={6} />;
  if (judging.error) return <ErrorState error={judging.error} onRetry={() => void judging.refetch()} />;
  const { round } = judging.data;
  const back = BACK[area];
  const locked = ["APPROVED", "RESULTS_PUBLISHED", "CLOSED"].includes(round.status);
  const jurors = round.juryMin === round.juryMax ? round.juryMin : `${round.juryMin} to ${round.juryMax}`;
  return (
    <>
      <PageTitle
        back={back ? { href: back.href(round), label: back.label(round) } : undefined}
        eyebrow={`${round.department.name} · judging`}
        title={`${round.award.name} ${round.cycle.label}`}
        badges={
          <>
            <Badge variant={STATUS_VARIANT[round.status]}>{round.statusLabel}</Badge>
            {round.cycle.blindJudging && (
              <Badge variant="outline">
                <EyeOffIcon aria-hidden /> Blind
              </Badge>
            )}
          </>
        }
        description={NEXT_STEP[round.status]}
      />
      <p className="-mt-3 mb-6 text-sm text-muted-foreground sm:-mt-5">
        Deadline {istDateTime(round.cycle.deadlineAt)} · {jurors} {round.juryMax === 1 ? "juror" : "jurors"} per application
      </p>
      <Tabs defaultValue={locked ? "results" : round.status === "NOT_STARTED" ? "assignment" : "judging"}>
        <TabsList>
          <TabsTrigger value="assignment">1. Assignment</TabsTrigger>
          <TabsTrigger value="judging">2. Judging and approval</TabsTrigger>
          <TabsTrigger value="results">3. Results</TabsTrigger>
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
