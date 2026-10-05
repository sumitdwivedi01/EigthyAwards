# 0007. Drop the signed authorisation letter (for now)

- Status: **Accepted** (leader call, 2026-10-05). What replaces it is **open**: GAPS A13, G-H01.
- Date: 2026-10-05
- Related: spec §5.2, §5.6; this supersedes the letter parts of GAPS G-C08 and G-C09

## Context

The spec required each applicant to download a pre-filled authorisation letter, get it signed by the organisation's officials, and upload it before submitting. Staff then verified it. The point was to prove that the person may act for the organisation. The leader wants the process automated and does not want a signed-document step. For now, every application from a member of an organisation is accepted.

## Options

1. **Keep the signed letter.** Strong proof, but it's manual for applicants and staff, and slow near the deadline. The client rejected it.
2. **Drop it, and trust organisation membership (PAN + GSTIN to join).** ← chosen for now. Simple, but weak (see below).
3. **Replace it with a confirmation sent to the organisation's official email**: joining or applying needs a click on a link sent to that mailbox. Automated and much stronger. Proposed for the leader to consider.
4. **Replace it with a declaration at submit** ("I am authorised by <organisation> to apply"), recording name, designation and time. Gives a trail, but no real proof.

## Decision

Option 2 for now. The letter template, upload, verification step and AUTH_LETTER file kind are removed from the spec and the plan. The duplicate rule (one active application per organisation per cycle, flagged for staff) stays, because consistent data was the leader's main concern.

## Known weakness (stated openly)

The PAN is characters 3 to 12 of the GSTIN, and a GSTIN is printed on every invoice. So "knows the PAN and GSTIN" proves almost nothing: anyone holding an invoice could join an organisation and apply in its name. The duplicate flag limits the damage, because staff see two applications and contact the organisation through its official email.

## What would change our mind

- The leader picks option 3 or 4. Option 3 is our recommendation: it fits "automated", and fits in Phase 2 (identity) for about half a day of extra work.
- The first wrong-person application in real use.
