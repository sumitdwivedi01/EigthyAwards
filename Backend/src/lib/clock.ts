/**
 * The only source of "now" in the application. Every deadline check calls clock.now(), so tests
 * can move time past a deadline without waiting (spec §11).
 */
let override: (() => Date) | null = null;

export const clock = {
  now(): Date {
    return override ? override() : new Date();
  },
};

/** Test helper: freeze time at a fixed date, or supply a function. Refused in production. */
export function setClock(fixed: Date | (() => Date)): void {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("The clock cannot be changed in production");
  }
  override = typeof fixed === "function" ? fixed : () => new Date(fixed.getTime());
}

export function resetClock(): void {
  override = null;
}
