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
