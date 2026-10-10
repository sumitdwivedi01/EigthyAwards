import { describe, expect, it } from "vitest";
import { clock, resetClock, setClock } from "./clock.js";

describe("clock (spec §11: one source of time, movable in tests)", () => {
  it("returns the real time by default", () => {
    const before = Date.now();
    const now = clock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("can be moved past a deadline, and reset", () => {
    setClock(new Date("2026-04-01T00:00:00Z"));
    expect(clock.now().toISOString()).toBe("2026-04-01T00:00:00.000Z");
    // Callers get a copy, so they can't change the frozen time by accident.
    clock.now().setFullYear(2000);
    expect(clock.now().toISOString()).toBe("2026-04-01T00:00:00.000Z");
    resetClock();
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
