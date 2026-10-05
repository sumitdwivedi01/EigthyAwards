# 0006. Data consistency by design: one record, normalised, from controlled lists

- Status: **Accepted** (leader call, 2026-10-05)
- Date: 2026-10-05
- Related: spec §5.18; GAPS section H; G-C07 (identity snapshot)

## Context

The leader said data inconsistency was the biggest problem before this platform. Each award kept its own records, so the same organisation, person, department or domain was written differently in each place, and the leadership's combined view could not be trusted.

## Options

1. **Rely on the UI** (dropdowns and form checks). It's cheap, but anything that bypasses the UI (the API, seed data, a future import) brings the inconsistency back. Turned down as the only guard.
2. **Clean up later** with reports and manual merges. That treats the symptom; the problem would keep coming back. Kept only as a "could have" (a possible-duplicates list for PAs).
3. **Enforce consistency on the server and in the database, at write time.** ← chosen

## Decision

Option 3, in five layers:

1. **One record per real thing**, reused by every award: an organisation per PAN, a user per email, a department per name.
2. **Normalisation in the service** before every save:
   - PAN, GSTIN and CIN: upper case, spaces removed
   - emails: lower case
   - names: trimmed, repeated spaces collapsed
   - phone: `+91` and 10 digits
   - PIN code: 6 digits
3. **Database constraints** as the second guard: case-insensitive unique indexes on emails, department names, award names per department, cycle labels per award, category names per cycle, and master data names.
4. **Controlled lists** (master data) instead of free text for award domains and organisation types, managed by the leader and PAs. States and union territories come from a fixed list with GST state codes. List values are retired, never deleted.
5. **History stays true**: the application snapshots the organisation's identity at submit and freezes it at the deadline. Corrections are new, audited records with a reason.

## Why

- Consistency is checked where it can't be skipped: the service plus the database. This is the same reasoning the spec uses for the four rules.
- The shared-tables design (spec §8) already gives one place for each kind of record. These rules stop that one place from filling up with near-duplicates.

## Consequences

- A new `master-data` module (16 modules in total). Two new tables: AwardDomain and OrganisationType.
- Unit tests for every normaliser. Service tests for case-insensitive duplicates and the GSTIN/PAN check.
- The GSTIN state code differing from the address state gives a **warning, not a refusal**, because a GSTIN can belong to a branch in another state (spec assumption A17).

## What would change our mind

- If real organisations often have legitimate data that our normalisers reject (for example landline formats, or foreign entities), relax that specific rule and record the exception, rather than dropping the layer.
