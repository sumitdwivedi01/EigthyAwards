# Delivery plan: three phases

> **For the lead and reviewers.** This page is the whole plan in plain words, from start to finish. It takes 5 minutes to read.
> Agreed on 9 Oct 2026 after the lead call. Phase 1 started **Saturday 10 October**; re-planned on 11 Oct around the lead's focus (forms and judging) and the owner's request to create people on screen.
> **Phase 1, day by day, for presenting:** [PHASE-1-ROADMAP.md](PHASE-1-ROADMAP.md). The detailed working steps are in [PHASES.md](PHASES.md), the technical design in [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md), and live status in [PROGRESS.md](PROGRESS.md).

## The three phases at a glance

| Phase | What it delivers | When | Effort |
|---|---|---|---|
| **1. Working platform** (what we are judged on) | Two awards that work differently run **end to end, online**. Staff set them up on screen with **no code**. The **four rules** are enforced and tested. | **Sat 10 – Thu 15 Oct 2026** | 5 working days (about 71 hours) |
| **2. Complete product** | Everything else the client asked for: on-site rounds and medals, the full site builder, invitations by email and the rest of the admin screens, all emails, end-to-end tests | About **23 working days** after Phase 1 | ~23 days |
| **3. Launch-ready** | What a real launch needs: security and privacy review, load testing, a real payment gateway, own domains, client testing | About **15 working days**, plus client testing | ~15 days + 5–10 days of client testing |

```mermaid
flowchart LR
    P1["<b>Phase 1</b><br/>Working platform<br/>10–15 Oct"] --> P2["<b>Phase 2</b><br/>Complete product<br/>~23 working days"] --> P3["<b>Phase 3</b><br/>Launch-ready<br/>~15 days + client testing"]
```

Each phase ends with something the client can open and use. Nothing built in Phase 1 is thrown away: it is the real architecture, and Phases 2 and 3 add to it.

---

## Phase 1: the working platform (10–15 October)

### The goal

Exactly what the brief asks, done properly: *"one system handling two awards that work in different ways; a staff member sets those differences without changing any code"*, with the four rules enforced and tested. It is **deployed online**, so anyone can try it.

**The lead's focus (11 Oct):** staff building the form, applicants filling it, and the jury judging it, all done really well. Those three get the most care and the most tests. An organiser is also set up on screen, as the brief's addendum asks: the leader creates a department and its head, and the head adds their own staff and jury.

### The two awards in the demo

| | Award A: Safety Excellence Award 2026 | Award B: FPO Excellence Awards 2026 |
|---|---|---|
| Blind judging | **On**: jury never see the company, the applicant or any file | **Off** |
| Entry fee | **₹10,000** (demo payment) | **Free** |
| Categories | 1 | **4** |
| Jury per application | **2 to 3**; the average counts | **1** |
| Entry limit | None | **500**, shown as "499 / 500" |
| Questions | 3 sections, text answers only | 2 sections, with evidence uploads |

Both are set up **on screen by staff**. In the walkthrough, staff also set up a third award live, to show that no developer is needed.

### What works in Phase 1

