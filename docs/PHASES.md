# Build plan: phases

> **This is the project plan.** The brief says: keep the plan in GitHub, update it when it changes, and say so each time. Every change goes in the **Plan change log** below, and gets a "Plan changed" line in [Daily.md](../Daily.md).
>
> Related files: [PROGRESS.md](PROGRESS.md) (what is done) · [GAPS.md](GAPS.md) (what is missing or undecided) · [requirements.md](requirements.md) (the spec) · [decisions/](decisions/) (why we chose what we chose)

## Plan change log

| Date | Change | Why |
|---|---|---|
| 2026-10-06 (Day 4) | **Final decisions before Phase 1.** Phase 4 gains a throw-away skeleton deploy check. On-site medals: one set per award (ranks 1 to 3 of the whole round). Scores are whole numbers. Phase 0.2 merged. | Owner's answers (GAPS A1, A2, A9; G-I05). |
| 2026-10-06 (Day 4) | **Answers on shop-floor and open questions.** Added Phase 0.2 (docs only) and a new **Phase 12: on-site rounds (backend)**. The old Phases 12, 13 and 14 become 13, 14 and 15. Phases 1, 2, 3, 6, 8 and 11 updated (round types and result labels, an optional questionnaire, standalone on-site criteria, category fees, optional GSTIN, team members, three seeded cycles). Phase 13 gains the on-site screens. Days re-planned from Day 4, and the cut order extended. | Shop-floor competitions are judged on site by a panel; a live round with no approval; Gold/Silver/Bronze; one real application per organisation. ADR 0008. |
| 2026-10-05 (Day 3) | **Leader call.** Added Phase 0.1 (docs only). Phase 1 schema: PA role, master data tables, case-insensitive unique indexes, identity snapshot; authorisation letter removed. Phase 2 grows: PA invites and removal, account deactivation, master-data module, organisation normalisation and audited corrections. Phase 3: awards also created by the leader or a PA; staff on many awards. Phases 5, 6, 7, 10, 11 and 12 updated to match. Phase 2 moves to Day 4, and Phases 12 and 13 now share Day 9. Two items added to the cut order. | Leader call: staff on many awards, award to the organisation, no signed letter, a Leader's PA role, data consistency as the main goal. ADRs 0005, 0006, 0007. |
| 2026-10-04 (Day 2) | First version: 15 phases (0–14). Backend and frontend are separate apps, built in alternating phases with the backend first. | The spec planned one Next.js app on Vercel. We are hosting the frontend on Vercel, the backend on Render and the database on Supabase, so it splits into two apps. See [ADR 0001](decisions/0001-frontend-backend-split-and-hosting.md). |

---

## 1. How every phase is run

These steps are the same for every phase. A phase is either **done** (all of them) or **not done**. There is no "mostly done".

1. **Branch** from an up-to-date `main`: `git checkout main && git pull && git checkout -b phase/NN-<track>-<name>`.
2. **Backend before frontend.** A frontend phase starts only after the backend phase it calls has been merged.
3. **Write the tests with the feature.** Rule tests (R1–R4) come straight from the wording of the rule, not from the code.
4. **Commit in small steps** using Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
5. **Run the phase exit checklist** (below). Every box must be ticked.
6. **Update tracking:** [PROGRESS.md](PROGRESS.md) (what was achieved), [GAPS.md](GAPS.md) (gaps closed or found), [Daily.md](../Daily.md), and an ADR if we made a decision.
7. **Open a pull request** into `main` (the template has the checklist), wait for green CI, and read the diff line by line.
8. **Merge** with a merge commit (no squash, so the phase history stays readable) and tag it: `git tag phase-NN-done && git push --tags`.
9. **Deploy nothing** until Phase 14, except the throw-away skeleton check at the end of Phase 4 (GAPS A2). `main` must stay runnable on a local machine after every merge.

### Phase exit checklist (definition of done)

- [ ] Every "Done when" item of the phase is met
- [ ] Tests added or updated, including any of the four rules this phase touches. `npm test` is green locally
- [ ] Lint and type check are clean (`npm run lint`, `npm run typecheck`)
- [ ] CI is green on the pull request (from Phase 1 onwards)
- [ ] No code branches on a specific award (search `src/` for award names and expect nothing)
- [ ] Every new service function takes the actor first and checks permission and scope
- [ ] Responses are view models, never raw database rows
- [ ] Every write of shared data goes through `lib/normalize.ts`, and new uniqueness rules have a case-insensitive DB index (spec §5.18)
- [ ] The phase's manual check was run by hand and works
- [ ] PROGRESS.md, GAPS.md, Daily.md and docs/API.md are updated. ADRs are added if a decision was made

---

## 2. Timeline at a glance

The brief gives 10 working days. Days 1–2 went on understanding, questions and design. Today's planning is Phase 0. Phases 0.1 (Day 3) and 0.2 (Day 4) went on client answers. That leaves **days 4–10 for 16 phases (1 to 15)**, about two and a half a day, with Days 8 and 9 carrying three phases each. This is tight (G-I09), so the **cut order** at the end of this file says what gets dropped first.

