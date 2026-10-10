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

const RUPEES = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/** Money is integer paise in the API (₹1 = 100 paise). */
export function rupees(paise: number): string {
  return RUPEES.format(paise / 100);
}
