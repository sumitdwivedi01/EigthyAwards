# Backend: Awards Platform API

An Express 5 + TypeScript API on PostgreSQL (Prisma). It is deployed to **Render**, with the database and files on **Supabase**. Why it's built this way: [ADR 0001](../docs/decisions/0001-frontend-backend-split-and-hosting.md), [ADR 0002](../docs/decisions/0002-tech-stack.md).

> **Status:** Phase 1 (foundation) done: schema, migrations, shared libraries, audit, email outbox, health route, 62 tests. Business features come in Phases 2, 3, 6, 8, 9, 11 and 12 ([docs/PHASES.md](../docs/PHASES.md)).

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
│     ├─ applications/      fee, answers, files, submit, withdraw, duplicates, identity snapshot, deadline lock (R4)
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

You need **Node.js 22** and **Docker Desktop** (running).

```bash
cd Backend
cp .env.example .env        # then set AUTH_SECRET (see the comment inside)
npm ci
docker compose up -d        # PostgreSQL (port 5433) + Mailpit (inbox: http://localhost:8025)
npm run db:deploy           # create the tables
npm run db:seed             # starter lists (award domains, organisation types)
npm test                    # every test, against the separate awards_test database
npm run dev                 # API on http://localhost:4000 -> try /api/health
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm test` | Run all tests (they use `awards_test`, never your data) |
| `npm run lint` / `npm run typecheck` | Code quality checks (CI runs them too) |
| `npm run build` / `npm start` | Production build and start |
| `npm run db:deploy` | Apply new migrations |
| `npm run db:seed` | Add the starter lists (safe to repeat) |

Stop the services with `docker compose stop` (data is kept).
