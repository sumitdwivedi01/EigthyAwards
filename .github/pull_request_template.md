<!--
Two kinds of pull request (ADR 0015):
- A step (or a docs phase or a fix) into `staging`: fill in the whole template.
- `staging` → `main` (production): delete everything above the line at the bottom and fill in only that part.
-->

## Step

Step **1.n**: <name> · branch `phase-1.<n>-<word>` · base **`staging`**

Gaps closed: G-… · Gaps found: G-… · ADRs: …

## What this PR does

-

## How to check it by hand

1.

## Exit checklist ([PHASES.md §1](../docs/PHASES.md))

- [ ] Every "Done when" item of the step is met
- [ ] Tests added or updated, including any of R1–R4 this step touches; `npm test` is green locally
- [ ] Lint and type check are clean
- [ ] CI is green
- [ ] No code branches on a specific award
- [ ] Every new service function takes the actor first and checks permission and scope
- [ ] Responses are view models, never raw database rows
- [ ] Every write of shared data goes through `lib/normalize.ts`; new uniqueness rules have a case-insensitive DB index
- [ ] The leader stays off judging writes; any new endpoint has its permission test
- [ ] The manual check above was run and works
- [ ] PROGRESS.md, GAPS.md, Daily.md and docs/API.md are updated; an ADR was added if a decision was made
- [ ] I read the whole diff line by line

---

## `staging` → `main` (production)

Carries: step **1.n** (PR #…), already merged into `staging`.

- [ ] The step's pull request into `staging` was merged with its exit checklist ticked
- [ ] CI is green on `staging`
- [ ] The step's manual check was run again on `staging`, and works
- [ ] After merging: tag `phase-1.<n>-done` on `main`
