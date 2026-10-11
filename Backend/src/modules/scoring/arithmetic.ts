/**
 * The score arithmetic of ADR 0019: whole numbers all the way, one division and one rounding at
 * the end, so a result can be checked with a calculator. No floating point is used until the
 * final division, and even that is done in whole hundredths.
 *
 * - Weights are whole percentages: section weights W add up to 100, and inside each section the
 *   indicator weights w add up to 100.
 * - A mark v is a whole number 0 to 10; a Yes/No indicator counts Yes = 10 and No = 0.
 * - One juror's points: P = Σ W × w × v, a whole number from 0 to 100,000 (score out of 100 = P ÷ 1000).
 * - The final score over n submitted evaluations: F₂ = ⌊(ΣP + 5n) ÷ (10n)⌋ ÷ 100, the exact
 *   average rounded once, half up, to two decimals.
 * - Ranks: by F₂, highest first; equal scores share a rank and the next rank is skipped.
 */

export const INDICATOR_TYPES = ["SCORE", "YES_NO"] as const;
export type IndicatorType = (typeof INDICATOR_TYPES)[number];

export const MAX_POINTS = 100_000;

export interface SheetIndicator {
  key: string;
  type: IndicatorType;
  weight: number;
}

export interface SheetSection {
  key: string;
  weight: number;
  indicators: readonly SheetIndicator[];
}

/** The v in the formula: a score mark as given (0 to 10); Yes/No is stored as 1 or 0 and counts 10 or 0. */
export function indicatorValue(type: IndicatorType, mark: number): number {
  if (type === "YES_NO") {
    if (mark !== 0 && mark !== 1) throw new RangeError("A Yes/No mark is 1 (Yes) or 0 (No).");
    return mark * 10;
  }
  if (!Number.isInteger(mark) || mark < 0 || mark > 10) throw new RangeError("A score mark is a whole number from 0 to 10.");
  return mark;
}

/** One juror's points, P = Σ W × w × v. Every indicator must have a mark. */
export function evaluationPoints(sections: readonly SheetSection[], marks: ReadonlyMap<string, number>): number {
  let points = 0;
  for (const section of sections) {
    for (const indicator of section.indicators) {
      const mark = marks.get(indicator.key);
      if (mark === undefined) throw new RangeError(`The indicator ${indicator.key} has no mark.`);
      points += section.weight * indicator.weight * indicatorValue(indicator.type, mark);
    }
  }
  return points;
}

/** "6927" hundredths → "69.27". */
export function formatHundredths(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** A juror's own score out of 100, for reading only (P ÷ 1000, half up to two decimals); never used in sums. */
export function evaluationScore(points: number): string {
  return formatHundredths(Math.floor((points + 5) / 10));
}

export interface FinalScore {
  /** ΣP, kept so anyone can redo the sum. */
  totalPoints: number;
  /** n: the submitted evaluations counted. */
  count: number;
  /** F₂ in whole hundredths: 6927 means 69.27. */
  hundredths: number;
  display: string;
}

/** The application's final score: the exact average of its submitted evaluations, rounded once (ADR 0019). */
export function finalScore(points: readonly number[]): FinalScore | null {
  if (points.length === 0) return null;
  for (const p of points) {
    if (!Number.isInteger(p) || p < 0 || p > MAX_POINTS) throw new RangeError("Points are a whole number from 0 to 100,000.");
  }
  const totalPoints = points.reduce((sum, p) => sum + p, 0);
  const count = points.length;
  const hundredths = Math.floor((totalPoints + 5 * count) / (10 * count));
  return { totalPoints, count, hundredths, display: formatHundredths(hundredths) };
}

/** Competition ranking (1, 2, 2, 4): equal final scores share a rank; staff settle ties by hand. */
export function rankResults<T extends { hundredths: number }>(items: readonly T[]): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => b.hundredths - a.hundredths);
  let rank = 0;
  let previous: number | null = null;
  return sorted.map((item, index) => {
    if (item.hundredths !== previous) {
      rank = index + 1;
      previous = item.hundredths;
    }
    return { ...item, rank };
  });
}
