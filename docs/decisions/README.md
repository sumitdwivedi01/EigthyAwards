# Decision records (ADRs)

The brief asks: *"Write each one down when you make it. Give the options, the one you picked, why, and what would change your mind."* There is one file per decision, numbered in the order the decisions were made. Superseded decisions are kept and marked, never deleted.

## Index

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-frontend-backend-split-and-hosting.md) | Split into a Next.js frontend (Vercel) and an Express API (Render), with Supabase PostgreSQL and Storage | Accepted | 2026-10-04 |
| [0002](0002-tech-stack.md) | Tech stack for the backend and the frontend | Accepted (6 Oct) | 2026-10-04 |
| [0003](0003-authentication-and-sessions.md) | Our own authentication in the API; session cookie through the Next.js proxy | Accepted (6 Oct) | 2026-10-04 |
| [0004](0004-git-branching-workflow.md) | One branch per phase → pull request → `main`, tagged per phase | Accepted | 2026-10-04 |
| [0005](0005-leader-pa-role.md) | A "Leader's PA" role for the leader's personal team (organisational work only) | Accepted (powers proposed) | 2026-10-05 |
| [0006](0006-data-consistency-by-design.md) | Data consistency by design: one record, normalised, controlled lists, DB constraints | Accepted | 2026-10-05 |
| [0007](0007-drop-authorisation-letter.md) | Drop the signed authorisation letter for now; what replaces it is open | Accepted | 2026-10-05 |
| [0008](0008-onsite-rounds.md) | On-site rounds as a round type (live presentations and shop-floor competitions): panels, averages, no approval, Gold/Silver/Bronze | Accepted | 2026-10-06 |
| [0009](0009-branded-award-sites.md) | Branded award sites built from ready-made sections, for all awards; staff change them any time; no approval | Accepted | 2026-10-07 |
| [0010](0010-proof-documents-and-entry-limit.md) | Proof of identity and employment with every application; an entry limit with a public counter | Accepted | 2026-10-07 |
| [0011](0011-one-application-per-organisation.md) | One application per organisation, blocked at the start; colleagues read-only; staff can release | Accepted | 2026-10-08 |

**Proposed** means it's what we will build, but we're waiting for confirmation (see [GAPS.md §A](../GAPS.md)). **Accepted** means confirmed.

## Decisions already recorded in the spec

These were made on Days 1–2 and are written up, with options and reasons, in [requirements.md](../requirements.md). They still stand unless an ADR above says otherwise.

| Decision | Where | Note |
|---|---|---|
| Modular monolith, not microservices | §8 "Why a modular monolith" | Still true for the backend. ADR 0001 only splits the UI out. |
| Shared tables, every row tied to its cycle, access enforced in one layer (not a DB per award or tables per award) | §8 "How one award's data stays apart" | Unchanged |
| PostgreSQL over MongoDB | §9 | Unchanged; hosted on Supabase |
| Prisma over Drizzle | §9 | Unchanged |
| Zod at every boundary | §9 | Unchanged |
| No background jobs; locking computed from time | §9 | Partly revised: EmailLog becomes an outbox ([GAPS G-C03](../GAPS.md)) |
| Tests against a real PostgreSQL, not mocks | §9, §15 | Unchanged |
| Award configuration as versioned JSON (FormVersion, ScoringSheet) | §8, §10 | Unchanged |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Related gaps: G-xxx

## Context
What forces the decision.

## Options
1. Option: pros / cons
2. ...

## Decision
The option picked.

## Why
The reasons.

## Consequences
What gets easier, what gets harder, and what follow-up work it creates.

## What would change our mind
The evidence or event that would make us revisit it.
```
