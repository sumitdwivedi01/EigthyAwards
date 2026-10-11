import type { PublicAward } from "@/lib/api-types";
import { rupees } from "@/lib/format";

type Cycle = PublicAward["cycle"];

/** "Free", "₹10,000", or "₹5,000 to ₹10,000" when categories have different fees. */
export function feeText(fee: Cycle["fee"]): string {
  const one = (paise: number) => (paise === 0 ? "Free" : rupees(paise));
  return fee.fromPaise === fee.toPaise ? one(fee.fromPaise) : `${one(fee.fromPaise)} to ${one(fee.toPaise)}`;
}

/** The live counter (spec §5.20): "499 / 500 entries", or "12 entries" without a limit. */
export function entriesText(entries: Cycle["entries"]): string {
  if (entries.limit === null) return entries.submitted === 1 ? "1 entry so far" : `${entries.submitted} entries so far`;
  return `${entries.submitted} / ${entries.limit} entries`;
}
