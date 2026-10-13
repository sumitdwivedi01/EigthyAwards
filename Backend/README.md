# Backend: Awards Platform API

The API that holds every rule of the platform: who may do what, the four rules of the brief, and all writes to the database. It is an Express 5 + TypeScript app on PostgreSQL (Prisma). It runs on **Render**, with the database and files on **Supabase**. The frontend only shows what this API decides.

Why it is built this way: [ADR 0001](../docs/decisions/0001-frontend-backend-split-and-hosting.md) (two apps, hosting) and [ADR 0002](../docs/decisions/0002-tech-stack.md) (tech stack). How it fits together: [TECHNICAL-DESIGN.md](../docs/TECHNICAL-DESIGN.md). The endpoints: [docs/API.md](../docs/API.md).

## Status

| | |
|---|---|
| **Built (Step 1.1)** | The foundation (database schema with its rules, shared libraries, audit, email outbox), the migration with the decisions of 7–9 Oct, logins and sessions, applicant and platform accounts (ADR 0016), scoped roles, My profile (change password; LinkedIn and identity document for applicants), organisations, master-data lists, the seed. 136 tests |
| **Built (Step 1.2)** | Departments and people (ADR 0017): the leader creates departments and heads, heads keep the staff and jury lists, temporary passwords (shown once, 7 days, must be changed; every other endpoint answers 403 until then). Award setup: awards, editions with dates, fee, blind judging, categories, entry limit, jury per application and result names; the publish check; questions with immutable versions (R4); the scoring sheet and the exact score arithmetic (ADR 0019); one public page per award and Open awards. No masking (ADR 0018). Departments run themselves: the head keeps the people and chooses the theme, the leader only views (ADR 0020). 203 tests |
| **Built (Step 1.3)** | Applying: starting (one per organisation, blocked at the start, ADR 0011), the demo fee, autosaved answers checked per question type, files through signed links, the recent employment proof (3 months), submitting with the entry limit under a lock and the organisation's snapshot, the deadline lock on first use, R4 pinning; staff's applications list, proof check (with the rejection email) and release (API); file downloads with access checks. 271 tests |
| **Built (Step 1.4)** | Judging: recorded conflicts (R2, for every award; removed with a reason), assigning listed jury by hand after the deadline (all or nothing, under a lock, with the board's counts), the blind jury view built from an allow-list (R1), draft marks and submit, the exact average (ADR 0019), score corrections with a reason until approval (R3), sending for approval and the head's approval (stores `F₂`, `ΣP`, `n` and the rank in the category), results by top N, a cut-off or by hand, publishing, an application's history and the dashboard; database triggers lock an approved round's scores. 332 tests |
| **Next** | **Step 1.5 (14–15 Oct):** production online (Supabase, Render, Vercel) with demo data, and the brief's documents |
| **Plan** | [PLAN.md](../docs/PLAN.md) (three phases) · [PHASES.md §4](../docs/PHASES.md#4-phase-1-steps-in-detail) (what each step builds and tests) |

## What gets built when

| Module | What it does | Phase 1 step | Later |
|---|---|---|---|
| `audit` | Insert-only history, written inside the caller's transaction (R3) | Built | — |
| `notifications` | Email templates and the EmailLog outbox | Built (outbox, "password changed"); templates as needed | All templates and a real provider (2.6) |
| `identity` | Register (applicant accounts), login, sessions, scoped roles (platform accounts), My profile, change password, profile proof (ID and LinkedIn; applicant accounts only) | Built (1.1) | Invites, password reset, deactivation (2.3) |
| `organisations` | Register and join with PAN and GSTIN checks, normalised profile (applicant accounts only) | Built (1.1) | Corrections by the leader (2.3) |
| `master-data` | Award domains and organisation types (retired, never deleted), states | Built (1.1: read; lists seeded) | Admin screens (2.3) |
| `departments` | Departments and their heads, the staff and jury lists, temporary passwords, the theme chosen by the head (the leader only views, ADR 0020) | Built (1.2) | Replace a head, more staff on an award, invites by email (2.3); brand-kit screen (2.2) |
| `awards` | Awards, cycles, categories, rounds, jury per application, entry limit, publish gate | Built (1.2) | Copy last year's setup (3.8) |
| `forms` | Questionnaire drafts, immutable versions (R4) | Built (1.2) | Version diff, New/Updated markers, more question types (2.5) |
| `scoring` | Scoring sheets, weight checks, the exact score arithmetic (whole-number points, one rounding, ties; ADR 0019) | Built (1.2; the arithmetic used by judging and approval in 1.4) | — |
| `sites` | One branded page per award (its address chosen by staff); Open awards and the public award page | Built (1.2) | Full section builder, versions, restore (2.2) |
| `applications` | Start (one per organisation), demo fee, answers, files, employment proof, submit with the entry limit, deadline lock, proof check, release, file downloads | Built (1.3) | Edit after submit, withdraw, deadline extension, "questions changed" alerts (2.5) |
| `judging` | The blind jury view (R1, no masking: ADR 0018), recorded conflicts (R2), assigning listed jury by hand with the assignment board, scoring, score changes with a reason (R3), judging progress | Built (1.4) | Disqualify and reinstate, reopen (2.5) |
| `approval` | Send for approval and approve (written rounds) | Built (1.4) | Send back (2.5) |
| `results` | Ranks within each category, result labels, publishing | Built (1.4) | Medals for on-site rounds (2.1) |
| `reporting` | The dashboard (applications by status, judging progress, approvals waiting, deadlines) for the leader and for a head's own departments | Built (1.4) | The department dashboard's own screens (2.4) |
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
│  ├─ server.ts             starts listening and the email dispatcher
│  ├─ app.ts                builds the Express app (also used by tests)
│  ├─ routes.ts             mounts each module's routes under /api
│  ├─ config/env.ts         environment variables, checked with Zod at start-up
│  ├─ lib/                  db, clock, errors, logger, ids, normalize, states, access (the actor and its
│  │                        scoped-role checks), password, session, prisma-errors, storage/, mailer/
│  ├─ middleware/           actor (session → user and roles), security (same-origin writes, no-store),
│  │                        error handler
│  ├─ types/                Express request typing (req.actor)
│  └─ modules/<name>/       one folder per module (see below)
└─ tests/                   test-database helpers, data factories, database-rule tests
```

Every module folder has the same files:

| File | Job |
|---|---|
| `routes.ts` | Checks the input with Zod, turns the session into an actor (or answers 401), calls **one** service function, returns its view. Never touches the database |
| `service.ts` | Takes the acting user first, checks permission and scope through `access.ts`, applies the rule, runs the transaction, writes the audit event |
| `access.ts` | The permission and scope checks for this module, built on `src/lib/access.ts` |
| `schemas.ts` | Zod schemas for input and stored configuration |
| `views.ts` | What each role may see (applicant, jury, staff, leader); raw database rows never leave the API |
| `*.test.ts` | Tests against a real PostgreSQL |

The full list of code rules is in [CLAUDE.md](../CLAUDE.md#code-rules-from-the-spec-not-negotiable).

## Running it locally

You need **Node.js 22** and **Docker Desktop** (running).

```bash
cd Backend
cp .env.example .env        # then set AUTH_SECRET, LEADER_PASSWORD and DEMO_PASSWORD (see the comments inside)
npm ci
docker compose up -d        # PostgreSQL on port 5433, Mailpit inbox on http://localhost:8025
npm run db:deploy           # create the tables
npm run db:seed             # starter lists, departments and demo accounts
npm test                    # every test, against the separate awards_test database
npm run dev                 # API on http://localhost:4000; try /api/health
```

The seed prints the demo accounts it created. The leader signs in with `LEADER_PASSWORD`; every other demo account with `DEMO_PASSWORD`. Both live only in your `.env`.

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm test` | Run all tests (they use `awards_test`, never your data) |
| `npm run lint` · `npm run typecheck` | Code checks (CI runs them too) |
| `npm run build` · `npm start` | Production build and start |
| `npm run db:deploy` | Apply new migrations |
| `npm run db:migrate` | Create a new migration while developing (interactive terminal) |
| `npm run db:seed` | Add the starter data (safe to repeat: adds only what's missing, never resets a password) |
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
| `AUTH_SECRET` | Signs the session cookie and the storage links; at least 32 random characters |
| `SESSION_MAX_AGE_HOURS` | How long a login lasts (default 12) |
| `BCRYPT_ROUNDS` | Password hashing work (default 12; the tests use 4) |
| `TRUST_PROXY` | Proxies in front of the API (default 1: the Next.js `/api` proxy) |
| `APP_URL` | The frontend's address, for CORS, the same-origin check and links in emails |
| `SMTP_*`, `MAIL_FROM` | Email; locally Mailpit catches everything |
| `STORAGE_DRIVER`, `STORAGE_DISK_ROOT` | Files: `disk` locally, Supabase Storage online (Step 1.5) |
| `LEADER_EMAIL`, `LEADER_PASSWORD`, `DEMO_PASSWORD` | The seed's accounts |

## Tests

- They run against a **real PostgreSQL** (`awards_test`), because the rules depend on real constraints, triggers and transactions.
- Each suite empties its tables first, and the tests refuse to run on a database whose name doesn't contain "test".
- The rule tests (R1–R4) are written from the wording of each rule, together with the feature. API tests go through HTTP with Supertest, sessions included.
- CI runs lint, type check, migrations, a drift check (schema against migrations) and every test on each pull request, and on pushes to `staging` and `main`.

## Online (Step 1.5, 14 Oct)

Two Render web services built from this folder, one for staging (the `staging` branch) and one for production (`main`): build with `npm ci && npm run build`, migrate with `npm run db:deploy`, start with `npm start`, health check `/api/health`. The steps will be written down in `docs/DEPLOYMENT.md`.
