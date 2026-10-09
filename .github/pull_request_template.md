## Phase

Phase **NN**: <name> · branch `phase/NN-<track>-<name>`

Gaps closed: G-… · Gaps found: G-… · ADRs: …

## What this PR does

-

## How to check it by hand

1.

## Exit checklist ([PHASES.md §1](../docs/PHASES.md))

- [ ] Every "Done when" item of the phase is met
- [ ] Tests added or updated, including any of R1–R4 this phase touches; `npm test` is green locally
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
