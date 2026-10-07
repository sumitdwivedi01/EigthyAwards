# 0010. Proof documents with every application, and an entry limit

- Status: **Accepted** (owner's answers, 7 Oct 2026)
- Date: 2026-10-07
- Related: spec §5.20; ADR 0007 (still: no signed authorisation letter); GAPS §J

## Context

Only one real application per organisation is allowed per award, but anyone who knows a company's PAN and GSTIN can join it on the platform. The owner wants proof that the person applying really works there, and staff want to cap the number of entries an award accepts.

## Options for proof

1. **Nothing** (the 5 Oct position). Too weak: PAN and GSTIN are effectively public.
2. **A signed authorisation letter** (the original spec). Manual and slow; dropped on 5 Oct (ADR 0007).
3. **A confirmation link to the organisation's official email.** Automated, but proves control of a mailbox, not employment. Kept as a possible extra later.
4. **Proof documents with every application:** a photo identity document, a proof of employment, and a LinkedIn link, checked by staff. ← chosen by the owner.

## Decision

- With **every application**, before submitting: a photo identity document (PAN card, passport, driving licence, voter ID, or **masked** Aadhaar only), a proof of employment (company ID card, letter on letterhead, or appointment letter or payslip with the salary hidden), and a LinkedIn profile link. Submit is refused without them.
- **Staff check them:** Verified, or Rejected with a reason (audited). A rejected applicant can upload new documents until the deadline. An unverified application can't be assigned to jury.
- **Privacy (DPDP Act 2023):** consent at upload; seen only by the award's staff, its department head, the leader and PAs, **never jury**; deleted 12 months after the cycle's results are published, keeping the check record. This is a written exception to "nothing is ever hard-deleted".
- **Entry limit:** an optional maximum of submitted applications per cycle; the public count (e.g. "499 / 500") is always shown when a limit is set; submissions past the limit are refused; one transaction with a lock prevents overfilling.

## Why

- Documents per application are what the owner asked for, and what staff can check today without integrations. LinkedIn has no open verification API.
- Masked Aadhaar only: storing full Aadhaar numbers is restricted, and we don't need them.
- Keeping proof documents away from jury protects blind judging and privacy at the same time.

## Consequences

- New file kinds `IDENTITY_PROOF` and `EMPLOYMENT_PROOF`, a `purgedAt` field, new application fields (`linkedinUrl`, `proofStatus`, check details), and `Cycle.maxEntries`.
- A proof-check screen for staff, an upload step for applicants, and a scheduled clean-up of documents past their retention date. That's the first background job; it can run daily from a cron route.

## What would change our mind

- Staff find per-application checks too much work: reuse a verified person-and-organisation check across awards (as proposed in 0.4), with a validity period.
- A legal review asks for a shorter retention: change the 12 months.
