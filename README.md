# EightyAwards: one platform for eighty award programmes

An industry body in India runs about 80 awards (business excellence, energy, safety, design, innovation, sustainability, regional awards, Kaizen and 5S). This project is **one configurable platform** that runs all of them. Staff set up a new award, with its questionnaire, scoring sheet and weights, deadline, entry fee and blind judging, **in the UI, without a developer**. Shared data stays **consistent** across all awards: one record per organisation, person and department, and controlled lists instead of free text. This fixes the client's biggest problem with the old award systems.

It is a 10-working-day build. The problem statement is in [docs/brief.md](docs/brief.md).

> **Status:** planning complete (Phase 0), updated after the leader call (Phase 0.1). No runnable code yet. See [docs/PROGRESS.md](docs/PROGRESS.md) for the live state.

## Where to look

| You want… | Open |
|---|---|
| Where the project is right now | [docs/PROGRESS.md](docs/PROGRESS.md) |
| The plan (phases, scope, tests, cut order) | [docs/PHASES.md](docs/PHASES.md) |
| What's missing, contradictory or undecided | [docs/GAPS.md](docs/GAPS.md) |
| Daily updates (Done · Next · Stuck) | [Daily.md](Daily.md) |
| Decisions, with options and reasons | [docs/decisions/](docs/decisions/) |
| The product and technical spec | [docs/requirements.md](docs/requirements.md) |
| The architecture drawing | [docs/architecture/](docs/architecture/) |

## Shape of the system

- **`Front-End/`**: a Next.js app on **Vercel**. Screens for each role area: public, applicant, jury, staff, department head, and leader with their PAs (the leader's personal team). No business rules.
- **`Backend/`**: an Express + TypeScript API on **Render**. A modular monolith of 16 modules; every check happens in a service that takes the acting user first.
- **Database and files**: PostgreSQL and private file storage on **Supabase**.

The four rules from the brief (blind judging, conflicts of interest, score audit, question versioning) are enforced on the server and covered by automated tests.

## Running it

Coming with Phase 1 (backend) and Phase 4 (frontend). The final version of this section will let a stranger run the project from a fresh clone in under 10 minutes.
