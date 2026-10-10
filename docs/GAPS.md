# Gaps, open questions and risks

> Everything that is **missing, contradictory, undecided or risky** in the project. Every gap has an ID, so commits, ADRs and PRs can refer to it (e.g. `fixes G-B04`).
>
> **Status values:** `Open` (nobody has decided; the default is used) · `Decision needed` (we need your answer, or the reviewer's) · `Default adopted` (we are building the default; it can still change) · `Decided` (an ADR records it) · `Fixed` (done and tested) · `Accepted risk` (known and deliberately left).
>
> **Status values (continued):** `Answered` (the client answered it) · `Removed` (no longer applies after a client decision).
>
> Phase numbers in sections A–I were remapped to the 7 Oct plan (old Phases 4–9 became 5–9; see PHASES.md §2).
>
> Last updated: 2026-10-10 (Day 8, Phase 0.10: a staging branch). Update this file at the end of every step.
>
> **Phase numbers** in the "Phase" columns use the old 15-phase list. [PHASES.md §7](PHASES.md#7-where-the-old-15-phase-list-went) maps them to the new steps (1.1–1.5) and packages (2.x, 3.x).

## Summary

| Section | What it covers | Count | Not yet closed* |
|---|---|---|---|
| A | Decisions we need from you before or during the build | 14 | 1 |
| B | Gaps caused by splitting frontend and backend across Vercel, Render and Supabase | 16 | 11 |
| C | Architecture gaps from the architecture PDF (pages 10–11) | 15 | 10 |
| D | Contradictions and holes found in the spec while planning | 11 | 6 |
| E | Client questions from spec §18 | 16 | 9 |
| F | Brief deliverables not yet in the repo | 9 | 6 |
| G | Repository and process gaps | 7 | 4 |
| H | Gaps from the leader call: data consistency (and the PA role, removed 9 Oct) (Day 3) | 12 | 7 |
| I | Gaps from on-site rounds (Day 4) | 13 | 9 |
| J | New issues (Day 5): branded award sites, organisers, verification, entry limits, domains | 24 | 8 |
| K | Lead call (Day 7) and Phase 1 planning (Day 8): proof once, My profile, several jury, re-plan, staging | 19 | 9 |

\* Not yet closed = any status except `Decided`, `Fixed`, `Accepted risk`, `Done`, `Answered`, `Removed`, `Superseded` or `Ongoing` (a habit kept every day, such as the daily log). "Default adopted" still counts as open until the code that implements it is merged and tested.

---

## A. Decisions needed (answer these first)

Until you answer, the **default** is what gets built. Each one points to the detailed gap.

| ID | Question | Default until answered | Needed by | Status |
|---|---|---|---|---|
| A1 | Build order: backend and frontend phases **alternating** (as in PHASES.md), or **all backend first, then all frontend**? | Alternating, backend first (G-B13) | Phase 1 | Decided (6 Oct): alternate |
| A2 | Is a throw-away "hello world" deploy of the empty skeletons acceptable around Phase 5, to test the cookie proxy and the Supabase connection early? No real features would be deployed. | No early deploy (your instruction); risks stay open until Phase 14 | Phase 5 | Decided (6 Oct): yes, skeleton check at the end of Phase 5; superseded on 9 Oct: the real deployment is Step 1.5, 14 Oct |
| A3 | Login: a session cookie through the Next.js `/api` proxy (ADR 0003), or a bearer token in the browser? | Cookie through the proxy (G-B02) | Phase 2 | Decided (6 Oct): cookie through the proxy |
| A4 | Email provider for production (Render may block SMTP): Resend, Brevo or another? Do we have a domain to send from? | Phase 1: emails are written to the email log (caught by Mailpit locally); an HTTP email API behind the mailer interface, provider chosen in Phase 2, package 2.6 (G-B06) | Phase 14 | Decision needed |
| A5 | ~~Authorisation letter template: DOCX or PDF?~~ | No letter any more (ADR 0007) | — | Removed |
| A6 | ~~Does an unverified authorisation letter block masking and assignment?~~ | No letter any more (ADR 0007) | — | Removed |
| A7 | Snapshot the organisation's identity onto the application at submit (frozen at the deadline)? | Yes. Now part of data consistency (ADR 0006) | Phase 1 (schema) | Decided |
| A8 | Editing an already-submitted application: an explicit "Save changes" that runs full validation (no autosave)? | Yes (G-D02) | Phase 7 | Decided (6 Oct): yes |
| A9 | Indicator scores: whole numbers 0–10, or decimals like 7.5? | Whole numbers (G-D09) | Phase 3 | Decided (6 Oct): whole numbers |
| A10 | Module folders: 18 (adding `departments`, `jury-pool`, `master-data`, `onsite` and `sites`), or fold some together? | 18 folders (G-C01) | Phase 1 | Decided: 18 folders (adds `sites`, 7 Oct) |
| A11 | Do all PAs get the **same** powers, or does the leader switch powers on and off for each PA? | The same powers for every PA (ADR 0005, G-H02) | Phase 2 | Removed (9 Oct: no PA role, ADR 0014) |
| A12 | Can a PA **create awards** in any department (staff then configure them), or only staff? Should PAs get other powers too (reminders, CSV exports, a duplicate-organisation clean-up list)? | PAs create awards: yes. The other three are "could have" (spec §14) | Phase 3 | Removed (9 Oct: no PA role, ADR 0014) |
| A13 | What replaces the signed letter as proof that an applicant may act for the organisation? | Nothing for now (leader's decision). **Recommended:** a confirmation link sent to the organisation's official email (G-H01) | Phase 2 | Decided (6 Oct): nothing for now |
| A14 | "Accept all the applications of the same organisation": does that mean one organisation may have **several active** applications in one cycle? | **Answered:** one application per organisation per award; since 8 Oct a second one is **blocked at the start** (ADR 0011) | Phase 7 | Answered (6 Oct) |

---

## B. Gaps from the deployment split (Vercel + Render + Supabase)

The spec (§8, §9) and the architecture PDF describe **one Next.js app** using Auth.js and server actions. We are building **two apps**: a Next.js frontend on Vercel and an Express API on Render, with PostgreSQL and file storage on Supabase. That creates the gaps below. See [ADR 0001](decisions/0001-frontend-backend-split-and-hosting.md).

| ID | Gap | Impact | Default / proposed fix | Phase | Status |
|---|---|---|---|---|---|
| G-B01 | Parts of the spec assume one Next.js app: Auth.js, server actions, Next.js middleware as the gate, `/api/files/:id` inside Next.js. | The spec no longer matches the build in §8, §9, §11 and §16. | ADR 0001 lists what is superseded. Server actions become REST endpoints on the Express API, Auth.js becomes our own auth (ADR 0003), and the access layer moves into the Express services unchanged in spirit. | 0 | Decided |
| G-B02 | **Cross-site cookies.** `*.vercel.app` and `*.onrender.com` are different sites. Safari blocks third-party cookies, so a cookie set by the API would not be sent. | Login would fail in some browsers. | The Next.js rewrite proxies `/api/*` to Render, so the browser only talks to the Vercel origin and the cookie is first-party (httpOnly, Secure, SameSite=Lax). Fallback: a bearer token. Confirm with A3 and A2. | 2, 5, 14 | Decided (6 Oct); verify in the Phase 5 skeleton check |
| G-B03 | **10 MB files.** Uploads through the Vercel proxy may hit body-size limits (4.5 MB for functions; the limit for external rewrites needs checking). Render's disk is wiped on every deploy and restart. | Uploads fail, or files vanish. | Files live in **Supabase Storage** (private bucket, S3-compatible). The browser uploads and downloads using short-lived **signed URLs** that the API issues only after its access checks (R1 still holds). Locally, a disk driver behind the same storage interface. | 1.1, 1.3, 1.5 | Decided (10 Oct, owner): signed links from Phase 1 |
| G-B04 | **Supabase Data API exposure.** Supabase serves tables in the `public` schema over its REST API to anyone holding the anon key, unless row-level security (RLS) is on. Prisma creates tables in `public`. | **Security:** applicant identity, scores and audit could be read directly, bypassing every rule. | Turn on RLS for every table with no policies (our API connects as the owner, which bypasses RLS), and/or turn off Data API exposure of `public`. Test it in Phase 14 with a `curl` using the anon key, which must return nothing. | 14 | Open, **high** |
| G-B05 | Supabase connections: the app needs the pooled connection string (transaction mode), while migrations need a direct or session connection. | Migrations hang, or the app runs out of connections. | Two env variables (`DATABASE_URL` pooled, `DIRECT_URL` direct). Configure them the way the Prisma version we pin expects. | 1, 14 | Open |
| G-B06 | **Email in production.** Render's free tier may block outbound SMTP ports (needs checking). Sending to arbitrary inboxes usually needs a verified sender domain. | No emails in production. | The mailer interface gets an HTTP API driver (Resend or Brevo) for production and SMTP with Mailpit locally. Every email is logged in EmailLog either way. Provider: see A4. | 14 | Decision needed |
| G-B07 | **Render free tier sleeps** after about 15 minutes idle; the first request then takes about 30–60 seconds. The outbox dispatcher only runs while awake. | The walkthrough looks broken; emails are delayed. | The frontend shows a "waking the server" state. Call `/api/health` before a demo. Consider a paid instance for walkthrough week. | 14 | Open |
| G-B08 | Supabase free tier pauses projects after about a week of inactivity, and its backups are limited. The spec's NFR asks for managed backups. | A paused database during review. | Accept for the demo, and say so in the README. Upgrade if it becomes a real system. | 14 | Accepted risk |
| G-B09 | Running migrations on Render: a pre-deploy command may need a paid plan. | The schema is out of date after a deploy. | Run `prisma migrate deploy` in the build or start command. Check this in Phase 14. | 14 | Open |
| G-B10 | **API contract drift.** Two apps, and no shared types package. | The frontend breaks quietly when the backend changes. | `docs/API.md` is the contract, updated in every backend phase. The frontend keeps its own Zod schemas for forms. E2E tests catch drift. Generate an OpenAPI client later if needed. | 1+ | Default adopted |
| G-B11 | CSRF and CORS for cookie auth. | Cross-site request forgery. | The proxy keeps requests same-origin. Cookies use SameSite=Lax. The CORS allowlist holds only the frontend origin, and state-changing requests have their `Origin` header checked. | 2 | Default adopted |
| G-B12 | Two apps, one notion of time. | The UI shows "open" while the API says "closed". | Only the backend decides deadline state, using `clock.now()`. The frontend only shows what the API returns: times in IST, stored in UTC. | 5+ | Default adopted |
| G-B13 | Building all of the backend before any UI would leave the UI (about 30 screens) squeezed into about 2 days, and the brief's success test is staff configuring awards **in the UI**. | The UI is late or thin. | Alternate the phases: three backend phases first, then each frontend phase right after the backend phase it needs. See A1. | Plan | Decided (6 Oct): alternate |
| G-B14 | **Library versions have moved.** Prisma 7, Express 5, Next.js 15/16 and Tailwind 4 changed setup compared with older tutorials (and older AI training data). | Plausible-looking but wrong config. | Pin versions in Phase 1 and Phase 4 and follow each library's current docs. Log any AI mistakes in `docs/ai-notes.md`; the brief asks for one. | 1, 5 | Open |
| G-B15 | The leader account in production is "created at setup". | Credentials leak, or there's no way to log in. | The seed reads `LEADER_EMAIL` and `LEADER_PASSWORD` from the environment and never commits them. The password is changed after first login. | 2, 14 | Default adopted |
| G-B16 | **Vercel caches proxied responses.** For projects created after 6 Apr 2026, Vercel's CDN honours caching headers that the external origin (our API) sends on rewritten requests. | One person's API response (`/me`, an application) could be cached and served to another person. | The API sends `Cache-Control: no-store` on every response by default; only public award pages opt in to short caching. Checked on 14 Oct with two accounts on staging. | 1.1, 1.5 | Default adopted |

---

## C. Architecture gaps (from the architecture PDF, pages 10–11)

The numbers match the PDF's cards (the PDF was removed on 7 Oct 2026 as out of date; it is still in git history at tag `phase-00-done`). The spec does not answer any of them. The PDF proposed the defaults, and we are adopting them unless noted.

| ID | Gap | Default we build | Phase | Status |
|---|---|---|---|---|
| G-C01 | The module list disagrees with itself (12 vs 13 vs 15). | 16 module folders: `departments`, `jury-pool` and (since the leader call) `master-data` (A10). | 1 | Decided |
| G-C02 | 10 MB files won't fit through a Vercel function. | Partly solved by the API moving to Render; the rest is G-B03 (signed URLs). | 7 | Default adopted |
| G-C03 | Emails are sent during the request. One request can mean about 1,000 emails, and an email can go out for a change that later rolls back. | Treat **EmailLog as an outbox**: insert PENDING rows in the same transaction, send in batches after commit. | 1, 11 | Default adopted |
| G-C04 | Some statuses change with time ("Closed", "Not submitted") but no job runs. | Derive them from `clock.now()` on read, and store them on the next write. Dashboards use the derived value. | 3, 7, 11 | Default adopted |
| G-C05 | Invite and reset tokens have no table. | An `AuthToken` table: hashed token, type, expiry, used-at, single use. | 1, 2 | Default adopted |
| G-C06 | Removing an assignment conflicts with "never hard-delete". | A `REVOKED` evaluation status with a reason, and a partial unique index allowing one **active** evaluation per (round, application). | 1, 9 | Default adopted |
| G-C07 | The identity section reads the live organisation profile, so last year's application would show this year's name and address. | Copy identity onto the application at submit, refresh it until the deadline, freeze it at the lock. Part of data consistency (spec §5.18). | 1, 7 | Decided (ADR 0006) |
| G-C08 | "Verify authorisation letters" has no operation or outcome. | No letter any more. | — | Removed (ADR 0007) |
| G-C09 | The pre-filled letter template needs a generator. | No letter any more. | — | Removed (ADR 0007) |
| G-C10 | "Append-only audit" is only a convention. | A DB trigger that rejects UPDATE and DELETE on AuditEvent (and on FormVersion). Also audit role assignments, staff changes, the leader's actions (with the actor's role), master data changes and organisation edits. | 1 | Default adopted |
| G-C11 | Unique keys with NULL scope columns let duplicates in, and "exactly one leader" isn't enforced. | `NULLS NOT DISTINCT` (PostgreSQL 15+, which Supabase has) or partial unique indexes, plus a partial unique index on LEADER. | 1 | Default adopted |
| G-C12 | No login throttling and no monitoring. | Rate limits per email and per IP on login and reset; structured pino logs; an error tracker is optional. | 2, 13 | Default adopted |
| G-C13 | "Safe as is" files need a representation. | A MASKED_EVIDENCE row pointing at the same storage key, so the jury file check stays one rule. | 9 | Default adopted |
| G-C14 | Should totals be computed or stored? | Computed with `computeScore` on read; totals and ranks snapshotted on approval so results never shift. | 9, 11 | Default adopted |
| G-C15 | The live round would need realtime updates. | Not needed: on-site panel members score independently and there is no live scoreboard (ADR 0008). Staff progress pages refresh. | — | Removed (6 Oct) |

---

## D. Contradictions and holes found in the spec (Day 2 review)

| ID | Where | Problem | Default we build | Phase | Status |
|---|---|---|---|---|---|
| G-D01 | §2 Glossary vs §10 Data model | The glossary defined an Evaluation as one jury member scoring *multiple* applications. The data model has one Evaluation per (round, application, jury member). | The data model wins: **one Evaluation = one jury member × one application × one round.** Glossary fixed on 5 Oct. | 0 | Fixed (Phase 0.1) |
| G-D02 | §5.6 | "Each save [of a submitted application] must pass the same checks as submitting" can't coexist with autosave, which saves half-typed answers. | Drafts autosave. Submitted applications are edited with an explicit **Save changes** that runs full validation (A8). | 7, 8 | Decided (6 Oct) |
| G-D03 | §4 table vs §5.4 | "Update requested" shows the applicant "Pending: your application is not submitted yet", but §5.4 says the application **stays submitted**. | Show "Submitted, update requested: questions changed, please review the highlighted ones before the deadline". | 7 | Decided (6 Oct) |
| G-D04 | §4 Round status | Nothing says what moves a round from "Not started" to "Judging". | Derived: Judging as soon as the round has any active evaluation. | 9 | Default adopted |
| G-D05 | §16 Git workflow | The spec uses a `develop` branch. We merged phase branches straight into `main` via PR (ADR 0004). | Since 10 Oct: step branches → `staging` → `main` (production), close to the spec's `develop` → `main` (ADR 0015). | 0, 0.10 | Decided |
| G-D06 | §11 Errors | Only 4 typed errors, with no "not logged in" case. | Add `UnauthenticatedError` → 401. | 1 | Default adopted |
| G-D07 | §5.3 vs §5.5 | The publish gate checks weights only at publish, but the scoring sheet stays editable until the first score, and questions can be added mid-cycle. | Every scoring sheet save after publish must also pass weight and reference validation. Indicators for new questions can be added until the first score. | 3 | Default adopted |
| G-D08 | §5.11 | "Every non-disqualified application has a submitted evaluation" doesn't define the set. What about Withdrawn, Not submitted or Released? | Eligible = submitted at the lock, and not withdrawn, released or disqualified. (Duplicates can no longer exist: a second application is blocked at the start, ADR 0011.) | 11 | Default adopted |
| G-D09 | §5.5 | "Score 0 to 10": whole numbers or decimals? | Whole numbers (A9). | 3 | Decided (6 Oct): whole numbers |
| G-D10 | §5.10 | "Reinstate returns it to the state it was in", even if the round has been approved since? | Reinstating is refused once the round is approved. | 9 | Default adopted |
| G-D11 | §5.7 | Masking can be reopened while the jury holds draft scores. What does the jury see? | Reopening hides the application from the jury until masking is marked done again. Draft scores are kept. | 9 | Default adopted (9 Oct: with several jury, masking reopens only while none of the application's evaluations is submitted) |

---

## E. Client questions still open (spec §18)

The full wording and the 13 assumptions (A1–A13) are in [requirements.md §18](requirements.md). The defaults are what we build. Questions 1–7 would change the data model or the roles.

| ID | Question (short) | Default in use | Status |
|---|---|---|---|
| G-E01 | The legal company applies, or each plant separately? | **The organisation (legal entity, by PAN).** Plants and units never apply separately | Answered (5 Oct) |
| G-E02 | Is the department head's approval final? | **Yes, for document rounds; on-site rounds have no approval** | Answered (6 Oct) |
| G-E03 | Who creates staff: the department head or the leader? | **The department head, or the leader** (no PA role since 9 Oct) | Answered (5 Oct) |
| G-E04 | Can a department head create awards? | No, only staff | Open |
| G-E05 | Can a department head edit scores? | No; approve or send back only | Open |
| G-E06 | Exactly one leader? | Yes | Open |
| G-E07 | Several judges per application in the live round? | **Yes: a panel of 2 to 5, average counts; built now** | Answered (6 Oct). **9 Oct:** document review rounds can also have several jury (a minimum and maximum per round, average), ADR 0013 |
| G-E08 | Duplicates: block, or allow and flag? | **Blocked at the start** (changed 8 Oct, ADR 0011); staff can release a wrong one | Answered (6 Oct) |
| G-E09 | Must the applicant resubmit after questions are added? | No; flagged "Update requested" | Open |
| G-E10 | How do weights work? | Section weight, then indicator weight within the section | Open |
| G-E11 | Does anyone approve the shortlist? | No | Open |
| G-E12 | What does a disqualified applicant see? | "Under review", then "Rejected" | Open |
| G-E13 | Is recording conflicts acceptable for rule 2? | Yes; recorded conflicts are blocked | Open |
| G-E14 | Must every organisation have a GSTIN? | **No, GSTIN optional**; without one, joining needs PAN and official email | Answered (6 Oct) |
| G-E15 | How do shop-floor competitions (Kaizen, 5S) work? | **Registered as usual, judged on site by a panel; modelled as an on-site round (ADR 0008)** | Answered (6 Oct) |
| G-E16 | Withdraw after the deadline? | No | Open |

---

## F. Brief deliverables (what the reviewer expects in the repo)

| ID | Deliverable | Where | Phase | Status |
|---|---|---|---|---|
| G-F01 | The plan, kept up to date | [PHASES.md](PHASES.md) | 0 | Done (Phase 0 merged) |
| G-F02 | Daily progress: done, next, stuck | [Daily.md](../Daily.md) | Daily | Ongoing |
| G-F03 | Decisions: options, choice, why, what would change it | [decisions/](decisions/) | Ongoing | Ongoing |
| G-F04 | Code, with a README a stranger can run from | README.md, Backend/, Front-End/ | 15 | Open |
| G-F05 | One page: the journey of each user | docs/user-journeys.md (content drafted in spec §7) | 15 | Open |
| G-F06 | A simple drawing of how the parts fit | The old PDF showed **one** Next.js app with no PA role, so it was removed (7 Oct). A plain-language drawing is now in [overview/ §8](overview/README.md#8-how-the-parts-fit); a technical drawing for the split apps is still to come | 15 | Open (simple drawing done) |
| G-F07 | What the tests check and what they don't | docs/testing.md (drafted in spec §15) | 15 | Open |
| G-F08 | One place AI looked right but was wrong, and how it was caught | docs/ai-notes.md, recorded as soon as it happens | Ongoing | Open |
| G-F09 | Three cycles that work differently (including on-site rounds), configured with no code change | Phases 5 and 13 | 13 | Open |

---

## H. Gaps from the leader call: PA role and data consistency (Day 3; PA role removed 9 Oct, ADR 0014)

Raised by the 5 October 2026 call (ADRs 0005, 0006, 0007; spec §5.17, §5.18).

| ID | Gap | Impact | Default / proposed fix | Phase | Status |
|---|---|---|---|---|---|
| G-H01 | **Proof of authority is now weak.** With no letter, joining an organisation needs only its PAN and GSTIN, but the PAN is inside the GSTIN, and a GSTIN is printed on every invoice. | Anyone with an invoice could apply in a company's name. | For now: accepted (the leader's decision), and staff can release an application from the wrong person (ADR 0011). **Recommended:** confirm joining with a link sent to the organisation's official email (A13). | 2 | Decided (7 Oct): proof documents with every application (ADR 0010) |
| G-H02 | PA powers are a fixed set; the leader can't tailor them per person. | A PA may get more power than the leader intends. | Same powers for all PAs, and every action audited with the role (A11). Per-PA switches are later work. | 2 | Removed (9 Oct: no PA role, ADR 0014) |
| G-H03 | Can PAs create awards? The call mentioned "creating new award[s]". | Changes the permission matrix. | Yes, in any department; cycle configuration stays with staff (A12). | 3 | Removed (9 Oct: no PA role, ADR 0014) |
| G-H04 | Deactivating people who still own work: a staff member who is the only one on an award, a jury member with unsubmitted evaluations, a department head with a round waiting. | Work gets stuck with someone who can't log in. | Deactivation is allowed but first shows what they still own. Their awards and evaluations stay assigned until staff, the department head or the leader reassigns them. The dashboard flags "awards with no active staff". Approval always goes to the **current** head of the department. | 2, 11 | Default adopted |
| G-H05 | One organisation can have **several GSTINs** (one per state), but the profile stores one. | A second user may know a different GSTIN and fail to join, then create a "new" organisation, which is refused because the PAN is unique. | One GSTIN on record (the one the organisation registers with). Joining needs that GSTIN; the error message says which state's GSTIN is on record. Several GSTINs is later work. | 2 | Default adopted |
| G-H06 | The GSTIN state code can differ from the registered address state. | False refusals for genuine organisations. | A warning, not a refusal (spec assumption A17). | 2 | Default adopted |
| G-H07 | **Old data** from the 80 old award systems is exactly what was inconsistent. Importing and cleaning it is out of scope (spec §14). | The leader may expect history to appear on day one. | Not imported. Consistency starts with the first cycle run here. Say so in the walkthrough, and ask the leader whether a one-time import and clean-up is wanted later. | 15 | Open: ask the leader |
| G-H08 | Case-insensitive uniqueness needs expression or `citext` indexes, which Prisma doesn't declare natively. | Duplicates slip in if only the service checks. | Raw SQL migration with unique indexes on `lower(...)`, plus the service check for a friendly error. | 1 | Default adopted |
| G-H09 | Normalisation must happen in **one** place, or the seed and any future import will bypass it. | Inconsistent data again. | A single `lib/normalize.ts` used by every service **and** the seed, with unit tests for each normaliser. | 1, 2 | Default adopted |
| G-H10 | Renaming a master data value changes how every old record displays it. | History reads differently. | Renaming is for spelling fixes only. A change of meaning means retiring the old value and adding a new one. Renames are audited. | 2 | Default adopted |
| G-H11 | The leader's dashboard needs a way to see what PAs did. | The leader can't check delegated work. | A "PA activity" view, built from audit events filtered by role = LEADER_PA. | 11, 13 | Removed (9 Oct: no PA role, ADR 0014) |
| G-H12 | With staff spread over many awards in several departments, a department head only sees their own department's awards. | A head can't see that a staff member is overloaded elsewhere. | Accept for now. The leader sees everything; a per-staff workload view is later work. | — | Accepted risk |

---

## I. Gaps from on-site rounds (Day 4)

Raised by the answers of 6 October 2026 (ADR 0008; spec §5.12, §5.16).

| ID | Gap | Impact | Default / proposed fix | Phase | Status |
|---|---|---|---|---|---|
| G-I01 | The department head approves document rounds but may also sit on on-site panels. | They could approve their own scores. | Never a juror in a document round of their own department; allowed on on-site panels, which have no approval (spec A18). | 9, 12 | Default adopted |
| G-I02 | A blind award with an on-site round reveals the applicant at the presentation. | Blind judging only covers the document round. | Accepted by design: an on-site panel meets the team. Stated in R1's known limit. | — | Accepted risk |
| G-I03 | A panel member doesn't turn up. | The round can't close. | Staff remove them with a reason (evaluation Revoked); the average uses those who submitted, at least one (spec A19). | 12 | Default adopted |
| G-I04 | Staff typing a juror's scores could be misused. | Scores nobody on the panel gave. | Each such evaluation records who typed it, and is audited. The progress page and the department head's view show how many evaluations staff entered. | 12 | Default adopted |
| G-I05 | Medal ties, and medals per category or per cycle. | Disputed results. | **One set per award cycle**: Gold, Silver and Bronze for ranks 1 to 3 of the whole on-site round; ties flagged for staff to settle (spec A20). | 11, 12 | Decided (6 Oct): one set per award |
| G-I06 | Slot clashes: one juror on two panels at the same time, or two entries in one venue at once. | A confusing day on site. | Not blocked; a warning shows when a panel member's slots overlap. | 12 | Default adopted |
| G-I07 | Moving a slot after scoring started. | Scores for a presentation that "moved". | A slot can move only until the entry has scores (spec A21). | 12 | Default adopted |
| G-I08 | A document-only award ends at "Shortlisted / Rejected". Is "Shortlisted" the win for such awards? | Applicants might not understand their result. | Labels can be renamed per round (e.g. "Winner / Not selected") with no code change. **Confirm with the leader** what document-only awards should say. | 3, 11 | Open: ask the leader |
| G-I09 | **Timeline.** On-site rounds add a backend phase (12) and more frontend work (13), with no extra days. | Late phases get squeezed. | Cut order extended (PHASES §5). Watch it daily from Phase 8 on. | Plan | Superseded by G-J21 |
| G-I10 | Internet at venues is assumed (client answer). | No scoring if the network fails. | Staff backup entry from paper sheets covers it (G-I04). No offline mode. | — | Accepted risk |
| G-I11 | Team member names reveal who applied. | A leak in a blind document round. | The TEAM_MEMBERS answer is treated as identity: never sent to jury in blind document rounds. | 7, 9 | Default adopted |
| G-I12 | A shortlisted entry doesn't come to present. | No scores, so the round can't close. | Staff disqualify it with the reason "did not present" (kept on record; shows Rejected). | 12 | Default adopted |
| G-I13 | With GSTIN optional, two organisations could still share one GSTIN by mistake. | Inconsistent data. | GSTIN unique when present (a partial unique index), and it must contain the PAN. | 1 | Default adopted |

---

## J. New issues (Day 5): branded sites, organisers, verification, entry limits, domains

From the owner on 7 Oct 2026. Full analysis and proposals: [proposals/0.4-new-issues.md](proposals/0.4-new-issues.md). J1–J12 are questions for the owner; J13–J16 are gaps the proposal creates.

| ID | Question or gap | Default / proposal | Phase | Status |
|---|---|---|---|---|
| G-J01 | Is the 10-day deadline fixed? If yes, which smaller first release? | Not fixed: extend the plan, cover every detail, cut nothing | Plan | Answered (7 Oct) |
| G-J02 | Page builder for all awards, or only external organisers? | All awards | 4, 6 | Answered (7 Oct) |
| G-J03 | Can a department head (the organiser's lead) create awards, or only staff? | Staff only | 3 | Answered (7 Oct) |
| G-J04 | Can one person head more than one department? | Yes | 2 | Answered (7 Oct) |
| G-J05 | Does an award site need the leader's or a PA's approval before going live? | No approval. The leader can view sites, not edit them | 4 | Answered (7 Oct) |
| G-J06 | Brand kit per department with per-award overrides, or per award only? | Per department, with per-award overrides (default kept) | 4 | Decided (7 Oct, default) |
| G-J07 | Entry limit: count submitted applications only? Show "places left" publicly? | Submitted only; the count is **always shown** publicly, e.g. 499 / 500 | 3, 7 | Answered (7 Oct) |
| G-J08 | Delete verification documents 12 months after results, keeping only the "verified" record? | Yes, 12 months after results (default kept). For an identity document kept on a profile: 12 months after the results of the last cycle that used it (9 Oct, G-K05) | 2 | Decided (7 Oct, default) |
| G-J09 | Verify membership before submission, or after submission but before judging? | At submission: photo identity document + proof of employment + LinkedIn link are required to submit; staff check them before judging. **Changed 9 Oct:** the identity document and LinkedIn link are given once on the profile; each application needs a proof of employment dated within 3 months (G-K01, ADR 0012) | 2, 7, 9 | Answered (7 Oct; changed 9 Oct) |
| G-J10 | Show past winners automatically on award sites? | Staff decide what to show and where, and can change the site design at any time, also after publishing | 4, 11 | Answered (7 Oct) |
| G-J11 | Simpler branch names: number plus one word? | Yes | Plan | Answered (7 Oct) |
| G-J12 | Bring the 6 Oct decisions (scores, medals, build order, skeleton deploy) from the parked branch onto `main`? | Yes: brought onto this branch | 0.4 | Answered (7 Oct) |
| G-J13 | Personal documents (proof of employment) fall under India's DPDP Act 2023: consent, purpose, minimal data, retention. | Consent at upload; ID card or letter only, salary hidden; staff, department head and leader only, never jury; deletion per J08. From 9 Oct the identity document is stored once per person (less data), never shown to colleagues, and seen by staff only through an application they may see | 2 | Open |
| G-J14 | Page content must never become a security hole (scripts, phishing links, broken layouts). | Fixed section types; rich text limited to bold, italic, headings, lists and links; no HTML or scripts; images only, 5 MB, re-encoded | 4, 6 | Open |
| G-J15 | Public images must never sit next to private applicant files. | A separate public storage bucket for site images | 4 | Open |
| G-J17 | Nobody outside a department can take down a wrong or abusive award site (no leader approval or editing, J05). | Accept for now: the leader asks the department head. Revisit if it happens. | 4 | Accepted risk |
| G-J18 | Aadhaar: storing full Aadhaar numbers is restricted. | Accept only masked Aadhaar (last four digits) as an identity document; other IDs preferred | 2, 7 | Default adopted |
| G-J19 | Deleting proof documents after 12 months needs a scheduled job; the platform has none yet. | A daily clean-up run from a cron route (Render cron or an external scheduler). From 9 Oct it must also count the applications using a profile's identity document before deleting it (G-K05) | 7 | Open |
| G-J20 | The last place under the entry limit: two applicants submitting at the same moment could both get in. | Count and submit in one transaction that locks the cycle's row | 7 | Default adopted |
| G-J21 | **Hard limit 15 October** (owner, 8 Oct). The full plan (15 build phases) can't fit. Option A (focused demo) or Option B (real product, 10–14 weeks)? | Option A by 15 Oct, with B as the roadmap ([proposals/0.5-replan-options.md](proposals/0.5-replan-options.md)). **Lead, 9 Oct:** build in **three phases**; Phase 1 is a fully working demo; agree the plan and the data model before coding. The re-plan itself is G-K12 | Plan | Answered (9 Oct) |
| G-J22 | One application per organisation: flag duplicates afterwards, or stop them before filling? | **Blocked at the start**; colleagues see it read-only with the status only; staff can release (ADR 0011) | 7, 8 | Answered (8 Oct) |
| G-J23 | With first-come blocking, a wrong or fake member who starts first blocks the real applicant. | Proof documents show staff who the person is; staff release the application with a reason; the real applicant contacts the award team | 7, 9 | Default adopted |
| G-J24 | If the person who started the application leaves the organisation, nobody else can continue it. | Staff release it and a colleague starts again; a draft hand-over is later work (spec A26) | 7 | Accepted risk |
| G-J16 | Sub-domains and own domains need a domain we own and Vercel domain setup, which can't be tested in the 10 days. | Store a slug and an empty `customDomain` field now; build sub-domains and own domains later | 4, later | Open |

## K. Lead call (Day 7, 9 Oct) and Phase 1 planning (Day 8): proof once, My profile, several jury, staging

From the lead call and the owner's answers on 9 Oct 2026. ADRs [0012](decisions/0012-proof-once-on-profile-and-account-settings.md) and [0013](decisions/0013-several-jury-per-application.md); what the built backend must change: [proposals/0.7-backend-changes.md](proposals/0.7-backend-changes.md).

| ID | Gap or question | Default / answer | Phase | Status |
|---|---|---|---|---|
| G-K01 | Uploading the ID, the LinkedIn link and the employment proof with **every** application repeats work and stores many copies of an ID | The ID and LinkedIn once, on the profile; a proof of employment **dated within 3 months** with each application; the staff of **each award** check their own application | 2, 7, 9 | Answered (9 Oct) |
| G-K02 | Users can't change their password or their details | **My profile** for every role: name, phone, change password (needs the current one; ends other sessions; email; audited without the password) | 2, 5 | Answered (9 Oct) |
| G-K03 | One jury member per application lets one person's bias decide the result | Staff set the **jury per application** (minimum and maximum, at least 1, at most the pool) for each document round; every application needs the minimum; the final score is the **average** | 3, 9, 11 | Answered (9 Oct) |
| G-K04 | If an applicant replaces their profile ID after staff verified it, what did staff check? | The application records the ID and LinkedIn it used; they follow the profile until verified or locked, then stay fixed (spec A30) | 7, 9 | Default adopted |
| G-K05 | A profile's ID belongs to no cycle, so "12 months after results" is unclear | 12 months after the results of the last cycle that used it; one replaced before any use is deleted at once | 7 | Default adopted |
| G-K06 | Two staff assigning at the same moment could go above the maximum | Count and assign under a lock on the application; a partial unique index stops the same jury member twice | 9 | Default adopted |
| G-K07 | A high minimum multiplies jury work; a small pool may not cover it | The maximum is capped by the pool; staff see "needs more jury"; the round can't be sent for approval until every application has its minimum | 9, 10 | Default adopted |
| G-K08 | An average hides a wide disagreement between jury members | Staff and the department head see every score next to the average; a "large spread" flag is Could have | 10, 13 | Open |
| G-K09 | A user can't change their login email | Not built; designed for (spec A27) | Later | Accepted risk |
| G-K10 | The "within 3 months" check uses the date the applicant types | Staff confirm the date on the document when they check the proof | 9 | Accepted risk |
| G-K11 | The parked Phase 1 code predates the 7–9 Oct decisions (sites, proof, release, profile proof, jury per application) | Every change listed in [proposals/0.7-backend-changes.md](proposals/0.7-backend-changes.md); made in Step 1.1 (Sat 10 Oct) | 1.1 | Open |
| G-K12 | **Re-plan in three phases** (lead, 9 Oct): Phase 1 a fully working demo; what moves to Phases 2 and 3, with time limits; the data model and technical design agreed before coding | Done: [PLAN.md](PLAN.md). Phase 1 build Sat 10 – Tue 13 Oct, deploy Wed 14, walkthrough Thu 15 (two written-review awards; a simple branded page); Phase 2 ~20 working days; Phase 3 ~15 + client testing. Design in [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md) | Plan | Answered (9 Oct) |
| G-K13 | Phase 1's full list was about 100 hours of work against about 64 available | **Trimmed on 10 Oct** to about 71 hours (the moved items are in PLAN.md); 12–13 hour days with Thursday morning as a buffer; the cut order and never-cut list (PHASES §8); Daily shows any slip at once | 1.1–1.5 | Open |
| G-K14 | Phase 1 seeds departments, heads, staff and jury; their admin screens come in Phase 2 | Accepted for Phase 1: the brief tests award setup by staff, which is on screen. Admin screens in package 2.3 | 1.1 | Accepted risk |
| G-K15 | Render's free plan sleeps after ~15 minutes, so the first demo request is slow (G-B07) | Open the site a few minutes before the walkthrough; consider a small paid plan for demo week | 1.5 | Open |
| G-K16 | No PA role: the leader's team shares the leader's account, so the history can't tell which person acted, and several people know one password | Accepted by the owner (ADR 0014). Change the password when a team member leaves (it signs out every device); named accounts if traceability is ever needed | 1.1 | Accepted risk |
| G-K17 | File masking moves to Phase 2, so in Phase 1 a blind award can't show uploaded files to jury | Jury in a blind award get **no files** until file masking exists (R1 stays safe); the demo's blind award has text answers only | 1.4, 2.5 | Decided (10 Oct) |
| G-K18 | **Two online environments** (ADR 0015): staging and production each need a Supabase project, a Render service and Vercel environment variables | More setup on 14 Oct; the free tiers may not allow two of each (number of free projects, instance hours, sleeping) | Check the free-tier limits before 14 Oct. If two don't fit, keep `staging` tested by CI and locally, and put only production online (ADR 0015, "what would change our mind") | 1.5 | Open |
| G-K19 | The JURY role always belongs to a cycle, but Phase 1 seeds jury accounts before any cycle exists, and inviting jury by email moved to Phase 2 | A seeded juror has no role until added to a pool, so at first they see the applicant area | Owner, 10 Oct: jury accounts come only from the seed (passwords from the environment); staff or the department head add them to a cycle's pool by email (Step 1.4); no platform-wide jury marker; email invites in package 2.3 | 1.1, 1.4 | Decided (10 Oct) |

---

## G. Repository and process gaps

| ID | Gap | Fix | Status |
|---|---|---|---|
| G-G01 | No `.gitignore`, so `node_modules`, `.env` and uploads could get committed. | Added in Phase 0. | Fixed (Phase 0) |
| G-G02 | No CI. | Backend CI in Phase 1, frontend CI in Phase 4. | Open |
| G-G03 | `main` and `staging` are not protected on GitHub. | **You:** GitHub → Settings → Branches → protect `main` and `staging` (require a PR and green CI; ADR 0015). Keep `main` as the default branch. | Open |
| G-G04 | No GitHub Issues or Project board. The spec wants one issue per feature, and the `gh` CLI isn't installed on this machine. | One issue per phase (the "Done when" list as acceptance criteria), created on the web or after installing `gh`. | Open |
| G-G05 | The GitHub repo is named `EigthyAwards` (typo) while the project is `EightyAwards`. | Optional: rename in GitHub settings (old URLs redirect), then `git remote set-url`. | Open |
| G-G06 | Earlier commits don't follow Conventional Commits ("fixing things", "back to work"). | From now on, use `feat:`, `docs:` and so on. Don't rewrite history. | Accepted risk |
| G-G07 | `Front-End/Frontend.md` was a placeholder, not a README. | Renamed to `Front-End/README.md` in Phase 0. | Fixed (Phase 0) |

---

## Change log

| Date | Change |
|---|---|
| 2026-10-04 | First version: gaps from the architecture PDF, the deployment split, the spec review, the open client questions, deliverables and process. |
| 2026-10-10 | Staging branch (Phase 0.10, ADR 0015): D05 and G03 updated; B03 decided (signed upload links from Phase 1); B16 (Vercel caching proxied responses), K18 (two online environments) and K19 (seeded jury accounts) added. |
| 2026-10-10 | Phase 1 trimmed to fit the dates: K13 updated; K17 added (no files for jury in blind awards until file masking). |
| 2026-10-09 | No PA role (owner, ADR 0014): A11, A12, H02, H03 and H11 removed; E03, H04, H12, C10, J05, J13 and K14 updated; K16 added. |
| 2026-10-09 | Three-phase plan (Phase 0.8): K12 answered; K13–K15 added; A2 superseded (deploy in Step 1.5); A4 default updated; note that phase numbers use the old list (PHASES §7). |
| 2026-10-09 | Lead call (Phase 0.7): new section K (12 items); J08, J09, J13, J19, D11 and E07 updated; J21 answered (three phases; the re-plan is K12). |
| 2026-10-08 | One application per organisation blocked at the start (owner): A14, D08 and E08 updated; G-J22–J24 added. |
| 2026-10-08 | Hard limit of 15 Oct: G-J21 added (Option A vs B, for the lead); G-I09 superseded. |
| 2026-10-07 | Owner's answers to section J: J01–J12 answered or decided; H01 decided (proof documents); 6 Oct decisions brought over from the parked branch; J17–J20 added; phase numbers remapped to the 7 Oct plan. |
| 2026-10-07 | New issues: section J added (12 questions, 4 gaps) from the branding, organiser, verification, entry-limit and domain discussion. |
| 2026-10-06 | Answers on shop-floor and open questions: A11–A14 decided or answered; E02, E07, E08, E14 and E15 answered; C15 removed; phase numbers after 11 shifted by one (new Phase 12, on-site rounds); new section I (13 gaps). |
| 2026-10-05 | Leader call: the letter gaps removed (A5, A6, C08, C09); E01 and E03 answered; A7 and C07 decided; D01 fixed; new decisions A11–A14; new section H (12 gaps on the PA role and data consistency). |
