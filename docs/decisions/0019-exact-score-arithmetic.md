# 0019. Exact score arithmetic: whole-number points and one rounding

- Status: **Accepted** (owner, 2026-10-11)
- Date: 2026-10-11
- Related: spec §5.5 (formula), §5.8, §5.12 (ranks and ties); [ADR 0013](0013-several-jury-per-application.md) (the average of several jury)

## Context

An application's final mark is the average of its jury's scores, and each score comes from weighted sections and indicators (spec §5.5). The owner asked for the marking to be exact. With ordinary floating-point numbers, sums like 0.1 + 0.2 are not exact, and rounding each juror's score before averaging can move a result by 0.01, enough to swap two ranks or cross a shortlist cut-off. The spec also didn't say how to round, or how to treat ties.

## Options

1. **Floating-point numbers**, rounded when shown. Simple, but small errors can change a rank.
2. **A decimal library** in the API. Exact, but one more dependency, and every step needs care.
3. **Whole-number points, divided and rounded once, at the end** ← chosen.
4. **Compute in the database** with `NUMERIC`. Exact, but the formula would live in SQL, away from its tests.

## Decision

Option 3.

**Inputs**

- Every **section weight** `W` is a whole percentage from 1 to 100, and a round's section weights add up to **100**.
- Inside each section, every **indicator weight** `w` is a whole percentage from 1 to 100, and they add up to **100**.
- A **score indicator** takes a whole number `v` from 0 to 10. A **Yes/No indicator** counts as `v = 10` for Yes and `v = 0` for No.

**One juror's score**

- Points: `P = Σ over sections Σ over indicators ( W × w × v )`, a whole number from 0 to 100,000.
- Score out of 100: `S = P ÷ 1000`, exact (at most three decimals). Staff see it with two decimals; it is never rounded inside a calculation.

**The application's final score**

- Over its `n` **submitted** evaluations (revoked ones never count): `F = (P₁ + … + Pₙ) ÷ (1000 × n)`.
- **Rounded once, half up, to two decimals, using whole numbers only:** `F₂ = ⌊ (ΣP + 5n) ÷ (10n) ⌋ ÷ 100`.
- `F₂` is the official final score. The result record keeps `ΣP` and `n` too, so anyone can redo the sum by hand.

**Ranks and cut-offs**

- Ranked by `F₂`, highest first, per entry category or overall. Equal `F₂` share a rank, and the next rank skips (1, 2, 2, 4). Staff settle ties by hand (spec §5.12).
- "Shortlist everyone with at least 70.00" compares `F₂` with the cut-off.

**Where it lives**

- Pure functions in the `scoring` module (`evaluationPoints`, `finalScore`, `rankResults`), used by judging, approval and results. The database stores whole numbers only (indicator values, points, `ΣP`, `n`); `F₂` is stored with two decimals.

**Worked example** (one round, two sections)

| Section (weight) | Indicator (weight) | Juror 1 | Juror 2 | Juror 3 |
|---|---|---|---|---|
| Environment (40) | Oxygen efficiency (60) | 8 | 9 | 7 |
| | Shade (40) | 5 | 6 | 6 |
| Safety (60) | Training (50) | 7 | 6 | 8 |
| | Audit passed, Yes/No (50) | Yes | Yes | No |
| | **Points `P`** | **78,200** | **79,200** | **50,400** |
| | **Score `S`** | 78.2 | 79.2 | 50.4 |

- Juror 1: 40×60×8 + 40×40×5 + 60×50×7 + 60×50×10 = 19,200 + 8,000 + 21,000 + 30,000 = 78,200. Environment alone gives 27.2 points, the spec's own example.
- Final: `ΣP` = 207,800 and `n` = 3, so `F` = 207,800 ÷ 3,000 = 69.2666…; `F₂` = ⌊(207,800 + 15) ÷ 30⌋ ÷ 100 = ⌊6,927.166…⌋ ÷ 100 = **69.27**.

## Why

- Every step before the last division is a whole-number sum, so there is nothing to lose; the one rounding has a stated rule.
- Anyone can check a result with a calculator from the stored numbers, which matters for an award.
- It needs no library, and the largest sum (100,000 points × a few jury) is far inside the range JavaScript counts exactly.

## Consequences

- Weights are whole percentages: three equal sections are 33, 33 and 34. The builder offers "split evenly" and shows the running totals.
- Tests check the worked example, Yes/No, all zeros (0.00) and all tens (100.00), a half-up boundary, ties sharing a rank, and that a revoked evaluation never counts.

## What would change our mind

- The client needs weights such as 12.5%: weights in tenths of a percent, with the same method and a larger divisor (10,000 instead of 1,000).
- The client wants a different average (for example dropping the highest and lowest score): a cycle setting, with the same whole-number method.
