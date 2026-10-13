import type { ScoringSection } from "./schemas.js";

/** What the scoring-sheet builder shows: the sheet, its running totals, and what still blocks it. */
export interface ScoringSheetView {
  roundId: string;
  sections: ScoringSection[];
  /** Scoring has started in the round: the sheet can't change. */
  locked: boolean;
  /** Running totals: the section weights, and each section's indicator weights (all must be 100). */
  totals: { sections: number; bySection: Record<string, number> };
  /** Empty when the sheet is ready for publishing. */
  issues: string[];
  /** The form's questions an indicator can score, whether each is published yet, and its section. */
  questions: { key: string; label: string; type: string; published: boolean; section: { key: string; title: string } }[];
}
