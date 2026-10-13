/** The head's approval queue: rounds sent to them, waiting and decided. */
export interface ApprovalQueueItem {
  id: string;
  roundId: string;
  roundNumber: number;
  award: { id: string; name: string };
  cycle: { id: string; label: string };
  department: { id: string; name: string };
  submittedAt: string;
  submittedBy: string;
  decision: "PENDING" | "APPROVED" | "SENT_BACK";
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface ApprovalQueueView {
  pending: ApprovalQueueItem[];
  decided: ApprovalQueueItem[];
}
