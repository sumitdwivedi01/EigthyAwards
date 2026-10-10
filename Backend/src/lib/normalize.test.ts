import { describe, expect, it } from "vitest";
import {
  gstinMatchesPan,
  gstinStateCode,
  isValidGstin,
  isValidPan,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizePincode,
  normalizeTaxId,
} from "./normalize.js";

// Spec §5.18 and ADR 0006: the same value is always stored the same way.
describe("normalizers", () => {
  it("trims names and collapses repeated spaces, keeping letter case", () => {
    expect(normalizeName("  Acme   Steel\tLtd ")).toBe("Acme Steel Ltd");
    expect(normalizeName("ITC Limited")).toBe("ITC Limited");
  });

  it("lower-cases and trims emails", () => {
    expect(normalizeEmail("  Asha@Example.COM ")).toBe("asha@example.com");
  });

  it("upper-cases PAN, GSTIN and CIN and removes spaces and hyphens (spec: `abcde 1234f` → `ABCDE1234F`)", () => {
    expect(normalizeTaxId("abcde 1234f")).toBe("ABCDE1234F");
    expect(normalizeTaxId("27-abcde1234f-1zv")).toBe("27ABCDE1234F1ZV");
  });

  it("stores phones as +91 and 10 digits, whatever the input format", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("098765 43210")).toBe("+919876543210");
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("022-2345 6789")).toBe("+912223456789");
  });

  it("rejects phones that are not 10 digits", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+1 415 555 0100")).toBeNull();
    expect(normalizePhone("0000000000")).toBeNull();
  });

  it("accepts 6-digit PIN codes that don't start with 0", () => {
    expect(normalizePincode(" 411 001 ")).toBe("411001");
    expect(normalizePincode("011001")).toBeNull();
    expect(normalizePincode("41100")).toBeNull();
  });
});

describe("PAN and GSTIN checks (spec §5.2)", () => {
  it("checks the PAN format: 5 letters, 4 digits, 1 letter", () => {
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(isValidPan("ABCD1234F")).toBe(false);
    expect(isValidPan("abcde1234f")).toBe(false);
  });

  it("checks the GSTIN format", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("27AAPFU0939F1YV")).toBe(false); // 14th character must be Z
    expect(isValidGstin("2AAAPFU0939F1ZV")).toBe(false);
  });

  it("requires characters 3 to 12 of the GSTIN to equal the PAN", () => {
    expect(gstinMatchesPan("27AAPFU0939F1ZV", "AAPFU0939F")).toBe(true);
    expect(gstinMatchesPan("27AAPFU0939F1ZV", "AAPFU0939G")).toBe(false);
  });

  it("reads the GST state code from the first two digits", () => {
    expect(gstinStateCode("27AAPFU0939F1ZV")).toBe("27");
  });
});
