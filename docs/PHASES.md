# Build plan: phases

> **This is the project plan.** The brief says: keep the plan in GitHub, update it when it changes, and say so each time. Every change goes in the **Plan change log** below, and gets a "Plan changed" line in [Daily.md](../Daily.md).
>
> Related files: [PROGRESS.md](PROGRESS.md) (what is done) · [GAPS.md](GAPS.md) (what is missing or undecided) · [requirements.md](requirements.md) (the spec) · [decisions/](decisions/) (why we chose what we chose)

## Plan change log

| Date | Change | Why |
|---|---|---|
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
9. **Deploy nothing** until Phase 13. `main` must stay runnable on a local machine after every merge.

### Phase exit checklist (definition of done)

- [ ] Every "Done when" item of the phase is met
- [ ] Tests added or updated, including any of the four rules this phase touches. `npm test` is green locally
- [ ] Lint and type check are clean (`npm run lint`, `npm run typecheck`)
- [ ] CI is green on the pull request (from Phase 1 onwards)
- [ ] No code branches on a specific award (search `src/` for award names and expect nothing)
- [ ] Every new service function takes the actor first and checks permission and scope
- [ ] Responses are view models, never raw database rows
- [ ] The phase's manual check was run by hand and works
- [ ] PROGRESS.md, GAPS.md, Daily.md and docs/API.md are updated. ADRs are added if a decision was made

---

## 2. Timeline at a glance

The brief gives 10 working days. Days 1–2 went on understanding, questions and design. Today's planning is Phase 0. That leaves **days 3–10 for 14 phases**, about two phases a day. This is tight, so the **cut order** at the end of this file says what gets dropped first.

