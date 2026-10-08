# Progress tracker

> **Start here in any new session (human or AI).** This file says exactly where the project stands. It is updated at the end of every working session and every phase. If this file and the code disagree, the code is the truth, so fix this file.

## Snapshot

| | |
|---|---|
| **Last updated** | 2026-10-08 · Day 6 |
| **Current phase** | Phase 0.6: One application per organisation, blocked at the start (🧪 docs and prototype updated; waiting for review and merge) |
| **Current branch** | `phase-0.6-entry` |
| **What runs today** | Nothing on `main`. The backend foundation (Phase 1) is built and tested on its own branch, **parked** (tag `parked/phase-01-be-foundation`). |
| **Next action** | 1) Review and merge Phase 0.6, tag `phase-0.6-done`. 2) **9 Oct lead call:** walk through the [UI prototype](ui/prototype.html) and the [branding presentation](ui/brand-value.html); the lead chooses [Option A or B](proposals/0.5-replan-options.md). 3) Re-plan PHASES.md from that decision, then resume Phase 1. |
| **Blockers** | Building waits for the lead's choice between Option A (demo by 15 Oct) and Option B (real product). Open: A4 (email provider); ask the leader: G-I08, G-H07; branding questions B1–B6. |
| **Risk** | **Hard limit 15 October** (owner, 8 Oct): about 5 working days after the call. Only Option A fits. |

## Phase status board

The live version of the table in [PHASES.md §2](PHASES.md). Update the row whenever a phase changes state.

| # | Phase | Branch | Status | PR | Merged | Tests |
|---|---|---|---|---|---|---|
| 0 | Planning and tracking setup | `phase/00-planning-docs` | ✅ Merged | sumitdwivedi01/EigthyAwards#1 | 2026-10-04 · `phase-00-done` | n/a |
| 0.1 | Leader-call changes | `phase/00.1-leader-call-changes` | ✅ Merged | sumitdwivedi01/EigthyAwards#2 | 2026-10-05 · `phase-00.1-done` | n/a |
| 0.2 | On-site rounds and answers | `phase/00.2-onsite-rounds-and-answers` | ✅ Merged | sumitdwivedi01/EigthyAwards#3 | 2026-10-06 · `phase-00.2-done` | n/a |
| 0.3 | Plain-language overview | `phase/00.3-overview-page` | ✅ Merged | sumitdwivedi01/EigthyAwards#4 | 2026-10-07 · `phase-00.3-done` | n/a |
| 0.4 | New issues and the owner's answers | `phase-0.4-issues` | ✅ Merged (committed to `main` by mistake; accepted as is, see Daily 7 Oct) | — | 2026-10-07 · `phase-0.4-done` | n/a |
| 0.5 | UI overview and re-plan options | `phase-0.5-ui` | ✅ Merged | sumitdwivedi01/EigthyAwards#5 | 2026-10-08 · `phase-0.5-done` | n/a |
| 0.6 | One application per organisation | `phase-0.6-entry` | 🧪 In review | — | — | n/a |
| 1 | Backend foundation (+ new tables) | `phase/01-be-foundation` → `phase-1-setup` | ⏸ Parked: built, 62 tests passing, not merged | — | — | 62 passing |
| 2 | People: logins, roles, PA, departments (incl. external organisers), master data, organisations | `phase-2-people` | ⬜ | — | — | — |
| 3 | Award setup: rounds, forms, score sheets (R4), entry limit | `phase-3-awards` | ⬜ | — | — | — |
| 4 | Award sites (backend) | `phase-4-sites` | ⬜ | — | — | — |
| 5 | Frontend foundation, public award sites, skeleton deploy check | `phase-5-web` | ⬜ | — | — | — |
| 6 | Setup screens, brand kit, site builder | `phase-6-builder` | ⬜ | — | — | — |
| 7 | Applications, proof documents, entry limit, deadline lock (R4) | `phase-7-apply` | ⬜ | — | — | — |
| 8 | Applicant screens | `phase-8-applicant` | ⬜ | — | — | — |
| 9 | Proof check, masking, jury pool, conflicts, assignment, judging, audit (R1–R3) | `phase-9-judging` | ⬜ | — | — | — |
| 10 | Staff operations and jury screens | `phase-10-jury` | ⬜ | — | — | — |
| 11 | Approval, results, emails, dashboards, seed | `phase-11-results` | ⬜ | — | — | — |
| 12 | On-site rounds (backend) | `phase-12-onsite` | ⬜ | — | — | — |
| 13 | Results, on-site and dashboard screens | `phase-13-results-ui` | ⬜ | — | — | — |
| 14 | E2E tests and deployment | `phase-14-deploy` | ⬜ | — | — | — |
| 15 | Final deliverables and walkthrough | `phase-15-final` | ⬜ | — | — | — |

Status key: ⬜ not started · 🚧 in progress · 🧪 testing or in review · ✅ merged · ⛔ blocked

## Decisions of 7 Oct: where they stand

| Goal | Built in | Status |
|---|---|---|
| Branded award sites for all awards (brand kit, pages, sections, versions, no approval) | Phases 1 (tables), 4, 5, 6 | ⬜ |
| External organisers as departments; one head for several departments | Phases 2, 11 (department dashboard), 13 | ⬜ |
| Proof documents with every application, staff check, never to jury | Phases 1, 7, 8, 9, 10 | ⬜ |
| Entry limit with public "499 / 500" counter | Phases 3, 7, 8, 5 (site counter) | ⬜ |
| Own domains | Designed for (slug, `customDomain`), built later | ⬜ |

