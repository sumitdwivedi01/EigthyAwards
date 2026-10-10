# Build plan: phases and steps (detailed)

> **The simple version for the lead is [PLAN.md](PLAN.md).** This file is the detailed working plan: the steps of Phase 1 day by day, with what each builds and tests. **This is the project plan.** The brief says: keep the plan in GitHub, update it when it changes, and say so each time. Every change goes in the **Plan change log** below, and gets a "Plan changed" line in [Daily.md](../Daily.md).
>
> Related files: [PROGRESS.md](PROGRESS.md) (what is done) · [GAPS.md](GAPS.md) (what is missing or undecided) · [requirements.md](requirements.md) (the spec) · [decisions/](decisions/) (why we chose what we chose)

## Plan change log

| Date | Change | Why |
|---|---|---|
| 2026-10-10 (Day 8, evening) | **A `staging` branch** (Phase 0.10, ADR 0015). Each step's branch is cut from `staging` and merged into it; the step is tested on `staging` (CI and its manual check), then `staging` is merged into `main` (production) and the step is tagged there. From Step 1.5 there are two online environments, staging and production. Also decided: Phase 1 jury accounts come only from the seed (G-K19), and uploads use signed links as ADR 0003 says (G-B03). No change to scope or dates; about 15 minutes more per step, and more setup on 14 Oct (G-K18). | Owner, 10 Oct: test each step before it reaches production |
| 2026-10-10 (Day 8) | **Phase 1 trimmed to fit the dates.** The full Phase 1 came to about 100 hours against about 64 available. Moved to Phase 2: send back and reopen, masking of files, version comparison and New/Updated markers, editing after submit and withdraw, the release screen, the full scoring-sheet builder and three question types, the brand-kit screen and image uploads, inviting jury by email, the status timeline, edge-case tests. Kept at the owner's request: the leader dashboard screen and masking of answers. Phase 1 is now about 71 hours; Thursday morning is a buffer and the walkthrough is Thursday afternoon. Phase 2 grows to about 24 days. | Owner, 10 Oct |
| 2026-10-09 (Day 7, late) | **Docs refined** (Phase 0.9): the Backend and Front-End READMEs rewritten for the three-phase plan (status, what each step builds, how to run); wording tightened across the lead-facing docs. No change to scope or dates. | Owner: keep the docs clear and current |
| 2026-10-09 (Day 7, night) | **No PA role** (owner): the leader's team works from the leader's account (ADR 0014). Removed from the seed (1.1), the leader dashboard (1.4) and package 2.3 (no PA team or PA activity screens). | Simpler; fewer roles, flows and tests |
| 2026-10-09 (Day 7, evening) | **Three-phase plan** (Phase 0.8). Phase 1 = the working platform judged by the lead: **build Sat 10 – Tue 13 Oct, deploy Wed 14, walkthrough Thu 15**, in five steps (1.1 foundation and people, 1.2 award setup and branded pages, 1.3 applying and proof check, 1.4 judging and results, 1.5 online and polished). Two written-review awards. Phase 2 (~20 days: on-site rounds, full site builder, admin screens, emails, end-to-end tests) and Phase 3 (~15 days + client testing: security, privacy, load, payments, domains). The old 15-phase list is mapped in §7. The simple version is [PLAN.md](PLAN.md); the data model and architecture are in [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md). | Lead, 9 Oct: three phases, Phase 1 a fully working demo, technical design before coding; owner: wrap up by 13 Oct including Sunday |
| 2026-10-09 (Day 7) | **Lead call.** Points changed **inside the phase descriptions only** (Phase 0.7, docs only): the ID and LinkedIn once on the profile and a recent employment proof per application (Phases 1, 2, 7, 8, 9, 10); My profile with change password (Phases 2, 5); several jury per application in document rounds with the average (Phases 1, 3, 9, 10, 11, 13). The lead asked for a re-plan in **three phases** (Phase 1 a fully working demo) with the data model agreed before coding: that re-plan comes next, so the phase list and days are **not** changed yet. | Lead call, 9 Oct; ADR 0012, 0013 |
| 2026-10-08 (Day 6, later) | **One application per organisation, blocked at the start** (Phase 0.6, docs only): Phases 1, 7, 9/10 and the cut order updated. Build plan still on hold for the lead's choice. | Owner: stop a second application before anyone fills it; ADR 0011 |
| 2026-10-08 (Day 6) | **Hard limit: 15 October.** The 15-phase plan (to Day 21) can't fit, so the build plan is **on hold** until the lead chooses between [Option A, a focused demo by 15 Oct, and Option B, the real product (10–14 weeks)](proposals/0.5-replan-options.md). Phase 0.5 delivered the UI overview (clickable prototype + flow diagrams) the client asked for before any building. The phase list below is kept as the full-product breakdown (Option B). | Owner: deadline no later than 15 Oct; a big demo isn't efficient |
| 2026-10-07 (Day 5, later) | **Owner's answers (GAPS §J).** The deadline can move, so the plan is **extended, not cut**: one build phase per working day, Days 7 to 21, to be agreed with the reviewer on the 9 Oct call. Award sites for all awards (new Phase 4); proof documents and the entry limit in Phases 7 and 8; the skeleton deploy check moves to the end of Phase 5; the 6 Oct decisions brought over from the parked branch. Phase descriptions rewritten in the new numbering. | Owner's answers; ADR 0009, 0010 |
| 2026-10-07 (Day 5) | **New issues: branded award sites, organisers running their own awards, membership verification, entry limits, own domains, and showing the UI before building.** Added Phase 0.4 (analysis) and Phase 0.5 (UI flow and wireframes, for the lead call on 9 Oct). Draft build list: a new **Phase 4 (award sites)**, old Phases 8 and 9 merged, the frontend phases shifted by one. **Simpler branch names** (number plus one word). Target days on hold until the 9 Oct call agrees a smaller first release. Phase 1 code stays parked (tag `parked/phase-01-be-foundation`). | [docs/proposals/0.4-new-issues.md](proposals/0.4-new-issues.md) |
| 2026-10-06 (Day 4) | **Answers on shop-floor and open questions.** Added Phase 0.2 (docs only) and a new **Phase 12: on-site rounds (backend)**. The old Phases 12, 13 and 14 become 13, 14 and 15. Phases 1, 2, 3, 6, 8 and 11 updated (round types and result labels, an optional questionnaire, standalone on-site criteria, category fees, optional GSTIN, team members, three seeded cycles). Phase 13 gains the on-site screens. Days re-planned from Day 4, and the cut order extended. | Shop-floor competitions are judged on site by a panel; a live round with no approval; Gold/Silver/Bronze; one real application per organisation. ADR 0008. |
| 2026-10-05 (Day 3) | **Leader call.** Added Phase 0.1 (docs only). Phase 1 schema: PA role, master data tables, case-insensitive unique indexes, identity snapshot; authorisation letter removed. Phase 2 grows: PA invites and removal, account deactivation, master-data module, organisation normalisation and audited corrections. Phase 3: awards also created by the leader or a PA; staff on many awards. Phases 5, 6, 7, 10, 11 and 12 updated to match. Phase 2 moves to Day 4, and Phases 12 and 13 now share Day 9. Two items added to the cut order. | Leader call: staff on many awards, award to the organisation, no signed letter, a Leader's PA role, data consistency as the main goal. ADRs 0005, 0006, 0007. |
| 2026-10-04 (Day 2) | First version: 15 phases (0–14). Backend and frontend are separate apps, built in alternating phases with the backend first. | The spec planned one Next.js app on Vercel. We are hosting the frontend on Vercel, the backend on Render and the database on Supabase, so it splits into two apps. See [ADR 0001](decisions/0001-frontend-backend-split-and-hosting.md). |

