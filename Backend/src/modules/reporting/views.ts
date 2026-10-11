import type { ApplicationStatus, CycleStatus, ProofStatus, RoundStatus } from "../../generated/prisma/client.js";
import type { CycleState } from "../awards/views.js";

/** The leadership dashboard: counts per department, award and edition (spec §5.14). */
export interface DashboardCycle {
  id: string;
  label: string;
  status: CycleStatus;
  state: CycleState;
  deadlineAt: string;
  maxEntries: number | null;
  applications: Record<ApplicationStatus, number>;
  /** Of the submitted applications. */
  proof: Record<ProofStatus, number>;
  round: {
    id: string;
    status: RoundStatus;
    statusLabel: string;
    juryMin: number;
    juryMax: number;
    evaluationsAssigned: number;
    evaluationsSubmitted: number;
    /** Applications being judged: submitted with verified proof. */
    judged: number;
    /** Applications with at least the minimum of submitted evaluations. */
    atMinimum: number;
    waitingForApproval: boolean;
  } | null;
}

export interface DashboardView {
  /** The leader sees the platform; a department head their own departments. */
  scope: "PLATFORM" | "DEPARTMENTS";
  totals: { departments: number; awards: number; openCycles: number; submitted: number; judging: number; pendingApprovals: number };
  pendingApprovals: { roundId: string; award: string; cycle: string; department: string; submittedAt: string }[];
  upcomingDeadlines: { cycleId: string; award: string; cycle: string; department: string; deadlineAt: string }[];
  departments: {
    id: string;
    name: string;
    externalOrganiser: boolean;
    awards: { id: string; name: string; cycles: DashboardCycle[] }[];
  }[];
}
