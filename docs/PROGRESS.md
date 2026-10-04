# Progress tracker

> **Start here in any new session (human or AI).** This file says exactly where the project stands. It is updated at the end of every working session and every phase. If this file and the code disagree, the code is the truth, so fix this file.

## Snapshot

| | |
|---|---|
| **Last updated** | 2026-10-04 · Day 2 |
| **Current phase** | Phase 0: Planning and tracking setup (🚧 docs written, waiting for review, commit and merge) |
| **Current branch** | `phase/00-planning-docs` (local only, not pushed yet) |
| **What runs today** | Nothing yet. The repo holds docs only. |
| **Next action** | 1) Review the Phase 0 docs, 2) answer the decisions in [GAPS.md §A](GAPS.md), 3) commit, push and merge Phase 0 into `main`, 4) start Phase 1 on `phase/01-be-foundation`. |
| **Blockers** | None. GAPS §A decisions have defaults, so work can go on without them. |

## Phase status board

The live version of the table in [PHASES.md §2](PHASES.md). Update the row whenever a phase changes state.

| # | Phase | Branch | Status | PR | Merged | Tests |
|---|---|---|---|---|---|---|
| 0 | Planning and tracking setup | `phase/00-planning-docs` | 🚧 In progress | — | — | n/a |
| 1 | Backend foundation | `phase/01-be-foundation` | ⬜ | — | — | — |
| 2 | Identity, departments, organisations | `phase/02-be-identity-orgs` | ⬜ | — | — | — |
| 3 | Award configuration engine (R4) | `phase/03-be-award-config` | ⬜ | — | — | — |
| 4 | Frontend foundation | `phase/04-fe-foundation` | ⬜ | — | — | — |
| 5 | Setup screens | `phase/05-fe-award-setup` | ⬜ | — | — | — |
| 6 | Applications and deadline lock (R4) | `phase/06-be-applications` | ⬜ | — | — | — |
| 7 | Applicant journey | `phase/07-fe-applicant` | ⬜ | — | — | — |
| 8 | Masking, jury pool, conflicts, assignment (R1, R2) | `phase/08-be-masking-assignment` | ⬜ | — | — | — |
| 9 | Judging, score audit, disqualification (R3) | `phase/09-be-judging-audit` | ⬜ | — | — | — |
| 10 | Staff operations and jury scoring | `phase/10-fe-masking-judging` | ⬜ | — | — | — |
| 11 | Approval, results, emails, reporting, seed | `phase/11-be-approval-results` | ⬜ | — | — | — |
| 12 | Approval, results, dashboards | `phase/12-fe-approval-results` | ⬜ | — | — | — |
| 13 | E2E tests and deployment | `phase/13-e2e-deploy` | ⬜ | — | — | — |
| 14 | Final deliverables and walkthrough | `phase/14-final-review` | ⬜ | — | — | — |

Status key: ⬜ not started · 🚧 in progress · 🧪 testing or in review · ✅ merged · ⛔ blocked

## The four rules: where they stand

| Rule | Enforced in | Tests | Status |
|---|---|---|---|
| R1 Blind judging hides who applied | Phase 8 | — | ⬜ |
| R2 No assignment with a recorded conflict | Phase 8 | — | ⬜ |
| R3 Who changed a score, and why | Phases 1 (audit trigger), 9 | — | ⬜ |
| R4 Last year's applications still read correctly | Phases 1 (FormVersion trigger), 3, 6 | — | ⬜ |

---

## What has been achieved (newest first)

Each phase gets an entry when it starts. Tick items off as they land and keep the entry once the phase is merged. That way this section is the full history of what exists and why.

### Phase 0: Planning and tracking setup · 🚧 · 2026-10-04 (Day 2)

Goal: put everything a new person (or a new AI session) needs into the repo, and fix the plan before writing code.

- [x] Read the three source documents: the brief, the product and technical spec (2 Oct 2026), and the high-level architecture PDF (11 pages).
- [x] `docs/brief.md`: the brief converted to Markdown, wording unchanged.
- [x] `docs/requirements.md`: the full spec converted to Markdown (sections 1–18, tables, JSON schemas). The diagrams are not reproduced; they point to the PDF.
- [x] `docs/architecture/Awards_Platform_High_Level_Architecture.pdf`: the architecture drawing, kept as is.
- [x] `docs/PHASES.md`: the plan. 15 phases (0–14), backend first and alternating with frontend, each with goal, scope, tests, "done when" and a manual check. Exit checklist, workflow and cut order.
- [x] `docs/GAPS.md`: 83 tracked items across 7 sections. 10 of them are the decisions in §A, which are waiting for an answer.
- [x] `docs/decisions/`: an ADR index plus 0001 (split and hosting), 0002 (tech stack), 0003 (auth and sessions) and 0004 (git workflow).
- [x] `CLAUDE.md`: working rules and file map for AI coding sessions, so a new chat picks up the context automatically.
- [x] `.github/pull_request_template.md`: the phase exit checklist as a PR template.
- [x] `.gitignore` for Node, Next.js, env files, uploads and coverage.
- [x] README updates: root `README.md`, `Backend/README.md`, and `Front-End/README.md` (renamed from `Frontend.md`).
- [x] `Daily.md`: today's entry.
- [ ] You review the docs and answer [GAPS.md §A](GAPS.md), or accept the defaults.
- [ ] Commit, push the branch, open a PR, merge into `main`, tag `phase-00-done`.

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
| Production | Frontend → Vercel · API → Render · DB and files → Supabase. Not created yet (Phase 13) |
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