---

## 1. How every step is run

The plan has **three phases** ([PLAN.md](PLAN.md)). Phase 1 is built in **five steps, one per day**. Each step goes through the same routine, and a step is either **done** (every part below) or **not done**.

1. **Branch** from an up-to-date `staging` (ADR 0015): `git checkout staging && git pull && git checkout -b phase-1.<n>-<word>` (for example `phase-1.2-setup`).
2. **Backend first, then its screens, in the same step.** The service and its tests are finished before the screen that uses it.
3. **Write the tests with the feature.** Rule tests (R1–R4) come straight from the wording of the rule, not from the code.
4. **Commit in small steps** with Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
5. **Run the step's exit checklist** (below).
6. **Update tracking:** [PROGRESS.md](PROGRESS.md), [GAPS.md](GAPS.md), [Daily.md](../Daily.md), `docs/API.md`, and an ADR if a decision was made.
7. **Open a pull request into `staging`**, wait for green CI, read the diff line by line, and merge with a merge commit.
8. **Test on `staging`:** CI runs on the `staging` push, and the step's manual check is run again on the `staging` branch (on a laptop until 14 Oct, on the staging site after).
9. **Open a pull request `staging` → `main`** (production), wait for green CI, merge with a merge commit, and tag `main`: `git tag phase-1.<n>-done && git push origin phase-1.<n>-done`. When Phase 1 is complete, tag `phase-1-done`.
10. **Deploy only in Step 1.5** (14 Oct): `staging` → the staging site, `main` → production. Both branches must run on a laptop after every merge.

### Step exit checklist (definition of done)

- [ ] Every "Done when" item of the step is met
- [ ] Tests added or updated, including any of the four rules the step touches; `npm test` green in `Backend/` (and in `Front-End/` when it has tests)
- [ ] Lint and type check clean in both apps
- [ ] CI green on the pull request
- [ ] No code branches on a specific award (search `src/` for award names and expect nothing)
- [ ] Every new service function takes the actor first and checks permission and scope
- [ ] Responses are view models, never raw database rows
- [ ] Every write of shared data goes through `lib/normalize.ts`; new uniqueness rules have a case-insensitive database index
- [ ] The step's manual check was run by hand and works (before the pull request into `staging`, and again on `staging` before the one into `main`)
- [ ] PROGRESS, GAPS, Daily and `docs/API.md` updated

---

## 2. Timeline at a glance

**Docs phases** (understanding, client answers, design: Days 1–8)

