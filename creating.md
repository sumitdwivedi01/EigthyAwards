# creating.md: what we chose, and why

My own learning notes. Short and simple. One line per choice: **what** we picked, then **why**.
Updated every working session. (The detailed versions live in `docs/`.)

---

## The big picture

- **One platform for ~80 awards.** An award is *data* (settings), not *code*. Staff create new awards themselves.
- **Two apps.** The frontend (screens) runs on Vercel. The backend (rules + database) runs on Render. The database is on Supabase.
- **The backend decides everything.** The frontend only shows what the backend says. So nobody can cheat by editing the page.
- **The four rules** (blind judging, conflicts, score audit, question versions) are enforced in the backend *and* the database.

## How we work

- **One branch per phase** → test → pull request → merge into `main` → tag it. Why: `main` always works, and each phase is easy to review.
- **Tests come with the code, not after.** Why: the reviewer reads the tests to trust the rules.
- **Every decision is written down** (`docs/decisions/`). Why: the brief asks for options, the choice, why, and what would change our mind.

---

## Phase 0 decisions (planning)

- **Separate frontend and backend** → because of the hosting (Vercel + Render). The backend is the only door to the data.
- **Our own login, cookie through the frontend** → browsers like Safari block cookies across two different sites.
- **Leader's PA role** → the leader's team does organisational work, never judging. Every PA action is logged.
- **Data consistency** → one record per organisation, person and department, cleaned on save, with lists instead of free text.
- **No signed authorisation letter** → the leader wants it automated. Known weakness: PAN + GSTIN isn't secret.
- **On-site rounds** → shop-floor competitions and live round 2 are the same thing: a panel scores a live presentation.
- **Medals** → one Gold/Silver/Bronze per award (ranks 1–3 overall).
- **Scores** → whole numbers 0–10. Simple to type on a phone.

---

## Phase 1 decisions (backend foundation): 6 Oct

**Tools**
- **Express 5 + TypeScript (strict)** → familiar, simple, and strict types catch mistakes before running.
- **Prisma 7.10.0 (pinned), not "latest"** → "latest" on npm is an unreleased 8.0 test version. Never install untested software.
- **TypeScript 6.0.3, not 7** → our linter (`typescript-eslint`) doesn't support TS 7 yet.
- **Exact versions everywhere** → my laptop, CI and Render all install exactly the same thing.
- **Vitest + a real PostgreSQL in tests** → the rules depend on real database behaviour, so no fake database.

**Local setup**
- **Docker runs PostgreSQL + Mailpit** → one command starts everything. Mailpit catches all emails locally.
- **PostgreSQL on port 5433, not 5432** → so it never clashes with another PostgreSQL on the laptop.
- **A separate `awards_test` database** → tests wipe their data; my development data stays safe.

**Database safety (the "second line of defence")**
- **Case-insensitive names (`citext`)** → "Energy" and "energy" can't both exist. That's data consistency.
- **Foreign keys that include the cycle** → an application can't point at another award's category. Awards can't mix.
- **Partial unique indexes** → exactly one active leader; no duplicate role for the same person and scope.
- **CHECK constraints** → bad PAN/GSTIN formats, scores above 10, and files over 10 MB are refused by the database itself.
- **Append-only triggers** → audit history, form versions and disqualification history can never be edited or deleted.
- **One-jury trigger** → in a document round, only one active jury member per application.

**Code design**
- **One clock (`clock.now()`)** → tests can "jump" past a deadline without waiting.
- **Typed errors (400/401/403/404/409)** → services say *what* went wrong; one place turns that into HTTP.
- **Audit inside the same transaction** → if the change fails, the log entry disappears too, and the other way round.
- **Email outbox** → emails are saved first, and sent only after the change succeeds. No emails for undone changes.
- **Normalisers in one file** → PAN, GSTIN, email, phone and PIN are always cleaned the same way.
- **Storage and mailer behind interfaces** → local disk/Mailpit now, Supabase Storage/email API later, with no module changes.

**Things that surprised us (lessons)**
- Prisma's own AI docs mentioned a setting (`directUrl`) that doesn't exist. **Check the installed types, not the docs.**
- AI-remembered GSTIN numbers didn't agree with the checksum. **Don't build hard rules on remembered data.**
- An ESM example would compile but crash at runtime. **Think about how Node actually runs the code.**

---

**Bugs the tests caught on day one (6 Oct)**
- **A rule that let bad data in.** "Panel size must be ≥ 1" passed when the panel size was *empty*, because in SQL "empty ≥ 1" is "unknown", and unknown counts as a pass. Fixed by saying "must not be empty" explicitly.
- **Errors that lost their message.** The database refused the bad writes correctly, but Prisma relabelled the error and dropped our explanation. Fixed by using an error code Prisma passes through.
- **How we fixed them:** a *new* migration, never editing the old one. Old migrations may already exist on other databases.
- **Lesson:** these were AI-written code that looked right. Tests on a **real** database caught both. A fake database wouldn't have.

**Drift check**
- A third local database, `awards_shadow`, is scratch space. Prisma replays the migrations there and compares them with the schema.
- The result was "No difference detected": no future migration will try to undo our hand-written rules. CI checks this on every pull request.

---

## Where the code runs (4 places, 4 separate databases)

