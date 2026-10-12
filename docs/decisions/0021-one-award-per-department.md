# 0021. One award per award department

- Status: **Accepted** (the lead and the owner, 2026-10-12)
- Date: 2026-10-12
- Changes: [ADR 0020](0020-departments-run-themselves.md) (a department now runs one award, and every staff member of it runs that award); spec §2, §3, §5.3, §7, §18; GAPS G-K41–G-K44
- Related: [ADR 0009](0009-branded-award-sites.md) (a brand kit per department now means a brand per award); [ADR 0017](0017-people-created-on-screen.md) (people created on screen); [ADR 0013](0013-several-jury-per-application.md) (the jury list is the department's)

## Context

Until now a department was "a team that runs a group of awards": its staff could create several awards, each run by the staff member who created it, all sharing the department's people, jury list and theme. In the 12 Oct call the lead said this isn't how the client thinks of it. An organiser comes to announce **an award**; a department is really that award's home. To announce a different award, the leader sets up a new department for it. The lead also clarified the brief's "38 categories competing in the same cycle": it means 38 separate awards running in the same year, not 38 groups inside one award.

## Options

1. **Keep departments with several awards.** No change, but it doesn't match how the client runs awards, and people, jury lists and themes are shared across unrelated awards.
2. **Merge department and award into one record.** Exactly the client's picture, but a large change to the data model, the people screens and every access check, two days before going online.
3. **Keep both records, one award per department** ← chosen. The department stays the award's home (its head, staff, jury list, theme); the database allows one award in it.

## Decision

Option 3.

- **One award per department.** A department holds at most one award; the API refuses a second with "This award department already runs its award", and a unique index on the department decides when two staff try at the same moment. A new award needs a new department, which the leader creates with its head (ADR 0020 is unchanged there).
- **The screens call it an "award department"** (the leader's list, the head's page, the navigation).
- **The staff create it.** As before, the department's staff create its award (name, subject area, description); then they set up its editions.
- **Every staff member of the department runs its award.** There is no separate "assign staff to an award" step: the award's staff are its department's staff list, kept by the head. An `AWARD_STAFF` role given before this decision still counts, and no new ones are made. One person can still run several awards, by being staff of several award departments.
- **One edition at a time.** The award runs year after year, but only one edition is in progress: a new one can be created once the current one's results are published (or once its deadline passed with nothing submitted). The check runs under a lock on the award.
- **Jury, judging, approval and results don't change.** The jury list is the department's, which is now the award's.

## Why

- It matches the client's way of working, as the lead described it: an award has its own home and its own people.
- It is a small, safe change: one unique index, one access rule, one edition rule, and wording. No judging code changes.
- Keeping both records leaves room for an organiser that later wants several awards under one head: one person can already head several departments.

## Consequences

- A department's theme, staff and jury list now belong to exactly one award.
- The staff "work" that stops the head from removing someone is now what they recorded on the department's award.
- The migration refuses to run on a database where a department already has two awards, with a message naming the departments (only local test databases can; production has no data yet).
- The seed keeps its two department names; Step 1.5's demo data online uses award-style names.

## What would change our mind

- An organiser that genuinely runs a family of related awards with the same people and jury, and finds one department per award heavy: allow several awards under one head, or merge the records (option 2) when the data model is next opened up.