| Who | What they can do |
|---|---|
| **Visitor** | See open awards as branded cards, and each award's page in its department's logo and colours (dates, categories, fee, places left) |
| **Applicant** | Register, then create or join their company (PAN and GSTIN checked and cleaned). Add a photo ID and LinkedIn link once, on **My profile**. Start an application (blocked if a colleague already did), pay the demo fee, fill the form with autosave, upload evidence and a recent proof of employment, then submit, and see their status and result. Change their password |
| **Staff** | Create an award and set it up: dates, fee, blind, categories, entry limit, jury per application, questions (with versions) and the scoring sheet (weights must total 100%). Choose the award page's address. Check proof and record conflicts. After the deadline, **assign each application by hand** to jury from the department's list, with the counts in view: per application (assigned, against the minimum) and per juror (assigned, submitted). Follow progress, correct a score with a reason, send for approval, then shortlist and publish results |
| **Jury** | Log in with the temporary password from their head, set their own, and see the departments they judge for. See their applications, score them (whole numbers 0–10 or Yes/No) with an overall note, and submit. In a blind award they never see the company, the applicant or any file |
| **Department head** | **Create their department's staff and jury** (each gets a temporary password, changed at first login). Review the ranked results and approve the round |
| **Leader** (and the leader's team, on the same account) | **Create departments and their heads.** A read-only dashboard across all awards and departments: applications, judging progress, rounds waiting for approval, deadlines |

**Two kinds of account** (decided 10 Oct, [ADR 0016](decisions/0016-applicant-and-platform-accounts.md)). Applicants register their own account, and only they apply. The leader, department heads, staff and jury get their accounts from the platform and never apply from them; a juror who also wants to apply for their company registers a second account with another email.

### How the four rules are proven

| Rule | In Phase 1 | Proof |
|---|---|---|
| 1. Blind judging | In a blind award the jury never get the company's details, the applicant's name or any file: only the answers as typed. No masking step ([ADR 0018](decisions/0018-blind-judging-without-masking.md)) | Automated tests scan every jury response for the company's name, PAN, GSTIN, email and address and the applicant's name; a jury file download is refused |
| 2. Conflicts of interest | A recorded conflict blocks that jury member, for every award | A test tries to assign through the API directly and is refused |
| 3. Score history | Every change after submission needs a reason; who, when, old and new are kept | Tests; the history shows on the application page |
| 4. Question versions | Published questions are frozen; old applications open with their own version | Tests; the database itself refuses edits |

### Day by day

Re-planned on 11 Oct: from Sunday each step runs across two days, and Thursday morning is build time.

| Day | Date | Build | By the end of the day you can see |
|---|---|---|---|
| 1 | **Sat 10 Oct** | **Step 1.1, foundation and people.** The backend base (the parked code plus the 7–9 Oct changes), logins and roles, applicant and platform accounts, My profile, companies, starter data. The web app with login and role areas | Log in as every role; create or join a company; change your password |
| 2 | **Sun 11 Oct** | **Step 1.2, departments and people**, then **award setup** begins | The leader creates a department and its head; the head creates staff and jury; each logs in with a temporary password, sets their own and sees their department |
| 3 | **Mon 12 Oct** | Step 1.2 finishes (the question builder with versions, the scoring sheet with weights and the exact formula, the award page, publishing); **Step 1.3, applying**, begins (one per company, demo fee, the form with autosave) | Staff set up both awards on screen and publish them; they appear on Open awards; an applicant starts filling a form |
| 4 | **Tue 13 Oct** | Step 1.3 finishes (uploads, proof of employment, submit with the entry limit, the deadline lock; staff applications list and proof check); **Step 1.4, assignment and judging**, begins (conflicts, the assignment board, scoring) | Applicants submit to both awards; staff verify the proof and assign applications to jury |
| 5 | **Wed 14 Oct** | Step 1.4 finishes (score changes with reasons, the exact average, approval, results, the leader dashboard; all rule tests green); **Step 1.5, online**: production on Supabase, Render and Vercel | Both awards run from application to published results; the platform runs at a public address |
| — | **Thu 15 Oct** | Morning: Step 1.5 finishes (demo data, documents, every role tested online, rehearsal). **Afternoon: walkthrough with the lead** | — |

Each step is tested on the `staging` branch as soon as its checklist is ticked, then merged into `main` (production); [Daily.md](../Daily.md) gets a short update every day.

### Kept simple in Phase 1, on purpose

- **People are created on screen, without email.** The leader or the head passes on a temporary password, which works once and must be changed at first login. Invitations by email come in Phase 2.
- **A simple page per award**, in its department's logo and colours, filled in automatically from the award's settings. The full drag-and-arrange site builder comes in Phase 2.
- **Only production goes online.** The `staging` branch is tested by CI and on a laptop; the staging site comes in Phase 2.
- **Emails** are written to an email log, and caught locally by a test mailbox. Real sending online needs an email provider, chosen in Phase 2.
- **The payment is a demo**; there are no real payments until Phase 3.
- **Written rounds only.** On-site rounds (shop-floor competitions, live finals, medals) come in Phase 2. The data model already includes them.

### Moved to Phase 2 to fit the dates

On 10 Oct the full Phase 1 list came to about 100 hours of work against about 64 available, so these items moved to Phase 2 (package 2.5 unless noted). On 11 Oct the people screens came into Phase 1 (about 8 hours), paid for by dropping masking, a simpler award page and one online site. None of the moved items is needed for the brief or the four rules:

| Moved | Why it can wait |
|---|---|
| Send back with a remark, and reopening a jury member's scores | The head can still approve; the full loop comes next |
| Comparing question versions and "New / Updated" markers | Versions are still frozen and tested (rule 4) |
| Editing a submitted application ("Save changes") and withdrawing | Applicants submit when ready; staff can release a wrong application |
| A screen for releasing an application | The release works through the API, with its test |
| The full scoring-sheet builder; date, multi-choice and team-member questions | A simpler builder and six question types cover both demo awards |
| The award page's banner, about text and contacts; the brand-kit screen and image uploads (2.2) | The page shows the name, logo, colours, dates, categories, fee and counter; a new department's colours are set when it is created |
| Invitations by email (2.3) | The leader or the head creates the account and passes on a temporary password |
| The staging site online (2.9) | `staging` is tested by CI and on a laptop |
| The applicant's status timeline | The status and result still show |
| Edge-case tests beyond the four rules and the main flows (2.8) | Every rule keeps its tests |

**Dropped, not moved:** masking, where staff edit a copy of the answers and files to hide names (the lead's decision, 11 Oct; [ADR 0018](decisions/0018-blind-judging-without-masking.md)). Blind awards hide the company, the applicant and every file from the jury automatically, and the form asks applicants not to name their organisation in their answers.

That keeps Phase 1 at **about 71 hours**: 12–13 hour days, Sunday included, with Thursday morning now planned work, so **no buffer is left**.

### If a day still runs late

We cut from the top, and never the core:

1. removing a person from a department (Phase 2 instead);
2. Open awards as branded cards (a plain list stays; each award page keeps its logo and colours);
3. the filters on the staff applications list;
4. the leader dashboard's panels (one table of counts per department and award stays).

**Never cut:** the four rules and their tests; two awards configured on screen; people created on screen; the question builder with versions and the form with autosave; manual assignment with the minimum and the counts; several jury with the exact average; the proof check; one application per company; the entry limit; the leader dashboard (at least its counts); and the online deployment.

### Phase 1 is done when

- [ ] Both awards run end to end online, set up on screen with no code change
- [ ] A third award can be set up live in the walkthrough
- [ ] A department, its head, staff and jury can be created on screen, and each can log in
- [ ] All four rules are enforced on the server, with tests passing in CI
- [ ] Every role can log in online with a demo account
- [ ] A stranger can run it from the README in under 10 minutes
- [ ] The brief's documents are in the repository: user journeys, an architecture drawing, what the tests check and don't, the AI mistake we caught, and the decisions

---

## Phase 2: the complete product (about 23 working days)

| # | Work | Days | What it adds |
|---|---|---|---|
| 2.1 | **On-site rounds** | 4 | Shop-floor competitions (Kaizen, 5S) and live finals: time slots, panels of 2–5, scoring on a phone, average, close the round, Gold / Silver / Bronze. A third award type |
| 2.2 | **Full site builder** | 5 | Pages made of ready-made sections (gallery, past winners, FAQ, partners…), layouts, a phone preview, saved versions and restore; the brand-kit screen and image uploads |
| 2.3 | **The rest of the admin screens** | 2 | Invitations by email (instead of temporary passwords), replacing a head, assigning more staff to an award, master lists, company corrections, deactivating accounts. (Creating departments, heads, staff and jury moved into Phase 1) |
| 2.4 | **Department dashboard** | 1 | External organisers run their awards from their own dashboard |
| 2.5 | **Applying and judging extras** | 3.5 | Send back and reopen scores; version comparison and "New / Updated" markers; editing after submit and withdrawing; the release screen; the full scoring-sheet builder and more question types; disqualify and reinstate; deadline extension; "questions changed" alerts; a flag when jury disagree widely; the applicant's status timeline |
| 2.6 | **Emails** | 1 | Every email template, sent for real through an email provider |
| 2.7 | **Privacy housekeeping** | 1 | Automatic deletion of proof documents after 12 months |
| 2.8 | **End-to-end and edge-case tests** | 3 | Robot tests that click through every user's journey in a browser, and the edge cases Phase 1 skipped |
| 2.9 | **Review, buffer and the staging site** | 2.5 | Fixes from the client's feedback on Phase 1; the staging site online |
| | **Total** | **23** | |

## Phase 3: launch-ready (about 15 working days, plus client testing)

| # | Work | Days | What it adds |
|---|---|---|---|
| 3.1 | **Security review** | 3 | An outside-in check of every permission, the database locked down, a penetration test |
| 3.2 | **Privacy review** | 2 | India's DPDP Act: consent, minimum data, retention, with the client's legal team |
| 3.3 | **Load and speed** | 2 | Hundreds of applicants online the night before a deadline |
| 3.4 | **Accessibility** | 2 | Keyboard use, screen readers, contrast |
| 3.5 | **Real payments** | 3 | A payment gateway and receipts, for awards with fees |
| 3.6 | **Own web addresses** | 1 | `fpo.<platform>` first, then the organiser's own domain |
| 3.7 | **Backups and monitoring** | 1 | Alerts, backups, a runbook for staff |
| 3.8 | **Nice extras** | 1 | Copy last year's setup, reports as CSV, reminders to jury and heads |
| 3.9 | **Client testing** | 5–10 | The client's staff try real awards; we fix what they find |

**Total, all three phases:** about 43 working days for one developer, plus client testing. With two developers, Phases 2 and 3 take about half the time.

---

## Why this order

- **Phase 1 proves the hard parts first.** One engine runs different awards, set up without code, with fair, auditable judging. Everything else builds on that.
- **What's most visible to applicants comes early**: branded pages, a simple form, one profile reused everywhere.
- **What's rare or big comes later**: on-site days happen once or twice a year, and the full site builder is a large feature on its own.
- **Launch work comes last**, when the features have stopped moving.

## What the walkthrough will show

- **An organiser set up live:** the leader creates a department and its head; the head adds a staff member and two jury; each logs in.
- **A third award set up live**, in a few minutes, with no code.
- **Tests for each rule.** Each of the four rules has named tests that run on every change; `docs/testing.md` lists them.
- **Clean company data.** Company details are cleaned when saved (one PAN, one spelling), so the leader's dashboard counts each company once.
- **Fair, exact judging.** Staff assign each application by hand, with the counts per application and per juror in view; several jury per application, averaged with whole-number arithmetic and one rounding, so a result can be checked with a calculator; jury never see each other's marks; every score change has a reason.
- **Room to grow.** One database for all awards, with every row tied to its award. About 40,000 applications a year fits, and Phases 2 and 3 add features without rebuilding.
- **Online, with a demo login for every role**, so the lead can try it alone.

## Risks we are watching

| Risk | What we do |
|---|---|
| The build is tight (about 71 hours, and Thursday morning is now build time) | Trimmed on 10 Oct and re-planned on 11 Oct; each day has a clear finish line; the cut list protects the core; any slip shows in Daily.md that day |
| The free server sleeps after 15 minutes idle | Wake it before the demo; consider a small paid plan for demo week |
| Something only breaks online | Wednesday afternoon and Thursday morning are kept for going online; only production goes online, so there is one set-up to get right |
| A temporary password leaks on its way to the person | It works once, for 7 days at most, and must be changed at first login; issuing a new one is audited |
| No email provider chosen yet | Emails are logged in Phase 1; real sending in Phase 2 |

## Open questions for the lead (none of them blocks Phase 1)

1. Should a written-review-only award say "Shortlisted" or "Winner" at the end? (Renamable; default "Shortlisted".)
2. Which email address or domain should the platform send from? (Needed for Phase 2.)
3. Should past years' data be imported later? (Not planned.)
