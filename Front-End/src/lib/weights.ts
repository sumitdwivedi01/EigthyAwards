/**
 * Weights that balance themselves (ADR 0019 needs whole percentages that add up to exactly 100).
 * A help for the scoring-sheet builder only: the API still checks every total when the edition
 * is published. The same rule serves the section weights and the indicator weights of a section.
 *
 * - Every weight the person hasn't typed ("automatic") shares what is left of 100 equally, so a
 *   sheet built without touching a weight is always an even split: 50/50, 34/33/33, 25 × 4.
 * - A typed weight ("manual") stays as typed; the others adjust so the total stays 100. When there
 *   is no room left for them, the other manual weights scale down in proportion.
 * - Every weight is a whole number from 1 to 100; one item alone is 100.
 */

export interface Weighted {
  weight: number;
  /** Typed by the person; automatic weights share the rest equally. */
  manual?: boolean;
}

/** Whole percentages adding up to `total`: an even split, the remainder on the first ones. */
export function evenSplit(count: number, total = 100): number[] {
  if (count <= 0) return [];
  const each = Math.floor(total / count);
  const extra = total - each * count;
  return Array.from({ length: count }, (_, i) => each + (i < extra ? 1 : 0));
}

/** The weights are exactly an even split (the way an untouched group looks). */
export function isEvenSplit(weights: readonly number[]): boolean {
  const even = evenSplit(weights.length);
  return weights.every((w, i) => w === even[i]);
}

/**
 * `total` shared in proportion to `basis`, in whole numbers (largest remainder first, ties to the
 * earlier item), then any item below 1 is lifted to 1 from the largest ones. Needs
 * total ≥ basis.length.
 */
export function distribute(total: number, basis: readonly number[]): number[] {
  const count = basis.length;
  if (count === 0) return [];
  const sum = basis.reduce((s, b) => s + Math.max(0, b), 0);
  if (sum <= 0) return evenSplit(count, total);
  const raw = basis.map((b) => (total * Math.max(0, b)) / sum);
  const shares = raw.map((r) => Math.floor(r));
  let leftover = total - shares.reduce((s, f) => s + f, 0);
  const order = raw.map((r, i) => ({ i, fraction: r - Math.floor(r) })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (const { i } of order) {
    if (leftover <= 0) break;
    shares[i] = (shares[i] ?? 0) + 1;
    leftover -= 1;
  }
  // Every weight is at least 1: take what the small ones need from the largest.
  for (let i = 0; i < count; i++) {
    while ((shares[i] ?? 0) < 1) {
      const largest = shares.reduce((best, value, j) => (value > (shares[best] ?? 0) ? j : best), 0);
      shares[largest] = (shares[largest] ?? 0) - 1;
      shares[i] = (shares[i] ?? 0) + 1;
    }
  }
  return shares;
}

/**
 * Puts the group back to exactly 100. `focus` is the item being typed into: its weight stays
 * (kept between 1 and what leaves 1 for every other item). Returns new items; the flags travel
 * with them.
 */
export function balance<T extends Weighted>(items: readonly T[], focus: number | null = null): T[] {
  const n = items.length;
  if (n === 0) return [];
  if (n === 1) return items.map((item) => ({ ...item, weight: 100 }));

  const weights = items.map((item) => (Number.isFinite(item.weight) ? Math.round(item.weight) : 0));
  let space = 100;
  if (focus !== null && focus >= 0 && focus < n) {
    weights[focus] = Math.min(Math.max(weights[focus] ?? 1, 1), 100 - (n - 1));
    space -= weights[focus] ?? 0;
  }
  const others = items.map((_, i) => i).filter((i) => i !== focus);
  const manual = others.filter((i) => items[i]?.manual);
  const automatic = others.filter((i) => !items[i]?.manual);
  const manualSum = manual.reduce((s, i) => s + Math.max(weights[i] ?? 0, 1), 0);
  const left = space - manualSum;

  if (automatic.length > 0 && left >= automatic.length && manual.every((i) => (weights[i] ?? 0) >= 1)) {
    // The usual case: typed weights stay, the automatic ones share what is left equally.
    const shares = evenSplit(automatic.length, left);
    automatic.forEach((i, k) => (weights[i] = shares[k] ?? 0));
  } else if (automatic.length === 0 && left === 0 && manual.every((i) => (weights[i] ?? 0) >= 1)) {
    // Every other weight was typed and they already fit.
  } else {
    // No room as they are: everything but the focus scales into the space, typed weights keeping
    // their proportions and automatic ones counting as a fair share.
    const fair = space / others.length;
    const shares = distribute(
      space,
      others.map((i) => (items[i]?.manual ? Math.max(weights[i] ?? 0, 1) : fair)),
    );
    others.forEach((i, k) => (weights[i] = shares[k] ?? 1));
  }
  return items.map((item, i) => ({ ...item, weight: weights[i] ?? 0 }));
}

/** Sets item `index` to `value` as typed: it becomes manual and the others adjust. */
export function setWeight<T extends Weighted>(items: readonly T[], index: number, value: number): T[] {
  return balance(
    items.map((item, i) => (i === index ? { ...item, weight: value, manual: true } : item)),
    index,
  );
}

/** Adds an item with an automatic weight and rebalances. */
export function addBalanced<T extends Weighted>(items: readonly T[], item: T): T[] {
  return balance([...items, { ...item, manual: false }]);
}

/** Removes item `index` and rebalances what is left. */
export function removeBalanced<T extends Weighted>(items: readonly T[], index: number): T[] {
  return balance(items.filter((_, i) => i !== index));
}

/** Back to an even split: every weight automatic again. */
export function makeEqual<T extends Weighted>(items: readonly T[]): T[] {
  const even = evenSplit(items.length);
  return items.map((item, i) => ({ ...item, weight: even[i] ?? 0, manual: false }));
}

/**
 * How a saved group starts on screen: an even split stays automatic; anything else was set by
 * hand, so its weights count as typed (adding an item then keeps their proportions).
 */
export function fromSaved<T extends { weight: number }>(items: readonly T[]): (T & Weighted)[] {
  const manual = !isEvenSplit(items.map((item) => item.weight));
  return items.map((item) => ({ ...item, manual }));
}