| # | Track | Phase | Branch | Target day | Status |
|---|---|---|---|---|---|
| 0 | Docs | Planning and tracking setup | `phase/00-planning-docs` | Day 2 | 🚧 In progress |
| 1 | Backend | Backend foundation | `phase/01-be-foundation` | Day 3 | ⬜ Not started |
| 2 | Backend | Identity, departments, organisations | `phase/02-be-identity-orgs` | Day 3 | ⬜ |
| 3 | Backend | Award configuration engine (R4) | `phase/03-be-award-config` | Day 4 | ⬜ |
| 4 | Frontend | Frontend foundation, login, public pages | `phase/04-fe-foundation` | Day 4 | ⬜ |
| 5 | Frontend | Setup screens: leader, department head, staff builders | `phase/05-fe-award-setup` | Day 5 | ⬜ |
| 6 | Backend | Applications and deadline lock (R4) | `phase/06-be-applications` | Day 5 | ⬜ |
| 7 | Frontend | Applicant journey | `phase/07-fe-applicant` | Day 6 | ⬜ |
| 8 | Backend | Masking, jury pool, conflicts, assignment (R1, R2) | `phase/08-be-masking-assignment` | Day 6 | ⬜ |
| 9 | Backend | Judging, score audit, disqualification (R3) | `phase/09-be-judging-audit` | Day 7 | ⬜ |
| 10 | Frontend | Staff operations and jury scoring | `phase/10-fe-masking-judging` | Day 7 | ⬜ |
| 11 | Backend | Approval, results, emails, reporting, full seed | `phase/11-be-approval-results` | Day 8 | ⬜ |
| 12 | Frontend | Approval, results, dashboards | `phase/12-fe-approval-results` | Day 8 | ⬜ |
| 13 | Ops | End-to-end tests and deployment (Supabase, Render, Vercel) | `phase/13-e2e-deploy` | Day 9 | ⬜ |
| 14 | Docs | Final deliverables, self-review, walkthrough | `phase/14-final-review` | Day 10 | ⬜ |

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
│  ├─ architecture/           architecture PDF, plus the updated drawing (Phase 14)
│  ├─ user-journeys.md        (Phase 14)
│  ├─ testing.md              what the tests check and what they don't (Phase 14)
│  ├─ ai-notes.md             where AI output looked right but was wrong (started when it first happens)
│  └─ DEPLOYMENT.md           runbook for Supabase, Render and Vercel (Phase 13)
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
│  │  ├─ lib/                 db, clock, errors, logger, ids, storage/, mailer/, auth/
│  │  ├─ middleware/          actor (session → actor), error-handler, validate, rate-limit
│  │  └─ modules/<module>/    routes.ts · service.ts · access.ts · schemas.ts · views.ts · *.test.ts
│  │       modules: identity, departments, organisations, awards, forms, scoring,
│  │                applications, masking, jury-pool, judging, approval, results,
│  │                reporting, audit, notifications
│  └─ tests/                  helpers (test DB reset, factories, clock), integration suites
└─ Front-End/                 Next.js + TypeScript UI, deployed to Vercel
   ├─ next.config.ts          rewrites /api/* to the backend (same-origin cookies)
   ├─ src/
   │  ├─ middleware.ts        coarse gate: logged in or not (never decides permissions)
   │  ├─ app/                 (public) · applicant · staff · jury · dept · leader · auth pages
   │  ├─ components/          ui/ (shadcn) · form-renderer/ · form-builder/ · scoring-sheet/ · layout/
   │  ├─ features/<area>/     API hooks and feature components per area
   │  └─ lib/                 api-client, auth (current user), format (₹ from paise, IST), query client
   └─ tests/e2e/              Playwright journeys (Phase 13)
```

**How the backend is layered** (spec §11, adapted to Express): `routes.ts` parses input with Zod, takes the actor from `req`, calls **one** service function, and returns its view model. `service.ts` checks access through `access.ts`, applies the rule, runs the transaction and writes the audit event. Routes never touch Prisma.

---

## 4. Phase details

Each phase lists its goal, what it builds, the tests that must pass, what "done" means, and a manual check you can run by hand.

### Phase 0: Planning and tracking setup (Docs)

**Goal.** Put the brief, the spec, the plan and the tracking files in the repo, so anyone (or any new AI session) can pick up the work from the repo alone.

**Builds.** `docs/brief.md`, `docs/requirements.md`, the architecture PDF, `docs/PHASES.md`, `docs/PROGRESS.md`, `docs/GAPS.md`, `docs/decisions/` (ADRs 0001–0004 and the index), `CLAUDE.md`, the PR template, `.gitignore`, updated READMEs, and today's Daily.md entry.

**Done when.** These files are on `main` and the open decisions in GAPS.md §A have been answered, or knowingly left on their defaults.

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
- The **full Prisma schema** from spec §10, plus the fixes for gaps G-C05, C06, C07, C08, C11 and C13 (AuthToken; a REVOKED evaluation status; identity snapshot; letter status; partial unique indexes; "safe as is" files).
- A raw SQL migration with triggers that refuse UPDATE and DELETE on `AuditEvent` and `FormVersion`, and a partial unique index on the LEADER role.
- The `audit` module: `record(tx, event)`, which always runs inside the caller's transaction.
- The `notifications` module: `send()` writes a PENDING `EmailLog` row in the caller's transaction, and a dispatcher sends it after commit (outbox, G-C03).
- `GET /api/health`, which pings the database.
- `tests/` helpers: reset the test database between suites, data factories and clock control.
- `.github/workflows/backend-ci.yml`: install, lint, typecheck, `prisma migrate deploy` against a Postgres service container, then Vitest.
- The first version of `docs/API.md`.

**Tests.** The app refuses to start when an env variable is missing. Each typed error maps to the right status and JSON shape. The clock can be moved. The AuditEvent and FormVersion triggers reject UPDATE and DELETE on the real database. A second LEADER is refused by the database. A duplicate PAN is refused by the database. Health returns 200.

**Done when.** On a fresh clone, `docker compose up -d && npm ci && npm run db:migrate && npm test` passes, and CI is green.

**Manual check.** `npm run dev`, then `curl localhost:4000/api/health` returns `{ "status": "ok", "db": "up" }`.

---

### Phase 2: Identity, departments, organisations (Backend)

**Goal.** People can log in, roles have scopes, the leader → department head → staff hierarchy works, and applicants have organisations.

**Builds.**
- **identity:** register (applicants), login and logout (bcrypt; a signed session token in an httpOnly cookie, [ADR 0003](decisions/0003-authentication-and-sessions.md)), `GET /api/auth/me`, invites (AuthToken, hashed, single use, expiring), accept invite, forgot password and reset password, and rate limits on login and reset.
- The actor middleware loads the user and every scoped role on each request. Access helpers: `requireLeader`, `requireDeptHead(deptId)`, `requireDeptStaff(deptId)`, `requireStaffOfAward`, `requireStaffOfCycle`, `requireJuryOfCycle`, `requireOrgMember`.
- **departments:** create a department and appoint its head (leader); add staff to a department (department head); list departments.
- **organisations:** create (with PAN and GSTIN checks), join (needs both PAN and GSTIN), list mine, edit profile; a privacy-safe view.
- Email templates: account invite, password reset.
- Seed: the leader (credentials from env), 2 departments with heads, 2 staff, 4 jury users.

**Tests.** PAN and GSTIN validators (unit). Login with a wrong password returns 401. The password hash never appears in any response. Invite and reset tokens are single use and expire. Only the leader can create departments (everyone else gets 403). A department head can add staff only to their own department. Joining an organisation needs both PAN and GSTIN. An applicant asking for another organisation gets 404. A jury user calling a staff endpoint gets 403. The leader is refused on every other write.

**Done when.** Every seeded user can log in and `/me` returns their scoped roles. Invite → set password → login works, and the invite email shows in Mailpit.

**Manual check.** A requests file (`Backend/requests/phase-02.http`) walks the leader → head → staff → applicant flow.

---

### Phase 3: Award configuration engine (Backend, rule R4)

**Goal.** Staff can fully configure and publish an award cycle through the API, with immutable form versions and validated scoring sheets. This is the heart of "an award is data, not code".

**Builds.**
- **awards:** create an award (department staff; the creator becomes award staff), list, get; the department head assigns staff to or removes staff from an award.
- **cycles:** create (label unique per award); update settings (dates, fee in paise, blind judging, entry categories, rounds including a planned LIVE round); the publish gate (spec §5.3); fee and blind judging frozen after publish; status derived from the clock (G-C04).
- **forms:** a draft editor (Zod questionnaire schema; the server generates keys). Publishing a version is an insert only, with a change summary and a NEW/UPDATED/UNCHANGED diff. Within a cycle, nothing can be removed and no question type can change; options can only be added. Also: get a version, list versions, compare two versions.
- **scoring:** a scoring sheet per round; `validateWeights` (100 at every level, and every indicator points to a real question); `computeScore` as a pure function.
- **public:** the Open awards list and cycle details (published, and `opensAt ≤ now < deadline`).
- Audit: form version published.

**Tests.** **R4:** editing a published version is refused (by the service and the DB trigger); removing a question or section inside a cycle is refused; changing a type is refused; removing an option is refused; keys are never reused; the diff marks NEW and UPDATED correctly. Weights that don't add up to 100 are refused. The formula matches the worked example (27.2), Yes/No indicators and rounding to 2 decimals. Each publish-gate failure gives a clear 409. Changing the fee or blind setting after publish gives 409. Staff of another award get 403. Open awards hides drafts and cycles past their deadline.

**Done when.** Two cycles with clearly different settings (blind + fee + 3 sections, and non-blind + free + several categories) can be configured and published through the API alone.

**Manual check.** `Backend/requests/phase-03.http` builds and publishes both awards.

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

**Tests.** Unit tests for the api-client error mapping and the formatters.

**Done when.** Every seeded role logs in and lands in its own area. Visiting another role's area is refused. Open awards lists the published cycles.

**Manual check.** Log in as each seeded user, one after another.

---

### Phase 5: Setup screens: leader, department head, staff (Frontend)

**Goal.** Everything from Phase 2 and Phase 3 can be done in the UI, so no code change is needed to create an award.

**Builds.**
- Leader: departments (list, create), appoint a head.
- Department head: department staff (invite or add), assign staff to awards.
- Staff: My awards, Create award, and **cycle setup** with these tabs: basics and dates · entry categories · settings (fee, blind, rounds) · **questionnaire builder** · **scoring sheet builder** (running weight totals) · publish (gate errors listed). Also the form versions list and "publish new version" with a change summary.
- Components: `form-builder/`, `scoring-sheet/` (builder mode).

**Done when.** Staff create and publish both demo awards **using the UI only**, and a third award can be configured live in the walkthrough.

**Manual check.** Build both awards from scratch in the browser, then check Open awards.

---

### Phase 6: Applications and deadline lock (Backend, rule R4)

**Goal.** The applicant's whole journey up to the deadline, and the lock that ends it.

**Builds.**
- Start an application (logged in, organisation member, category chosen, cycle open). Duplicate flag: a second active application from the same organisation in the same cycle flags both.
- Fee gate: `payFee` (demo) writes a Payment row with a fake reference.
- `saveAnswers`: stored by question key, partial drafts allowed, values checked against the question types.
- File flow through the storage interface: request an upload → upload → confirm. Type and size (10 MB) checks; the disk driver is used locally (G-B03).
- Authorisation letter: a generated template (format decision G-C09) and the AUTH_LETTER upload. Staff `verifyAuthLetter` (G-C08).
- Submit (all required answers plus the letter). Edit after submit, with a full-validation save (G-D02). Withdraw (with a reason, before the deadline). Reapplying after a withdrawal pays the fee again.
- Staff `resolveDuplicate` (in one transaction, with audit).
- **Deadline lock:** every write compares `clock.now()` with the deadline. Drafts become "Not submitted". The form version is pinned at the lock. The identity snapshot is frozen (G-C07).
- Publishing a new form version sets "Update requested" on submitted applications and sends the "questionnaire updated" email.
- `extendDeadline` (staff; refused once masking has started; email; audit).
- `GET /api/files/:id`: a download that checks access first.
- The applicant-facing status mapping (spec §4 table).
- Emails: submitted, questionnaire updated, deadline extended.

**Tests.** The form stays locked until the fee is paid. A partial draft saves. Submit is refused with a missing required answer or a missing letter. Any write after the deadline gives 409, and an extension reopens editing. Withdraw, then apply again, works. Duplicates are flagged on both applications; withdrawn ones don't count; resolving keeps exactly one and audits it. **R4:** a 2025 application opens with its 2025 version after 2026 dropped questions, and answers carry across versions within a cycle. An applicant gets 404 for another organisation's application. A wrong file type or size is refused. A table-driven test covers the applicant status mapping.

**Done when.** An applicant can submit end to end through the API for both awards.

---

### Phase 7: Applicant journey (Frontend)

**Goal.** A real applicant can do everything in the browser.

**Builds.** My organisation (create, join, edit) · My applications (with friendly status messages) · start an application (pick a category) · the demo payment screen · **`form-renderer/`**, which renders any FormVersion schema with sections, per-section progress, NEW/UPDATED badges, file upload, autosave (debounced and on section change), letter download and upload · submit · edit after submit · withdraw · the status page.

**Done when.** An applicant submits to both awards through the UI. Closing the browser and coming back keeps the draft. A locked application shows as read-only.

---

### Phase 8: Masking, jury pool, conflicts, assignment (Backend, rules R1 and R2)

**Goal.** After the deadline, blind applications reach their jury masked, and conflicted pairs can never meet.

**Builds.**
- **masking** (blind cycles only): the workspace (original next to a pre-filled masked copy), save a masked answer, upload a masked file or mark it "safe as is" (G-C13), mark done (one transaction: status + audit), reopen (only while the evaluation is not submitted; audited). In non-blind cycles an application is ready at lock.
- **jury-pool:** add a member (an existing user or an invite; JURY role scoped to the cycle), remove a member (only with no submitted evaluation), list (conflicts flagged). Staff and department head can both do this.
- **conflicts:** `recordConflict` (applies across all awards; audited). A conflict recorded late revokes an unsubmitted assignment, or flags a submitted one.
- **assignment** (staff only): bulk assign. One active evaluation per application per round. Conflicted pairs and disqualified applications are refused. Reassign until submitted (old evaluation REVOKED, G-C06; audited). One "jury assigned" email per action.
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
- Staff: applications list (filters: status, category, duplicate, masking), application detail (original and masked copies, files, letter verification, duplicate resolution, history), masking workspace, jury pool and conflicts (also available to the department head), bulk assignment (conflicted jury hidden), judging progress (edit a score with a reason, reopen), disqualify and reinstate dialogs.
- Jury: My assignments (with counts), and the **scoring screen**: answers and files, indicators with their weights, 0–10 or Yes/No inputs, comments per question, overall note, autosave, submit, disqualify.

**Done when.** In the browser, a blind application is masked, assigned, scored and corrected with a reason.

---

### Phase 11: Approval, results, emails, reporting, full seed (Backend)

**Goal.** Close the cycle: approval, shortlist, published results, dashboards, and seed data for the demo.

**Builds.**
- **approval:** `sendForApproval` (only when every eligible application has a submitted evaluation; G-D08). `approve` (the department head of the award's department; one transaction: round APPROVED + snapshot of totals and ranks, G-C14). `sendBack` (remark required; optional remarks per application; emails staff and the named jury). The leader is refused.
- **results:** a ranked list per category (ties share a rank), shortlist (top N, cut-off or manual; only after approval), `publishResults` (statuses, emails, audit, cycle → Results published).
- **notifications:** all 9 templates; the outbox dispatcher sends in batches; EmailLog statuses.
- **reporting:** `leaderDashboard`, `departmentDashboard`, `cycleSummary` (statuses derived on read).
- **Full seed** (spec §15): 2 departments, leader, heads, 2 staff, 4 jury, 2 awards with different settings, about 20 organisations and applications in mixed states, 1 conflict.

**Tests.** Send for approval is refused while an evaluation is missing. Send back without a remark is refused. Approve locks every score (staff and jury edits then give 409). The leader trying to approve or send back gets 403. Shortlisting before approval is refused. Ties share a rank. Published statuses map correctly (disqualified → Rejected). A department head sees only their own department's dashboard. Every email is logged.

**Done when.** A full cycle runs through the API for both awards.

---

### Phase 12: Approval, results, dashboards (Frontend)

**Goal.** Close the cycle in the UI and give leadership its single view.

**Builds.**
- Staff: send for approval, read remarks, resubmit; shortlist and results (ranked per category, top N, cut-off or manual); publish.
- Department head: approval queue; round review (ranked list, notes, indicator details, disqualified list); approve, or send back with remarks; department dashboard.
- Leader: the dashboard, and a read-only award view with drill-down.
- An audit history panel on application pages.

**Done when.** **One full cycle runs in the browser for both awards with no code change**, which is the brief's success test.

---

### Phase 13: End-to-end tests and deployment (Ops)

**Goal.** Prove the journeys automatically, then deploy. The production checks need **your accounts** (Supabase, Render, Vercel). Claude does not create accounts or enter credentials.

**Builds.**
- Playwright (Chromium), three journeys: staff configure and publish; applicant pays, fills and submits; jury score and staff get approval.
- **Supabase:** the database (pooled URL for the app, direct URL for migrations, G-B05), the Data API locked down (G-B04), and a private Storage bucket with `originals/` and `masked/` prefixes.
- **Render:** a web service from `Backend/` (build, migrate, start, health check path, env vars) and an email API provider (G-B06).
- **Vercel:** a project from `Front-End/` with `BACKEND_URL` set.
- `docs/DEPLOYMENT.md` runbook, plus a production smoke checklist: each role logs in, a file uploads and downloads, an email arrives, and the cold-start behaviour is acceptable.

**Done when.** Every journey works on the live URLs, and the README links to them.

---

### Phase 14: Final deliverables, self-review, walkthrough (Docs)

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

**Never cut:** the four rules and their tests, the end-to-end cycle for two differently configured awards, and staff configuring an award with no code change.
