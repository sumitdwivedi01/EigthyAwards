import { describe, expect, it } from "vitest";
import { INDIAN_STATES, findState, isValidStateCode } from "./states.js";

describe("Indian states and union territories", () => {
  it("lists 28 states and 8 union territories, each code once", () => {
    expect(INDIAN_STATES.filter((s) => s.kind === "STATE")).toHaveLength(28);
    expect(INDIAN_STATES.filter((s) => s.kind === "UNION_TERRITORY")).toHaveLength(8);
    expect(new Set(INDIAN_STATES.map((s) => s.code)).size).toBe(INDIAN_STATES.length);
  });

  it("finds a state by its GST code", () => {
    expect(findState("27")?.name).toBe("Maharashtra");
    expect(isValidStateCode("37")).toBe(true);
    expect(isValidStateCode("99")).toBe(false);
  });
});
