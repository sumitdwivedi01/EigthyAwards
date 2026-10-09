# EightyAwards: one platform for eighty award programmes

An industry body in India runs about 80 awards (business excellence, energy, safety, design, innovation, sustainability, regional awards, Kaizen and 5S). This project is **one configurable platform** that runs all of them. Staff set up a new award, with its questionnaire, scoring sheet and weights, deadline, entry fee and blind judging, **in the UI, without a developer**. Shared data stays **consistent** across all awards: one record per organisation, person and department, and controlled lists instead of free text. This fixes the client's biggest problem with the old award systems.

Awards are judged in rounds that staff configure: **document review** (one or more jury score the written application, as many as staff set; the average counts; Shortlisted / Rejected, approved by the department head) and **on-site** (a panel of 2–5 jury score a live presentation on their devices; the average counts; Gold / Silver / Bronze). Shop-floor competitions such as Kaizen and 5S are simply on-site-only cycles.

**Branded award sites.** Every award gets its own site in the organiser's brand, built by staff from ready-made sections, with no developer. Outside organisers (for example the FPO Awards team) run their awards on the platform on their own. Applicants give a photo ID and LinkedIn link once, on their profile, and a recent proof of employment with each application, and awards can cap their entries, with the count shown publicly.

It is a 10-working-day build. The problem statement is in [docs/brief.md](docs/brief.md).

> **Status:** planning, client answers and the UI overview done (Phases 0–0.5). Building waits for the lead's choice between a focused demo by 15 Oct and the full product. The backend foundation is built and tested but parked on its own branch.

## Where to look

| You want… | Open |
|---|---|
| **The plan in 5 minutes, with pictures (start here)** | [docs/overview/](docs/overview/) |
| **What the platform looks like: clickable prototype and flows per role** | [docs/ui/](docs/ui/README.md) |
| Re-plan options for the 15 Oct limit | [docs/proposals/0.5-replan-options.md](docs/proposals/0.5-replan-options.md) |
| Where the project is right now | [docs/PROGRESS.md](docs/PROGRESS.md) |
| The plan (phases, scope, tests, cut order) | [docs/PHASES.md](docs/PHASES.md) |
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

Coming with Phase 1 (backend) and Phase 4 (frontend). The final version of this section will let a stranger run the project from a fresh clone in under 10 minutes.
