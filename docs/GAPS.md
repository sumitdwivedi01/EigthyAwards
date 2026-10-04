# Gaps, open questions and risks

> Everything that is **missing, contradictory, undecided or risky** in the project. Every gap has an ID, so commits, ADRs and PRs can refer to it (e.g. `fixes G-B04`).
>
> **Status values:** `Open` (nobody has decided; the default is used) · `Decision needed` (we need your answer, or the reviewer's) · `Default adopted` (we are building the default; it can still change) · `Decided` (an ADR records it) · `Fixed` (done and tested) · `Accepted risk` (known and deliberately left).
>
> Last updated: 2026-10-04 (Day 2, Phase 0). Update this file at the end of every phase.

## Summary

| Section | What it covers | Count | Not yet closed* |
|---|---|---|---|
| A | Decisions we need from you before or during the build | 10 | 10 |
| B | Gaps caused by splitting frontend and backend across Vercel, Render and Supabase | 15 | 13 |
| C | Architecture gaps from the architecture PDF (pages 10–11) | 15 | 14 |
| D | Contradictions and holes found in the spec while planning | 11 | 10 |
| E | Client questions still open from spec §18 | 16 | 16 |
| F | Brief deliverables not yet in the repo | 9 | 6 |
| G | Repository and process gaps | 7 | 4 |

\* Not yet closed = any status except `Decided`, `Fixed`, `Accepted risk` or `Done`. "Default adopted" still counts as open until the code that implements it is merged and tested.

---

## A. Decisions needed (answer these first)

Until you answer, the **default** is what gets built. Each one points to the detailed gap.

| ID | Question | Default until answered | Needed by |
|---|---|---|---|
| A1 | Build order: backend and frontend phases **alternating** (as in PHASES.md), or **all backend first, then all frontend**? | Alternating, backend first (G-B13) | Phase 1 |
| A2 | Is a throw-away "hello world" deploy of the empty skeletons acceptable around Phase 4, to test the cookie proxy and the Supabase connection early? No real features would be deployed. | No early deploy (your instruction); risks stay open until Phase 13 | Phase 4 |
| A3 | Login: a session cookie through the Next.js `/api` proxy (ADR 0003), or a bearer token in the browser? | Cookie through the proxy (G-B02) | Phase 2 |
| A4 | Email provider for production (Render may block SMTP): Resend, Brevo or another? Do we have a domain to send from? | An HTTP email API behind the mailer interface; provider chosen in Phase 13 (G-B06) | Phase 13 |
| A5 | Authorisation letter template: DOCX or PDF? | DOCX, so organisations can print it on their letterhead (G-C09) | Phase 6 |
| A6 | Does an unverified authorisation letter **block** masking and assignment, or only show a warning? | A warning only (G-C08) | Phase 6 |
| A7 | Snapshot the organisation's identity onto the application at submit (frozen at the deadline)? | Yes (G-C07) | Phase 1 (schema) |
| A8 | Editing an already-submitted application: an explicit "Save changes" that runs full validation (no autosave)? | Yes (G-D02) | Phase 6 |
| A9 | Indicator scores: whole numbers 0–10, or decimals like 7.5? | Whole numbers (G-D09) | Phase 3 |
| A10 | Module folders: 15 (adding `departments` and `jury-pool`), or fold them into identity and judging? | 15 folders (G-C01) | Phase 1 |

---

## B. Gaps from the deployment split (Vercel + Render + Supabase)

The spec (§8, §9) and the architecture PDF describe **one Next.js app** using Auth.js and server actions. We are building **two apps**: a Next.js frontend on Vercel and an Express API on Render, with PostgreSQL and file storage on Supabase. That creates the gaps below. See [ADR 0001](decisions/0001-frontend-backend-split-and-hosting.md).

| ID | Gap | Impact | Default / proposed fix | Phase | Status |
|---|---|---|---|---|---|
| G-B01 | Parts of the spec assume one Next.js app: Auth.js, server actions, Next.js middleware as the gate, `/api/files/:id` inside Next.js. | The spec no longer matches the build in §8, §9, §11 and §16. | ADR 0001 lists what is superseded. Server actions become REST endpoints on the Express API, Auth.js becomes our own auth (ADR 0003), and the access layer moves into the Express services unchanged in spirit. | 0 | Decided |
| G-B02 | **Cross-site cookies.** `*.vercel.app` and `*.onrender.com` are different sites. Safari blocks third-party cookies, so a cookie set by the API would not be sent. | Login would fail in some browsers. | The Next.js rewrite proxies `/api/*` to Render, so the browser only talks to the Vercel origin and the cookie is first-party (httpOnly, Secure, SameSite=Lax). Fallback: a bearer token. Confirm with A3 and A2. | 2, 4, 13 | Decision needed |
| G-B03 | **10 MB files.** Uploads through the Vercel proxy may hit body-size limits (4.5 MB for functions; the limit for external rewrites needs checking). Render's disk is wiped on every deploy and restart. | Uploads fail, or files vanish. | Files live in **Supabase Storage** (private bucket, S3-compatible). The browser uploads and downloads using short-lived **signed URLs** that the API issues only after its access checks (R1 still holds). Locally, a disk driver behind the same storage interface. | 6, 13 | Default adopted |
| G-B04 | **Supabase Data API exposure.** Supabase serves tables in the `public` schema over its REST API to anyone holding the anon key, unless row-level security (RLS) is on. Prisma creates tables in `public`. | **Security:** applicant identity, scores and audit could be read directly, bypassing every rule. | Turn on RLS for every table with no policies (our API connects as the owner, which bypasses RLS), and/or turn off Data API exposure of `public`. Test it in Phase 13 with a `curl` using the anon key, which must return nothing. | 13 | Open, **high** |
| G-B05 | Supabase connections: the app needs the pooled connection string (transaction mode), while migrations need a direct or session connection. | Migrations hang, or the app runs out of connections. | Two env variables (`DATABASE_URL` pooled, `DIRECT_URL` direct). Configure them the way the Prisma version we pin expects. | 1, 13 | Open |
| G-B06 | **Email in production.** Render's free tier may block outbound SMTP ports (needs checking). Sending to arbitrary inboxes usually needs a verified sender domain. | No emails in production. | The mailer interface gets an HTTP API driver (Resend or Brevo) for production and SMTP with Mailpit locally. Every email is logged in EmailLog either way. Provider: see A4. | 13 | Decision needed |
| G-B07 | **Render free tier sleeps** after about 15 minutes idle; the first request then takes about 30–60 seconds. The outbox dispatcher only runs while awake. | The walkthrough looks broken; emails are delayed. | The frontend shows a "waking the server" state. Call `/api/health` before a demo. Consider a paid instance for walkthrough week. | 13 | Open |
| G-B08 | Supabase free tier pauses projects after about a week of inactivity, and its backups are limited. The spec's NFR asks for managed backups. | A paused database during review. | Accept for the demo, and say so in the README. Upgrade if it becomes a real system. | 13 | Accepted risk |
| G-B09 | Running migrations on Render: a pre-deploy command may need a paid plan. | The schema is out of date after a deploy. | Run `prisma migrate deploy` in the build or start command. Check this in Phase 13. | 13 | Open |
| G-B10 | **API contract drift.** Two apps, and no shared types package. | The frontend breaks quietly when the backend changes. | `docs/API.md` is the contract, updated in every backend phase. The frontend keeps its own Zod schemas for forms. E2E tests catch drift. Generate an OpenAPI client later if needed. | 1+ | Default adopted |
| G-B11 | CSRF and CORS for cookie auth. | Cross-site request forgery. | The proxy keeps requests same-origin. Cookies use SameSite=Lax. The CORS allowlist holds only the frontend origin, and state-changing requests have their `Origin` header checked. | 2 | Default adopted |
| G-B12 | Two apps, one notion of time. | The UI shows "open" while the API says "closed". | Only the backend decides deadline state, using `clock.now()`. The frontend only shows what the API returns: times in IST, stored in UTC. | 4+ | Default adopted |
| G-B13 | Building all of the backend before any UI would leave the UI (about 30 screens) squeezed into about 2 days, and the brief's success test is staff configuring awards **in the UI**. | The UI is late or thin. | Alternate the phases: three backend phases first, then each frontend phase right after the backend phase it needs. See A1. | Plan | Decision needed |
| G-B14 | **Library versions have moved.** Prisma 7, Express 5, Next.js 15/16 and Tailwind 4 changed setup compared with older tutorials (and older AI training data). | Plausible-looking but wrong config. | Pin versions in Phase 1 and Phase 4 and follow each library's current docs. Log any AI mistakes in `docs/ai-notes.md`; the brief asks for one. | 1, 4 | Open |
| G-B15 | The leader account in production is "created at setup". | Credentials leak, or there's no way to log in. | The seed reads `LEADER_EMAIL` and `LEADER_PASSWORD` from the environment and never commits them. The password is changed after first login. | 2, 13 | Default adopted |

---

## C. Architecture gaps (from the architecture PDF, pages 10–11)

The numbers match the PDF's cards. The spec does not answer any of them. The PDF proposed the defaults, and we are adopting them unless noted.

| ID | Gap | Default we build | Phase | Status |
|---|---|---|---|---|
| G-C01 | The module list disagrees with itself (12 vs 13 vs 15). | 15 module folders, including `departments` and `jury-pool` (A10). | 1 | Decision needed |
| G-C02 | 10 MB files won't fit through a Vercel function. | Partly solved by the API moving to Render; the rest is G-B03 (signed URLs). | 6 | Default adopted |
| G-C03 | Emails are sent during the request. One request can mean about 1,000 emails, and an email can go out for a change that later rolls back. | Treat **EmailLog as an outbox**: insert PENDING rows in the same transaction, send in batches after commit. | 1, 11 | Default adopted |
| G-C04 | Some statuses change with time ("Closed", "Not submitted") but no job runs. | Derive them from `clock.now()` on read, and store them on the next write. Dashboards use the derived value. | 3, 6, 11 | Default adopted |
| G-C05 | Invite and reset tokens have no table. | An `AuthToken` table: hashed token, type, expiry, used-at, single use. | 1, 2 | Default adopted |
| G-C06 | Removing an assignment conflicts with "never hard-delete". | A `REVOKED` evaluation status with a reason, and a partial unique index allowing one **active** evaluation per (round, application). | 1, 8 | Default adopted |
| G-C07 | The identity section reads the live organisation profile, so last year's application would show this year's name and address. | Copy identity onto the application at submit, refresh it until the deadline, freeze it at the lock (A7). | 1, 6 | Decision needed |
| G-C08 | "Verify authorisation letters" has no operation or outcome. | `verifyAuthLetter` with status PENDING / VERIFIED / REJECTED plus a reason, audited (A6). | 6 | Decision needed |
| G-C09 | The pre-filled letter template needs a generator. | Generated on the server from one platform template, as DOCX (A5). | 6 | Decision needed |
| G-C10 | "Append-only audit" is only a convention. | A DB trigger that rejects UPDATE and DELETE on AuditEvent (and on FormVersion). Also audit role assignments, staff changes and letter verification. | 1 | Default adopted |
| G-C11 | Unique keys with NULL scope columns let duplicates in, and "exactly one leader" isn't enforced. | `NULLS NOT DISTINCT` (PostgreSQL 15+, which Supabase has) or partial unique indexes, plus a partial unique index on LEADER. | 1 | Default adopted |
| G-C12 | No login throttling and no monitoring. | Rate limits per email and per IP on login and reset; structured pino logs; an error tracker is optional. | 2, 13 | Default adopted |
| G-C13 | "Safe as is" files need a representation. | A MASKED_EVIDENCE row pointing at the same storage key, so the jury file check stays one rule. | 8 | Default adopted |
| G-C14 | Should totals be computed or stored? | Computed with `computeScore` on read; totals and ranks snapshotted on approval so results never shift. | 9, 11 | Default adopted |
| G-C15 | The live round would need realtime updates. | Not built. When it is: short polling first. Render (unlike Vercel functions) can hold a WebSocket if needed. | Future | Accepted risk |

---

## D. Contradictions and holes found in the spec (Day 2 review)

| ID | Where | Problem | Default we build | Phase | Status |
|---|---|---|---|---|---|
| G-D01 | §2 Glossary vs §10 Data model | The glossary defines an Evaluation as one jury member scoring *multiple* applications. The data model has one Evaluation per (round, application, jury member). | The data model wins: **one Evaluation = one jury member × one application × one round.** Fix the glossary wording. | 0 | Default adopted |
| G-D02 | §5.6 | "Each save [of a submitted application] must pass the same checks as submitting" can't coexist with autosave, which saves half-typed answers. | Drafts autosave. Submitted applications are edited with an explicit **Save changes** that runs full validation (A8). | 6, 7 | Decision needed |
| G-D03 | §4 table vs §5.4 | "Update requested" shows the applicant "Pending: your application is not submitted yet", but §5.4 says the application **stays submitted**. | Show "Submitted, update requested: questions changed, please review the highlighted ones before the deadline". | 6 | Open |
| G-D04 | §4 Round status | Nothing says what moves a round from "Not started" to "Judging". | Derived: Judging as soon as the round has any active evaluation. | 9 | Default adopted |
| G-D05 | §16 Git workflow | The spec uses a `develop` branch. We are using phase branches merged straight into `main` via PR. | ADR 0004. | 0 | Decided |
| G-D06 | §11 Errors | Only 4 typed errors, with no "not logged in" case. | Add `UnauthenticatedError` → 401. | 1 | Default adopted |
| G-D07 | §5.3 vs §5.5 | The publish gate checks weights only at publish, but the scoring sheet stays editable until the first score, and questions can be added mid-cycle. | Every scoring sheet save after publish must also pass weight and reference validation. Indicators for new questions can be added until the first score. | 3 | Default adopted |
| G-D08 | §5.11 | "Every non-disqualified application has a submitted evaluation" doesn't define the set. What about Withdrawn, Not submitted, Rejected as duplicate, or unresolved duplicate flags? | Eligible = submitted at the lock, and not withdrawn, rejected as duplicate or disqualified. Send for approval is refused while duplicate flags are unresolved. | 11 | Default adopted |
| G-D09 | §5.5 | "Score 0 to 10": whole numbers or decimals? | Whole numbers (A9). | 3 | Decision needed |
| G-D10 | §5.10 | "Reinstate returns it to the state it was in", even if the round has been approved since? | Reinstating is refused once the round is approved. | 9 | Default adopted |
| G-D11 | §5.7 | Masking can be reopened while the jury holds draft scores. What does the jury see? | Reopening hides the application from the jury until masking is marked done again. Draft scores are kept. | 8 | Default adopted |

---

## E. Client questions still open (spec §18)

The full wording and the 13 assumptions (A1–A13) are in [requirements.md §18](requirements.md). The defaults are what we build. Questions 1–7 would change the data model or the roles.

| ID | Question (short) | Default in use | Status |
|---|---|---|---|
| G-E01 | The legal company applies, or each plant separately? | The legal entity, by PAN; one application per cycle | Open |
| G-E02 | Is the department head's approval final? | Yes; the leader only watches | Open |
| G-E03 | Who creates staff: the department head or the leader? | The department head | Open |
| G-E04 | Can a department head create awards? | No, only staff | Open |
| G-E05 | Can a department head edit scores? | No; approve or send back only | Open |
| G-E06 | Exactly one leader? | Yes | Open |
| G-E07 | Several judges per application in the live round? | Yes, in future; round 1 has one | Open |
| G-E08 | Duplicates: block, or allow and flag? | Allow, flag both, staff resolve | Open |
| G-E09 | Must the applicant resubmit after questions are added? | No; flagged "Update requested" | Open |
| G-E10 | How do weights work? | Section weight, then indicator weight within the section | Open |
| G-E11 | Does anyone approve the shortlist? | No | Open |
| G-E12 | What does a disqualified applicant see? | "Under review", then "Rejected" | Open |
| G-E13 | Is recording conflicts acceptable for rule 2? | Yes; recorded conflicts are blocked | Open |
| G-E14 | Must every organisation have a GSTIN? | Yes (NGOs and government bodies may not have one) | Open |
| G-E15 | How do shop-floor competitions (Kaizen, 5S) work? | Not modelled; documented as where the model breaks | Open |
| G-E16 | Withdraw after the deadline? | No | Open |

---

## F. Brief deliverables (what the reviewer expects in the repo)

| ID | Deliverable | Where | Phase | Status |
|---|---|---|---|---|
| G-F01 | The plan, kept up to date | [PHASES.md](PHASES.md) | 0 | Done (on merge) |
| G-F02 | Daily progress: done, next, stuck | [Daily.md](../Daily.md) | Daily | Ongoing |
| G-F03 | Decisions: options, choice, why, what would change it | [decisions/](decisions/) | Ongoing | Started |
| G-F04 | Code, with a README a stranger can run from | README.md, Backend/, Front-End/ | 14 | Open |
| G-F05 | One page: the journey of each user | docs/user-journeys.md (content drafted in spec §7) | 14 | Open |
| G-F06 | A simple drawing of how the parts fit | The PDF exists but shows **one** Next.js app, so it needs a redraw for the split | 14 | Open |
| G-F07 | What the tests check and what they don't | docs/testing.md (drafted in spec §15) | 14 | Open |
| G-F08 | One place AI looked right but was wrong, and how it was caught | docs/ai-notes.md, recorded as soon as it happens | Ongoing | Open |
| G-F09 | Two awards that work differently, configured with no code change | Phases 5 and 12 | 12 | Open |

---

## G. Repository and process gaps

| ID | Gap | Fix | Status |
|---|---|---|---|
| G-G01 | No `.gitignore`, so `node_modules`, `.env` and uploads could get committed. | Added in Phase 0. | Fixed (Phase 0) |
| G-G02 | No CI. | Backend CI in Phase 1, frontend CI in Phase 4. | Open |
| G-G03 | `main` is not protected on GitHub. | **You:** GitHub → Settings → Branches → protect `main` (require a PR and green CI). | Open |
| G-G04 | No GitHub Issues or Project board. The spec wants one issue per feature, and the `gh` CLI isn't installed on this machine. | One issue per phase (the "Done when" list as acceptance criteria), created on the web or after installing `gh`. | Open |
| G-G05 | The GitHub repo is named `EigthyAwards` (typo) while the project is `EightyAwards`. | Optional: rename in GitHub settings (old URLs redirect), then `git remote set-url`. | Open |
| G-G06 | Earlier commits don't follow Conventional Commits ("fixing things", "back to work"). | From now on, use `feat:`, `docs:` and so on. Don't rewrite history. | Accepted risk |
| G-G07 | `Front-End/Frontend.md` was a placeholder, not a README. | Renamed to `Front-End/README.md` in Phase 0. | Fixed (Phase 0) |

---

## Change log

| Date | Change |
|---|---|
| 2026-10-04 | First version: gaps from the architecture PDF, the deployment split, the spec review, the open client questions, deliverables and process. |
