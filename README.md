# EightyAwards: one platform for eighty award programmes

An industry body in India runs about 80 awards (business excellence, energy, safety, design, innovation, sustainability, regional awards, Kaizen and 5S). This project is **one configurable platform** that runs all of them. Staff set up a new award, with its questionnaire, scoring sheet and weights, deadline, entry fee and blind judging, **in the UI, without a developer**. Shared data stays **consistent** across all awards: one record per organisation, person and department, and controlled lists instead of free text. This fixes the client's biggest problem with the old award systems.

Awards are judged in rounds that staff configure: **document review** (one or more jury score the written application, as many as staff set; the average counts; Shortlisted / Rejected, approved by the department head) and **on-site** (a panel of 2–5 jury score a live presentation on their devices; the average counts; Gold / Silver / Bronze). Shop-floor competitions such as Kaizen and 5S are simply on-site-only cycles.

**Branded award sites.** Every award gets its own site in the organiser's brand, built by staff from ready-made sections, with no developer. Outside organisers (for example the FPO Awards team) run their awards on the platform on their own. Applicants give a photo ID and LinkedIn link once, on their profile, and a recent proof of employment with each application, and awards can cap their entries, with the count shown publicly.

It is delivered in **three phases** ([docs/PLAN.md](docs/PLAN.md)). **Phase 1, the working platform, runs 10–15 October 2026.** The problem statement is in [docs/brief.md](docs/brief.md).

> **Status (9 Oct):** planning, client answers, the UI prototype, the three-phase plan and the technical design are done. **Phase 1 starts Sat 10 Oct** (build 10–13, online 14, walkthrough 15). The backend foundation is built and tested on its own branch and joins in the first step.

## Where to look

| You want… | Open |
|---|---|
| **The plan: three phases, dates, what's in each (start here)** | [docs/PLAN.md](docs/PLAN.md) |
| The platform in 5 minutes, with pictures | [docs/overview/](docs/overview/) |
| **What the platform looks like: clickable prototype and flows per role** | [docs/ui/](docs/ui/README.md) |
| How it's built: architecture, data model, API | [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md) |
| Where the project is right now | [docs/PROGRESS.md](docs/PROGRESS.md) |
| The detailed steps (what each day builds and tests, cut order) | [docs/PHASES.md](docs/PHASES.md) |
| What's missing, contradictory or undecided | [docs/GAPS.md](docs/GAPS.md) |
| Daily updates (Done · Next · Stuck) | [Daily.md](Daily.md) |
| Decisions, with options and reasons | [docs/decisions/](docs/decisions/) |
| The product and technical spec | [docs/requirements.md](docs/requirements.md) |
| How the parts fit (simple drawing) | [docs/overview/ §8](docs/overview/README.md#8-how-the-parts-fit) |

## Shape of the system

- **`Front-End/`**: a Next.js app on **Vercel**. Screens for each role area: public, applicant, jury, staff, department head, and leader with their PAs (the leader's personal team). No business rules.
- **`Backend/`**: an Express + TypeScript API on **Render**. A modular monolith of 18 modules; every check happens in a service that takes the acting user first.
- **Database and files**: PostgreSQL and private file storage on **Supabase**.

The four rules from the brief (blind judging, conflicts of interest, score audit, question versioning) are enforced on the server and covered by automated tests.

## Running it

Coming with Step 1.1 (10 Oct); the live links come with Step 1.5 (14 Oct). The final version of this section will let a stranger run the project from a fresh clone in under 10 minutes.
