import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "../../generated/prisma/client.js";
import { applicantStatus } from "./status.js";

const deadline = new Date("2026-11-15T18:29:00Z");
const before = new Date("2026-11-01T10:00:00Z");
const after = new Date("2026-11-16T10:00:00Z");

describe("what the applicant sees (spec §4)", () => {
  it.each<[ApplicationStatus, Date, string, string]>([
    ["DRAFT", before, "Pending", "Your application is not submitted yet."],
    ["DRAFT", after, "Not submitted", "The deadline passed before submission."],
    ["NOT_SUBMITTED", after, "Not submitted", "The deadline passed before submission."],
    ["SUBMITTED", before, "Submitted", "We received your application."],
    ["SUBMITTED", after, "Under review", "Your application is being reviewed."],
    ["WITHDRAWN", before, "Withdrawn", "You withdrew this application."],
  ])("shows %s (at %s) as %s", (status, now, label, message) => {
    expect(applicantStatus({ status, releaseReason: null }, deadline, now)).toMatchObject({ label, message });
  });

  it("shows a released application as Closed, with the staff's reason", () => {
    expect(applicantStatus({ status: "RELEASED", releaseReason: "Started by mistake" }, deadline, before)).toEqual({
      code: "CLOSED",
      label: "Closed",
      message: "The award team closed this application: Started by mistake. Your organisation can start a new one.",
    });
  });

  it("shows the deadline moment itself as past", () => {
    expect(applicantStatus({ status: "DRAFT", releaseReason: null }, deadline, deadline).code).toBe("NOT_SUBMITTED");
  });
});
