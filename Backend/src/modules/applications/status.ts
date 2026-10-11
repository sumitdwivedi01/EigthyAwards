import type { ApplicationStatus } from "../../generated/prisma/client.js";

/**
 * What an applicant sees (spec §4, "What the applicant sees"): a short, friendly version of the
 * application's state. Worked out from the stored status and the clock, so a draft shows "Not
 * submitted" from the deadline on, even before the deadline lock has run. Result labels arrive
 * with Step 1.4; until a round's results are published a judged application shows Under review.
 */
export type ApplicantStatusCode = "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "NOT_SUBMITTED" | "WITHDRAWN" | "CLOSED";

export interface ApplicantStatus {
  code: ApplicantStatusCode;
  label: string;
  message: string;
}

export function applicantStatus(
  application: { status: ApplicationStatus; releaseReason: string | null },
  deadlineAt: Date,
  now: Date,
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