| # | Track | Phase | Branch | Target day | Status |
|---|---|---|---|---|---|
| 0 | Docs | Planning and tracking setup | `phase/00-planning-docs` | Day 2 | ✅ Merged (`phase-00-done`) |
| 0.1 | Docs | Leader-call changes: PA role, data consistency, no letter | `phase/00.1-leader-call-changes` | Day 3 | ✅ Merged (`phase-00.1-done`) |
| 0.2 | Docs | On-site rounds and answers to the open questions | `phase/00.2-onsite-rounds-and-answers` | Day 4 | ✅ Merged (`phase-00.2-done`) |
| 1 | Backend | Backend foundation | `phase/01-be-foundation` | Day 4 | 🧪 In review |
| 2 | Backend | Identity, PA role, departments, master data, organisations | `phase/02-be-identity-orgs` | Day 5 | ⬜ |
| 3 | Backend | Award configuration engine: rounds, forms, score sheets (R4) | `phase/03-be-award-config` | Day 5 | ⬜ |
| 4 | Frontend | Frontend foundation, login, public pages | `phase/04-fe-foundation` | Day 6 | ⬜ |
| 5 | Frontend | Setup screens: leader and PA, department head, staff builders | `phase/05-fe-award-setup` | Day 6 | ⬜ |
| 6 | Backend | Applications and deadline lock (R4) | `phase/06-be-applications` | Day 7 | ⬜ |
| 7 | Frontend | Applicant journey | `phase/07-fe-applicant` | Day 7 | ⬜ |
| 8 | Backend | Masking, jury pool, conflicts, assignment (R1, R2) | `phase/08-be-masking-assignment` | Day 8 | ⬜ |
| 9 | Backend | Judging, score audit, disqualification (R3) | `phase/09-be-judging-audit` | Day 8 | ⬜ |
| 10 | Frontend | Staff operations and jury scoring | `phase/10-fe-masking-judging` | Day 8 | ⬜ |
| 11 | Backend | Approval, results and labels, emails, reporting, full seed | `phase/11-be-approval-results` | Day 9 | ⬜ |
| 12 | Backend | On-site rounds: slots, panels, panel scoring, averages, close, medals | `phase/12-be-onsite-rounds` | Day 9 | ⬜ |
| 13 | Frontend | Approval, results, on-site rounds, dashboards | `phase/13-fe-results-onsite-dashboards` | Day 9 | ⬜ |
| 14 | Ops | End-to-end tests and deployment (Supabase, Render, Vercel) | `phase/14-e2e-deploy` | Day 10 | ⬜ |
| 15 | Docs | Final deliverables, self-review, walkthrough | `phase/15-final-review` | Day 10 | ⬜ |

Status key: ⬜ not started · 🚧 in progress · 🧪 in testing or review · ✅ merged to `main` · ⛔ blocked. The live status is in [PROGRESS.md](PROGRESS.md). This table is updated whenever a phase merges.

---

## 3. Target repository layout

```
/
├─ CLAUDE.md                  context for AI coding sessions (read first)
├─ README.md                  what this is, how to run it, links
├─ Daily.md                   daily log: Done · Next · Stuck · Plan changed
├─ docs/
│  ├─ brief.md                the original problem statement
│  ├─ requirements.md         the product and technical spec
│  ├─ PHASES.md               this plan
│  ├─ PROGRESS.md             what is achieved; start here in a new session
│  ├─ GAPS.md                 gaps, open questions, risks
│  ├─ API.md                  endpoint contract between frontend and backend (from Phase 1)
│  ├─ decisions/              one ADR per decision
│  ├─ architecture/           architecture PDF, plus the updated drawing (Phase 15)
│  ├─ user-journeys.md        (Phase 15)
│  ├─ testing.md              what the tests check and what they don't (Phase 15)
│  ├─ ai-notes.md             where AI output looked right but was wrong (started when it first happens)
│  └─ DEPLOYMENT.md           runbook for Supabase, Render and Vercel (Phase 14)
├─ .github/
│  ├─ pull_request_template.md
│  └─ workflows/ backend-ci.yml, frontend-ci.yml
├─ Backend/                   Node.js + Express + TypeScript API, deployed to Render
│  ├─ docker-compose.yml      PostgreSQL + Mailpit for local work and tests
│  ├─ prisma/                 schema.prisma, migrations/, seed.ts
│  ├─ src/
│  │  ├─ server.ts            starts listening
│  │  ├─ app.ts               builds the Express app (also used by tests)
│  │  ├─ routes.ts            mounts every module router under /api
│  │  ├─ config/env.ts        Zod-validated environment (fails fast)
│  │  ├─ lib/                 db, clock, errors, logger, ids, normalize, states (GST codes), storage/, mailer/, auth/
│  │  ├─ middleware/          actor (session → actor), error-handler, validate, rate-limit
│  │  └─ modules/<module>/    routes.ts · service.ts · access.ts · schemas.ts · views.ts · *.test.ts
│  │       modules (17): identity, departments, master-data, organisations, awards, forms,
│  │                scoring, applications, masking, jury-pool, judging, onsite,
│  │                approval, results, reporting, audit, notifications
│  └─ tests/                  helpers (test DB reset, factories, clock), integration suites
└─ Front-End/                 Next.js + TypeScript UI, deployed to Vercel
   ├─ next.config.ts          rewrites /api/* to the backend (same-origin cookies)
   ├─ src/
   │  ├─ middleware.ts        coarse gate: logged in or not (never decides permissions)
   │  ├─ app/                 (public) · applicant · staff · jury · dept · leader (leader and PAs) · auth pages
   │  ├─ components/          ui/ (shadcn) · form-renderer/ · form-builder/ · scoring-sheet/ · layout/
   │  ├─ features/<area>/     API hooks and feature components per area
   │  └─ lib/                 api-client, auth (current user), format (₹ from paise, IST), query client
   └─ tests/e2e/              Playwright journeys (Phase 14)
```

