# 0018. Blind judging without a masking step

- Status: **Accepted** (owner and lead, 2026-10-11)
- Date: 2026-10-11
- Related: the brief's rule 1 ("If an award uses blind judging, a jury member cannot see who applied"); spec §5.4, §5.7, §6; GAPS G-K17, G-K22, G-C13, G-D11

## Context

The spec (§5.7) gave blind awards a **masking step**: after the deadline, staff edit a copy of every answer to hide names, and upload a masked copy of every file or mark it "safe as is"; jury only read the masked copies. The 10 Oct plan kept masking of answers in Phase 1 and moved masking of files to Phase 2. On 11 Oct the lead said he doesn't want the masking feature: the focus is on building and filling forms and on judging.

## Options

1. **The masking step as specified** (answers and files). Catches a name typed inside an answer, but staff edit every application by hand, and it is the largest piece of rule 1.
2. **Masking of answers only** (the 10 Oct plan). About 3 hours in Phase 1; the same manual work per application.
3. **Hide identity automatically, with no masking step** ← chosen.
4. **No blind award in Phase 1.** Rule 1 would only be designed, not shown.

## Decision

Option 3.

- **In a blind award the jury view never contains:** the identity section (the organisation's name, PAN, GSTIN, address, official email, phone, and the identity snapshot), the applicant's name and email, team-member answers, proof documents, payments, or **any uploaded file**. The view is built from an allow-list of fields, so nothing new can slip in by accident.
- **The jury sees** the answers to text, number, date, choice and yes/no questions exactly as typed, with the scoring sheet.
- **The applicant is told.** In a blind award the form shows "This award is judged blind: don't name your organisation or its people in your answers." Staff building a blind award see that file questions are for staff only, because jury won't see them.
- **No masking state.** Once the deadline passes, a submitted application is ready to assign, blind or not. The masking parts of the data model (masked answers, masked files, the masking status) are removed in Step 1.2's migration.
- **Non-blind awards** are unchanged: jury see the answers and the evidence files, never the proof documents.
- **Rule 1 tests:** every jury response in a blind award is scanned for the organisation's name, PAN, GSTIN, email and address and the applicant's name; a jury file download in a blind award is refused; a non-blind award shows the answers and files.

## Why

- The lead's direction: the time goes to the form builder, the form and judging.
- The core of rule 1 (the jury can't see the company, the person or their documents) is guaranteed by how the view is built, with no staff effort and nothing to forget.
- About 3 hours saved in Phase 1, and the masking work disappears from Phase 2 as well.

## Consequences

- **Known limit:** a name an applicant types inside an answer does reach the jury. The form warns against it, and if a juror notices it they score normally (the client's earlier decision, spec §5.7).
- **A blind award can't have evidence files judged by the jury** (G-K22). The demo's blind award uses text answers only.
- The spec's masking screens, statuses and tests are removed; the "Locked, Masked…" applicant status becomes "Locked…".

## What would change our mind

- A blind award needs its jury to see evidence files: add a light step where staff mark each file "safe to show" (no editing), or run that award non-blind.
- Applicants name themselves in answers often enough to affect results: bring back masking of answers for the awards that need it, as a cycle setting.
