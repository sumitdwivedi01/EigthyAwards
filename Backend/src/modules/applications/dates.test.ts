import { describe, expect, it } from "vitest";
import { addMonths, istToday, proofDateWindow, readableDate } from "./dates.js";

describe("the employment proof's 3-month window (ADR 0012)", () => {
  it("runs from 3 months back to today, in India", () => {
    expect(proofDateWindow(new Date("2026-10-12T06:00:00Z"))).toEqual({ earliest: "2026-07-12", latest: "2026-10-12" });
  });

  it("uses India's date: just after midnight there it is already the next day", () => {
    // 18:45 UTC on 11 Oct is 00:15 on 12 Oct in India.
    expect(istToday(new Date("2026-10-11T18:45:00Z"))).toBe("2026-10-12");
    expect(istToday(new Date("2026-10-11T18:15:00Z"))).toBe("2026-10-11");
  });

  it("moves a day that doesn't exist to the month's last day", () => {
    expect(addMonths("2026-05-31", -3)).toBe("2026-02-28");
    expect(addMonths("2028-05-31", -3)).toBe("2028-02-29");
    expect(addMonths("2026-01-15", -3)).toBe("2025-10-15");
  });

  it("writes a date for people", () => {
    expect(readableDate("2026-07-12")).toBe("12 Jul 2026");
  });
});