## The four rules: where they stand

| Rule | Enforced in | Tests | Status |
|---|---|---|---|
| R1 Blind judging hides who applied (document rounds) | Phase 9 | — | ⬜ |
| R2 No assignment with a recorded conflict | Phases 9 (document rounds), 12 (on-site panels) | — | ⬜ |
| R3 Who changed a score, and why | Phases 1 (audit trigger), 9, 12 (closed rounds, staff backup entry) | — | ⬜ |
| R4 Last year's applications still read correctly | Phases 1 (FormVersion trigger), 3, 7 | — | ⬜ |

## Leader-call goals: where they stand

| Goal | Built in | Status |
|---|---|---|
| Staff assigned to many awards | Phases 1 (schema), 3, 5 | ⬜ |
| Award goes to the organisation, never to plants | Phase 1 (schema; one organisation per PAN) | ⬜ |
| No signed authorisation letter | Removed from spec and plan (Phase 0.1) | ✅ docs |
| Leader's PA role | Phases 1, 2, 5, 11, 13 | ⬜ |
| Data consistency | Phases 1 (normalize, indexes), 2 (master data, organisations), 6 (identity snapshot) | ⬜ |
| One application per organisation per award, **blocked at the start**; colleagues read-only; staff release | Phases 1 (index), 7 (start check, release), 8, 10 | ⬜ |
| On-site rounds (shop-floor and live round 2): panels, averages, no approval | Phases 1 (schema), 3 (round types), 12, 13 | ⬜ |
| Results: Shortlisted/Rejected, then Gold/Silver/Bronze | Phases 3 (labels), 11, 12, 13 | ⬜ |
| GSTIN optional; fee per category | Phases 1, 2, 3, 6 | ⬜ |

---

## What has been achieved (newest first)

Each phase gets an entry when it starts. Tick items off as they land and keep the entry once the phase is merged. That way this section is the full history of what exists and why.


### Phase 0.6: One application per organisation · 🧪 · 2026-10-08 (Day 6)

The owner asked two questions about the prototype: can a colleague see an application someone else is filling, and can we stop a second one **before** it's filled, not after submission? Four details were agreed first (all recommended options, except "status only, no name").

- [x] Spec §5.2 rewritten: blocked at the start; status-only message; colleagues read-only ("Started by a colleague"); withdrawn and released don't count; staff release with a reason; a partial unique index for simultaneous starts. Related sections updated (§3, §4, §5.15, §5.16, §5.20, §7, §10–§15, §18).
- [x] ADR 0011; ADR 0007 note updated.
- [x] GAPS: A14, D08, E08 updated; J22 (answered), J23 (fake starter blocks the real one: staff release), J24 (no hand-over yet).
- [x] PHASES (Phase 0.6; Phases 1, 7, 10 and cut order), the prototype (start, My applications, staff list), the UI README, CLAUDE.md, Backend README, the overview, creating.md, Daily.md.
- [ ] Merged, tagged `phase-0.6-done`.

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
| Backend local URL | `http://localhost:4000` (planned) |
| Frontend local URL | `http://localhost:3000` (planned) |
| PostgreSQL (Docker) | `localhost:5432`, databases `awards` and `awards_test` (planned) |
| Mailpit | SMTP `localhost:1025`, inbox UI `http://localhost:8025` (planned) |
| Production | Frontend → Vercel · API → Render · DB and files → Supabase. Not created yet (Phase 14) |
| Pinned versions | Recorded here in Phases 1 and 4 |

## Seeded test accounts

Added in Phase 2. Passwords live only in `Backend/.env` and `.env.example` placeholders, never in this file.

## Deviations from the spec

| What | Why | Record |
|---|---|---|
| Two apps (Next.js on Vercel, Express on Render) instead of one Next.js app | The chosen hosting | ADR 0001 |
| Our own auth in the API instead of Auth.js | Auth.js doesn't fit a separate API | ADR 0003 |
| Phase branches → `main` instead of `develop` | The owner's workflow; one builder | ADR 0004 |
| EmailLog used as an outbox instead of sending during the request | Bulk emails and rollbacks | GAPS G-C03 |
| New role: Leader's PA | Leader call, 5 Oct | ADR 0005, spec §5.17 |
| Data consistency rules and master data | Leader call, 5 Oct | ADR 0006, spec §5.18 |
| No authorisation letter | Leader call, 5 Oct | ADR 0007 |
| On-site rounds built now (were "future"); no approval for them; medals | Answers, 6 Oct | ADR 0008, spec §5.16 |
| GSTIN optional | Answers, 6 Oct | Spec §5.2 |

---

## How to resume in a new chat

Paste this to an AI assistant (Claude Code loads `CLAUDE.md` automatically, but this works anywhere):

> We are building the Awards Platform in this repo. Read `CLAUDE.md`, then `docs/PROGRESS.md` (where we are), `docs/PHASES.md` (the plan, especially the current phase), and `docs/GAPS.md` §A (open decisions). The spec is in `docs/requirements.md`. Continue the current phase on its branch. Don't start a new phase until the current one meets its exit checklist. At the end, update PROGRESS.md, GAPS.md and Daily.md.

## End-of-session routine (every time)

1. Tick off finished items in the current phase's entry above, and update the **Snapshot** table.
2. Update the **phase status board** (and PHASES.md §2 when a phase changes state).
3. Close or add gaps in [GAPS.md](GAPS.md) and update its summary counts.
4. Add today's lines to [Daily.md](../Daily.md): Done · Next · Stuck (· Plan changed).
5. Commit with a `docs:` message on the current phase branch.
