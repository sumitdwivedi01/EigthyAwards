import { describe, expect, it } from "vitest";
import { newKey } from "./ids.js";

describe("newKey (spec §5.4: system-generated keys, never reused)", () => {
  it("uses the prefix and a lower-case suffix", () => {
    expect(newKey("q")).toMatch(/^q_[0-9a-z]{10}$/);
    expect(newKey("sec")).toMatch(/^sec_/);
    expect(newKey("ind")).toMatch(/^ind_/);
  });

  it("never returns a key already taken", () => {
    const taken = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      const key = newKey("q", taken);
      expect(taken.has(key)).toBe(false);
      taken.add(key);
    }
  });
});
