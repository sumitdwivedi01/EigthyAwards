import type { EvaluationStatus, ProofStatus, RoundStatus, RoundType } from "../../generated/prisma/client.js";
import type { AnswerValue } from "../applications/answers.js";
import type { Question } from "../forms/schemas.js";
import type { IndicatorType } from "../scoring/arithmetic.js";

/**
 * What judging returns to each role. The jury views are built field by field from an allow-list
 * (ADR 0018): in a blind award they carry no organisation, applicant, team member, proof,
 * payment or file, and no jury view ever carries a total, an average or another juror's work.
 */

export interface JurorRef {
  id: string;
  name: string;
  email: string;
}

export interface RoundHeader {
  id: string;
  number: number;
  type: RoundType;
  status: RoundStatus;
  statusLabel: string;
  juryMin: number;
  juryMax: number;
  cycle: { id: string; label: string; deadlineAt: string; blindJudging: boolean; deadlinePassed: boolean };
  award: { id: string; name: string };
  department: { id: string; name: string };
}

// ── The assignment board (staff; the head and the leader read it) ──

export interface BoardEvaluation {
  evaluationId: string;
  juror: JurorRef;
  status: EvaluationStatus;
  submittedAt: string | null;
  /** A conflict was recorded after this juror submitted: flagged for staff; it still counts (11 Oct). */
  conflictFlagged: boolean;
  canRevoke: boolean;
}

export interface BoardApplication {
  id: string;
  reference: string;
  organisation: { id: string; name: string };
  category: { id: string; name: string };
  proofStatus: ProofStatus;
  /** Submitted, proof verified, not disqualified: it can be assigned and is judged. */
  eligible: boolean;
  /** Why it can't be assigned, when it can't. */
  notEligibleReason: string | null;
  assigned: number;
  submitted: number;
  /** How many more jury it needs to reach the minimum. */
  needs: number;
  /** It has the maximum: no more jury can be added. */
  full: boolean;
  evaluations: BoardEvaluation[];
  /** Jury on the list who have a recorded conflict with this organisation: left out of its picker. */
  conflictedJuryIds: string[];
}

export interface BoardJuror extends JurorRef {
  assigned: number;
  submitted: number;
  pending: number;
}

export interface ConflictView {
  id: string;
  juror: JurorRef;
  organisation: { id: string; name: string };
  note: string | null;
  recordedBy: string;
  recordedAt: string;
}

export interface BoardView {
  round: RoundHeader;
  juryOnList: number;
  /** The most jury any application has now: the maximum can't go below it. */
  mostAssigned: number;
  applications: BoardApplication[];
  jury: BoardJuror[];
  conflicts: ConflictView[];
  /** Organisations with an application in this edition, for recording a conflict. */
  organisations: { id: string; name: string }[];
  counts: { eligible: number; needMoreJury: number; proofPending: number; proofRejected: number };
  can: { assign: boolean; changeJuryPerApplication: boolean; recordConflicts: boolean };
  /** Why assigning isn't possible yet, when it isn't. */
  assignBlockedReason: string | null;
}

export interface AssignmentProblem {
  applicationId: string | null;
  juryUserId: string | null;
  message: string;
}

// ── Judging progress, approval and results (staff, the head, the leader) ──

export interface SheetIndicatorView {
  key: string;
  label: string;
  type: IndicatorType;
  weight: number;
  questionKey: string;
}

export interface SheetSectionView {
  key: string;
  title: string;
  weight: number;
  indicators: SheetIndicatorView[];
}

export interface ScoredEvaluation {
  id: string;
  juror: JurorRef;
  status: EvaluationStatus;
  submittedAt: string | null;
  /** P, once every indicator has a mark. */
  points: number | null;
  /** P ÷ 1000 with two decimals, for reading. */
  score: string | null;
  marks: Record<string, number>;
  overallNote: string | null;
  conflictFlagged: boolean;
  /** Staff may correct it with a reason (rule R3). */
  canCorrect: boolean;
}

export interface FinalScoreView {
  /** ΣP. */
  totalPoints: number;
  /** n. */
  count: number;
  /** F₂ with two decimals. */
  display: string;
}

export interface ResultLabelView {
  label: string;
  advances: boolean;
}

