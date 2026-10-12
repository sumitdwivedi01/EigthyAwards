import type { ApplicationStatus } from "../../generated/prisma/client.js";

/**
 * What an applicant sees (spec §4, "What the applicant sees"): a short, friendly version of the
 * application's state. Worked out from the stored status and the clock, so a draft shows "Not
 * submitted" from the deadline on, even before the deadline lock has run. Until a round's results
 * are published a judged application shows Under review; then its result (spec §5.12).
 */
export type ApplicantStatusCode = "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "RESULT" | "NOT_SUBMITTED" | "WITHDRAWN" | "CLOSED";

/** A published result as the applicant sees it: the round's label, and whether it moves them on. */
export interface PublishedResult {
  label: string;
  advances: boolean;
}

/** The message under a published result (spec §4): renamed labels keep the default messages. */
export function resultMessage(advances: boolean): string {
  return advances ? "Keep an eye on your email; we will contact you soon." : "Better luck next time.";
}

export interface ApplicantStatus {
  code: ApplicantStatusCode;
  label: string;
  message: string;
}

export function applicantStatus(
  application: { status: ApplicationStatus; releaseReason: string | null },
  deadlineAt: Date,
  now: Date,
  result: PublishedResult | null = null,
): ApplicantStatus {
  const pastDeadline = now >= deadlineAt;
  switch (application.status) {
    case "DRAFT":
      return pastDeadline
        ? { code: "NOT_SUBMITTED", label: "Not submitted", message: "The deadline passed before submission." }
        : { code: "PENDING", label: "Pending", message: "Your application is not submitted yet." };
    case "NOT_SUBMITTED":
      return { code: "NOT_SUBMITTED", label: "Not submitted", message: "The deadline passed before submission." };
    case "SUBMITTED":
      if (result) return { code: "RESULT", label: result.label, message: resultMessage(result.advances) };
      return pastDeadline
        ? { code: "UNDER_REVIEW", label: "Under review", message: "Your application is being reviewed." }
        : { code: "SUBMITTED", label: "Submitted", message: "We received your application." };
    case "WITHDRAWN":
      return { code: "WITHDRAWN", label: "Withdrawn", message: "You withdrew this application." };
    case "RELEASED":
      return {
        code: "CLOSED",
        label: "Closed",
        message: `The award team closed this application: ${application.releaseReason ?? "no reason given"}. Your organisation can start a new one.`,
      };
  }
}

/** How staff name each stored status. */
export const STAFF_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  WITHDRAWN: "Withdrawn",
  NOT_SUBMITTED: "Not submitted",
  RELEASED: "Released",
};
