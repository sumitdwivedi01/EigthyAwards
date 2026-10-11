/**
 * Calendar dates in India time (spec §13: store UTC, show Asia/Kolkata). An employment proof's
 * date is a calendar date printed on the document, so the 3-month rule (ADR 0012) compares dates,
 * not instants.
 */

const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

/** Today's date in India, as "YYYY-MM-DD". */
export function istToday(now: Date): string {
  return IST_DATE.format(now);
}

/** "2026-10-12" minus 3 months is "2026-07-12"; a day that doesn't exist moves to the month's last day. */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

/** How far back an employment proof may be dated (ADR 0012): 3 months before the upload. */
export const PROOF_MONTHS = 3;

/** The window a proof's date must fall in when uploaded now: from 3 months ago to today, in India. */
export function proofDateWindow(now: Date): { earliest: string; latest: string } {
  const latest = istToday(now);
  return { earliest: addMonths(latest, -PROOF_MONTHS), latest };
}

const IST_DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** An instant as people in India read it, for messages and emails: "15 Nov 2026, 11:59 pm IST". */
export function istDateTime(instant: Date): string {
  return `${IST_DATE_TIME.format(instant)} IST`;
}

/** "2026-07-12" → "12 Jul 2026", for messages. */
export function readableDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
