import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slug.js";

describe("award page addresses", () => {
  it("turns a name into a lower-case address with single hyphens", () => {
    expect(slugify("  Safety Excellence Award 2026! ")).toBe("safety-excellence-award-2026");
    expect(slugify("FPO   Awards — Team")).toBe("fpo-awards-team");
    expect(slugify("Café Énergie")).toBe("cafe-energie");
  });

  it("never returns an empty or too short address", () => {
    expect(slugify("!!!")).toBe("award");
    expect(slugify("A")).toBe("award");
    expect(slugify("x".repeat(80))).toHaveLength(60);
  });

  it("accepts only the pattern the database accepts", () => {
    expect(isValidSlug("fpo-awards")).toBe(true);
    expect(isValidSlug("FPO-awards")).toBe(false);
    expect(isValidSlug("fpo--awards")).toBe(false);
    expect(isValidSlug("-fpo")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
  });
});
