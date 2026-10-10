# Backend: Awards Platform API

The API that holds every rule of the platform: who may do what, the four rules of the brief, and all writes to the database. It is an Express 5 + TypeScript app on PostgreSQL (Prisma). It runs on **Render**, with the database and files on **Supabase**. The frontend only shows what this API decides.

Why it is built this way: [ADR 0001](../docs/decisions/0001-frontend-backend-split-and-hosting.md) (two apps, hosting) and [ADR 0002](../docs/decisions/0002-tech-stack.md) (tech stack). How it fits together: [TECHNICAL-DESIGN.md](../docs/TECHNICAL-DESIGN.md).

## Status

| | |
|---|---|
| **On `main`** | Nothing yet |
| **Built** | The foundation, on branch `phase/01-be-foundation` (tag `parked/phase-01-be-foundation`): project setup, the full database schema with its rules, shared libraries, the audit and email-outbox modules, `GET /api/health`, CI and 62 passing tests |
| **Next** | **Step 1.1 (Sat 10 Oct)** brings that code onto `staging`, and then `main` (ADR 0015), with the changes decided on 7–9 Oct ([list](../docs/proposals/0.7-backend-changes.md)), then adds logins, roles, My profile and organisations |
| **Plan** | [PLAN.md](../docs/PLAN.md) (three phases) · [PHASES.md §4](../docs/PHASES.md#4-phase-1-steps-in-detail) (what each step builds and tests) |

## What gets built when

| Module | What it does | Phase 1 step | Later |
|---|---|---|---|
| `audit` | Insert-only history, written inside the caller's transaction (R3) | Built | — |
| `notifications` | Email templates and the EmailLog outbox | Built (outbox); templates as needed | All templates and a real provider (2.6) |
| `identity` | Register, login, sessions, scoped roles, My profile, change password, profile proof (ID and LinkedIn) | 1.1 | Invites from admin screens, deactivation (2.3) |
| `organisations` | Create and join with PAN and GSTIN checks, normalised profile | 1.1 | Corrections by the leader (2.3) |
| `master-data` | Award domains and organisation types (retired, never deleted) | 1.1 (read; lists seeded) | Admin screens (2.3) |
| `departments` | Departments, heads, staff on awards, brand kit | Seeded (departments and brand kits) | Create departments, appoint heads (2.3); brand-kit screen (2.2) |
| `awards` | Awards, cycles, categories, rounds, jury per application, entry limit, publish gate | 1.2 | Copy last year's setup (3.8) |
| `forms` | Questionnaire drafts, immutable versions (R4) | 1.2 | Version diff, New/Updated markers, more question types (2.5) |
| `scoring` | Scoring sheets, weight checks, score formula, average | 1.2 | — |
| `sites` | One branded page per award; public award pages | 1.2 | Full section builder, versions, restore (2.2) |
| `applications` | Start (one per organisation), demo fee, answers, files, employment proof, submit with the entry limit, deadline lock, proof check, release | 1.3 | Edit after submit, withdraw, deadline extension, "questions changed" alerts (2.5) |
| `masking` | Masked answers for blind awards (R1) | 1.4 | Masked files (2.5) |
| `jury-pool` | Jury pool per cycle, recorded conflicts (R2) | 1.4 | — |
| `judging` | Assigning several jury per application, scoring, score changes with a reason (R1–R3) | 1.4 | Disqualify and reinstate, reopen (2.5) |
| `approval` | Send for approval and approve (written rounds) | 1.4 | Send back (2.5) |
| `results` | Ranks, result labels, publishing | 1.4 | Medals for on-site rounds (2.1) |
| `reporting` | The leader dashboard (applications by status, judging progress, approvals waiting, deadlines) | 1.4 | Department dashboard (2.4) |
| `onsite` | Slots, panels, staff backup entry, closing the round | — (tables exist) | 2.1 |

## Structure

```
Backend/
├─ docker-compose.yml       PostgreSQL 16 (port 5433) and Mailpit, for local work and tests
├─ prisma/
│  ├─ schema.prisma         the whole data model (spec §10)
│  ├─ migrations/           SQL migrations, including hand-written rules (triggers, CHECKs, partial indexes)
│  └─ seed.ts               starter lists and demo accounts (passwords from the environment)
├─ src/
│  ├─ server.ts             starts listening
│  ├─ app.ts                builds the Express app (also used by tests)
│  ├─ routes.ts             mounts each module's routes under /api
│  ├─ config/env.ts         environment variables, checked with Zod at start-up
│  ├─ lib/                  db, clock, errors, logger, ids, normalize, states, storage/, mailer/
│  ├─ middleware/           error handler; from Step 1.1 also the actor (session → user and roles) and rate limits
│  └─ modules/<name>/       one folder per module (see below)
└─ tests/                   test-database helpers, data factories, database-rule tests
```

Every module folder has the same files:

| File | Job |
|---|---|
| `routes.ts` | Checks the input with Zod, calls **one** service function, returns its view. Never touches the database |
| `service.ts` | Takes the acting user first, checks permission and scope through `access.ts`, applies the rule, runs the transaction, writes the audit event |
| `access.ts` | The permission and scope checks for this module |
| `schemas.ts` | Zod schemas for input and stored configuration |
| `views.ts` | What each role may see (applicant, jury, staff, leader); raw database rows never leave the API |
| `*.test.ts` | Tests against a real PostgreSQL |

The full list of code rules is in [CLAUDE.md](../CLAUDE.md#code-rules-from-the-spec-not-negotiable).

## Running it locally

Available from Step 1.1. You need **Node.js 22** and **Docker Desktop** (running).

```bash
cd Backend
cp .env.example .env        # then set AUTH_SECRET (see the comment inside)
npm ci
docker compose up -d        # PostgreSQL on port 5433, Mailpit inbox on http://localhost:8025
npm run db:deploy           # create the tables
npm run db:seed             # starter lists and demo accounts
npm test                    # every test, against the separate awards_test database
npm run dev                 # API on http://localhost:4000; try /api/health
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm test` | Run all tests (they use `awards_test`, never your data) |
| `npm run lint` · `npm run typecheck` | Code checks (CI runs them too) |
| `npm run build` · `npm start` | Production build and start |
| `npm run db:deploy` | Apply new migrations |
| `npm run db:migrate` | Create a new migration while developing |
| `npm run db:seed` | Add the starter data (safe to repeat) |
| `npm run db:reset` | Drop and rebuild the local database |

Stop the services with `docker compose stop`; the data is kept.

## Environment variables

Listed in `.env.example`. Secrets never go into Git.

| Variable | Use |
|---|---|
| `DATABASE_URL` | The app's connection (online: Supabase's pooled connection) |
| `DIRECT_URL` | Migrations (online: Supabase's direct connection) |
| `TEST_DATABASE_URL` | The test database; its name must contain "test" |
| `SHADOW_DATABASE_URL` | Scratch database for the drift check (local and CI only) |
| `AUTH_SECRET` | Signs the session cookie; at least 32 random characters |
| `APP_URL` | The frontend's address, for CORS and links in emails |
| `SMTP_*`, `MAIL_FROM` | Email; locally Mailpit catches everything |
| `STORAGE_DRIVER`, `STORAGE_DISK_ROOT` | Files: `disk` locally, Supabase Storage online |
| `LEADER_EMAIL`, `LEADER_PASSWORD` | The leader's account, created by the seed (added in Step 1.1) |

## Tests

- They run against a **real PostgreSQL** (`awards_test`), because the rules depend on real constraints, triggers and transactions.
- Each suite empties its tables first, and the tests refuse to run on a database whose name doesn't contain "test".
- The rule tests (R1–R4) are written from the wording of each rule, together with the feature.
- CI runs lint, type check, migrations, a drift check and every test on each pull request.

## Online (Step 1.5, 14 Oct)

Two Render web services built from this folder, one for staging (the `staging` branch) and one for production (`main`): build with `npm ci && npm run build`, migrate with `npm run db:deploy`, start with `npm start`, health check `/api/health`. The steps will be written down in `docs/DEPLOYMENT.md`.
