# Progress tracker

> **Start here in any new session (human or AI).** This file says exactly where the project stands. It is updated at the end of every working session and every phase. If this file and the code disagree, the code is the truth, so fix this file.

## Snapshot

| | |
|---|---|
| **Last updated** | 2026-10-10 · Day 8 |
| **Current phase** | **Step 1.1: Foundation and people** (🧪 built; the pull request into `staging` is next) |
| **Current branch** | `phase-1.1-foundation`, cut from `staging` (`main` is production) |
| **What runs today** | On the step branch, locally: the API (logins, scoped roles, My profile, organisations, master lists, the seed; 129 tests) and the web app (login, register, My profile, My organisation, a home per role), checked by hand in a browser. `staging` and `main` hold the docs until this step merges |
| **The plan** | [PLAN.md](PLAN.md): **Phase 1 build Sat 10 – Tue 13 Oct, deploy Wed 14, walkthrough with the lead Thu 15 (afternoon)**, about 71 hours of work; then Phase 2 (~24 working days) and Phase 3 (~15 + client testing) |
| **Next action** | 1) The owner opens the pull request `phase-1.1-foundation` → `staging`, checks CI and merges it; runs the manual check on `staging`; then `staging` → `main` and the tag `phase-1.1-done`. 2) **Step 1.2** Award setup and branded pages (Sun 11 Oct), on `phase-1.2-setup` cut from `staging` |
| **Blockers** | None. Open but not blocking Phase 1: A4 (email provider, Phase 2); ask the leader: G-I08, G-H07 |
| **Risk** | Four build days are tight even after the trim (about 71 hours against about 64; G-K13): Thursday morning is the buffer; daily finish lines and the cut order in [PHASES.md §8](PHASES.md#8-if-a-phase-1-day-runs-late-cut-order). Step 1.1 starts on Saturday evening, so it runs into Sunday. Two online environments add setup on 14 Oct (G-K18) |

## Phase status board

The live version of the tables in [PHASES.md §2](PHASES.md#2-timeline-at-a-glance). Update the row whenever a step changes state.

| # | Phase or step | Branch | Status | PR | Merged | Tests |
|---|---|---|---|---|---|---|
| 0 | Planning and tracking setup | `phase/00-planning-docs` | ✅ Merged | sumitdwivedi01/EigthyAwards#1 | 2026-10-04 · `phase-00-done` | n/a |
| 0.1 | Leader-call changes | `phase/00.1-leader-call-changes` | ✅ Merged | sumitdwivedi01/EigthyAwards#2 | 2026-10-05 · `phase-00.1-done` | n/a |
| 0.2 | On-site rounds and answers | `phase/00.2-onsite-rounds-and-answers` | ✅ Merged | sumitdwivedi01/EigthyAwards#3 | 2026-10-06 · `phase-00.2-done` | n/a |
| 0.3 | Plain-language overview | `phase/00.3-overview-page` | ✅ Merged | sumitdwivedi01/EigthyAwards#4 | 2026-10-07 · `phase-00.3-done` | n/a |
| 0.4 | New issues and the owner's answers | `phase-0.4-issues` | ✅ Merged (committed to `main` by mistake; accepted as is, see Daily 7 Oct) | — | 2026-10-07 · `phase-0.4-done` | n/a |
| 0.5 | UI overview and re-plan options | `phase-0.5-ui` | ✅ Merged | sumitdwivedi01/EigthyAwards#5 | 2026-10-08 · `phase-0.5-done` | n/a |
| 0.6 | One application per organisation | `phase-0.6-entry` | ✅ Merged | sumitdwivedi01/EigthyAwards#6 | 2026-10-08 · `phase-0.6-done` | n/a |
| 0.7 | Lead call: proof once, My profile, several jury | `phase-0.7-lead` | ✅ Merged | sumitdwivedi01/EigthyAwards#7 | 2026-10-09 · `phase-0.7-done` | n/a |
| 0.8 | Three-phase plan and technical design; PA role removed | `phase-0.8-plan` | ✅ Merged | sumitdwivedi01/EigthyAwards#8 | 2026-10-09 · `phase-0.8-done` | n/a |
| 0.9 | Docs refined | `phase-0.9-docs` | ✅ Merged | sumitdwivedi01/EigthyAwards#9 | 2026-10-10 · `phase-0.9-done` (tag to push) | n/a |
| 0.10 | A `staging` branch (ADR 0015) | `phase-0.10-staging` | ✅ Merged | sumitdwivedi01/EigthyAwards#10 → `staging`, sumitdwivedi01/EigthyAwards#11 → `main` | 2026-10-10 · `phase-0.10-done` | n/a |
| **1.1** | Foundation and people · **Sat 10 Oct** | `phase-1.1-foundation` | 🧪 Built, pull request next | — | — | 129 backend (were 62); frontend: lint, type check, build |
| **1.2** | Award setup and branded pages · **Sun 11 Oct** | `phase-1.2-setup` | ⬜ | — | — | — |
| **1.3** | Applying and proof check · **Mon 12 Oct** | `phase-1.3-apply` | ⬜ | — | — | — |
| **1.4** | Judging, approval and results · **Tue 13 Oct** | `phase-1.4-judging` | ⬜ | — | — | — |
| **1.5** | Online and polished · **Wed 14 Oct** | `phase-1.5-deploy` | ⬜ | — | — | — |
| — | Buffer, then walkthrough with the lead · **Thu 15 Oct** | — | ⬜ | — | `phase-1-done` | — |
| 2 | Complete product (~24 working days) | per package | ⬜ | — | — | — |
| 3 | Launch-ready (~15 working days + client testing) | per package | ⬜ | — | — | — |

Status key: ⬜ not started · 🚧 in progress · 🧪 testing or in review · ✅ merged · ⛔ blocked

From 0.10 on, the PR column lists both pull requests (into `staging`, then `staging` → `main`), and **Merged** means merged into `main` (ADR 0015).

## Phase 1 goals: where they stand

| Goal | Step | Status |
|---|---|---|
| Logins, scoped roles, My profile (change password, ID and LinkedIn once) | 1.1 | 🧪 Built and tested; in review |
| Companies created or joined, data cleaned on save (one PAN, one spelling) | 1.1 | 🧪 Built and tested; in review |
| Staff set up an award on screen: settings, questions with versions (R4), scoring sheet, jury per application | 1.2 | ⬜ |
| Branded award page and Open awards, with the live "499 / 500" counter | 1.2 | ⬜ |
| Apply: one per company (blocked at the start), demo fee, autosave form, recent employment proof, entry limit, deadline lock | 1.3 | ⬜ |
| Staff: proof check, release | 1.3 | ⬜ |
| Masking of answers (R1; files in Phase 2), conflicts (R2), several jury with the average, score changes with reasons (R3) | 1.4 | ⬜ |
| Approval by the head (send back: Phase 2), results published, the leader dashboard screen | 1.4 | ⬜ |
| Online on Supabase, Render and Vercel, with demo data and logins | 1.5 | ⬜ |
| The brief's documents: README, user journeys, architecture, testing, AI notes, decisions | 1.5 | ⬜ |

## The four rules: where they stand

| Rule | Enforced in | Tests | Status |
|---|---|---|---|
| R1 Blind judging hides who applied | Step 1.4 | — | ⬜ |
| R2 No assignment with a recorded conflict | Step 1.4 (on-site panels: Phase 2) | — | ⬜ |
| R3 Who changed a score, and why | Step 1.1 (audit trigger, built), 1.4 | — | ⬜ |
| R4 Last year's applications still read correctly | Step 1.1 (FormVersion trigger, built), 1.2, 1.3 | — | ⬜ |

## Decisions: where they land

| Decision | Phase 1 | Later |
|---|---|---|
| Staff on many awards; award to the organisation; no authorisation letter | ✅ in 1.1–1.2 | — |
| ~~Leader's PA role~~ **removed 9 Oct** (ADR 0014): the leader's team uses the leader's account | — | — |
| Data consistency (normalise, case-insensitive unique, master lists, snapshots) | 1.1–1.3 | Master-data screens, corrections (2.3) |
| One application per organisation, blocked at the start; staff release | 1.3 | — |
| Proof: ID and LinkedIn once on the profile, recent employment proof, each award checks | 1.1, 1.3 | Automatic deletion after 12 months (2.7) |
| Entry limit with the public counter | 1.2, 1.3 | — |
| Several jury per application, average | 1.2, 1.4 | Spread flag (2.5) |
| Branded award sites | One branded page per award (1.2) | Full section builder, versions (2.2); own domains (3.6) |
| External organisers as departments | Seeded ("FPO Awards team") | Admin screens (2.3), department dashboard (2.4) |
| On-site rounds and medals | Tables only | 2.1 |

---

## What has been achieved (newest first)

Each phase gets an entry when it starts. Tick items off as they land and keep the entry once the phase is merged. That way this section is the full history of what exists and why.


### Step 1.1: Foundation and people · 🧪 · 2026-10-10 (Day 8, evening and night)

The first build step, on `phase-1.1-foundation` (cut from `staging`). Decided first with the owner: copy the parked code (not merge it) with one new migration; jury accounts only from the seed until staff add them to a pool (G-K19); uploads through signed links (G-B03).

**Backend** (129 tests, were 62; lint, type check and the schema drift check clean)
- [x] The parked foundation copied across (0.7 list, B0.1), CI also on `staging`.
- [x] One new migration with every 7–9 Oct change (B1–B4, B6): site tables, entry limit, proof files and their owners, application proof status and release, profile fields, `juryMin`/`juryMax` for both round types, several jury per application, `LEADER_PA` removed. Database-rule tests rewritten from the rules.
- [x] **identity:** register, login (constant-time for unknown emails), logout, a signed session cookie (ADR 0003), the actor rebuilt from the database on every request, `GET /me` with areas and home; My profile (name, phone, change password that ends other sessions, is audited without the password and queues an email), LinkedIn link, identity document through a signed upload link with its content checked.
- [x] **Request safety:** same-origin check on writes (G-B11), `Cache-Control: no-store` (G-B16), failed-login limits per visitor and per email (G-C12).
- [x] **organisations:** register (normalised, PAN and GSTIN checks, state warning, master-data type), one record per PAN (409 → Join), join with PAN + GSTIN or PAN + official email, members-only view and edit (never the PAN), audited.
- [x] **master-data:** public lists of organisation types, award domains and states.
- [x] **Seed:** the leader, two departments (one an external organiser) with heads and brand kits, three staff (one in both), six jury, three applicants and Acme Steel Ltd; passwords from the environment; safe to repeat.

**Frontend** (Next.js 16.3.6, Tailwind 4, shadcn/ui on Radix; lint, type check and build clean; frontend CI added)
- [x] The `/api` proxy to the backend; `src/proxy.ts` as the coarse login gate (Next.js 16 renamed middleware, ai-notes #8).
- [x] Login, register, logout; the app shell with the areas the API gives; a home per role.
- [x] My profile (details, password, LinkedIn, identity document) and My organisation (register, join, edit).

**Checked by hand** (browser, against the running API): register with messy input (cleaned); register a PAN that exists (moved to Join); join with a wrong GSTIN (the state named) and the right one in lower case (one Acme record); phone and LinkedIn on My profile; the identity document upload; a role granted and revoked in the database showing and disappearing at once; a password changed on screen ending the session of a second device at once, with the "password changed" email in Mailpit; logout; the login gate. Every seeded role logs in to its own area (jury: the applicant area until added to a pool, as decided).

- [x] Docs: `docs/API.md`, both READMEs, CLAUDE.md commands, TECHNICAL-DESIGN, ai-notes #7–#9, GAPS (13 gaps closed, K20 added), the 0.7 change list ticked, Daily.
- [ ] Not yet: "a jury user gets 403 on a staff endpoint" through HTTP: there is no staff endpoint until Step 1.2; the access checks have unit tests now, and the HTTP test comes with the first staff endpoint.
- [ ] The owner merges into `staging`, checks it there, then into `main`; tag `phase-1.1-done`.

### Phase 0.10: A staging branch · ✅ · 2026-10-10 (Day 8, evening)

The owner met the lead (nothing changed) and asked for a staging branch: each step is merged into `staging` and tested there, then merged into `main` (production). Four details were agreed first (all recommended options): `main` is production; step branches go into `staging`; until 14 Oct, testing on `staging` means CI plus the step's manual check run locally, with two online environments from then; `staging` goes into `main` after each step.

- [x] [ADR 0015](decisions/0015-staging-branch.md) (supersedes 0004's flow); 0004 and the ADR index marked.
- [x] The workflow everywhere it is written: CLAUDE.md, PHASES (§1 routine and checklist, §2, Steps 1.1, 1.3 and 1.5, change log), PLAN, the Phase 1 roadmap, TECHNICAL-DESIGN, creating.md, the app READMEs, the spec's revision log and §16 note, the PR template (with a short `staging` → `main` checklist).
- [x] Also decided today: the paused backend is copied into Step 1.1 with one new migration; Phase 1 jury accounts come only from the seed (G-K19); uploads use signed links, as ADR 0003 says (G-B03). Found: Vercel caches proxied responses that carry caching headers, so the API sends `Cache-Control: no-store` (G-B16).
- [x] Small fixes: `requireLeaderOrPA` → `requireLeader`; the 0.7 change list (branch from `staging`, the extra files to copy, change password now in Step 1.1, partial indexes in the schema, the enum switch); 0.9 marked merged.
- [x] Merged through sumitdwivedi01/EigthyAwards#10 (→ `staging`) and sumitdwivedi01/EigthyAwards#11 (→ `main`); tagged `phase-0.10-done`.
- [ ] `staging` protected on GitHub like `main` (the owner's setting; G-G03).

### Phase 0.9: Docs refined · ✅ · 2026-10-09 (Day 7, late)

The owner asked for the Backend README to match the new plan, and for every document to be clear, current and free of filler words.

- [x] `Backend/README.md` rewritten: status (what's built, where, what Step 1.1 brings), which module is built in which step, structure, the file contract of each module, how to run, scripts, environment variables, tests, deployment.
- [x] `Front-End/README.md` rewritten the same way: status, which screens come in which step, structure, how to run, deployment.
- [x] Wording: decorative emojis and marketing phrases removed from the overview; "How Phase 1 stands out" became "What the walkthrough will show" in PLAN; filler words removed from creating.md, the UI README and ADRs 0001, 0003 and 0008. The overview now points to PLAN.md and TECHNICAL-DESIGN.md and says which awards Phase 1 shows.
- [x] Status of 0.7 and 0.8 set to merged in PROGRESS and PHASES.
- [x] [PHASE-1-ROADMAP.md](PHASE-1-ROADMAP.md): Phase 1 for presenting to the lead: the goal, what's delivered, the two awards, the timeline, the daily routine, each day's work and checks, how the rules are proven, what's left out, the walkthrough plan, done-when, risks, and what we need from the lead.
- [x] **Phase 1 fitted to the dates (10 Oct).** The full list came to about 100 hours against about 64 available. Moved to Phase 2: send back and reopen, file masking, version comparison and markers, editing after submit and withdraw, the release screen, the full scoring-sheet builder and three question types, the brand-kit screen and image uploads, jury invites by email, the status timeline, edge-case tests. Kept: the leader dashboard screen and masking of answers. Phase 1 ≈ 71 h; Thursday morning is a buffer. PLAN, PHASES, TECHNICAL-DESIGN, GAPS (K13, K17), the overview, the app READMEs, creating.md and Daily updated.
- [x] Merged through sumitdwivedi01/EigthyAwards#9 on 10 Oct (the tag `phase-0.9-done` is still to push).

### Phase 0.8: Three-phase plan and technical design · ✅ · 2026-10-09 (Day 7, evening)

The lead asked for the whole platform in **three phases**, Phase 1 a fully working platform (what we are judged on), and the technical design agreed before coding. The owner set Phase 1 to start on 10 Oct and wrap up by 13 Oct, including Sunday. Four choices were agreed first (all recommended): build 10–13, deploy 14, demo 15; two written-review awards; a simple branded page in Phase 1; a new simple PLAN.md.

- [x] [PLAN.md](PLAN.md): the three phases in plain words for the lead: Phase 1 by date with the two demo awards, what works for each user, how the rules are proven, day by day, kept simple on purpose, cut order, done-when; Phase 2 and Phase 3 in days; why this order; how Phase 1 stands out; risks.
- [x] [PHASES.md](PHASES.md) rewritten as the detailed steps: the five Phase 1 steps (backend, frontend, tests, done when, manual check), the Phase 2 and 3 packages, the map from the old 15-phase list, the cut order.
- [x] [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md): architecture, modules per phase, the data model (diagram and database guarantees), key flows, the Phase 1 API, scaling, security, environments, testing.
- [x] PROGRESS rebuilt for the steps; GAPS (K12 answered, K13–K15 added, A2 and A4 updated); spec §1, §14, §15 and §17 notes; CLAUDE.md, README, the overview, the 0.5 and 0.7 proposals, the UI README, creating.md (rewritten short) and Daily.
- [x] **The PA role removed** (owner, later on 9 Oct): the leader's team works from the leader's account. ADR 0014 (supersedes 0005); the spec (five roles, matrix, §5.17 now "the leader's team", journeys, operations, screens, data model, tests, A14 removed, A33 added); GAPS (A11, A12, H02, H03, H11 removed; K16 added); the prototype (the PA screen became "People and awards"; the role is now "Leader"); PLAN, PHASES, TECHNICAL-DESIGN, the overview, the READMEs, the PR template, the backend change list (B6), creating.md.
- [x] Merged through sumitdwivedi01/EigthyAwards#8 and tagged `phase-0.8-done`.

### Phase 0.7: Lead call: proof once, My profile, several jury · ✅ · 2026-10-09 (Day 7)

The owner met the lead. The lead agreed with most of the plan and asked for: the identity document and LinkedIn link given **once**, not with every application; only a **recent** proof of employment per application; a way for users to **change their password**; and **several jury per application** in round 1, with the average as the final score so no single person's bias decides. Four details were agreed first (all recommended options): each award checks its own application; the proof is dated within 3 months; one min–max per round; commit locally only.

- [x] Spec: new §5.21 (My profile and account); §5.20 rewritten (proof once on the profile, recent employment proof); §5.8 (jury per application), §5.5 (final score = average, rounded once); and every related section (§2, §3, §4, §5.1–5.3, §5.6–5.13, §5.15, §5.16, §6–8, §10–15, §18 with A27–A32).
- [x] ADR 0012 (proof once, My profile) and ADR 0013 (several jury per application); 0008 and 0010 marked as changed.
- [x] [proposals/0.7-backend-changes.md](proposals/0.7-backend-changes.md): what the parked backend has, what's planned, and every change it needs (B0–B5). Not done in code, as asked.
- [x] GAPS: new section K (12 items); J08, J09, J13, J19, D11 and E07 updated; J21 answered (three phases).
- [x] PHASES: the points changed inside Phases 1, 2, 3, 5, 7, 8, 9, 10, 11 and 13 only; the phase list and days are **not** re-planned yet (owner's instruction).
- [x] Prototype: a new **My profile** screen (proof once, change password); the proof step now asks only for the dated employment proof; proof check, assignment (min–max, several jury), judging progress, results and the head's review show each jury member's score and the average. 32 screens. Tested at phone, tablet and laptop widths: no errors, every link valid, nothing cut off (also fixed older screens whose tables were clipped on phones).
- [x] Also fixed: the overview still said "two entries from one company are flagged" (missed in 0.6).
- [x] UI README, overview, README, CLAUDE.md, creating.md, Daily.md.
- [x] Merged through sumitdwivedi01/EigthyAwards#7 and tagged `phase-0.7-done`; the three-phase re-plan followed in 0.8.

### Phase 0.6: One application per organisation · ✅ · 2026-10-08 (Day 6)

The owner asked two questions about the prototype: can a colleague see an application someone else is filling, and can we stop a second one **before** it's filled, not after submission? Four details were agreed first (all recommended options, except "status only, no name").

- [x] Spec §5.2 rewritten: blocked at the start; status-only message; colleagues read-only ("Started by a colleague"); withdrawn and released don't count; staff release with a reason; a partial unique index for simultaneous starts. Related sections updated (§3, §4, §5.15, §5.16, §5.20, §7, §10–§15, §18).
- [x] ADR 0011; ADR 0007 note updated.
- [x] GAPS: A14, D08, E08 updated; J22 (answered), J23 (fake starter blocks the real one: staff release), J24 (no hand-over yet).
- [x] PHASES (Phase 0.6; Phases 1, 7, 10 and cut order), the prototype (start, My applications, staff list), the UI README, CLAUDE.md, Backend README, the overview, creating.md, Daily.md.
- [x] Merged through sumitdwivedi01/EigthyAwards#6 and tagged `phase-0.6-done`.

### Phase 0.5: UI overview and re-plan options · ✅ · 2026-10-08 (Day 6)

Goal: show the client how the platform looks and flows **before** building, and re-plan for the owner's hard limit of 15 October.

- [x] Asked the owner four questions first (format, look, re-plan, branding deck); all answered with the recommended options.
- [x] [docs/ui/prototype.html](ui/prototype.html): a clickable prototype of **31 screens across 6 roles** (visitor 3, applicant 7, staff 10, jury 3, department head 4, leader and PA 4), with notes tying each screen to the rules (R1–R4) and decisions. Tested in the browser: no errors, every link valid, every role walkable, no sideways scrolling at laptop, tablet and phone widths.
- [x] [docs/ui/README.md](ui/README.md): the whole journey plus one Mermaid flow diagram per role, and the screen list with prototype links. GitHub shows it directly.
- [x] [docs/ui/brand-value.html](ui/brand-value.html): the branding presentation (3 pages, live builder demo).
- [x] [proposals/0.5-replan-options.md](proposals/0.5-replan-options.md): **Option A** (focused demo by 15 Oct, built on the real architecture) vs **Option B** (the real product, about 50–70 working days), with a recommendation. Not decided.
- [x] PHASES (build plan on hold), PROGRESS, GAPS (J21), CLAUDE.md, README, creating.md, Daily.md updated.
- [x] Merged through sumitdwivedi01/EigthyAwards#5 and tagged `phase-0.5-done`. Before merging, the Join tab on "My organisation" was made clickable at the owner's request.

### Phase 0.4: New issues and the owner's answers · ✅ · 2026-10-07 (Day 5)

- [x] Studied the FPO Awards site and wrote [proposals/0.4-new-issues.md](proposals/0.4-new-issues.md) with 12 questions.
- [x] Owner's answers recorded (GAPS §J): plan extended, not cut; sites for all awards; staff-only award creation; several departments per head; no site approval; public entry count; proof documents with every application; staff control what shows where and can redesign after publishing; simple branch names; 6 Oct decisions brought over.
- [x] Spec: new §5.19 and §5.20 plus all related sections. ADRs 0009 and 0010; 0004 and 0007 updated; 6 Oct changes to ADRs 0002, 0003, 0004 and 0008.
- [x] PHASES.md rewritten in the new numbering (new Phase 4 for sites; old 8 and 9 merged), target days to Day 21.
- [x] GAPS §J answered (J17–J20 added); the overview, CLAUDE.md, creating.md, Daily.md and README updated.
- [x] Tagged `phase-0.4-done` (its commits went to `main` directly by mistake; the owner chose to accept them as merged).
### Phase 0.2: On-site rounds and answers · 🚧 · 2026-10-06 (Day 4)

Goal: record the answers to the 15 open questions and design on-site rounds before writing code.

What was decided:
- Only one real application per organisation per award. Every application is accepted; extras are flagged and staff keep one. *(Changed on 8 Oct: a second one is blocked at the start, ADR 0011.)*
- **Shop-floor competitions** register as usual (small or empty form) and are judged **on site**. The same round type serves the large award's live round 2.
- On site: jury score on their own devices (internet assumed), with staff backup entry. A panel of 2–5 jury, each scoring separately; the average counts. **No approval**: staff close the round. The department head may sit on a panel.
- Results: document rounds give Shortlisted / Rejected; on-site rounds give **Gold / Silver / Bronze** (others: Participated).
- Defaults accepted: team members list, staff-set slots with an email, uploads only if staff add a file question, same powers for all PAs, PAs create awards, no proof-of-authority check for now, fee per category, GSTIN optional, the department head's approval is final, volume as before.

- [x] Spec: revision log; glossary (round types, panel, slot, result label, shop-floor); matrix; statuses (two round tables, new applicant statuses); §5.2–5.6; §5.12 results by round; **§5.16 rewritten as On-site rounds**; rules, journeys, model limits, data model (PresentationSlot, RoundResult, round type and labels, evaluation backup entry, category fee, optional GSTIN); operations, screens, scope, tests, §18 answers and assumptions A18–A22.
- [x] ADR 0008 On-site rounds; ADRs 0001, 0003, 0004 and 0006 renumbered.
- [x] GAPS.md: A11–A14 closed; E02, E07, E08, E14 and E15 answered; C15 removed; new section I (13 gaps); summary recounted from the tables.
- [x] PHASES.md: Phase 0.2 and a new **Phase 12 (on-site rounds, backend)**; old 12, 13 and 14 renumbered to 13, 14 and 15; Phases 1, 2, 3, 6, 8, 11, 13 and 14 updated; days re-planned; cut order extended.
- [x] CLAUDE.md, the READMEs and Daily.md updated.
- [ ] Commit, push, PR, merge, and tag `phase-00.2-done`.

### Phase 0.1: Leader-call changes · ✅ · 2026-10-05 (Day 3)

Goal: bring every document in line with the leader call before writing code.

What the leader said:
1. One staff member can work on many awards.
2. The award goes to the organisation, not to its units or plants.
3. No signed authorisation letter. For now, every application from a member of the organisation is accepted.
4. The leader has a personal team (PAs) who do the leader's work: creating departments and awards, appointing heads, assigning staff. The leader creates the PAs.
5. Data inconsistency was the main problem before this platform.

- [x] Spec ([requirements.md](requirements.md)): revision log; roles grow to six (Leader's PA); new permission matrix; new §5.17 Leader's PA team and §5.18 Data consistency; letter removed from §2, §5.2, §5.3, §5.6, §7, §10, §12, §14, §17; data model (LEADER_PA, master data tables, identity snapshot, actorRole, deactivation); screens, scope, tests and §18 answers updated; glossary "Evaluation" fixed (G-D01).
- [x] ADRs: 0005 Leader's PA role, 0006 Data consistency by design, 0007 Drop the authorisation letter.
- [x] [GAPS.md](GAPS.md): A5, A6, C08 and C09 removed (letter); A7 and C07 decided; E01 and E03 answered; new decisions A11–A14; new section H (12 gaps).
- [x] [PHASES.md](PHASES.md): Phase 0.1 added; Phases 1, 2, 3, 5, 6, 7, 10, 11 and 12 updated; days shifted; cut order extended.
- [x] CLAUDE.md, the READMEs and Daily.md (shortened) updated.
- [x] A11–A14 answered on 6 Oct (see Phase 0.2).
- [x] Merged through sumitdwivedi01/EigthyAwards#2 and tagged `phase-00.1-done`.

Found: proof of authority is now weak, because the PAN is inside the GSTIN, which is printed on every invoice (G-H01). Recommended fix: confirm joining through the organisation's official email (A13).

### Phase 0: Planning and tracking setup · ✅ · 2026-10-04 (Day 2)

Goal: put everything a new person (or a new AI session) needs into the repo, and fix the plan before writing code.

- [x] Read the three source documents: the brief, the product and technical spec (2 Oct 2026), and the high-level architecture PDF (11 pages).
- [x] `docs/brief.md`: the brief converted to Markdown, wording unchanged.
- [x] `docs/requirements.md`: the full spec converted to Markdown (sections 1–18, tables, JSON schemas). The diagrams are not reproduced; they point to the PDF.
- [x] `docs/architecture/Awards_Platform_High_Level_Architecture.pdf`: the architecture drawing, kept as is. (Removed on 7 Oct 2026 in Phase 0.3 as out of date; replaced by docs/overview/.)
- [x] `docs/PHASES.md`: the plan. 15 phases (0–14), backend first and alternating with frontend, each with goal, scope, tests, "done when" and a manual check. Exit checklist, workflow and cut order.
- [x] `docs/GAPS.md`: 83 tracked items across 7 sections. 10 of them are the decisions in §A, which are waiting for an answer.
- [x] `docs/decisions/`: an ADR index plus 0001 (split and hosting), 0002 (tech stack), 0003 (auth and sessions) and 0004 (git workflow).
- [x] `CLAUDE.md`: working rules and file map for AI coding sessions, so a new chat picks up the context automatically.
- [x] `.github/pull_request_template.md`: the phase exit checklist as a PR template.
- [x] `.gitignore` for Node, Next.js, env files, uploads and coverage.
- [x] README updates: root `README.md`, `Backend/README.md`, and `Front-End/README.md` (renamed from `Frontend.md`).
- [x] `Daily.md`: today's entry.
- [x] Reviewed by you; merged into `main` through sumitdwivedi01/EigthyAwards#1 and tagged `phase-00-done`.

Decisions made: ADR 0001 (accepted), 0002 (proposed), 0003 (proposed), 0004 (accepted).
Things found: the spec contradicts itself in 11 places (GAPS §D), and the deployment split adds 15 gaps (GAPS §B). The most serious is **G-B04** (Supabase's Data API could expose our tables).

---

## Environment facts

Filled in as things get built. Never put secrets here; only names and where they live.

| Item | Value |
|---|---|
| Local machine | Windows 11; Node v22.17.0, npm 11.8.0; Docker 29.7; Git Bash; Python 3.12. The `gh` CLI is **not** installed |
| GitHub repo | `https://github.com/sumitdwivedi01/EigthyAwards` (note the typo in the repo name, G-G05) |
| Branches | `main` = production; `staging` = where finished steps are tested; one branch per step, cut from `staging` (ADR 0015) |
| Backend local URL | `http://localhost:4000` |
| Frontend local URL | `http://localhost:3000` (its `/api/*` goes to the backend) |
| PostgreSQL (Docker) | `localhost:5433`, databases `awards`, `awards_test` and `awards_shadow` (built on the parked branch) |
| Mailpit | SMTP `localhost:1025`, inbox UI `http://localhost:8025` |
| Online | Two environments from Step 1.5 (14 Oct): staging (the `staging` branch) and production (`main`), each with Vercel, Render and its own Supabase project. Not created yet |
| Pinned versions | Backend: Express 5.2.1, TypeScript 6.0.3, Prisma 7.10.0, Zod 4.6.5, Vitest 5.0.3, bcryptjs 3.0.3, jose 6.2.12, express-rate-limit 8.7.0. Frontend: Next.js 16.3.6, React 19.2.8, Tailwind 4.3.3, TanStack Query 5.104.0, React Hook Form 7.89.0, radix-ui 1.6.7, TypeScript 6.0.3, ESLint 9.39.5 (G-K20). Exact versions at least two weeks old |

## Seeded test accounts

Created by `npm run db:seed` (Step 1.1). The leader signs in with `LEADER_PASSWORD`, every other account with `DEMO_PASSWORD`; both live only in `Backend/.env` (online: the hosting dashboards), never in this file or in Git.

| Account | Role |
|---|---|
| `leader@demo.test` (`LEADER_EMAIL`) | Leader (the leader's team uses this account) |
| `head.she@demo.test` | Department head, Safety, Health and Environment |
| `head.fpo@demo.test` | Department head, FPO Awards team (an external organiser) |
| `staff.asha@demo.test` | Staff, Safety, Health and Environment |
| `staff.ravi@demo.test` | Staff, FPO Awards team |
| `staff.neha@demo.test` | Staff in both departments |
| `jury.anil@`, `jury.priya@`, `jury.vikram@`, `jury.sunita@`, `jury.farhan@`, `jury.lakshmi@demo.test` | Jury accounts: no role until staff add them to a cycle's pool (G-K19) |
| `applicant.kiran@demo.test` | Applicant, member of Acme Steel Ltd |
| `applicant.deepa@demo.test` | Applicant, a colleague who joins Acme Steel on screen |
| `applicant.rahul@demo.test` | Applicant with no organisation yet (registers one on screen) |

## Deviations from the spec

| What | Why | Record |
|---|---|---|
| Two apps (Next.js on Vercel, Express on Render) instead of one Next.js app | The chosen hosting | ADR 0001 |
| Our own auth in the API instead of Auth.js | Auth.js doesn't fit a separate API | ADR 0003 |
| Step branches → `staging` → `main` instead of `feature` → `develop` → `main` | The owner's workflow; one builder (ADR 0004, changed on 10 Oct) | ADR 0015 |
| EmailLog used as an outbox instead of sending during the request | Bulk emails and rollbacks | GAPS G-C03 |
| ~~New role: Leader's PA~~ removed 9 Oct; the team uses the leader's account | Leader call, 5 Oct; owner, 9 Oct | ADR 0005, superseded by ADR 0014 |
| Data consistency rules and master data | Leader call, 5 Oct | ADR 0006, spec §5.18 |
| No authorisation letter | Leader call, 5 Oct | ADR 0007 |
| On-site rounds built now (were "future"); no approval for them; medals | Answers, 6 Oct | ADR 0008, spec §5.16 |
| GSTIN optional | Answers, 6 Oct | Spec §5.2 |

---

## How to resume in a new chat

Paste this to an AI assistant (Claude Code loads `CLAUDE.md` automatically, but this works anywhere):

> We are building the Awards Platform in this repo. Read `CLAUDE.md`, then `docs/PROGRESS.md` (where we are), `docs/PLAN.md` (the three phases), `docs/PHASES.md` (the detailed steps, especially the current one), `docs/TECHNICAL-DESIGN.md`, and `docs/GAPS.md` §A (open decisions). The spec is in `docs/requirements.md`. Continue the current phase on its branch (step branches are cut from `staging`; `main` is production, ADR 0015). Don't start a new phase until the current one meets its exit checklist. At the end, update PROGRESS.md, GAPS.md and Daily.md.

## End-of-session routine (every time)

1. Tick off finished items in the current phase's entry above, and update the **Snapshot** table.
2. Update the **phase status board** (and PHASES.md §2 when a phase changes state).
3. Close or add gaps in [GAPS.md](GAPS.md) and update its summary counts.
4. Add today's lines to [Daily.md](../Daily.md): Done · Next · Stuck (· Plan changed).
5. Commit with a `docs:` message on the current phase branch.
