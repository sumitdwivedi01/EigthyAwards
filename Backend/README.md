# Backend: Awards Platform API

An Express 5 + TypeScript API on PostgreSQL (Prisma). It is deployed to **Render**, with the database and files on **Supabase**. Why it's built this way: [ADR 0001](../docs/decisions/0001-frontend-backend-split-and-hosting.md), [ADR 0002](../docs/decisions/0002-tech-stack.md).

> **Status:** not started. It is built in Phases 1, 2, 3, 6, 8, 9, 11 and 12 ([docs/PHASES.md](../docs/PHASES.md)).

## Planned structure

```
Backend/
├─ docker-compose.yml       PostgreSQL 16 + Mailpit (local and tests)
├─ prisma/                  schema.prisma, migrations/, seed.ts
├─ src/
│  ├─ server.ts             listen
│  ├─ app.ts                build the Express app (used by tests too)
│  ├─ routes.ts             mount module routers under /api
│  ├─ config/env.ts         Zod-validated environment
│  ├─ lib/                  db, clock, errors, logger, ids, normalize, states, storage/, mailer/, auth/
│  ├─ middleware/           actor, error-handler, validate, rate-limit
│  └─ modules/
│     ├─ identity/          login, invites, resets, scoped roles, Leader's PAs, deactivation
│     ├─ departments/       departments, heads, staff (one staff member, many awards)
│     ├─ master-data/       award domains, organisation types (retire, never delete)
│     ├─ organisations/     PAN/GSTIN, create/join, normalised profile, audited corrections
│     ├─ awards/            awards, cycles, categories, rounds, publish gate
│     ├─ forms/             questionnaire drafts, immutable versions, diff (R4)
│     ├─ scoring/           scoring sheets, weights, score formula
│     ├─ applications/      fee, answers, files, submit, withdraw, one per organisation (blocked at start), release, identity snapshot, deadline lock (R4)
│     ├─ masking/           masked answers and files (R1)
│     ├─ jury-pool/         pool per cycle, conflicts (R2)
│     ├─ judging/           assignment, scores, corrections, disqualification (R1–R3)
│     ├─ onsite/            on-site rounds: slots, panels, backup entry, close, averages
│     ├─ approval/          send for approval, approve, send back (document rounds only)
│     ├─ results/           ranks, result labels (Shortlisted/Rejected, Gold/Silver/Bronze), publish
│     ├─ reporting/         leader, PA and department dashboards; PA activity
│     ├─ audit/             append-only history (R3)
│     └─ notifications/     email templates, EmailLog outbox
└─ tests/                   test DB helpers, factories, integration suites
```

Each module folder holds `routes.ts` (Zod parse → one service call), `service.ts` (access check, rule, transaction, audit), `access.ts`, `schemas.ts`, `views.ts`, and its tests.

## Running it

Added in Phase 1.