export interface JudgedApplication {
  id: string;
  reference: string;
  organisation: { id: string; name: string };
  category: { id: string; name: string };
  /** Judged in this round; an application whose proof was rejected isn't. */
  judged: boolean;
  evaluations: ScoredEvaluation[];
  /** Over the submitted evaluations: live while judging, as stored once approved. */
  final: FinalScoreView | null;
  /** Within its category (1, 2, 2, 4). */
  rank: number | null;
  /** Another application of its category has the same final score. */
  tied: boolean;
  minimumMet: boolean;
  result: { label: string | null; advances: boolean | null; publishedAt: string | null } | null;
}

export interface ApprovalRequestView {
  id: string;
  submittedAt: string;
  submittedBy: string;
  decision: "PENDING" | "APPROVED" | "SENT_BACK";
  decidedAt: string | null;
  decidedBy: string | null;
  remark: string | null;
}

export interface JudgingView {
  round: RoundHeader;
  sheet: SheetSectionView[];
  applications: JudgedApplication[];
  categories: { id: string; name: string }[];
  approvals: ApprovalRequestView[];
  /** What still stops sending the round for approval (empty when it can be sent). */
  sendBlockers: string[];
  resultLabels: ResultLabelView[];
  results: { decided: number; total: number; published: boolean };
  can: {
    correctScores: boolean;
    sendForApproval: boolean;
    approve: boolean;
    decideResults: boolean;
    publishResults: boolean;
  };
}

// ── The jury's own views ──

export interface JuryItem {
  evaluationId: string;
  reference: string;
  /** Only in an award that isn't blind. */
  organisationName: string | null;
  category: string;
  status: EvaluationStatus;
  statusLabel: string;
  submittedAt: string | null;
}

export interface JuryCycleGroup {
  roundId: string;
  award: string;
  cycle: string;
  blindJudging: boolean;
  roundStatus: RoundStatus;
  /** The round was sent for approval or approved: nothing changes any more. */
  closed: boolean;
  assigned: number;
  submitted: number;
  items: JuryItem[];
}

export interface JuryHomeView {
  departments: { id: string; name: string; cycles: JuryCycleGroup[] }[];
  totals: { assigned: number; submitted: number };
}

export interface JuryQuestion {
  key: string;
  type: Question["type"];
  label: string;
  help: string;
  options: { key: string; label: string }[];
  /** The answer as typed; never for a file question. */
  answer: AnswerValue | null;
  /** Evidence files; always empty in a blind award (ADR 0018). */
  files: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
  /** A file question in a blind award: its files aren't shown. */
  filesHidden: boolean;
  indicators: SheetIndicatorView[];
}

export interface JuryEvaluationView {
  id: string;
  reference: string;
  status: EvaluationStatus;
  statusLabel: string;
  submittedAt: string | null;
  canEdit: boolean;
  award: { name: string };
  cycle: { label: string; blindJudging: boolean };
  department: { name: string };
  category: { name: string };
  /** Only in an award that isn't blind: the name, type and place (minimum data, 11 Oct). */
  organisation: { name: string; type: string | null; city: string; state: string } | null;
  sections: { key: string; title: string; description: string; questions: JuryQuestion[] }[];
  /** Indicators scoring a question this application's version didn't have. */
  otherIndicators: SheetIndicatorView[];
  sectionWeights: { key: string; title: string; weight: number }[];
  scores: Record<string, number>;
  comments: Record<string, string>;
  overallNote: string;
  /** What still stops submitting. */
  missing: string[];
}

export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  NOT_STARTED: "Not started",
  JUDGING: "Judging",
  PENDING_APPROVAL: "Waiting for approval",
  SENT_BACK: "Sent back",
  APPROVED: "Approved",
  CLOSED: "Closed",
  RESULTS_PUBLISHED: "Results published",
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  ASSIGNED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  REDO: "Sent back",
  REVOKED: "Taken back",
};

export function sheetView(sections: readonly { key: string; title: string; weight: number; indicators: readonly SheetIndicatorView[] }[]): SheetSectionView[] {
  return sections.map((s) => ({
    key: s.key,
    title: s.title,
    weight: s.weight,
    indicators: s.indicators.map((i) => ({ key: i.key, label: i.label, type: i.type, weight: i.weight, questionKey: i.questionKey })),
  }));
}
