# Here You can see my daily working in the project so you can understand better what's going on in Daily bases

Each day: **Done** · **Next** · **Stuck** (and **Plan changed** when the plan changed). Details live in [docs/PROGRESS.md](docs/PROGRESS.md).

# DAY 1
 prepared questions I am gonna ask to my client before assuming things by my own to give a structure and design a high level architecture of the problem statement and which will eventually gonna help me to understand the problem more breifly and deep dive more 

# DAY 2 (4 Oct)
 Finally back on the work after some break , now will update regularly what's going on - and keep updating and pushing in github

- **Done:** Put the brief, spec and architecture into `docs/`. Wrote the plan (15 phases), the progress tracker, the gaps list and 4 decisions. Phase 0 merged.
- **Next:** Phase 1, the backend foundation.
- **Stuck:** Nothing.
- **Plan changed:** First plan. The frontend goes on Vercel, the API on Render and the database on Supabase, so it is two apps instead of one ([ADR 0001](docs/decisions/0001-frontend-backend-split-and-hosting.md)).

# DAY 3 (5 Oct)
- **Done:** Call with the leader. Updated all docs: a staff member can run many awards; the award goes to the organisation, not its plants; no signed authorisation letter; a new **Leader's PA** role; data consistency is now a main goal.
- **Next:** Merge these changes, then start Phase 1.
- **Stuck:** Need the leader to confirm what replaces the letter, and the PAs' exact powers ([GAPS §A](docs/GAPS.md), A11–A14).
- **Plan changed:** Added Phase 0.1. Phase 2 got bigger (PA role, master data), so the later phases moved half a day ([PHASES.md](docs/PHASES.md)).

# DAY 4 (6 Oct)
- **Done:** Got answers to my 15 questions. Shop-floor competitions (Kaizen, 5S) are judged on site by a panel of 2–5 jury, scored on their devices; the average counts, with no approval; winners get Gold, Silver or Bronze. One real application per organisation. Updated the spec, plan, gaps and decisions to match (new ADR 0008).
- **Next:** Merge Phase 0.2, then start coding with Phase 1, the backend foundation.
- **Stuck:** Nothing. Open risk: the timeline is tight (16 phases in 7 days).
- **Plan changed:** Added Phase 12 (on-site rounds, backend), so the old Phases 12–14 are now 13–15. Days re-planned from today ([PHASES.md](docs/PHASES.md)).

# DAY 5 (7 Oct)
- **Done:** Presented my understanding and the planned solution to the mentor. Added [docs/overview/](docs/overview/): the whole plan in plain language with diagrams (the problem, the idea, who uses it, the journey of one award, the four rules, why we chose this design), plus a screen-share version. Removed the old architecture PDF, which was out of date.
- **Next:** A new problem has been added to the brief. Update the spec, plan and gaps for it, then restart building.
- **Stuck:** Nothing.
- **Plan changed:** Building is on hold until the plan is updated for the new problem.
- **Later on Day 5:** New issues from the owner: organisers want to keep their **brand** (e.g. FPO Awards), run their award on their own, show the UI before building, verify applicants, and limit entries. Studied the FPO Awards site, wrote proposals (branded award sites built from ready-made sections, organiser = department, membership verification, entry limit, own domains in steps) and 12 questions. See [docs/proposals/0.4-new-issues.md](docs/proposals/0.4-new-issues.md).
- **Next:** Answers to the questions, then UI flow diagrams and wireframes for the lead call on 9 Oct.
- **Stuck:** The first release has to be smaller; to agree on the call.
- **Plan changed:** Added Phases 0.4 and 0.5, a new build phase for award sites, and simpler branch names. Target days on hold until 9 Oct.
- **Decided (Day 5, evening):** Answered all 12 questions. Every award gets a branded site that staff build and can change at any time; an outside organiser runs its award as its own department; each application carries an ID and a proof of employment; an entry limit shows publicly as "499 / 500". The deadline can move, so the plan is **extended, not cut**. Spec, plan, gaps and decision records (ADR 0009, 0010) updated.
- **Plan changed:** A new Phase 4 (award sites); old Phases 8 and 9 merged; simple branch names; target days now run to Day 21, to agree with the reviewer on 9 Oct.

# DAY 6 (8 Oct)
- **Done:** Made the **UI overview** the client asked for before building: a clickable prototype of 31 screens for all 6 roles, a flow diagram per role on GitHub, and the branding presentation ([docs/ui/](docs/ui/README.md)). Wrote two re-plan options for my lead: **A** a focused demo by 15 Oct, **B** the real product (about 10–14 weeks) ([proposals/0.5-replan-options.md](docs/proposals/0.5-replan-options.md)).
- **Next:** 9 Oct call with my lead: show the UI and choose A or B; then re-plan and restart building.
- **Stuck:** Waiting for the lead's choice. The full plan can't fit by 15 Oct.
- **Plan changed:** Hard limit 15 Oct. The build plan is on hold until the lead decides; the 15-phase list stays as the full-product breakdown.
- **Changed (Day 6, later):** A second application from the same company is now **stopped before anyone fills it**: colleagues see the company's application read-only (status only), and staff can release a wrong one with a reason ([ADR 0011](docs/decisions/0011-one-application-per-organisation.md)). Spec, plan, gaps and prototype updated.

