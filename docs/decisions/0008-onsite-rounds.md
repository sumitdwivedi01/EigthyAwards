# 0008. On-site rounds as a round type, for live presentations and shop-floor competitions

- Status: **Accepted** (answers of 2026-10-06)
- Date: 2026-10-06
- Related: spec §5.16, §5.12; GAPS section I; supersedes the "live rounds: future" parts of the spec

## Context

Shop-floor competitions (Kaizen, 5S) register like any other award, but their form is small or empty, and they are judged **on site**: the team presents, and each juror fills in a score table while watching. Large awards also have a live round 2 for their shortlisted entries. The spec had listed shop-floor as "where the model breaks", and live rounds as future work.

The client's answers:
- Jury score on their own devices at the venue, and internet is assumed.
- A panel of about 2–5 jury score independently, and the average counts.
- On-site rounds have **no approval**, and the department head may sit on the panel.
- Document rounds end in Shortlisted / Rejected; on-site rounds end in **Gold / Silver / Bronze**.

## Options

1. **A separate "shop-floor competition" type with its own flow.** Quick to picture, but it puts an award-type branch in the code, the thing the brief says staff must never need a developer for. It also wouldn't cover the large award's round 2. Turned down.
2. **Keep shop-floor out of the model.** It's honest, but it leaves out a real class of the client's awards when the client has now told us how they work. Turned down.
3. **One generic round type, ON_SITE, next to DOCUMENT_REVIEW.** ← chosen. Staff pick a cycle's rounds in order: document review only; document review then on-site; or on-site only.

## Decision

Option 3.

- An on-site round has presentation slots, a panel of 2–5 jury per entry (checked for conflicts), independent scoring on any device, staff backup entry, a final score that is the average, no approval, and staff closing the round to lock its scores.
- Each round carries its own **result labels**, which the cycle can rename. The defaults: Shortlisted / Rejected for document rounds, Gold / Silver / Bronze / Participated for on-site rounds.
- The questionnaire may be empty for on-site-only cycles. On-site score sheets have their own criteria, not tied to form questions.

## Why

- No line of code names "shop-floor" or "live round 2". Behaviour comes from `round.type`, `round.resultLabels` and the panel size, so "an award is data, not code" still holds.
- The data model already allowed several evaluations per application per round (spec §5.16, old text), so this needs few new tables: `PresentationSlot` and `RoundResult`.
- The four rules keep working:
  - R1 applies to document rounds; on-site rounds are never blind.
  - R2 checks every panel member.
  - R3 covers closed on-site rounds and staff backup entry.
  - R4 is untouched.

## Consequences

- It moves on-site rounds from "future" into the 10-day build. That means a new backend phase (Phase 12) and more frontend work in Phase 13, with no extra days. The timeline risk is recorded in GAPS (G-I09) and the cut order.
- Approval applies to document rounds only. "Closed" joins "approved" as a state in which scores are locked.
- A new `onsite` module (17 modules at the time; 18 after ADR 0009 added `sites`).
- The applicant gets new statuses: Presentation scheduled, Gold, Silver, Bronze, Participated.

## What would change our mind

- Venues turn out to have no reliable internet: add an offline scoring mode, or a paper-sheet import flow, instead of the staff backup entry.
- The client wants a live scoreboard, or medals per entry category instead of one set per award (decided 6 Oct: one set per award): both would extend this design rather than replace it.