| # | Phase | Branch | Day | Status |
|---|---|---|---|---|
| 0 | Planning and tracking setup | `phase/00-planning-docs` | 2 | ✅ Merged (`phase-00-done`) |
| 0.1 | Leader-call changes: PA role, data consistency, no letter | `phase/00.1-leader-call-changes` | 3 | ✅ Merged (`phase-00.1-done`) |
| 0.2 | On-site rounds and answers to the open questions | `phase/00.2-onsite-rounds-and-answers` | 4 | ✅ Merged (`phase-00.2-done`) |
| 0.3 | Plain-language overview with diagrams | `phase/00.3-overview-page` | 5 | ✅ Merged (`phase-00.3-done`) |
| 0.4 | New issues: branding, organisers, verification, entry limits, domains | `phase-0.4-issues` | 5 | ✅ Merged (`phase-0.4-done`) |
| 0.5 | UI overview: clickable prototype, flows per role, re-plan options | `phase-0.5-ui` | 6 | ✅ Merged (`phase-0.5-done`) |
| 0.6 | One application per organisation, blocked at the start | `phase-0.6-entry` | 6 | ✅ Merged (`phase-0.6-done`) |
| 0.7 | Lead call: proof once on the profile, My profile, several jury per application | `phase-0.7-lead` | 7 | ✅ Merged (`phase-0.7-done`) |
| 0.8 | Three-phase plan and technical design; PA role removed | `phase-0.8-plan` | 7 | ✅ Merged (`phase-0.8-done`) |
| 0.9 | Docs refined: app READMEs, wording, status; Phase 1 fitted to the dates | `phase-0.9-docs` | 7–8 | ✅ Merged (sumitdwivedi01/EigthyAwards#9) |
| 0.10 | A `staging` branch between the step branches and `main` (ADR 0015) | `phase-0.10-staging` | 8 | ✅ Merged (`phase-0.10-done`) |

**Phase 1: working platform** (the dates are fixed; the build is 10–13 Oct, deployment 14 Oct, demo 15 Oct)

| Step | Date | Work | Branch | Status |
|---|---|---|---|---|
| 1.1 | **Sat 10 Oct** | Foundation and people | `phase-1.1-foundation` | 🧪 Built; pull request next |
| 1.2 | **Sun 11 Oct** | Award setup and branded pages | `phase-1.2-setup` | ⬜ |
| 1.3 | **Mon 12 Oct** | Applying and proof check | `phase-1.3-apply` | ⬜ |
| 1.4 | **Tue 13 Oct** | Judging, approval and results | `phase-1.4-judging` | ⬜ |
| 1.5 | **Wed 14 Oct** | Online and polished | `phase-1.5-deploy` | ⬜ |
| — | **Thu 15 Oct** | Morning: buffer. Afternoon: walkthrough with the lead; tag `phase-1-done` | — | ⬜ |

**Phase 2: complete product** (about 24 working days) and **Phase 3: launch-ready** (about 15 working days plus client testing): see [§5](#5-phase-2-complete-product-about-24-working-days) and [§6](#6-phase-3-launch-ready-about-15-working-days--client-testing).

Status key: ⬜ not started · 🚧 in progress · 🧪 testing or in review · ✅ merged · ⛔ blocked. Live status: [PROGRESS.md](PROGRESS.md).

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
│  ├─ PLAN.md                 the three phases in plain words (for the lead)
│  ├─ PHASE-1-ROADMAP.md      Phase 1 day by day, how it's checked, the walkthrough
│  ├─ PHASES.md               this plan, in detail
│  ├─ TECHNICAL-DESIGN.md     architecture, data model, flows, API, scaling
│  ├─ PROGRESS.md             what is achieved; start here in a new session
│  ├─ GAPS.md                 gaps, open questions, risks
│  ├─ API.md                  endpoint contract between frontend and backend (from Step 1.1)
│  ├─ decisions/              one ADR per decision
│  ├─ overview/               the plan in plain language with diagrams (README.md, platform-flow.html)
│  ├─ user-journeys.md        (Step 1.5)
│  ├─ testing.md              what the tests check and what they don't (Step 1.5)
│  ├─ ai-notes.md             where AI output looked right but was wrong (started when it first happens)
│  ├─ walkthrough.md          the 20-minute demo script (Step 1.5)
│  └─ DEPLOYMENT.md           runbook for Supabase, Render and Vercel (Step 1.5)
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
│  │       modules (18): identity, departments, master-data, organisations, awards, forms,
│  │                scoring, sites, applications, masking, jury-pool, judging, onsite,
│  │                approval, results, reporting, audit, notifications
│  └─ tests/                  helpers (test DB reset, factories, clock), integration suites
└─ Front-End/                 Next.js + TypeScript UI, deployed to Vercel
   ├─ next.config.ts          rewrites /api/* to the backend (same-origin cookies)
   ├─ src/
   │  ├─ proxy.ts             coarse gate: logged in or not (never decides permissions); Next.js 16's name for middleware
   │  ├─ app/                 (public) · applicant · staff · jury · dept · leader · auth pages
   │  ├─ components/          ui/ (shadcn) · form-renderer/ · form-builder/ · scoring-sheet/ · layout/
   │  ├─ features/<area>/     API hooks and feature components per area
   │  └─ lib/                 api-client, auth (current user), format (₹ from paise, IST), query client
   └─ tests/e2e/              Playwright journeys (Phase 2, package 2.8)
```

**How the backend is layered** (spec §11, adapted to Express): `routes.ts` parses input with Zod, takes the actor from `req`, calls **one** service function, and returns its view model. `service.ts` checks access through `access.ts`, applies the rule, runs the transaction and writes the audit event. Routes never touch Prisma.


---

## 4. Phase 1 steps in detail

The two demo awards (see [PLAN.md](PLAN.md#the-two-awards-in-the-demo)):

- **A. Safety Excellence 2026:** blind, ₹10,000 fee, 1 category, 2–3 jury per application, 3 sections of text answers (no uploads: file masking is in Phase 2).
- **B. FPO Excellence 2026:** not blind, free, 4 categories, 1 jury per application, entry limit 500, 2 sections with evidence uploads.

The items moved out of Phase 1 on 10 Oct are listed in [PLAN.md](PLAN.md#moved-to-phase-2-to-fit-the-dates). Estimated hours per step: 1.1 ≈ 15 h · 1.2 ≈ 13 h · 1.3 ≈ 14 h · 1.4 ≈ 17 h · 1.5 ≈ 12 h (about 71 h).

Both use one written (document review) round. On-site rounds wait for Phase 2, but their tables already exist.

### Step 1.1: Foundation and people · Sat 10 Oct · `phase-1.1-foundation`

**Goal.** A running backend with the complete, up-to-date data model; people can log in with their scoped roles, manage their profile, and create or join their company. A web app that logs them in.

**Backend**
- Bring the parked Phase 1 code onto this branch: only `Backend/`, its CI (now also run on pushes to `staging`), `docs/API.md` and `docs/ai-notes.md`, plus the old branch's `.gitattributes` and its two `.gitignore` lines (the generated Prisma client, the test storage). Add **one new migration** with every change in [proposals/0.7-backend-changes.md](proposals/0.7-backend-changes.md) (B1–B4): site tables, proof fields, `maxEntries`, `RELEASED` and the one-per-organisation index, profile proof fields, `juryMin`/`juryMax`, and active-evaluation uniqueness.
- **identity:** register (applicants), login and logout (bcrypt; a signed session cookie, ADR 0003; a rate limit on login), `GET /me` with every scoped role, and the access helpers (`requireLeader`, `requireDeptHead`, `requireStaffOfAward`, `requireJuryOfCycle`, `requireOrgMember`…).
- **My profile:** edit name and phone; `changePassword` (needs the current one; raises `sessionVersion`; "password changed" email to the outbox; audited without the password); for applicants, the identity document (private storage through a signed upload link, G-B03; consent) and the LinkedIn link.
- **organisations:** create (normalised; PAN and GSTIN checks; a warning when the GSTIN state differs), join (PAN + GSTIN, or PAN + official email), list mine, edit (audited).
- **Storage and responses:** the storage interface issues short-lived signed upload and download links after the API's access check (G-B03): the disk driver behind an API route locally, Supabase Storage from Step 1.5. Every API response sends `Cache-Control: no-store` unless it is a public award page (G-B16).
- **Seed:** the leader (the account the leader's team also uses; no PA role, ADR 0014); 2 departments (one an external organiser, "FPO Awards team") with their heads; 3 staff (one in both departments); 6 jury (in Phase 1 jury accounts come only from the seed, with no role until they are added to a cycle's pool in Step 1.4; G-K19); the master lists; demo applicant accounts. Passwords come from the environment, never from the repo.

**Frontend**
- A Next.js app (App Router, strict TypeScript, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod). `/api/*` is rewritten to the backend; an API client maps 400/401/403/404/409 to messages; ₹ and India-time formatters.
- Pages: login, register, a home page per role (redirect after login), **My profile** (details, change password, and the proof tab for applicants), **My organisation** (create or join).
- `frontend-ci.yml`: lint, type check, build, on pull requests and on pushes to `main` and `staging`.

**Tests:** the database-rule tests from the change list (B1.5, B2.4, B3.5, B4.4) · a wrong password gives 401 · the password hash is never in a response · a password change needs the current password and ends other sessions · `abcde 1234f` joins the existing `ABCDE1234F` · a GSTIN without the PAN is refused · joining needs the PAN and GSTIN (or the official email) · an applicant gets 404 for another company · a jury user gets 403 on a staff endpoint.

**Done when:** every seeded role logs in and lands in its own area (jury from Step 1.4, once they are in a cycle's pool); an applicant creates or joins a company and adds their ID and LinkedIn link; CI is green.

**Manual check:** log in as each seeded role; change a password and see the other browser signed out.

---

### Step 1.2: Award setup and branded pages · Sun 11 Oct · `phase-1.2-setup`

**Goal.** Staff configure and publish an award entirely on screen. This is the heart of "an award is data, not code" (rule R4).

**Backend**
- **awards:** create in the staff member's own department (the domain from the master list; the name unique ignoring case); the creator becomes award staff; "my awards" across departments.
- **cycles:** dates, fee, category fees, blind judging, entry categories, an optional entry limit, one written round with its **jury per application** (`juryMin`–`juryMax`) and result labels (Shortlisted / Rejected, renamable); the publish gate; fee and blind frozen after publishing; status worked out from the clock.
- **forms:** a draft editor (the server makes the keys); question types short text, long text, number, single choice, yes/no and file upload; publishing inserts an immutable version with a change summary; inside a cycle nothing can be removed and no type can change. (Version comparison and New/Updated markers: Phase 2.)
- **scoring:** the scoring sheet per round; `validateWeights` (100% at each level; every indicator points to a real question); `computeScore` and `averageScore` as pure functions.
- **sites (simple):** a brand kit per department (logo and colours from the starter data); one branded page per award (slug, banner text, about text, contacts) whose deadline, categories, fees and "499 / 500" counter fill in **automatically**; text only, no HTML; links http(s). (Brand-kit screen and image uploads: Phase 2.)
- **public:** the Open awards list (published, and open now) and the award page by slug.

**Frontend:** staff **My awards**, **Create award**, and **cycle setup** tabs: basics and dates · categories · round and jury per application · **question builder** · **scoring-sheet builder** (a table of sections and indicators with running totals) · award page (form plus preview) · publish (gate errors listed). Public **Open awards** (branded cards) and the **award page**.

**Tests (R4 and setup):** editing a published version is refused (by the service and the database) · removing a question or changing its type inside a cycle is refused · removing an option is refused · keys are never reused · weights that don't total 100 are refused · the formula matches the worked example (27.2), including Yes/No · the average of three scores matches the hand calculation · each publish-gate failure gives a clear 409 · fee or blind changes after publishing give 409 · staff of another award get 403 · a jury minimum of 0, or a minimum above the maximum, is refused · Open awards hides drafts and closed cycles · HTML in page text is stored as text.

**Done when:** both demo awards are configured and published **through the UI only**, and appear on Open awards with their branded pages.

**Manual check:** build Award B from scratch in the browser.

---

### Step 1.3: Applying and proof check · Mon 12 Oct · `phase-1.3-apply`

**Goal.** The applicant's whole journey up to the deadline, and the staff checks before judging.

**Backend**
- **Start:** logged in, a company member, a category chosen, the cycle open. **One application per company** (a service check plus the database index); colleagues see it read-only, status only.
- **Fee:** `payFee` (demo) records a payment with a fake reference; the category's fee if it has one, otherwise the cycle's.
- **Answers and files:** autosaved drafts stored by question key and checked against the question types; uploads through signed links from the storage interface (type and size checked; 10 MB; G-B03).
- **Proof:** `uploadEmploymentProof` with the document's date (within 3 months; consent recorded). Submit needs the profile's ID and LinkedIn link too, and records which ones it used.
- **Submit:** all required answers and files; the entry limit checked under a lock on the cycle; the company snapshot; the confirmation email to the outbox. (Save changes after submitting, and withdraw: Phase 2.)
- **Deadline lock:** every write checks `clock.now()`; drafts become Not submitted; the form version and snapshot are pinned.
- **Staff:** the applications list (filters: status, category, proof); `checkProof` (Verified, or Rejected with a reason; audited; email to the outbox); `releaseApplication` with a reason (one transaction with its audit event; API only, the screen is Phase 2).
- The public `entryCount`; the applicant-facing status mapping; `GET /files/:id` with access checks.

**Frontend:** **My applications** (with the colleague's read-only row) · start and demo payment · the **form renderer** (sections, progress, autosave, uploads) · the proof step · review and submit with the counter · the status and result · staff **Applications** and **Proof check**.

**Tests:** a second start by the same company is refused, also when two colleagues start at once · releasing frees the place · the colleague's view hides the starter's name · the form stays locked until the fee is paid · a partial draft saves · submit is refused with a missing answer or missing proof · an employment proof older than 3 months is refused · a second application reuses the profile's ID · the 501st submission is refused, also when two race for the last place · any write after the deadline gives 409 · **R4:** an application opens with its pinned version · the snapshot stays after the company's name changes · 404 for another company's application · the status mapping (table-driven).

**Done when:** an applicant submits to both awards in the browser; staff verify the proof; the counter shows the right number.

**Manual check:** two browsers as two colleagues from the same company: the second can't start.

---

### Step 1.4: Judging, approval and results · Tue 13 Oct · `phase-1.4-judging`

**Goal.** After the deadline, applications reach their jury (masked in blind awards); several jury score each one; the head approves; staff publish. Rules R1, R2 and R3.

**Backend**
- **masking** (blind cycles): the workspace; masked answers; masking done (one transaction with the status); reopening while no evaluation is submitted. In a blind award, jury get **no files** until file masking arrives in Phase 2.
- **jury pool and conflicts:** add existing jury accounts (staff or the head; inviting by email is Phase 2); remove one who has submitted nothing; `recordConflict` (applies to every award; a late conflict revokes an unsubmitted evaluation).
- **assignment:** `setJuryPerApplication`; bulk assignment of one or more jury to each application, all or nothing, under a lock on the application. Checked: the maximum, conflicts, verified proof, masking done (if blind), and the head of the award's department never judging its written round.
- **judging:** the jury view (masked only in blind awards; never proof documents, a total or another jury member's scores); `saveScores`; `submitEvaluation` (every indicator plus the note; the first score locks the scoring sheet); `editScoreWithReason` (one transaction with the audit event; refused after approval); progress per application and per jury member; `GET /applications/:id/history`.
- **approval:** `sendForApproval` (every eligible application has its minimum of submitted evaluations); `approve` (the round locks, and the averages and ranks are saved in `RoundResult`); (`sendBack` and `reopenEvaluation`: Phase 2.)
- **results:** labels by top N or by hand, only after approval; `publishResults` (applicants see their label; emails to the outbox).
- **reporting:** the leader dashboard: per department and award, applications by status, judging progress, rounds waiting for approval, upcoming deadlines.

**Frontend:** staff **Masking** (answers), **Jury pool and conflicts**, **Assignment** (minimum and maximum; "needs more jury"), **Judging progress** (each jury member's score, the average, edit with a reason), **Send for approval**, **Results** · jury **My assignments** and **Scoring** · the head's **approval queue** and **round review** (approve) · the **leader dashboard** · a history panel on the application page.

**Tests:**
- **R1:** no company name, PAN, GSTIN, email or address anywhere in a jury response · in a blind award jury get no files, and downloading one is refused · an unmasked application is refused · a non-blind award shows the originals · proof documents never appear.
- **R2:** a conflicted pair is refused even through the API · conflicted jury are left out of the list · a late conflict revokes.
- **R3:** a change without a reason is refused · the audit row has old, new, who, when and why · a failed audit write rolls back the change (fault injected) · changes after approval are refused.
- **Several jury:** going above the maximum is refused, also when two staff assign at once · a maximum above the pool is refused · sending is refused below the minimum · the average matches the hand calculation · a jury member can't see others' scores.
- **Also:** the head can't be assigned in their own department's written round · the leader is refused on every judging write · approving locks the scores · no label before approval.

**Done when:** both awards run from submitted to **published results** in the browser; all rule tests are green in CI.

**Manual check:** Award A with 2 jury per application: mask the answers, assign, score from two jury accounts, correct a score with a reason, approve, publish, and see the result as the applicant; then open the leader dashboard.

---

### Step 1.5: Online and polished · Wed 14 Oct · `phase-1.5-deploy`

**Goal.** The platform runs online with demo data, and the repo holds everything the brief asks for.

- **Two environments** (ADR 0015): staging, built from the `staging` branch, and production, built from `main`, each with its own Supabase project, Render service and Vercel environment variables. Check the free-tier limits first (G-K18). The demo data and demo logins go on production.
- **Supabase:** the database (a pooled URL for the app, a direct one for migrations), the automatic table API locked down (G-B04: a `curl` with the public key must return nothing), a private bucket for applicant files and a public one for page images.
- **Render:** the API service (build, migrate, start, health check, environment variables). **Vercel:** the frontend with `BACKEND_URL`. The login cookie checked in Chrome and Edge, and in Safari if possible.
- **Demo data online:** both awards, about 20 companies, applications in mixed states (one award already judged), and a demo login for each role. Passwords stay in environment variables and go to the lead privately.
- **Documents:** a README a stranger can run from a fresh clone in under 10 minutes, with the live links · `docs/user-journeys.md` (one page, every role) · `docs/testing.md` (what the tests check and don't) · `docs/ai-notes.md` · `docs/DEPLOYMENT.md` (the runbook) · `docs/walkthrough.md` (the 20-minute demo script) · the architecture drawing ([TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md)).
- **Online smoke test**, on staging first and then on production: each role logs in; a file uploads and downloads; submit, assign, score, approve and publish all work; two accounts never see each other's data (G-B16).

**Done when:** every box under "Phase 1 is done when" in [PLAN.md](PLAN.md#phase-1-is-done-when) is ticked. Then the walkthrough on Thu 15 Oct, and the tag `phase-1-done`.

---

## 5. Phase 2: complete product (about 24 working days)

Started after the Phase 1 review. Each package becomes one or more steps run by the same routine (§1). The days are estimates for one developer.

| # | Package | Days | Technical scope |
|---|---|---|---|
| 2.1 | On-site rounds | 4 | `onsite` module: entries of the round, slots (move until scored), panels of 2–5 with conflict checks, staff backup entry (`enteredById`), absent members, close the round, Gold/Silver/Bronze for ranks 1–3 of the round; a phone scoring screen; the shop-floor (on-site-only) award as a third type |
| 2.2 | Full site builder | 5 | Pages and the 13 section types, layouts, a phone and desktop preview, `SitePageVersion` publish and restore, galleries, past winners and the jury section; the brand-kit screen and image uploads (public bucket) |
| 2.3 | Leader's admin screens | 3 | Departments and external organisers, appointing heads, staff on awards, master-data screens, company corrections with a reason, deactivating and reactivating accounts, invitations by email |
| 2.4 | Department dashboard | 1 | `departmentDashboard` and the head's screens for external organisers |
| 2.5 | Applying and judging extras | 4 | Send back and reopen; file masking (masked copy or "safe as is"); version diff and New/Updated markers; Save changes after submit and withdraw; the release screen; the full scoring-sheet builder; date, multi-choice and team-member questions; disqualify and reinstate; deadline extension; "update requested"; a spread flag; the applicant timeline |
| 2.6 | Emails | 1 | All 12 templates; an HTTP email provider (decision A4) for production |
| 2.7 | Privacy housekeeping | 1 | A daily clean-up of proof documents after 12 months (G-J19, G-K05) |
| 2.8 | End-to-end and edge-case tests | 3 | Playwright journeys (setup, apply, judge, approve, on-site) and the edge-case service tests skipped in Phase 1 |
| 2.9 | Review and buffer | 2 | The client's feedback on Phase 1 |

## 6. Phase 3: launch-ready (about 15 working days + client testing)

| # | Package | Days | Technical scope |
|---|---|---|---|
| 3.1 | Security review | 3 | A permission audit of every endpoint, row-level security as a second net, dependency audit, a penetration test |
| 3.2 | Privacy review | 2 | DPDP Act: consent texts, data minimisation, retention, a data-access log |
| 3.3 | Load and speed | 2 | Load tests at deadline peaks; query plans; caching for public pages |
| 3.4 | Accessibility | 2 | Keyboard navigation, screen-reader labels, contrast (WCAG AA) |
| 3.5 | Real payments | 3 | A payment gateway, receipts, reconciliation |
| 3.6 | Own web addresses | 1 | Sub-domains, then custom domains (`customDomain`) on Vercel |
| 3.7 | Backups and monitoring | 1 | Error tracking, uptime alerts, backup restore drill, runbook |
| 3.8 | Extras | 1 | Copy last year's setup, CSV reports, reminders, changing one's email |
| 3.9 | Client testing | 5–10 | The client's acceptance testing and fixes |

---

## 7. Where the old 15-phase list went

The full-product breakdown written on 4–8 Oct maps onto the new plan like this (old details are in git history, tag `phase-0.6-done`).

| Old phase | Now |
|---|---|
| 1 Backend foundation | Step 1.1 |
| 2 Logins, roles, PA, departments, master data, organisations | Step 1.1 (logins, roles, companies, profile; departments seeded; **PA role dropped**, ADR 0014) + 2.3 (admin screens) |
| 3 Award setup (R4) | Step 1.2 |
| 4 Award sites (backend) | Step 1.2 (one branded page) + 2.2 (builder) |
| 5 Frontend foundation | Step 1.1 |
| 6 Setup screens, brand kit, site builder | Step 1.2 + 2.2 + 2.3 |
| 7 Applications, proof, entry limit, deadline lock | Step 1.3 (deadline extension and update alerts: 2.5) |
| 8 Applicant screens | Step 1.3 |
| 9 Proof check, masking, jury, judging, audit | Steps 1.3 + 1.4 (disqualify and reinstate: 2.5) |
| 10 Staff operations and jury screens | Step 1.4 |
| 11 Approval, results, emails, dashboards, seed | Step 1.4 + 1.5 (all emails: 2.6; department dashboard: 2.4) |
| 12 On-site rounds (backend) | 2.1 |
| 13 Results, on-site and dashboard screens | Step 1.4 (results, leader dashboard) + 2.1 |
| 14 End-to-end tests and deployment | Step 1.5 (deployment) + 2.8 (end-to-end tests) |
| 15 Final deliverables | Step 1.5 |

Phase numbers in [GAPS.md](GAPS.md) (the "Phase" column) still use the old numbers; read them with this table.

---

## 8. If a Phase 1 day runs late: cut order

Cut from the top first:

The scope was already trimmed on 10 Oct ([PLAN.md](PLAN.md#moved-to-phase-2-to-fit-the-dates)). If a day still runs late:

1. Joining an existing company on screen (create stays; join works through the API)
2. The award page's banner and contacts (logo, colours, deadline and counter stay)
3. Scoring-sheet sections (one section with weighted indicators stays)

**Never cut:** the four rules and their tests, both awards configured on screen with no code, several jury per application with the average, masking of answers, the proof check, one application per company, the entry limit, the leader dashboard, normalised company data, and the online deployment.

---

## 9. Docs phases in detail (history)

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

### Phase 0.3: Plain-language overview (Docs) ✅

The whole plan in plain language with diagrams ([docs/overview/](overview/)) for the mentor meeting; the out-of-date architecture PDF removed.

---

### Phase 0.4: New issues and the owner's answers (Docs)

**Goal.** Analyse the new issues (branded award sites, external organisers, proof documents, entry limit, own domains, showing the UI first), get the owner's answers, and update every document. Bring the 6 Oct decisions over from the parked branch.

**Builds.** [proposals/0.4-new-issues.md](proposals/0.4-new-issues.md); spec §5.19–§5.20 and related sections; ADRs 0009–0010; GAPS §J; this plan; PROGRESS, CLAUDE.md, the overview, creating.md, Daily.md.

**Done when.** Every answer is reflected in the spec, plan and gaps; merged and tagged `phase-0.4-done`.

---

### Phase 0.5: UI overview and re-plan options (Docs) ✅

**Goal.** Show how the platform looks and flows, **before building**, for the lead call on 9 Oct.

**Builds.** In `docs/ui/`: one flow diagram per role (applicant, staff including the site builder, jury for document and on-site rounds, department head or external organiser, leader and PA); simple grey wireframes of the key screens (Open awards, an award site, the site builder, the application form with proof upload and entry counter, proof check, jury scoring on desktop and phone, the staff, department and leader dashboards); a screen-share page, like the 0.3 overview.

**Delivered (8 Oct).** [docs/ui/prototype.html](ui/prototype.html) (31 clickable screens, 6 roles, with notes linking each screen to the rules and decisions), [docs/ui/README.md](ui/README.md) (a flow diagram per role and the screen list), [docs/ui/brand-value.html](ui/brand-value.html) (the branding presentation), and [proposals/0.5-replan-options.md](proposals/0.5-replan-options.md) (Option A vs Option B for the lead).

**Done when.** Every role's journey can be walked through on screen without code; merged and tagged `phase-0.5-done`.

---

### Phase 0.6: One application per organisation (Docs) ✅

**Goal.** Stop a second application from the same organisation **before** anyone fills it, instead of flagging duplicates after submission (owner, 8 Oct; ADR 0011).

**Builds.** Spec §5.2 and related sections; ADR 0011; GAPS (A14, D08, E08, J22–J24); this plan; the prototype ("start" screen, "My applications" with a colleague's read-only application, the staff list with "Release"); PROGRESS, CLAUDE.md, the overview, creating.md and Daily.md.

**Done when.** No document describes the old "accept all, flag, staff keep one" rule as current; merged and tagged `phase-0.6-done`.

---

### Phase 0.7: Lead call: proof once, My profile, several jury (Docs) ✅

**Goal.** Record the 9 Oct lead call before re-planning: the identity document and LinkedIn link once on the profile with a recent employment proof per application; My profile with change password for every role; several jury per application in document review rounds, averaged (ADR 0012, 0013). List what the parked backend must change.

**Builds.** Spec (§2, §3, §4, §5.1–5.3, §5.5–5.13, §5.15, §5.16, §5.20, new §5.21, §6–8, §10–15, §18); ADRs 0012 and 0013 (0008 and 0010 updated); [proposals/0.7-backend-changes.md](proposals/0.7-backend-changes.md); GAPS section K; the phase descriptions (points only, no re-plan; since rewritten by Phase 0.8); the prototype (new My profile screen; proof, assignment, judging, results and review screens); the UI README, the overview, CLAUDE.md, creating.md, PROGRESS and Daily.

**Done when.** No document says "one jury member per application" or "ID with every application" as current; the owner has reviewed it. Not merged until the owner says so.


---

### Phase 0.8: Three-phase plan and technical design (Docs) ✅

**Goal.** Split the whole platform into three phases as the lead asked, with Phase 1 by date (10–15 Oct) and Phases 2–3 in days; agree the data model and architecture before coding.

**Builds.** [PLAN.md](PLAN.md) (simple, for the lead), this file rewritten as the detailed steps, [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md), the PA role removed everywhere (ADR 0014), and updates to PROGRESS, GAPS, the spec §14, CLAUDE.md, README, the overview, creating.md and Daily.

**Done when.** The owner has reviewed the plan; merged before Step 1.1 starts.

---

### Phase 0.9: Docs refined and Phase 1 scope fitted (Docs) ✅

**Goal.** Bring every document in line with the three-phase plan before Step 1.1, tighten the wording, and fit Phase 1 into the hours available (10 Oct).

**Builds.** `Backend/README.md` and `Front-End/README.md` rewritten (status, what each step builds, structure, how to run, environment, deployment); wording fixes in PLAN, the overview, the UI README, creating.md and three ADRs; PROGRESS and PHASES status for 0.7 and 0.8.

**Done when.** The owner has reviewed it; merged before Step 1.1 starts. Merged through sumitdwivedi01/EigthyAwards#9 on 10 Oct.

---

### Phase 0.10: A staging branch (Docs) ✅

**Goal.** Test every step on a `staging` branch before it reaches `main` (production), as the owner asked on 10 Oct (ADR 0015).

**Builds.** ADR 0015 (0004 and the ADR index marked); the workflow rules in CLAUDE.md, this plan (§1 routine and checklist, §2, Steps 1.1, 1.3 and 1.5, the change log), PLAN, the Phase 1 roadmap, TECHNICAL-DESIGN, creating.md, the app READMEs and the PR template; GAPS (B03, B16, D05, G03, K18, K19); the 0.7 change list; PROGRESS and Daily.

**Done when.** Merged into `staging` and then into `main`; `staging` is protected on GitHub like `main`. Step 1.1 is then cut from `staging`.
