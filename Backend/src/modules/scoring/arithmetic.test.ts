import { describe, expect, it } from "vitest";
import { evaluationPoints, evaluationScore, finalScore, indicatorValue, rankResults, type SheetSection } from "./arithmetic.js";

/** The sheet of ADR 0019's worked example: Environment 40, Safety 60. */
const SHEET: SheetSection[] = [
  {
    key: "area_environment",
    weight: 40,
    indicators: [
      { key: "ind_oxygen", type: "SCORE", weight: 60 },
      { key: "ind_shade", type: "SCORE", weight: 40 },
    ],
  },
  {
    key: "area_safety",
    weight: 60,
    indicators: [
      { key: "ind_training", type: "SCORE", weight: 50 },
      { key: "ind_audit", type: "YES_NO", weight: 50 },
    ],
  },
];

const marks = (oxygen: number, shade: number, training: number, audit: 0 | 1) =>
  new Map([
    ["ind_oxygen", oxygen],
    ["ind_shade", shade],
    ["ind_training", training],
    ["ind_audit", audit],
  ]);

describe("one juror's points (ADR 0019)", () => {
  it("matches the spec's example: Environment alone gives 27,200 points, 27.2 out of 100", () => {
    const environment = [SHEET[0] as SheetSection];
    expect(evaluationPoints(environment, new Map([["ind_oxygen", 8], ["ind_shade", 5]]))).toBe(27_200);
    expect(evaluationScore(27_200)).toBe("27.20");
  });

  it("matches the worked example's three jurors, Yes/No counting 10 or 0", () => {
    expect(evaluationPoints(SHEET, marks(8, 5, 7, 1))).toBe(78_200);
    expect(evaluationPoints(SHEET, marks(9, 6, 6, 1))).toBe(79_200);
    expect(evaluationPoints(SHEET, marks(7, 6, 8, 0))).toBe(50_400);
  });

  it("gives 0 for all zeros and 100,000 for all tens", () => {
    expect(evaluationPoints(SHEET, marks(0, 0, 0, 0))).toBe(0);
    expect(evaluationPoints(SHEET, marks(10, 10, 10, 1))).toBe(100_000);
    expect(evaluationScore(100_000)).toBe("100.00");
  });

  it("refuses a missing mark, a mark outside 0 to 10, a fraction, and a Yes/No that isn't 0 or 1", () => {
    expect(() => evaluationPoints(SHEET, new Map([["ind_oxygen", 8]]))).toThrow(RangeError);
    expect(() => indicatorValue("SCORE", 11)).toThrow(RangeError);
    expect(() => indicatorValue("SCORE", 7.5)).toThrow(RangeError);
    expect(() => indicatorValue("YES_NO", 10)).toThrow(RangeError);
    expect(indicatorValue("YES_NO", 1)).toBe(10);
  });
});

describe("the final score: the exact average, rounded once (ADR 0019)", () => {
  it("matches the hand calculation for three jurors: 207,800 points over 3 is 69.27", () => {
    expect(finalScore([78_200, 79_200, 50_400])).toEqual({ totalPoints: 207_800, count: 3, hundredths: 6927, display: "69.27" });
  });

  it("is simply the juror's score with one juror", () => {
    expect(finalScore([78_200])).toMatchObject({ hundredths: 7820, display: "78.20" });
  });

  it("rounds half up, once, at the end", () => {
    // 70,120 and 70,130 average 70.125 exactly: half up gives 70.13.
    expect(finalScore([70_120, 70_130])?.display).toBe("70.13");
    // 70.1249… stays 70.12.
    expect(finalScore([70_124])?.display).toBe("70.12");
    expect(finalScore([70_125])?.display).toBe("70.13");
  });

  it("doesn't round each juror's score first, which would move the result", () => {
    // 33.335 + 33.335 + 33.334: rounding each first gives 33.34 + 33.34 + 33.33 → 33.34;
    // the exact average 33.33466… gives 33.33.
    expect(finalScore([33_335, 33_335, 33_334])?.display).toBe("33.33");
  });

  it("has no score without a submitted evaluation, and refuses impossible points", () => {
    expect(finalScore([])).toBeNull();
    expect(() => finalScore([100_001])).toThrow(RangeError);
    expect(() => finalScore([12.5])).toThrow(RangeError);
  });

  it("gives 0.00 and 100.00 at the ends", () => {
    expect(finalScore([0, 0])?.display).toBe("0.00");
    expect(finalScore([100_000, 100_000, 100_000])?.display).toBe("100.00");
  });
});

describe("ranks", () => {
  it("gives equal final scores the same rank and skips the next (1, 2, 2, 4)", () => {
    const ranked = rankResults([
      { id: "c", hundredths: 8000 },
      { id: "a", hundredths: 8125 },
      { id: "d", hundredths: 7999 },
      { id: "b", hundredths: 8000 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ["a", 1],
      ["c", 2],
      ["b", 2],
      ["d", 4],
    ]);
  });
});