**How the backend is layered** (spec §11, adapted to Express): `routes.ts` parses input with Zod, takes the actor from `req`, calls **one** service function, and returns its view model. `service.ts` checks access through `access.ts`, applies the rule, runs the transaction and writes the audit event. Routes never touch Prisma.

---

## 4. Phase details

Each phase lists its goal, what it builds, the tests that must pass, what "done" means, and a manual check you can run by hand.

### Phase 0: Planning and tracking setup (Docs)

**Goal.** Put the brief, the spec, the plan and the tracking files in the repo, so anyone (or any new AI session) can pick up the work from the repo alone.

**Builds.** `docs/brief.md`, `docs/requirements.md`, the architecture PDF, `docs/PHASES.md`, `docs/PROGRESS.md`, `docs/GAPS.md`, `docs/decisions/` (ADRs 0001–0004 and the index), `CLAUDE.md`, the PR template, `.gitignore`, updated READMEs, and today's Daily.md entry.

**Done when.** These files are on `main` and the open decisions in GAPS.md §A have been answered, or knowingly left on their defaults.

### Phase 0.1: Leader-call changes (Docs)

**Goal.** Bring every document in line with the leader call of 5 October 2026 before any code is written.

**Builds.** The spec (revision log, §1–3, §5.1–5.3, §5.6, §5.13–5.15, new §5.17 Leader's PA team and §5.18 Data consistency, §7, §8, §10–15, §17, §18), ADRs 0005–0007, GAPS.md (new decisions A11–A14, new section H), this plan, PROGRESS.md, CLAUDE.md, the READMEs and Daily.md.

**Done when.** No document mentions the authorisation letter as a requirement. The PA role and the data consistency rules appear in the spec, the plan and the permission matrix. The branch is merged and tagged `phase-00.1-done`.

---

### Phase 0.2: On-site rounds and answers to the open questions (Docs)

**Goal.** Record the 6 October answers in every document, and design on-site rounds (shop-floor competitions and live round 2) before any code is written.

**Builds.** The spec (revision log; §1–4, §5.2–5.6, §5.9, §5.11–5.13, rewritten §5.16, §6–8, §10–15, §18), ADR 0008, GAPS.md (A11–A14 closed; E02, E07, E08, E14 and E15 answered; new section I), this plan (new Phase 12, renumbering, days), PROGRESS.md, CLAUDE.md, the READMEs and Daily.md.

**Done when.** The spec, plan and gaps agree on on-site rounds, result labels and the renumbered phases. The branch is merged and tagged `phase-00.2-done`.

---

### Phase 1: Backend foundation (Backend)

**Goal.** A running Express + TypeScript API with the complete database schema, shared libraries, a real-database test harness and CI. It has no business features yet.

**Builds.**
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`, `db:reset`. Node version pinned (`.nvmrc` and `engines`).
- TypeScript strict mode, ESLint with `no-explicit-any` set to error, and Prettier.
- `docker-compose.yml` running PostgreSQL 16 (databases `awards` and `awards_test`) and Mailpit.
- `config/env.ts`: a Zod schema for every variable, plus a committed `.env.example`.
- `app.ts`: helmet, CORS allowlist, JSON body limit, cookie parser, request id and pino logging, `/api` routes, 404 handling and the error handler.
- `lib/`: `db.ts` (Prisma client and transaction helper), `clock.ts` (`now()`, movable in tests), `errors.ts` (ValidationError 400, UnauthenticatedError 401, ForbiddenError 403, NotFoundError 404, StateError 409), `ids.ts` (generates `sec_`/`q_`/`ind_` keys), `storage/` (interface plus disk driver), `mailer/` (interface plus SMTP driver for Mailpit).
- The **full Prisma schema** from spec §10, plus the fixes for gaps G-C05, C06, C07, C11 and C13 (AuthToken; a REVOKED evaluation status; identity snapshot; partial unique indexes; "safe as is" files). It includes the leader-call changes: the `LEADER_PA` role, `grantedById` and `revokedAt` on role assignments, `deactivatedAt` and `sessionVersion` on users, `actorRole` on audit events, and the master data tables `AwardDomain` and `OrganisationType`. There is no AUTH_LETTER file kind. From the 6 Oct answers: `Round.type` is DOCUMENT_REVIEW or ON_SITE, with `resultLabels`, panel size and `closedAt`; new tables `PresentationSlot` and `RoundResult`; `Evaluation.enteredById` and `revokedReason`; `EntryCategory.feePaise` (optional); `Organisation.gstin` optional, with a partial unique index (G-I13); no `Application.result` (results live in RoundResult).
- `lib/normalize.ts` (PAN, GSTIN, CIN, email, names, phone, PIN code) and `lib/states.ts` (states and union territories with GST state codes), with unit tests (G-H09).
- **Case-insensitive unique indexes** in raw SQL (`lower(...)`) on user email, department name, award name per department, cycle label per award, category name per cycle, and master data names (G-H08).
- A raw SQL migration with triggers that refuse UPDATE and DELETE on `AuditEvent` and `FormVersion`, and a partial unique index on the LEADER role.
- The `audit` module: `record(tx, event)`, which always runs inside the caller's transaction.
- The `notifications` module: `send()` writes a PENDING `EmailLog` row in the caller's transaction, and a dispatcher sends it after commit (outbox, G-C03).
- `GET /api/health`, which pings the database.
- `tests/` helpers: reset the test database between suites, data factories and clock control.
- `.github/workflows/backend-ci.yml`: install, lint, typecheck, `prisma migrate deploy` against a Postgres service container, then Vitest.
- The first version of `docs/API.md`.

**Tests.** Every normaliser (unit). The DB refuses `Energy` next to `energy` as department names. The app refuses to start when an env variable is missing. Each typed error maps to the right status and JSON shape. The clock can be moved. The AuditEvent and FormVersion triggers reject UPDATE and DELETE on the real database. A second LEADER is refused by the database. A duplicate PAN is refused by the database. Health returns 200.

**Done when.** On a fresh clone, `docker compose up -d && npm ci && npm run db:migrate && npm test` passes, and CI is green.

**Manual check.** `npm run dev`, then `curl localhost:4000/api/health` returns `{ "status": "ok", "db": "up" }`.

---

### Phase 2: Identity, PA role, departments, master data, organisations (Backend)

**Goal.** People can log in, roles have scopes, the leader → PA → department head → staff hierarchy works, shared data is consistent from the first write, and applicants have organisations.

**Builds.**
- **identity:** register (applicants), login and logout (bcrypt; a signed session token in an httpOnly cookie, [ADR 0003](decisions/0003-authentication-and-sessions.md)), `GET /api/auth/me`, invites (AuthToken, hashed, single use, expiring), accept invite, forgot password and reset password, and rate limits on login and reset. Also `invitePA` and `removePA` (leader only); `resendInvite`, `deactivateUser` and `reactivateUser` (leader and PA; never the leader's or another PA's account; shows what the person still owns first, G-H04). A deactivated user or a removed PA is refused on their next request.
- The actor middleware loads the user and every scoped role on each request. Access helpers: `requireLeader`, `requireLeaderOrPA`, `requireDeptHead(deptId)`, `requireDeptStaff(deptId)`, `requireStaffOfAward`, `requireStaffOfCycle`, `requireJuryOfCycle`, `requireOrgMember`.
- **departments:** create a department and appoint or replace its head (leader or PA); add staff to a department (department head for their own; leader or PA for any); list departments.
- **master-data:** award domains and organisation types (list for everyone; add, rename, retire for leader and PA; retired values can't be picked; renames audited, G-H10). The seed loads starter lists.
- **organisations:** create (with PAN and GSTIN checks), join (needs PAN and GSTIN, or PAN and the official email when there is no GSTIN; the error says which state's GSTIN is on record, G-H05), list mine, edit profile; `correctOrganisation` with a reason (leader or PA). Every value is normalised; a GSTIN/state mismatch returns a warning (G-H06). Profile edits and corrections are audited. Also a privacy-safe view.
- Every write in this phase records an audit event with the actor's role, including PA actions.
- Email templates: account invite, password reset.
- Seed: the leader (credentials from env), 1 PA, 2 departments with heads, 2 staff, 4 jury users, and the master data lists. Every seeded value goes through `lib/normalize.ts`.

**Tests.** PAN and GSTIN validators (unit). Login with a wrong password returns 401. The password hash never appears in any response. Invite and reset tokens are single use and expire. Only the leader and PAs can create departments (everyone else gets 403). A department head can add staff only to their own department. **PA:** a PA creates a department and the audit shows the PA and the role; a PA trying to create a PA gets 403; a removed PA is refused on their next request; a PA can't deactivate the leader or another PA. A deactivated user can't log in. `Asha@Example.com` is refused when `asha@example.com` exists. A PAN typed `abcde 1234f` joins the existing `ABCDE1234F` organisation. A GSTIN without the PAN is refused. An organisation without a GSTIN can be created, and joined with PAN plus official email. A retired award domain can't be picked. Joining an organisation needs both PAN and GSTIN. An applicant asking for another organisation gets 404. A jury user calling a staff endpoint gets 403. The leader and PAs are refused on every judging write.

**Done when.** Every seeded user (including the PA) can log in and `/me` returns their scoped roles. Invite → set password → login works, and the invite email shows in Mailpit.

**Manual check.** A requests file (`Backend/requests/phase-02.http`) walks the leader → PA → head → staff → applicant flow.

---

### Phase 3: Award configuration engine (Backend, rule R4)

**Goal.** Staff can fully configure and publish an award cycle through the API, with immutable form versions and validated scoring sheets. This is the heart of "an award is data, not code".

**Builds.**
- **awards:** create an award (department staff in their department, or the leader or a PA in any department; the domain comes from the master data list; the name is unique per department regardless of case; a staff creator becomes award staff), list, get. The department head (own department), the leader or a PA assigns staff to or removes staff from an award. **One staff member can hold many awards**, across departments; "my awards" lists them all.
- **cycles:** create (label unique per award); update settings (dates, fee in paise for the cycle and optionally per entry category, blind judging, entry categories, and the **rounds in order**: document review, on-site, or both; each with its result labels (defaults Shortlisted/Rejected and Gold/Silver/Bronze/Participated, renamable, with the label that moves an entry on) and, for on-site, the panel size of 2 to 5); the publish gate (spec §5.3: questions are needed only when the first round is a document review); fee and blind judging frozen after publish; status derived from the clock (G-C04).
- **forms:** a draft editor (Zod questionnaire schema; the server generates keys; question types include TEAM_MEMBERS; an empty questionnaire is allowed for on-site-first cycles). Publishing a version is an insert only, with a change summary and a NEW/UPDATED/UNCHANGED diff. Within a cycle, nothing can be removed and no question type can change; options can only be added. Also: get a version, list versions, compare two versions.
- **scoring:** a scoring sheet per round; `validateWeights` (100 at every level; in document rounds every indicator points to a real question; on-site criteria stand alone); `computeScore` and `averageScore` as pure functions.
- **public:** the Open awards list and cycle details (published, and `opensAt ≤ now < deadline`).
- Audit: form version published.

**Tests.** **R4:** editing a published version is refused (by the service and the DB trigger); removing a question or section inside a cycle is refused; changing a type is refused; removing an option is refused; keys are never reused; the diff marks NEW and UPDATED correctly. Weights that don't add up to 100 are refused. The formula matches the worked example (27.2), Yes/No indicators and rounding to 2 decimals. Each publish-gate failure gives a clear 409. Changing the fee or blind setting after publish gives 409. Staff of another award get 403. A staff member assigned to three awards in two departments sees all three. A PA creates an award but gets 403 when configuring its cycle. Open awards hides drafts and cycles past their deadline. An on-site-only cycle with no questions publishes; a document-review-first cycle with no questions is refused. An on-site criterion with a questionKey is refused. A round with fewer than two result labels is refused. A category fee overrides the cycle fee.

**Done when.** Three cycles with clearly different settings (blind + fee + 3 sections, document review only; non-blind + free + several categories, document review then on-site; shop-floor, on-site only with a near-empty form) can be configured and published through the API alone.

**Manual check.** `Backend/requests/phase-03.http` builds and publishes all three cycles.

---

### Phase 4: Frontend foundation, login, public pages (Frontend)

**Goal.** A Next.js app that talks to the backend, logs people in and sends each role to its own area.

**Builds.**
- Next.js (App Router) with TypeScript strict, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, and ESLint.
- `next.config.ts` rewrites `/api/*` to `BACKEND_URL`, so the session cookie is first-party ([ADR 0003](decisions/0003-authentication-and-sessions.md)).
- `lib/api-client.ts`: typed fetch that maps 400/401/403/404/409 to UI messages. `lib/format.ts`: ₹ from paise and IST date-times.
- Pages: login, register, forgot password, reset password, accept invite.
- `middleware.ts` coarse gate (logged in or not). Each role layout checks `/me` and redirects to the role's home page.
- An app shell per role area, plus 403 and 404 pages.
- Public pages: Open awards and Award details.
- `.github/workflows/frontend-ci.yml`: lint, typecheck, build.
- **Skeleton deploy check (throw-away, GAPS A2):** deploy the empty API to Render and the empty frontend to Vercel against a Supabase database, then check: the health route, `prisma migrate deploy`, login through the `/api` proxy with the cookie arriving in Chrome and Safari, and the Supabase Data API locked down (G-B04). This needs **your** Supabase, Render and Vercel accounts. Nothing real goes live, and the results go in GAPS (G-B02, G-B04, G-B05, G-B09).

**Tests.** Unit tests for the api-client error mapping and the formatters.

**Done when.** Every seeded role logs in and lands in its own area. Visiting another role's area is refused. Open awards lists the published cycles.

**Manual check.** Log in as each seeded user, one after another.

---

### Phase 5: Setup screens: leader and PA, department head, staff (Frontend)

**Goal.** Everything from Phase 2 and Phase 3 can be done in the UI, so no code change is needed to create an award.

**Builds.**
- Leader and PA: departments (list, create), appoint or replace a head; people (find a user, add staff to departments, assign staff to awards, resend invite, deactivate or reactivate); create an award in any department; master data (domains, organisation types); organisations (find, correct with a reason).
- Leader only: PA team (invite, remove).
- Department head: department staff (invite or add), assign staff to awards.
- Staff: My awards (all assigned awards, across departments), Create award, and **cycle setup** with these tabs: basics and dates · entry categories · settings (fee, blind, rounds) · **questionnaire builder** · **scoring sheet builder** (running weight totals) · publish (gate errors listed). Also the form versions list and "publish new version" with a change summary.
- Components: `form-builder/`, `scoring-sheet/` (builder mode).

**Done when.** Staff create and publish both demo awards **using the UI only**, and a third award can be configured live in the walkthrough.

**Manual check.** Build all three cycles from scratch in the browser (including the on-site-only one), then check Open awards.

---

### Phase 6: Applications and deadline lock (Backend, rule R4)

**Goal.** The applicant's whole journey up to the deadline, and the lock that ends it.

**Builds.**
- Start an application (logged in, organisation member, category chosen, cycle open). Duplicate flag: a second active application from the same organisation in the same cycle flags both.
- Fee gate: `payFee` (demo) writes a Payment row with a fake reference. The amount is the category's fee if set, otherwise the cycle's.
- An on-site-only cycle with an empty questionnaire can be submitted with just the identity snapshot, the category and the optional team members.
- `saveAnswers`: stored by question key, partial drafts allowed, values checked against the question types.
- File flow through the storage interface: request an upload → upload → confirm. Type and size (10 MB) checks; the disk driver is used locally (G-B03).
- Submit (all required answers and files; takes the identity snapshot). Edit after submit, with a full-validation save (G-D02). Withdraw (with a reason, before the deadline). Reapplying after a withdrawal pays the fee again.
- Staff `resolveDuplicate` (in one transaction, with audit).
- **Deadline lock:** every write compares `clock.now()` with the deadline. Drafts become "Not submitted". The form version is pinned at the lock. The identity snapshot is frozen (G-C07).
- Publishing a new form version sets "Update requested" on submitted applications and sends the "questionnaire updated" email.
- `extendDeadline` (staff; refused once masking has started; email; audit).
- `GET /api/files/:id`: a download that checks access first.
- The applicant-facing status mapping (spec §4 table).
- Emails: submitted, questionnaire updated, deadline extended.

**Tests.** The form stays locked until the fee is paid. A partial draft saves. Submit is refused with a missing required answer. Any write after the deadline gives 409, and an extension reopens editing. Withdraw, then apply again, works. Duplicates are flagged on both applications; withdrawn ones don't count; resolving keeps exactly one and audits it. **R4:** a 2025 application opens with its 2025 version after 2026 dropped questions, and answers carry across versions within a cycle. An applicant gets 404 for another organisation's application. A wrong file type or size is refused. A table-driven test covers the applicant status mapping. After the organisation's name changes, a submitted application still shows the old name in its snapshot.

**Done when.** An applicant can submit end to end through the API to all three cycles (including the near-empty shop-floor form).

---

### Phase 7: Applicant journey (Frontend)

**Goal.** A real applicant can do everything in the browser.

**Builds.** My organisation (create, join, edit) · My applications (with friendly status messages) · start an application (pick a category) · the demo payment screen · **`form-renderer/`**, which renders any FormVersion schema with sections, per-section progress, NEW/UPDATED badges, file upload, autosave (debounced and on section change) · submit · edit after submit · withdraw · the status page.

**Done when.** An applicant submits to all three cycles through the UI. Closing the browser and coming back keeps the draft. A locked application shows as read-only.

---

### Phase 8: Masking, jury pool, conflicts, assignment (Backend, rules R1 and R2)

**Goal.** After the deadline, blind applications reach their jury masked, and conflicted pairs can never meet.

**Builds.**
- **masking** (blind cycles only): the workspace (original next to a pre-filled masked copy), save a masked answer, upload a masked file or mark it "safe as is" (G-C13), mark done (one transaction: status + audit), reopen (only while the evaluation is not submitted; audited). In non-blind cycles an application is ready at lock.
- **jury-pool:** add a member (an existing user or an invite; JURY role scoped to the cycle), remove a member (only with no submitted evaluation), list (conflicts flagged). Staff and department head can both do this.
- **conflicts:** `recordConflict` (applies across all awards; audited). A conflict recorded late revokes an unsubmitted assignment, or flags a submitted one.
- **assignment** (staff only, document rounds): bulk assign. One active evaluation per application per round. The department head of the award's department can't be assigned in a document round (they approve it, G-I01). TEAM_MEMBERS answers are treated as identity in blind rounds (G-I11). Conflicted pairs and disqualified applications are refused. Reassign until submitted (old evaluation REVOKED, G-C06; audited). One "jury assigned" email per action.
- **jury view:** my evaluations; opening one returns `juryView` (masked data only, no identity section, no original files). 404 if it isn't yours, refused if it isn't masked yet.
- The file route: in a blind award, jury get MASKED_EVIDENCE only.

**Tests.** **R1:** no identity value appears anywhere in any jury response (the test scans the JSON for the organisation's name, PAN, GSTIN, email and address); downloading an original file is refused; an unmasked application is refused; staff see both copies; jury in a non-blind award see the originals. **R2:** assigning a conflicted pair is refused even through a direct API call; conflicted jury are left out of the assignable list; a late conflict revokes the unsubmitted assignment and flags the submitted one. A department head trying to assign gets 403. Exactly one jury member per application. A jury member gets 404 on an evaluation that isn't theirs.

**Done when.** A blind application reaches its jury masked, through the API.

---

### Phase 9: Judging, score audit, disqualification (Backend, rule R3)

**Goal.** Jury score, staff correct scores with a reason, and every change is audited.

**Builds.**
- Jury: `saveScores` (draft), question comments, overall note. The first saved score locks the round's scoring sheet. `submitEvaluation` (every indicator plus the note). Jury edits are refused after submit unless the evaluation is in REDO.
- Staff: `editScoreWithReason` (one transaction: score + AuditEvent; refused after approval). `reopenEvaluation` (sent-back round only → REDO).
- Disqualify (staff on any application in the award; jury on applications assigned to them; reason required). Reinstate (staff; reason required; restores the previous state).
- Round progress (submitted / assigned). Totals come from `computeScore`, shown to staff, department head and leader, **never** to jury.
- `GET /api/applications/:id/history` (staff, department head, leader).

**Tests.** **R3:** a change without a reason is refused; the audit row has the old value, new value, actor, time and reason; a failing audit write rolls back the score change (fault injected); a change after approval is refused. Submit is refused with a missing indicator or an empty note. A submitted evaluation refuses jury edits. Disqualify without a reason is refused. Reinstate restores the previous state. Both appear in the history. No jury response contains a total.

**Done when.** A jury member submits, staff correct a score with a reason, and the history shows it.

---

### Phase 10: Staff operations and jury scoring (Frontend)

**Goal.** The screens for Phases 8 and 9.

**Builds.**
- Staff: applications list (filters: status, category, duplicate, masking), application detail (original and masked copies, files, identity snapshot, duplicate resolution, history), masking workspace, jury pool and conflicts (also available to the department head), bulk assignment (conflicted jury hidden), judging progress (edit a score with a reason, reopen), disqualify and reinstate dialogs.
- Jury: My assignments (with counts), and the **scoring screen**: answers and files, indicators with their weights, 0–10 or Yes/No inputs, comments per question, overall note, autosave, submit, disqualify.

**Done when.** In the browser, a blind application is masked, assigned, scored and corrected with a reason.

---

### Phase 11: Approval, results, emails, reporting, full seed (Backend)

**Goal.** Close document review rounds: approval, results with labels, publishing, dashboards, and seed data for the demo.

**Builds.**
- **approval** (document review rounds only): `sendForApproval` (only when every eligible application has a submitted evaluation; G-D08). `approve` (the department head of the award's department; one transaction: round APPROVED + snapshot of totals and ranks, G-C14). `sendBack` (remark required; optional remarks per application; emails staff and the named jury). The leader is refused.
- **results** (shared by both round types): `RoundResult` per application with final score and rank per category (ties share a rank); `setResultLabels` (Shortlisted or Rejected by top N, cut-off or manual; only after scores lock); `publishResults` (labels, emails, audit). Entries with the label that moves on enter the next round. The cycle becomes Results published after its last round.
- **notifications:** all 9 templates; the outbox dispatcher sends in batches; EmailLog statuses.
- **reporting:** `leaderDashboard` (leader and PAs), `departmentDashboard`, `cycleSummary` (statuses derived on read), `paActivity` (leader only, G-H11), and a flag for awards with no active staff (G-H04).
- **Full seed** (spec §15): 2 departments, leader, 1 PA, heads, 2 staff (one on awards in both departments), 4 jury, master data, 3 cycles with different settings (blind document review with a fee; document review then on-site; shop-floor on-site only), about 20 organisations and applications in mixed states, 1 conflict.

**Tests.** Send for approval is refused while an evaluation is missing. Send back without a remark is refused. Approve locks every score (staff and jury edits then give 409). The leader or a PA trying to approve or send back gets 403. Shortlisting before approval is refused. Ties share a rank. Published statuses map correctly (disqualified → Rejected). A department head sees only their own department's dashboard. Every email is logged.

**Done when.** Both document-review cycles run through the API to published Shortlisted / Rejected results (the on-site round follows in Phase 12).

---

### Phase 12: On-site rounds (Backend)

**Goal.** Shop-floor competitions and live round 2 work end to end through the API: slots, panels, independent scoring, averages, closing with no approval, and Gold, Silver and Bronze. See spec §5.16 and ADR 0008.

**Builds.**
- **onsite** module: entries of the round (every eligible submitted application if it's the first round, otherwise those with the label that moves on); `scheduleSlot` and `moveSlot` (only until the entry has scores, G-I07; email; audit); `setPanel` for one or many entries (2 to 5 from the jury pool, conflicts refused per member, the department head allowed); a warning on overlapping slots for a panel member (G-I06); `removePanelMember` with a reason (Revoked, G-I03); `enterScoresOnBehalf` (staff; marks `enteredById`; audited, G-I04); `roundProgress`; `closeRound` (only when every active evaluation is submitted; locks scores; snapshots final averages and ranks into RoundResult).
- **judging** reused for panel members: `saveScores` and `submitEvaluation` against the on-site score sheet. The jury view shows the organisation, team and slot (never blind) and never shows other panel members' scores or the average.
- **results:** `suggestLabels` for on-site rounds (Gold, Silver and Bronze for ranks 1 to 3 of the whole round, one set per award; Participated for the rest; ties flagged, G-I05). Staff adjust, then `publishResults`.
- Disqualify with the reason "did not present" for an entry that doesn't come (G-I12).
- Emails: presentation scheduled or moved; panel assigned (entries and slots).

**Tests.** R2: a conflicted panel member is refused through the API. A panel member gets 404 on another member's evaluation, and no jury response contains another member's scores or the average. The final score equals the hand-calculated average (including a Revoked member). Staff-entered scores carry `enteredById` and an audit event. R3: after submission, a change needs a reason; after closing, every change is refused. Closing with an unsubmitted active evaluation is refused. A slot can't move once scores exist. Only shortlisted entries appear in a following on-site round. Suggested medals go to ranks 1 to 3 of the whole round. A department head on a panel scores like any juror. Approval endpoints refuse on-site rounds.

**Done when.** Through the API: the shop-floor cycle runs from registration to published medals, and the two-round cycle runs from shortlist to medals.

**Manual check.** `Backend/requests/phase-12.http` runs both on-site flows.

---

### Phase 13: Approval, results, on-site rounds, dashboards (Frontend)

**Goal.** Close the cycle in the UI and give leadership its single view.

**Builds.**
- Staff: send for approval, read remarks, resubmit; results (ranked per category; Shortlisted or Rejected by top N, cut-off or manual; suggested Gold, Silver and Bronze for on-site rounds); publish.
- Staff, on-site: schedule and panels (slots, bulk panels, conflicted jury hidden, overlap warnings); progress (per member status, enter scores on a member's behalf, remove an absent member, averages, close the round).
- Jury, on-site: a phone-friendly scoring screen (organisation, team, slot; criteria with weights; overall note; submit).
- Applicant: presentation slot and result label on the status page.
- Department head: approval queue; round review (ranked list, notes, indicator details, disqualified list); approve, or send back with remarks; department dashboard.
- Leader and PA: the dashboard, and a read-only award view with drill-down.
- Leader only: the PA activity view.
- An audit history panel on application pages.

**Done when.** **All three seeded cycles run in the browser with no code change** (document review only; document review then on-site; shop-floor on-site only), which is the brief's success test.

---

### Phase 14: End-to-end tests and deployment (Ops)

**Goal.** Prove the journeys automatically, then deploy. The production checks need **your accounts** (Supabase, Render, Vercel). Claude does not create accounts or enter credentials.

**Builds.**
- Playwright (Chromium), four journeys: staff configure and publish; applicant pays, fills and submits; jury score and staff get approval; an on-site round from panel to published medals.
- **Supabase:** the database (pooled URL for the app, direct URL for migrations, G-B05), the Data API locked down (G-B04), and a private Storage bucket with `originals/` and `masked/` prefixes.
- **Render:** a web service from `Backend/` (build, migrate, start, health check path, env vars) and an email API provider (G-B06).
- **Vercel:** a project from `Front-End/` with `BACKEND_URL` set.
- `docs/DEPLOYMENT.md` runbook, plus a production smoke checklist: each role logs in, a file uploads and downloads, an email arrives, and the cold-start behaviour is acceptable.

**Done when.** Every journey works on the live URLs, and the README links to them.

---

### Phase 15: Final deliverables, self-review, walkthrough (Docs)

**Goal.** Everything the brief asks for on the last day.

**Builds.** A README a stranger can run from a fresh clone in under 10 minutes · `docs/user-journeys.md` (one page, every role) · `docs/architecture.md` (an updated drawing for the split architecture) · `docs/testing.md` (what is checked, what is not) · `docs/ai-notes.md` · every ADR complete · GAPS.md closed or explicitly accepted · a self-review of each module against the exit checklist · a 20-minute walkthrough script · tag `v1.0`.

**Done when.** The walkthrough runs from start to finish without surprises.

---

## 5. If we fall behind: cut order

Cut from the top first (from spec §17, adjusted for two apps):

1. The remaining email templates (keep: invite, questionnaire updated, jury assigned, results published)
2. The department head dashboard (keep the leader dashboard)
3. Leader drill-down screens beyond the dashboard
4. The duplicate resolution **screen** (keep the flag and the API)
5. Jury-side disqualification (keep staff-side)
6. The Playwright journeys shrink to the single most important one (applicant → jury → approval)
7. The organisation-correction and PA activity **screens** (keep the API and the audit records)
8. The master data **screens** (keep the API; the lists come from the seed)
9. On-site slot-overlap warnings and the slot-moved email
10. The on-site Playwright journey (keep its service tests)

**Never cut:** the four rules and their tests, on-site panel scoring with averages, closing and medals, the PA permission boundaries and their tests, the data consistency rules (normalisation and case-insensitive uniqueness), the end-to-end cycle for two differently configured awards, and staff configuring an award with no code change.