# DAY 7 (9 Oct)
- **Done:** Call with my lead, who agreed with most of the plan and asked for four changes, now in every document and the prototype:
  - the photo ID and LinkedIn link are given **once, on the profile**;
  - each application only needs a **proof of employment from the last 3 months**;
  - every user can **change their password** on My profile;
  - in round 1, **several jury can score one application** (staff set a minimum and a maximum), and the **average** decides.

  Decision records: [ADR 0012](docs/decisions/0012-proof-once-on-profile-and-account-settings.md) and [ADR 0013](docs/decisions/0013-several-jury-per-application.md). What the already-built backend must change is listed in [proposals/0.7-backend-changes.md](docs/proposals/0.7-backend-changes.md).
- **Next:** Re-plan in **three phases**, as the lead asked: Phase 1 a fully working demo, with time limits for Phases 2 and 3. Agree the data model before any code.
- **Stuck:** Nothing. Waiting for the re-plan before building.
- **Plan changed:** The lead chose three phases instead of Option A or B. Only the points inside the phase descriptions changed today; the phase list itself is redone next.
- **Plan changed (evening):** The new plan is in [docs/PLAN.md](docs/PLAN.md).
  - **Phase 1**, the working platform: build Sat 10 – Tue 13 Oct (Sunday included), go online Wed 14, walkthrough Thu 15. It covers two written-review awards set up on screen, the four rules tested, several jury, proof, entry limit, branded pages.
  - **Phase 2** (~20 working days): on-site rounds, the site builder, admin screens, emails.
  - **Phase 3** (~15 days + client testing): launch work.
  - The technical design is in [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md).
- **Changed (night):** No more PA role. The leader's team simply works from the leader's account, so there are five roles ([ADR 0014](docs/decisions/0014-no-pa-role.md)). Removed from the spec, plan, prototype and gaps.
- **Done (late):** Rewrote the Backend and Front-End READMEs for the new plan (what's built, what each step adds, how to run) and tightened the wording across the docs.
- **Next:** Sat 10 Oct, Step 1.1: foundation and people.

# DAY 8 (10 Oct)
- **Done:** Counted Phase 1 hour by hour: the full list was about 100 hours, and we have about 64. Trimmed it to about 71 hours: send back, masking of files, version markers, editing after submit, withdraw, the brand-kit screen and a few smaller items move to Phase 2. The leader dashboard and masking of answers stay.
- **Next:** Meeting with my lead today, then Step 1.1: foundation and people.
- **Stuck:** Nothing.
- **Plan changed:** Phase 1 is now about 71 hours; Thursday morning is a buffer and the walkthrough is Thursday afternoon. Phase 2 grows from about 20 to about 24 working days ([docs/PLAN.md](docs/PLAN.md)).
- **Later (Day 8):** Met my lead: nothing changed. Decided: the paused backend is copied into Step 1.1 with one new migration; in Phase 1 jury accounts come only from the seed (invites by email in Phase 2); uploads go straight to storage through signed links.
- **Plan changed:** A `staging` branch. Each step is merged into `staging` and tested there, then merged into `main` (production). From 14 Oct there are two online sites, staging and production ([ADR 0015](docs/decisions/0015-staging-branch.md)).
- **Next:** Step 1.1, foundation and people. It starts this evening and will run into Sunday.
- **Done (night):** Step 1.1 built on its branch. The parked backend is in, with one migration for the 7–9 Oct decisions. Logins, roles read fresh on every request, My profile (change password, LinkedIn, identity document through a signed upload link), companies (register, join, cleaned on save, one per PAN), the seed with every demo role, and the web app (login, register, My profile, My organisation, a home per role). 129 backend tests; frontend lint, types and build clean; checked by hand in a browser. Three AI mistakes caught and written down (ai-notes #7 to #9).
- **Next:** Merge Step 1.1 into `staging`, check it there, then into `main`. Sun 11 Oct: Step 1.2, award setup and branded pages.
- **Stuck:** Nothing. The frontend stays on ESLint 9 for now (G-K20).
- **Plan changed (late night):** Only applicants apply. The leader, department heads, staff and jury have their own kind of account: they never see the applying screens or the proof tab, and can't create or join a company. To apply, they register a separate applicant account with another email ([ADR 0016](docs/decisions/0016-applicant-and-platform-accounts.md)). Fixed in Step 1.1 before it merges; the database refuses mixed-up rows too.

# DAY 9 (11 Oct)

- **Plan changed:** My lead wants the focus on the form builder, filling the form and judging, and no masking. So: blind awards simply hide the company, the applicant and every file from the jury, and the masking step is gone ([ADR 0018](docs/decisions/0018-blind-judging-without-masking.md)). In Phase 1 the leader now creates departments and their heads on screen, and each head creates their own staff and jury, who get a temporary password and set their own at first login ([ADR 0017](docs/decisions/0017-people-created-on-screen.md)). After the deadline staff assign applications to the department's jury by hand, with the counts per application and per juror, and the final mark is an exact average ([ADR 0019](docs/decisions/0019-exact-score-arithmetic.md)). To make room: a simpler award page, only production online, and Thursday morning becomes build time. Still about 71 hours, with no buffer.
- **Done:** The re-plan written down everywhere (PLAN, PHASES, the Phase 1 roadmap, the spec, the technical design, GAPS).
- **Next:** My review of the re-plan; merge Step 1.1 into `staging` and `main`, then the re-plan; then Step 1.2: departments and people first, then award setup.
- **Done (later):** Step 1.1 and the re-plan merged into `staging`. Feedback on the repo: a first-time reader couldn't picture the problem, because the README went straight to the solution. Rewrote the README problem first: what the awards are and why organisations apply, one award walked through with a sample scoring sheet, how the awards run today and where it hurts, the terms (areas, indicators, categories), and what must stay the same or differ. The solution comes after.
- **Stuck:** Nothing.