| Where | Database | Server |
|---|---|---|
| My laptop: development | `awards` (Docker) | `npm run dev` → localhost:4000 |
| My laptop: tests | `awards_test` (Docker) | none; tests call the code directly |
| GitHub CI | a fresh PostgreSQL per run, thrown away | none |
| Production (online) | **Supabase** | **Render** (API) + **Vercel** (screens) |

- Each place has its **own settings**: `.env` on my laptop, the workflow file on GitHub, the Render dashboard online. Secrets never go into Git.
- Tests **refuse to run** unless the database name contains "test". They empty their tables, so this protects my data.

**Why Docker?**
- One command starts exactly PostgreSQL 16 + Mailpit, the same for everyone (and for the reviewer).
- Nothing gets installed on Windows itself; it's isolated and can be thrown away.
- It's only for laptops. Production uses Supabase and Render, not our Docker.

**Supabase: how and when**
- It's cloud PostgreSQL plus file storage (for uploaded documents, from Phase 6).
- Tables get there through the **migration files**, run by Render on deploy. My laptop data is never copied.
- Only starter lists and the leader account are seeded. Everything else comes from real users.
- First used at the **end of Phase 5** (test deploy), then for real in **Phase 14**.
- Two addresses: `DIRECT_URL` for migrations, `DATABASE_URL` (pooled) for the running app.
- Plan: two Supabase projects, *staging* (tests) and *prod* (real), so experiments can't hurt real data.

---

## New issues (7 Oct): what we're proposing, and why

- **Show the UI before building** → simple grey wireframes per role (Phase 0.5). People react to screens, not to tables of rules.
- **Branded award sites** → each award gets its own site: brand kit (logo, colours) + pages made of **ready-made sections** (banner, categories, gallery, past winners, FAQ…). Staff fill them in, with no developer.
- **Why sections, not free design** → free HTML breaks layouts, can hide harmful scripts, and can't be checked. Website builders and award software all use sections.
- **Automatic sections** → the deadline, categories and past winners come from our real data, so they're never out of date. That's data consistency again.
- **Organiser = department** → the leader creates it and appoints the organiser's person as head; they run their award alone. Mostly already in our design.
- **One entry per organisation, plus a limit** → staff can cap the number of entries; fake duplicates count only once.
- **Verify the applicant** → LinkedIn link + proof of employment, checked once per person per organisation and reused for every award. It's personal data, so: consent, minimal documents, deleted after a while, never shown to jury.
- **Own domain** → in steps: `platform/awards/fpo` now → `fpo.platform.in` later → `fpoawards.in` on request. The brand matters more than the address.
- **Honest scope** → it can't all fit in 10 days. We chose to extend the plan (see below), not to cut.
- **Simple branch names** → `phase-2-people` instead of `phase/02-be-identity-orgs`.

**What we decided (7 Oct, my answers)**
- **Plan extended, nothing cut** → about one phase per day, to Day 21. The reviewer must agree on 9 Oct.
- **Award sites for every award** → the same engine for all, so CII's own awards look good too.
- **Staff decide what shows where, and can redesign after publishing** → each publish is a saved version, so mistakes can be undone.
- **No approval to go live** → organisers are independent. The leader can look, not edit.
- **Proof with every application** → an ID (masked Aadhaar only) + proof of employment + LinkedIn link. No proof, no submit; never shown to jury.
- **Entry limit shown to everyone** → "499 / 500", so applicants know how many places are left.
- **Only staff create awards**, and one person can head several departments.
- **Old decisions brought over** (whole-number scores, one medal set per award, build order) → they were stuck on the parked branch.

---

## Words you'll see

- **Migration**: a saved SQL file that changes the database structure, run in order.
- **Seed**: starter data (like the list of award domains) put into an empty database.
- **Transaction**: several database writes that succeed or fail *together*.
- **Trigger**: a small database rule that runs automatically on insert/update/delete.
- **CHECK constraint**: a database rule a row must obey (e.g. score between 0 and 10).
- **CI**: GitHub runs lint + type check + tests on every pull request, automatically.
- **Outbox**: a table of "emails to send", written in the same transaction as the change.
- **Shadow database**: a scratch database Prisma uses to compare migrations with the schema.
- **Drift**: when the database and the schema disagree. The drift check catches it.
- **NULL**: an empty value. In SQL, comparing with NULL gives "unknown", not true or false.
- **Brand kit**: an organiser's logo, colours, fonts and social links, reused by all their award pages.
- **Section (block)**: one ready-made part of a page (banner, gallery…) that staff fill in.
- **Slug**: the short name in a web address, like `fpo` in `/awards/fpo`.
- **DPDP Act 2023**: India's personal-data law: ask consent, collect the minimum, delete when no longer needed.

---

## What I do by hand (current)

1. **Start Docker Desktop** and wait until it says "running".
2. In a terminal, from the `Backend` folder:
   - `docker compose up -d` → starts PostgreSQL + Mailpit
   - `npm run db:deploy` → creates the tables
   - `npm run db:seed` → adds the starter lists
   - `npm test` → runs every test
   - `npm run dev` → starts the API on http://localhost:4000
3. Open http://localhost:4000/api/health → should show `{"status":"ok","db":"up"}`.
4. Open http://localhost:8025 → the Mailpit inbox (empty for now).
5. Review the pull request on GitHub, then merge it (merge commit) and tag `phase-01-done`.
