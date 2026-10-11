# Progress tracker

> **Start here in any new session (human or AI).** This file says exactly where the project stands. It is updated at the end of every working session and every phase. If this file and the code disagree, the code is the truth, so fix this file.

## Snapshot

| | |
|---|---|
| **Last updated** | 2026-10-12 · Day 10 (docs cleanup and the UI pass on the Step 1.4 branch) |
| **Current phase** | **Step 1.4: Assignment, judging and results** (🧪 built and checked by hand on its branch; pull request into `staging` next). Steps 1.2 and 1.3 are in `staging` (sumitdwivedi01/EigthyAwards#16, sumitdwivedi01/EigthyAwards#18), being checked there; Step 1.1 and the docs phases are on `main` |
| **Current branch** | `phase-1.4-judging`, cut from `staging` after Step 1.3 merged, built in a third worktree (`../EightyAwards-1.4`, its own databases `awards14`, and ports 4200/3200) while the owner checks `staging` and Step 1.3 |
| **What runs today** | On the step branch, locally: the API (Step 1.1, plus departments and people with temporary passwords, award setup, questions with versions, scoring sheets with the exact arithmetic, award pages and Open awards, departments run by their heads (ADR 0020); then applying: starting (one per organisation), the demo fee, autosaved answers and files, the employment proof, submitting with the entry limit, the deadline lock, the proof check and release, file downloads; then judging: conflicts (R2), assigning by hand with the counts, the blind jury view (R1), scoring with autosave, the exact average, corrections with a reason (R3), approval, results and the dashboard; 332 tests) and the web app (all of that on screen, including the round page for staff, the head and the leader, My assignments and the scoring screen, the approval queue and the dashboard), checked by hand in a browser. On 12 Oct the whole UI was redone for ease of use (one design system, larger type and controls, a sidebar, guidance on every home, a stepper for the form, a progress panel for scoring; no behaviour changed). `staging` holds Steps 1.2 and 1.3, `main` Step 1.1 |
| **The plan** | [PLAN.md](PLAN.md), **re-planned 11 Oct**: Step 1.2 departments, people and award setup (Sun 11 – Mon 12), 1.3 applying (Mon 12 – Tue 13), 1.4 assignment and judging (Tue 13 – Wed 14), 1.5 production online (Wed 14 – Thu 15 morning), **walkthrough Thu 15 afternoon**; about 71 hours, no buffer left. Then Phase 2 (~23 working days) and Phase 3 (~15 + client testing) |
| **Next action** | 1) The owner checks Steps 1.2 and 1.3 on `staging` (apply the 1.3 migration to the local `awards` database first: `npm run db:deploy`), then `staging` → `main` and the tags. 2) The pull request `phase-1.4-judging` → `staging`, merged when CI is green; Step 1.4's manual check on `staging`. 3) **Step 1.5** (production online and the documents) on `phase-1.5-deploy`: the owner creates the Supabase, Render and Vercel accounts |
| **Blockers** | None. Open but not blocking Phase 1: A4 (email provider, Phase 2); ask the leader: G-I08, G-H07 |
| **Risk** | About 71 hours with Thursday morning now build time: **no buffer** (G-K13). Daily finish lines and the cut order in [PHASES.md §8](PHASES.md#8-if-a-phase-1-day-runs-late-cut-order). Step 1.1 ran into Sunday. Only production goes online, so there is one set-up to get right (G-K18). Step 1.2 was built on Sunday, inside its window (Sun 11 – Mon 12 morning), and Steps 1.3 and 1.4 on Sunday night, ahead of their windows (Mon 12 – Wed 14): Step 1.5 can start early |

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
| 0.11 | Re-plan: people on screen, no masking, exact scoring (ADRs 0017–0019) | `phase-0.11-replan` | ✅ Merged | sumitdwivedi01/EigthyAwards#13 → `staging`, sumitdwivedi01/EigthyAwards#15 → `main` | 2026-10-11 | n/a |
| 0.12 | README problem first | `phase-0.12-readme` | ✅ Merged | sumitdwivedi01/EigthyAwards#14 → `staging`, sumitdwivedi01/EigthyAwards#15 → `main` | 2026-10-11 | n/a |
| **1.1** | Foundation and people · **Sat 10 Oct** | `phase-1.1-foundation` | ✅ Merged | sumitdwivedi01/EigthyAwards#12 → `staging`, sumitdwivedi01/EigthyAwards#15 → `main` | 2026-10-11 · `phase-1.1-done` (tag to push) | 136 backend (were 62); frontend: lint, type check, build |
| **1.2** | Departments, people and award setup · **Sun 11 – Mon 12 Oct** | `phase-1.2-setup` | ✅ In `staging`; checked there, then `main` | sumitdwivedi01/EigthyAwards#16 → `staging` | — | 203 backend (were 136); frontend: lint, type check, build |
| **1.3** | Applying and proof check · **Mon 12 – Tue 13 Oct** | `phase-1.3-apply` | ✅ In `staging`; checked there, then `main` | sumitdwivedi01/EigthyAwards#18 → `staging` | — | 271 backend (were 203); frontend: lint, type check, build |
| **1.4** | Assignment, judging and results · **Tue 13 – Wed 14 Oct** | `phase-1.4-judging` | 🧪 Built and checked; pull request next | — | — | 332 backend (were 271); frontend: lint, type check, build |
| **1.5** | Online (production) and documents · **Wed 14 – Thu 15 Oct** (morning) | `phase-1.5-deploy` | ⬜ | — | — | — |
| — | Walkthrough with the lead · **Thu 15 Oct** (afternoon) | — | ⬜ | — | `phase-1-done` | — |
| 2 | Complete product (~23 working days) | per package | ⬜ | — | — | — |
| 3 | Launch-ready (~15 working days + client testing) | per package | ⬜ | — | — | — |

Status key: ⬜ not started · 🚧 in progress · 🧪 testing or in review · ✅ merged · ⛔ blocked

From 0.10 on, the PR column lists both pull requests (into `staging`, then `staging` → `main`), and **Merged** means merged into `main` (ADR 0015).

## Phase 1 goals: where they stand

| Goal | Step | Status |
|---|---|---|
| Logins, scoped roles, My profile (change password, ID and LinkedIn once) | 1.1 | ✅ Merged into `main` |
| Companies created or joined, data cleaned on save (one PAN, one spelling) | 1.1 | ✅ Merged into `main` |
| The leader creates departments and their heads; heads create staff and jury (temporary passwords, changed at first login) and choose the theme; the leader only views (ADR 0020) | 1.2 | ✅ In `staging` |
| Staff set up an award on screen: settings, questions with versions (R4), scoring sheet with exact arithmetic, jury per application | 1.2 | ✅ In `staging`; both demo awards built on screen |
| A simple award page (department colours; the logo in 2.2, G-K30) and Open awards, with the live "499 / 500" counter | 1.2 | ✅ In `staging` |
| Apply: one per company (blocked at the start), demo fee, autosave form, recent employment proof, entry limit, deadline lock | 1.3 | ✅ In `staging` |
| Staff: proof check, release | 1.3 | ✅ In `staging` (release through the API; its screen is Phase 2) |
| Blind view without masking (R1), conflicts (R2), assignment by hand with the counts, several jury with the exact average, score changes with reasons (R3) | 1.4 | 🧪 Built and tested; in review |
| Approval by the head (send back: Phase 2), results published, the leader dashboard screen | 1.4 | 🧪 Built and tested; in review (the head gets the same dashboard for their departments) |
| Production online on Supabase, Render and Vercel, with demo data and logins | 1.5 | ⬜ |
| The brief's documents: README, user journeys, architecture, testing, AI notes, decisions | 1.5 | ⬜ |

## The four rules: where they stand

| Rule | Enforced in | Tests | Status |
|---|---|---|---|
| R1 Blind judging hides who applied | Step 1.4: the jury view is an allow-list; files only in an award that isn't blind, never proof documents | Every jury response of a blind award scanned for the organisation's name, PAN, GSTIN, email, address, phone and the applicant; jury downloads refused; another juror's work, totals and averages never shown; a non-blind award shows the answers, files and the organisation's name and place only. The scan was proved to catch a leak by putting one in | 🧪 Built and tested; in review |
| R2 No assignment with a recorded conflict | Step 1.4 (on-site panels: Phase 2) | Refused through the API, also across awards; left out of the picker; a late conflict takes back unsubmitted work and flags submitted work; removal with a reason | 🧪 Built and tested; in review |
| R3 Who changed a score, and why | Step 1.1 (audit trigger, built), 1.4 (corrections in one transaction with their audit event; triggers lock scores, evaluations and results after approval) | Refused without a reason; who, role, when, old, new and why recorded; an injected audit failure rolls the change back; refused after approval by the service and by the database; shown in the history | 🧪 Built and tested; in review |
| R4 Last year's applications still read correctly | Step 1.1 (FormVersion trigger, built), 1.2 (versions, built), 1.3 (each application pinned to its version) | Database trigger (1.1); a version unchanged after the next one, nothing published removed or retyped, keys never reused (1.2); a submitted application opens with its own version after the next one is published, while a draft follows the latest (1.3) | 🧪 Built and tested; in review |

## Decisions: where they land

| Decision | Phase 1 | Later |
|---|---|---|
| Staff on many awards; award to the organisation; no authorisation letter | ✅ in 1.1–1.2 | — |
| ~~Leader's PA role~~ **removed 9 Oct** (ADR 0014): the leader's team uses the leader's account | — | — |
| Data consistency (normalise, case-insensitive unique, master lists, snapshots) | 1.1–1.3 | Master-data screens, corrections (2.3) |
| One application per organisation, blocked at the start; staff release | 1.3 | — |
| Proof: ID and LinkedIn once on the profile, recent employment proof, each award checks | 1.1, 1.3 | Automatic deletion after 12 months (2.7) |
| Entry limit with the public counter | 1.2, 1.3 | — |
| Several jury per application, exact average (ADR 0019) | 1.2, 1.4 | Spread flag (2.5) |
| People on screen: departments, heads, staff and jury lists (ADR 0017) | 1.2 | Invites by email, replace a head, deactivation (2.3) |
| Departments run themselves: the head keeps people and theme, the leader only views (ADR 0020) | 1.2 | The full brand-kit screen (2.2) |
| Blind judging without masking (ADR 0018) | 1.4 | — (masking dropped) |
| Branded award sites | A simple page per award (1.2) | Banner, about, contacts, full section builder, versions (2.2); own domains (3.6) |
| External organisers as departments | Created on screen by the leader (1.2) | Department dashboard (2.4) |
| On-site rounds and medals | Tables only | 2.1 |

---

## What has been achieved (newest first)

Each phase gets an entry when it starts. Tick items off as they land and keep the entry once the phase is merged. That way this section is the full history of what exists and why.

### Step 1.4: Assignment, judging and results · 🧪 · 2026-10-11 (Day 9, night)

On `phase-1.4-judging` (cut from `staging` after Step 1.3 merged, sumitdwivedi01/EigthyAwards#18), built in a third worktree with its own databases (`awards14`, `awards_test14`, `awards_shadow14`) and ports (API 4200, screens 3200). Decided first with the owner (11 Oct): staff correct a score with a reason **until the head approves** (there is no send back in Phase 1); sending for approval **waits for every proof check**, and an application whose proof was rejected gets the not-advancing result unjudged; ranks, top N and the cut-off are **per entry category**; a conflict recorded after a juror submitted is **flagged and still counts**; in an award that isn't blind the jury see the organisation's **name, type, city and state** only; a conflict recorded by mistake is **removed with a reason** and kept.

**Backend** (332 tests, were 271; lint, type check and the drift check clean)
- [x] **One migration:** conflicts can be removed with who, when and why (one active conflict per pair); `ΣP` and `n` next to the final score, with a CHECK that holds `F₂` to its formula and a trigger that keeps the score and rank fixed; triggers that refuse any change to evaluations, marks and comments of an approved round, and a locked round going back.
- [x] **judging** (a new module): **conflicts** (R2) recorded by staff or the head, for every award; recorded late, they take back unsubmitted work and flag submitted work. **Assignment** by hand from the department's list after the deadline, all or nothing, under a lock on each application, with the board's counts per application and per juror; take back before submission with a reason; the jury per application changes until the round is sent. **The jury view** (R1) from an allow-list; **scoring** with draft saves, the first mark locking the sheet, submit needing every indicator and the note. **Judging progress** with every juror's marks next to the exact average (ADR 0019), ranks within each category, ties; **corrections** with a reason (R3).
- [x] **approval** (a new module): send for approval (refused below the minimum, with an unfinished evaluation or an unchecked proof; the heads are emailed); the head's queue; **approve** stores `F₂`, `ΣP`, `n` and the rank and locks the round. Send back is Phase 2.
- [x] **results** (a new module): by top N of each category, a minimum score or by hand; publish (every applicant sees their result and is emailed; the cycle becomes Results published).
- [x] **reporting** (a new module): the dashboard, for the leader (every department) and a head (their own), counts only.
- [x] **History** of an application for staff, the head and the leader; jury downloads of evidence in awards that aren't blind; the proof check fixed once judging starts; three email templates.
- [x] Tests from the plan's list: R1, R2, R3 as above; assignment before the deadline, above the maximum (also two staff at once), off the list, the same juror twice, an unverified application, all or nothing; the head never assigned; the jury per application rules; submit without a mark or the note; edits after submit; 69.27 from three jury; a revoked evaluation never counts; ranks 1, 2, 2, 4; sending below the minimum; approve by the leader or staff refused; results before approval refused; top N, the cut-off, by hand, publish and what the applicant sees; the dashboard's scopes and counts; the database rules (the score CHECK, conflicts, locked rounds, results kept).

**Frontend** (lint, type check and build clean)
- [x] **The round page** for staff (`/staff/rounds/:id`), the head (`/department/rounds/:id`) and the leader (`/leader/rounds/:id`, read-only): **Assignment** (jury per application, the board with checkboxes, the jury list with counts, conflicted jurors greyed out, take back with a reason, conflicts with record and remove), **Judging** (per category, every juror's marks, points and note, the final score with `ΣP` and `n`, corrections with a reason, the history per application, send for approval with what still blocks it, approve with a remark), **Results** (top N or a cut-off, then by hand; publish).
- [x] The jury's **My assignments** and **scoring screen** (answers, files when not blind, 0–10 and Yes/No buttons, comments, the overall note, autosave, submit).
- [x] The head's **approval queue** and dashboard on the Department home; the **leader dashboard**; a **History** card on the staff application page; **Judging** links from the award, the edition and the applications list; results shown to applicants.

**Checked by hand** (browser, against the 1.4 API): a blind award with 2 jury per application and ADR 0019's scoring sheet; Kiran (Acme Steel) and Rahul (Bharat Cement) verified, Deepa (Coastal Chemicals) rejected. As Asha (staff): the board (2 to judge, 1 rejected not judged), a conflict Vikram – Bharat Cement recorded and Vikram greyed out for it, both applications assigned to Anil and Priya. As Anil: references only, no names; "Files aren't shown in a blind award"; marks autosaved across a reload; submit refused without the note, then submitted and locked. Final scores 78.70 (ΣP 157,400, n 2) and 64.30 as calculated by hand; Asha corrected Anil's Training 8 → 9 with a reason: 65.80, and the history shows who, when, 8 → 9 and why. Sent for approval; Meera's queue and dashboard; she approved with a remark (no correct buttons for her). Asha gave the top 1 of each category and published: Kiran sees Shortlisted with its message; 6 result emails, 2 assignment emails, 1 approval email in Mailpit. The leader's dashboard and read-only round page (no buttons or inputs). Phone width: no sideways scrolling on the round page, the dashboard or the scoring screen. Found and fixed: a raw action name in the history, and the approval card not saying why before the first assignment. Also fixed: the tests' database reset gets 30 seconds (its TRUNCATE passed Prisma's 5-second limit once on a busy machine, failing an unrelated departments test).

- [x] Docs: API.md (conflicts, assignment, judging, approval, results, history, dashboard), GAPS (K34–K39 added), ai-notes #15, both READMEs, TECHNICAL-DESIGN, PHASES §2, Daily.
- [ ] The owner opens the pull request into `staging` and merges it; the manual check again on `staging`; then `main` and the tag `phase-1.4-done`.

### Step 1.3: Applying and proof check · ✅ in `staging` · 2026-10-11 (Day 9, night)

On `phase-1.3-apply` (cut from `staging` after Step 1.2 merged), built in a second worktree with its own databases (`awards13`, `awards_test13`, `awards_shadow13`) and ports (API 4100, screens 3100), so the owner could test `staging` in the main folder at the same time. Decided first with the owner: keep the plan (Save changes after submitting and Withdraw stay in Phase 2; release is API-only).

**Backend** (271 tests, were 203; lint, type check and the drift check clean)
- [x] **One migration:** one payment per application (a unique index); `removedAt` on files (a file taken off a draft, or a replaced proof, is kept); a CHECK that evidence always answers a question.
- [x] **applications** (a new module): start for one of the user's organisations, in a category of an open edition; **one per organisation, blocked at the start** (the service checks; the partial unique index decides when two colleagues start at once); the colleague's row shows the status only. Change the category until the fee is paid. The **demo payment** (the category's fee, else the edition's) opens the form.
- [x] **Autosave:** each answer checked against its question type, with a message per question; a wrong one is reported and not saved while the others are. Drafts follow the latest questions; a submitted application keeps its own version (**R4**).
- [x] **Files** through signed links, checked against the question's kinds and count and by their content (Word and Excel as ZIP, G-K32); removed files kept.
- [x] **Employment proof** dated within the 3 months before today (India time), not in the future, with consent; it can be replaced on a draft, or after a rejection until the deadline.
- [x] **Submit** checks every required answer and file, the employment proof, and the identity document and LinkedIn link on the profile, then checks the **entry limit** in the transaction that locks the cycle; takes the organisation's snapshot and records the profile proof it uses; emails the applicant and the organisation's official email (outbox).
- [x] **The deadline lock** on the first use after the deadline (G-K33): the edition becomes Closed, drafts Not submitted, submitted applications get their final snapshot; every write refuses with 409 after the deadline.
- [x] **Staff:** the applications list with counts and filters (status, category, proof); the review view (the snapshot, the proof documents, the answers); the **proof check** (Verified, or Rejected with a reason that is emailed to the applicant; audited); a fix on the profile or a new employment proof puts the check back to pending until it is verified (G-K04); **release** with a reason (API). The department's head and the leader may read, never act.
- [x] **Files:** `GET /files/:id` gives a short-lived download link to the applicant and the award's people, never to anyone else (jury from Step 1.4, never proof documents).
- [x] Tests from the plan's list: a second start refused, also when two colleagues start at once; release frees the place; the colleague's view hides the starter; the form locked until the fee is paid; a partial draft saves; each question type refuses a wrong answer with its own message; submit refused without an answer, the proof, the ID or the LinkedIn link; a proof older than 3 months refused; a second award reuses the profile's ID; the limit refused, also when two race for the last place; every write after the deadline gives 409; R4 pinning; the snapshot kept after the organisation's name changes; 404 for another organisation's application; the status table. Also the database rules (one payment, evidence answers a question) and the identity origin test now reading `APP_URL`.

**Frontend** (lint, type check and build clean)
- [x] The applicant's home: **My applications** (a colleague's row: status only) and **Open awards** with Apply; the public award page's **Apply** goes to the start page.
- [x] **Apply**: the edition, its categories and fees, the counter, and the organisation's position (already started by a colleague, with its status only).
- [x] **The application**: the header (status and message, deadline, counter, category until paid, the fee and its reference), the **demo payment**, the form in **steps** with progress per section, **autosave** (saved, saving, unsaved, retrying, and "saved except the answers marked below"; leaving with unsaved answers asks first; queued answers survive a failed save), the blind award's notice, file questions with upload, download and remove, the **proof** step (the profile's ID and LinkedIn link, the employment proof with its date and consent, the rejection reason), **review and submit** (what is still needed, with a link to where it is fixed), and the read-only summary after submitting.
- [x] Staff: **Applications** (counts, filters, rows) and the **review** with the proof documents and Verify / Reject with a reason; links from the award and the edition setup.

**Checked by hand** (browser, against the 1.3 API): as Kiran (Acme Steel), applied to a blind award with a ₹2,500 fee: changed the category and back, paid, filled both sections (a member count below the minimum got its message next to the question while the rest saved), uploaded a PDF to the file question, reloaded and found every answer, was refused a proof dated 1 May ("on or after 11 Jul 2026"), added today's proof, saw the profile items missing at review, added them, and submitted (1 / 50). As Deepa, Kiran's colleague: the start page says Acme already has an application (Submitted), started by a colleague; a direct start gets 409 with the status only. As Ravi (staff): the list with counts and filters, the review with the ID, LinkedIn and proof side by side, the download link (an attachment), a rejection with a reason (emailed), Kiran's new proof putting it back to pending, then Verified. Phone width: no sideways scrolling on any of these pages. Found and fixed: "all changes saved" while an answer was refused, and no fee line after paying.

- [x] Docs: API.md (applying, checking applications, reading a file), GAPS (J20, K04 fixed; J23, K29 corrected; K32, K33 added), ai-notes #14, both READMEs, TECHNICAL-DESIGN, PHASES §2, Daily.
- [x] Merged into `staging` (sumitdwivedi01/EigthyAwards#18).
- [ ] The manual check again on `staging`; then `main` and the tag `phase-1.3-done`.

### Step 1.2: Departments, people and award setup · ✅ in `staging` · 2026-10-11 (Day 9)

On `phase-1.2-setup` (cut from `staging`). The organisers' hierarchy works on screen (ADR 0017), and staff set up and publish an award entirely on screen: "an award is data, not code" (rule R4).

**Backend** (203 tests, were 136; lint, type check, the drift check, and seeding a fresh database twice, all clean)
- [x] **One migration:** the JURY role belongs to a department's jury list (no cycle pool; the role scope CHECK rewritten); temporary-password columns with a CHECK that sets and clears them together; `externalOrganiser` on departments; the masking table, status and file fields removed (ADR 0018), with the file-kind enum swapped around its CHECKs (ai-notes #11). The seed puts its jury on the demo departments' lists; CI seeds a fresh database twice (ai-notes #12).
- [x] **identity:** temporary passwords (16 characters without look-alikes, about 79 bits; only the hash is stored; valid 7 days); login refuses an expired one; until the person sets their own, every request except `/me`, the password change and logging out answers `403 PASSWORD_CHANGE_REQUIRED`; setting it clears the flags and is audited.
- [x] **departments:** the leader creates a department with its head (a new account, or an existing platform account by email) in one transaction; the leader sees every department and a head their own; heads add staff and jury (the leader too, until ADR 0020 the same evening), refusing applicant accounts, the leader, doubles, and the department's own head or staff on its jury list (G-K26); removal only while the person has no work there; a new temporary password ends the old one and every session (only the leader for heads; never oneself).
- [x] **awards:** create in your own department (the domain from the master list; the name unique in the department, ignoring case); the creator runs it; My awards; editions start as a draft with one written round (1 juror per application, Shortlisted / Rejected), no categories, empty questions and sheet; basics, categories with their own fee, the jury per application and result names; the publish check as sentences, and a `409 PUBLISH_BLOCKED` listing every issue at once; after publishing, fee, blind judging, dates and categories are fixed and the entry limit can still change.
- [x] **forms:** six question types, stored with only the fields each type uses; keys made by the server and never reused; a draft, and immutable versions with a change summary; inside an edition nothing published is removed or changes type (R4); fixed after the deadline.
- [x] **scoring:** one sheet per round, saved in any state while it is built; the publish check needs 100% at each level and every indicator on a published question; locked once scoring starts; the arithmetic of ADR 0019 as pure functions, tested against the worked examples (27.2 for one section, 69.27 for three jurors, half-up rounding once at the end, ranks 1, 2, 2, 4).
- [x] **sites:** one page per award, its address made from the name (`-2`, `-3` if taken) and changeable by staff; Open awards (published and open today, with the live counter) and the page by address; drafts never public.
- [x] **Departments run themselves** (owner, 11 Oct evening; [ADR 0020](decisions/0020-departments-run-themselves.md)): creating a department takes no colours (the default theme until the head chooses one; other fields are refused); only the head adds, removes and resets staff and jury; the leader can view a department's people and theme and can only reset a locked-out head (G-K31); the head chooses the **theme** (`GET`/`PUT /departments/:id/theme`: colours and footer, audited, read live by every award page, an empty footer showing the department's name); the head can also change an award page's address. The people view says what the caller may do (`canManage`, `canIssuePassword`, `canRemove`), the theme view `canEdit`. 10 more tests.
- [x] Tests written from the rules, including the one Step 1.1 left open: a juror gets `403` on a staff endpoint, and so does another award's staff.

**Frontend** (lint, type check and build clean)
- [x] The leader's **Departments**, the head's **People** (the temporary password shown once), **Set your password** at the first login; homes that list each person's departments.
- [x] Staff: **My awards**, **Create award**, the award's editions and page address, and the **edition setup** tabs: basics; categories; judging (jurors per application against the department's jury list, result names); the **question builder** (sections, six types, published items locked, save the draft, publish a version with a summary, view earlier versions); the **scoring-sheet builder** (sections and indicators, running totals, split evenly); publish (what is still missing, a confirmation, then the fixed settings read-only). In a blind award both builders say that jurors won't see files (ADR 0018).
- [x] Public: **Open awards** on the front page and each **award page** in its department's colours.
- [x] ADR 0020: no colours on the leader's New department form; the department page is read-only for the leader (a reset button only for heads); the head's department page adds the **theme** (colour pickers, footer, a live preview that keeps the text readable on any colour) and the department's **award pages** (live or not, change the address); the award page keeps its text readable on the head's colours.

**Checked by hand** (browser, against the running API): the people flow: the leader creates a department with a new head (and another with an existing account as head); the head logs in with the temporary password and must set their own; an applicant's email is refused on the jury list; a new juror logs in, sets a password and sees their department. Then, as a staff member the leader added, three awards built on screen from nothing: a trial award, where a bad page address, a deadline before the opening, a bad fee, a duplicate category (other letter case), a minimum above the maximum and an empty section and question were each refused with the API's message next to the field; and the plan's two demo awards, **Safety Excellence Award 2026** (blind, ₹10,000, 1 category, 2–3 jurors, no limit, 3 sections of text answers) and **FPO Excellence Awards 2026** (not blind, free, 4 categories, 1 juror, limit 500, 2 sections with evidence uploads). A second form version published with version 1 still showing its own questions; published questions can't be removed or change type; after publishing, the fixed settings are read-only and the entry limit still saves; all three appear on Open awards with their counters and pages, and a draft's page is `404`. Found and fixed during the check: duplicate element ids between the two builders (ai-notes #13), a stale notice, and ".00" on whole-rupee amounts.

- [x] **Checked by hand after ADR 0020** (browser): as the leader, the Departments page has no colour fields, and a department's page shows its people, theme and award pages with no add, remove or theme controls, and a new-password button only for people who head a department; as the FPO head (given a new temporary password by the leader, then their own), the page has add, remove and reset for their staff and jury, refuses a colour like "purple", saves a new theme that the public award page shows at once (white text on purple; dark text on a light yellow in the preview), and changes an award page's address (then back). The FPO theme was restored afterwards.
- [x] Docs: ADR 0020 (and 0017 marked), the spec (§3 roles, matrix and rules, §5.1, §5.3, §5.19, §7, §15), CLAUDE.md, PLAN, PHASES, the Phase 1 roadmap, TECHNICAL-DESIGN, the overview and UI overview, GAPS (E03, J06; K31), API.md, Daily.
- [x] Docs: `docs/API.md` (departments, award setup, questions, scoring sheet, public pages), both READMEs, ai-notes #11–#13, GAPS (K26 fixed; K28–K30 added), PLAN and PHASES (no logo until image uploads), PHASES §2, Daily.
- [x] Merged into `staging` (sumitdwivedi01/EigthyAwards#16).
- [ ] The manual check again on `staging`; then `main` and the tag `phase-1.2-done`.

### Step 1.1: Foundation and people · ✅ · 2026-10-10 (Day 8, evening and night)

The first build step, on `phase-1.1-foundation` (cut from `staging`). Decided first with the owner: copy the parked code (not merge it) with one new migration; jury accounts only from the seed until staff add them to a pool (G-K19); uploads through signed links (G-B03).

**Backend** (136 tests, were 62; lint, type check and the schema drift check clean)
- [x] The parked foundation copied across (0.7 list, B0.1), CI also on `staging`.
- [x] One new migration with every 7–9 Oct change (B1–B4, B6): site tables, entry limit, proof files and their owners, application proof status and release, profile fields, `juryMin`/`juryMax` for both round types, several jury per application, `LEADER_PA` removed. Database-rule tests rewritten from the rules.
- [x] **identity:** register, login (constant-time for unknown emails), logout, a signed session cookie (ADR 0003), the actor rebuilt from the database on every request, `GET /me` with areas and home; My profile (name, phone, change password that ends other sessions, is audited without the password and queues an email), LinkedIn link, identity document through a signed upload link with its content checked.
- [x] **Applicant and platform accounts** (the owner's decision on the night of 10 Oct, [ADR 0016](decisions/0016-applicant-and-platform-accounts.md)): only applicant accounts create or join organisations and keep the profile proof; the leader, heads, staff and jury use platform accounts and get `403` there, and a juror with no role yet has no area. A second migration adds `accountType`, a CHECK and triggers that refuse mixed rows; the seed sets every account's type; 7 more tests.
- [x] **Request safety:** same-origin check on writes (G-B11), `Cache-Control: no-store` (G-B16), failed-login limits per visitor and per email (G-C12).
- [x] **organisations:** register (normalised, PAN and GSTIN checks, state warning, master-data type), one record per PAN (409 → Join), join with PAN + GSTIN or PAN + official email, members-only view and edit (never the PAN), audited.
- [x] **master-data:** public lists of organisation types, award domains and states.
- [x] **Seed:** the leader, two departments (one an external organiser) with heads and brand kits, three staff (one in both), six jury, three applicants and Acme Steel Ltd; passwords from the environment; safe to repeat.

**Frontend** (Next.js 16.3.6, Tailwind 4, shadcn/ui on Radix; lint, type check and build clean; frontend CI added)
- [x] The `/api` proxy to the backend; `src/proxy.ts` as the coarse login gate (Next.js 16 renamed middleware, ai-notes #8).
- [x] Login, register, logout; the app shell with the areas the API gives; a home per role.
- [x] My profile (details, password, LinkedIn, identity document) and My organisation (register, join, edit).
- [x] The Applying link, the proof tab and My organisation only for applicant accounts; "Nothing is assigned to you yet" for a juror not yet in a pool; register and login say "applicant account".

**Checked by hand** (browser, against the running API): register with messy input (cleaned); register a PAN that exists (moved to Join); join with a wrong GSTIN (the state named) and the right one in lower case (one Acme record); phone and LinkedIn on My profile; the identity document upload; a role granted and revoked in the database showing and disappearing at once; a password changed on screen ending the session of a second device at once, with the "password changed" email in Mailpit; logout; the login gate. Every seeded role logs in to its own area through the API: the leader, a head and staff see only their area and get `403` on the profile proof and organisations; a juror has no area until added to a pool; an applicant has Applying. In the browser, a platform account sees no Applying link and no proof tab, and "Not available" on the applicant pages.

- [x] Docs: `docs/API.md`, both READMEs, CLAUDE.md commands, TECHNICAL-DESIGN, ai-notes #7–#10, GAPS (13 gaps closed, K20 and K21 added, K19 updated), the 0.7 change list ticked, Daily; for the accounts decision, ADR 0016, the spec (§2, §3, §5.1, §5.2, §5.8, §5.21, §10, §12, §18), PLAN and PHASES (Steps 1.1, 1.3, 1.4).
- [x] "A jury user gets 403 on a staff endpoint" through HTTP: tested in Step 1.2, with the first staff endpoint.
- [x] Merged into `staging` (sumitdwivedi01/EigthyAwards#12) and `main` (sumitdwivedi01/EigthyAwards#15). The tag `phase-1.1-done` is still to push.

### Docs phases 0 to 0.12 · ✅ · 4–11 Oct 2026

The planning phases (brief, spec, plan, ADRs 0001–0020, overview, UI flows, re-plans) are on the status board above; their detailed entries were removed on 12 Oct 2026 to keep this file short. Git tags `phase-00-done` to `phase-0.10-done` and [Daily.md](../Daily.md) keep the record.

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
| Online | Production only in Phase 1, from Step 1.5 (14–15 Oct): `main` on Vercel, Render and its own Supabase project; `staging` is tested by CI and locally, and the staging site comes in Phase 2 (decided 11 Oct). Not created yet |
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
| `jury.anil@`, `jury.priya@`, `jury.vikram@demo.test` | Jury of Safety, Health and Environment (Vikram is on both lists) |
| `jury.sunita@`, `jury.farhan@`, `jury.lakshmi@demo.test` | Jury of the FPO Awards team; heads add more on screen (ADR 0017) |
| `applicant.kiran@demo.test` | Applicant, member of Acme Steel Ltd |
| `applicant.deepa@demo.test` | Applicant, a colleague who joins Acme Steel on screen |
| `applicant.rahul@demo.test` | Applicant with no organisation yet (registers one on screen) |

The seed creates no awards: staff build them on screen. It never changes the password of an account that already exists (G-K29): after changing `DEMO_PASSWORD`, reset the local database (`npm run db:reset`, then `npm run db:seed`). Scripts that sign in as these accounts must read `.env` with `dotenv`, as the seed does: the lines may carry inline comments (ai-notes #14).

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
