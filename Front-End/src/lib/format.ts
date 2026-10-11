/** Times are stored in UTC by the API and always shown in India time (spec §13). */
const IST_DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const IST_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function istDateTime(iso: string): string {
  return `${IST_DATE_TIME.format(new Date(iso))} IST`;
}

export function istDate(iso: string): string {
  return IST_DATE.format(new Date(iso));
}

const IST_INPUT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** An API time as the value of a datetime-local input, in India time: "2026-03-31T23:59". */
export function toIstInput(iso: string): string {
  const parts = Object.fromEntries(IST_INPUT.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** A datetime-local value typed in India time, as the API takes it: "2026-03-31T23:59:00+05:30". */
export function fromIstInput(value: string): string {
  return `${value}:00+05:30`;
}

// "₹2,500" for whole rupees, "₹2,500.50" otherwise.
const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  trailingZeroDisplay: "stripIfInteger",
});

/** Money is integer paise in the API (₹1 = 100 paise). */
export function rupees(paise: number): string {
  return RUPEES.format(paise / 100);
}

/** A fee as staff type it, in rupees: "10000" or "2500.50". */
export function rupeesInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** The typed rupees as whole paise, or null when it isn't a number (the API checks the rest). */
export function paiseFromRupees(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}
