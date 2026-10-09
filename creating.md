# creating.md: what we chose, and why

My own notes. One line per choice: **what** → **why**. The details live in `docs/`.

---

## The plan (from 9 Oct)

| Phase | What | When |
|---|---|---|
| **1. Working platform** (we're judged on this) | 2 different awards, set up on screen, run end to end online; the 4 rules tested | **Sat 10 – Thu 15 Oct** |
| **2. Complete product** | On-site rounds, site builder, admin screens, emails, robot tests | ~20 working days |
| **3. Launch-ready** | Security, privacy, load, payments, domains, client testing | ~15 days + testing |

**Phase 1, day by day**
- **Sat 10:** foundation + people (logins, roles, My profile, companies)
- **Sun 11:** award setup (settings, questions, scoring sheet, branded page)
- **Mon 12:** applying (form, proof, submit, entry limit) + proof check
- **Tue 13:** judging (masking, conflicts, several jury, scores, approval, results)
- **Wed 14:** online (Supabase + Render + Vercel), demo data, docs
- **Thu 15:** walkthrough with the lead

- **Why 3 phases** → the lead wants one solid, working thing first, then the rest in order.
- **Why only written rounds in Phase 1** → on-site rounds are a big feature used once or twice a year; Phase 2.
- **Why a simple branded page, not the builder** → shows the brand idea in a day; the builder takes four.
- **Why deploy on its own day** → things that work on a laptop can break online (cookies, database, files).
- **If late** → cut send-back, then file masking, then the dashboard. **Never** cut the 4 rules.
- Files: `docs/PLAN.md` (simple, for the lead), `docs/PHASES.md` (detailed steps), `docs/TECHNICAL-DESIGN.md` (data model, API).

---

## Big picture

- **One platform, ~80 awards** → an award is *settings*, not code. Staff create awards themselves.
- **Two apps** → screens on Vercel, backend on Render, database and files on Supabase.
- **The backend decides everything** → the screens only show what it says, so nobody can cheat by editing the page.
- **The 4 rules** → blind judging, conflicts, score history, frozen question versions. Enforced in the backend *and* the database.

## How we work

- **One branch per step** (`phase-1.2-setup`) → test → pull request → merge → tag. `main` always works.
- **Tests come with the code** → the reviewer trusts the tests, not my word.
- **Every decision is written down** (`docs/decisions/`) → options, choice, why, what would change it.

---

## Decisions (short)

**People and data**
- **5 roles** → leader, department head, staff, jury, applicant. The leader never touches judging.
- **No PA role** (9 Oct) → the leader's team uses the leader's account. One role, two flows and two screens fewer. Cost: the history can't tell which team member acted.
- **Award goes to the company** (one per PAN) → never to plants or units.
- **Data consistency** → one record per company, person, department; cleaned on save; lists instead of free text. It was the client's biggest problem.
- **No signed letter** → too manual. Instead: proof documents.

**Applying**
- **One application per company, blocked at the start** → no wasted forms; colleagues see it read-only (status only, no name); staff can release a wrong one.
- **ID + LinkedIn once, on My profile** → identity doesn't change between awards; fewer copies of a sensitive file.
- **Proof of employment per application, dated within 3 months** → the real question is "do they work there *now*?".
- **Each award checks its own proof** → each department stays responsible.
- **Entry limit "499 / 500"** → the count and the submit happen in one locked step, so the last place can't go twice.
- **Change password on My profile** → needs the old one; other devices get signed out; an email is sent.

**Judging**
- **Several jury per application** (staff set min–max) → averaging removes one person's bias.
- **Jury never see each other's marks** → independent judgement.
- **Average, rounded once at the end** → rounding doesn't tilt the result.
- **Scores 0–10, whole numbers** → simple, also on a phone.
- **Head approves written rounds**; on-site rounds (Phase 2) have no approval → staff close them.
- **Medals** (Phase 2) → one Gold / Silver / Bronze per award, ranks 1–3 overall.

**Branding**
- **Every award gets a branded page** → organisers keep their brand (like FPO Awards).
- **Ready-made sections, never free HTML** → free HTML breaks layouts and can hide harmful scripts.
- **Automatic parts** (deadline, counter, categories) → read live data, so never out of date.

---

## Tech choices (backend foundation, built 6 Oct)

- **Express 5 + TypeScript strict** → familiar; strict types catch mistakes early.
- **Exact versions** (Prisma 7.10.0, TS 6.0.3) → "latest" was an unreleased test version.
- **Real PostgreSQL in tests** → the rules depend on real database behaviour.
- **Docker for PostgreSQL + Mailpit** → one command; Mailpit catches emails locally.
- **Database as a second guard** → case-insensitive names, CHECKs, history that can't be edited, foreign keys that keep awards apart.
- **One clock (`clock.now()`)** → tests can jump past a deadline.
- **Audit in the same transaction** → a change and its history entry succeed or fail together.
- **Email outbox** → emails are sent only after the change has been saved.

**AI mistakes we caught** (the brief asks for one)
- Prisma's docs named a setting that doesn't exist → check the installed types.
- A database rule passed with an *empty* value (SQL "unknown" counts as pass) → caught by real-database tests.
- Error messages disappeared through Prisma → fixed with a new migration, never by editing an old one.

---

## Where the code runs

| Where | Database | For |
|---|---|---|
| My laptop | `awards` in Docker (port 5433) | Development |
| My laptop + GitHub CI | `awards_test`, or a fresh one in CI | Tests |
| Online (from 14 Oct) | Supabase | The demo: API on Render, screens on Vercel |

- Secrets only in `.env`, the Render or Vercel dashboards, never in Git.
- Tests refuse to run on a database without "test" in its name.

---

## Words

- **Migration**: a saved SQL change to the database structure, run in order.
- **Seed**: starter data (lists, demo users).
- **Transaction**: several writes that succeed or fail together.
- **Trigger / CHECK**: database rules that run by themselves.
- **Partial unique index**: "unique, but only among matching rows" (e.g. one *active* application per company).
- **Session version**: a number per user; raising it signs out every device.
- **Outbox**: a table of emails to send, written with the change.
- **Slug**: the short name in an address, like `fpo` in `/awards/fpo`.
- **Prototype**: clickable screens with no real data, to agree on the flow first.
- **DPDP Act 2023**: India's personal-data law: consent, minimum data, delete when done.

---

## What I do by hand

**Tonight (9 Oct)**
1. Read `docs/PLAN.md`.
2. Push and open a PR for `phase-0.8-plan` (it contains 0.7), merge it with a merge commit, and tag `phase-0.8-done`.

**Each day of Phase 1**
1. Start Docker Desktop.
2. In `Backend/`: `docker compose up -d`, then `npm test`, then `npm run dev` (API on http://localhost:4000).
3. In `Front-End/` (from Step 1.1): `npm run dev` (screens on http://localhost:3000).
4. Emails: http://localhost:8025 (Mailpit).
5. At the end of the day: review the PR, merge it, and tag `phase-1.<n>-done`.

**Wed 14 Oct (deployment): my accounts, my clicks**
- Supabase, Render and Vercel accounts are mine. Claude never creates accounts or types passwords. I paste the keys into their dashboards.
