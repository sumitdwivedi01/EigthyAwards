# Daily log

What I did each day, in short: **Done · Next · Stuck · Plan changed**. The full detail is in [docs/PROGRESS.md](docs/PROGRESS.md).

> **Where we are (Tue 13 Oct, Day 11):** Phase 1 Steps 1.1 to 1.4 are built and in `staging`: logins and people, award setup on screen, applying, and judging through to published results (338 backend tests). **We are about two days ahead of the plan:** Steps 1.3 and 1.4 were due Mon 12 – Wed 14 Oct, and I built both on Sunday. The lead's change (one award per award department) and self-balancing scoring weights are built too. Next: Step 1.5, the platform online, then the walkthrough on Thu 15 Oct.

## Day 1 (Sat 3 Oct)
- **Done:** Read the brief. Listed my questions for the client instead of assuming, and drew a first high-level architecture.

## Day 2 (Sun 4 Oct)
- **Done:** Brief, spec and architecture in `docs/`; the first plan, progress tracker, gaps list and 4 decisions. Phase 0 merged.
- **Plan changed:** two apps: screens on Vercel, API on Render, database on Supabase ([ADR 0001](docs/decisions/0001-frontend-backend-split-and-hosting.md)).

## Day 3 (Mon 5 Oct)
- **Done:** Call with the leader: the award goes to the organisation, not its plants; no signed authorisation letter; consistent data is a main goal. All docs updated.
- **Stuck:** What replaces the letter (asked).

## Day 4 (Tue 6 Oct)
- **Done:** The client answered my 15 questions: shop-floor competitions are judged on site by a panel of 2 to 5, the average counts, Gold / Silver / Bronze; one application per organisation ([ADR 0008](docs/decisions/0008-onsite-rounds.md)).

## Day 5 (Wed 7 Oct)
- **Done:** Presented the plan to my mentor; wrote the plain-language overview with diagrams ([docs/overview/](docs/overview/)).
- **Plan changed:** New needs: a branded page per award, organisers running their own award, proof that the applicant works there, an entry limit ([ADR 0009](docs/decisions/0009-branded-award-sites.md), [ADR 0010](docs/decisions/0010-proof-documents-and-entry-limit.md)).

## Day 6 (Thu 8 Oct)
- **Done:** The UI overview the client asked for before building: a clickable prototype of 31 screens and a flow per role; two re-plan options for the lead.
- **Plan changed:** A second application from the same company is stopped at the start ([ADR 0011](docs/decisions/0011-one-application-per-organisation.md)).

## Day 7 (Fri 9 Oct)
- **Done:** Call with my lead: ID and LinkedIn given once on the profile, proof of employment from the last 3 months, change password, several jury per application with the average ([ADR 0012](docs/decisions/0012-proof-once-on-profile-and-account-settings.md), [ADR 0013](docs/decisions/0013-several-jury-per-application.md)); no PA role ([ADR 0014](docs/decisions/0014-no-pa-role.md)).
- **Plan changed:** Three phases: Phase 1, a working platform by 15 Oct; Phase 2, about 23 working days; Phase 3, about 15 ([docs/PLAN.md](docs/PLAN.md)).

## Day 8 (Sat 10 Oct)
- **Done:** Fitted Phase 1 into about 71 hours (the rest moved to Phase 2). Built Step 1.1: logins and roles, My profile, companies, starter data and the web app. A `staging` branch between the step branches and `main` ([ADR 0015](docs/decisions/0015-staging-branch.md)).
- **Plan changed:** Applicants and the platform's people use separate accounts ([ADR 0016](docs/decisions/0016-applicant-and-platform-accounts.md)).

## Day 9 (Sun 11 Oct): a full Sunday of work, to get ahead of the plan
- **Plan changed:** The lead's focus: no masking ([ADR 0018](docs/decisions/0018-blind-judging-without-masking.md)), people created on screen ([ADR 0017](docs/decisions/0017-people-created-on-screen.md)), an exact average ([ADR 0019](docs/decisions/0019-exact-score-arithmetic.md)); departments run themselves and the leader only watches ([ADR 0020](docs/decisions/0020-departments-run-themselves.md)).
- **Done:** README rewritten problem first. Built and checked in the browser, each on its own branch:
  - **Step 1.2:** departments and their people on screen, award setup (questions with frozen versions, scoring sheet), award pages.
  - **Step 1.3:** applying: one per company, autosave, files, proof of employment, the entry limit; staff's proof check.
  - **Step 1.4:** assigning to jury by hand, blind judging, the exact average, score changes only with a reason, approval, results, the dashboard.
- **Stuck:** Nothing. Two AI mistakes caught and written down ([ai-notes](docs/ai-notes.md) #15, #16).

## Day 10 (Mon 12 Oct)
- **Done:** Steps 1.3 and 1.4 merged into `staging` (Step 1.2 on Day 9). Docs checked and trimmed; the whole UI redone for senior people who come once or twice a year (larger, calmer, guided).
- **Plan changed (the lead, after talking to the client):** **one award per award department.** The leader creates an award department for each award; its staff create that one award and all of them run it, one edition (year) at a time; to announce a new award, the leader creates a new award department. Jury and judging stay the same. Built, tested (338 tests) and written into the spec and README ([ADR 0021](docs/decisions/0021-one-award-per-department.md)).
- **Cleared up:** The brief's "38 categories competing in the same cycle" was ambiguous: it means **38 separate awards**, not 38 groups inside one award.
- **Open for the lead:** Should jury assignment start before the deadline? My recommendation is in [GAPS G-K43](docs/GAPS.md); not built yet.
- **Next:** Merge this change into `staging`, then Step 1.5: the platform online and the brief's documents.

## Day 11 (Tue 13 Oct)
- **Done:** The scoring sheet's weights now **balance themselves**: they start equal and always add up to exactly 100%, adding or removing a section or indicator re-splits them, and typing one weight makes the others adjust. A new **"Start from the questions"** button builds a balanced sheet from the form in one click. Checked with thousands of random edits and by hand in the browser.
- **Next:** Merge this branch into `staging`, then Step 1.5: the platform online and the brief's documents.
