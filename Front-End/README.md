# Front-End: Awards Platform UI

The screens for every role: visitors, applicants, staff, jury, department heads and the leader. It is a Next.js (App Router) + TypeScript + Tailwind + shadcn/ui app on **Vercel**. It holds **no business rules**: every decision comes from the API, which it reaches through a same-origin `/api/*` proxy, so the login cookie works in every browser ([ADR 0003](../docs/decisions/0003-authentication-and-sessions.md)).

What the screens look like: the clickable prototype in [docs/ui/](../docs/ui/README.md).

## Status

| | |
|---|---|
| **On `main`** | Nothing yet |
| **Next** | **Step 1.1 (Sat 10 Oct)** creates the app: login, role areas, My profile, My organisation |
| **Plan** | [PLAN.md](../docs/PLAN.md) (three phases) · [PHASES.md §4](../docs/PHASES.md#4-phase-1-steps-in-detail) (what each step builds) |

## What gets built when

| Area | Screens | Phase 1 step | Later |
|---|---|---|---|
| Public | Open awards (branded cards), the award's branded page | 1.2 | Multi-page sites from the site builder (2.2) |
| Account | Login, register, My profile (details, change password, ID and LinkedIn for applicants) | 1.1 | Forgot password, accept invite (2.3) |
| Applicant | My organisation, My applications, start and demo payment, the form, proof of employment, review and submit, status | 1.1, 1.3 | On-site slot and medals on the status page (2.1) |
| Staff | My awards, create award, cycle setup (settings, questions, scoring sheet, jury per application, award page), applications, proof check, release | 1.2, 1.3 | Site builder (2.2) |
| Staff, judging | Masking, jury pool and conflicts, assignment, judging progress, send for approval, results | 1.4 | On-site schedule, panels and progress (2.1) |
| Jury | My assignments, scoring | 1.4 | Phone scoring on site (2.1) |
| Department head | Brand kit, approval queue, round review | 1.2, 1.4 | Department dashboard, staff screens (2.3, 2.4) |
| Leader | Dashboard | 1.4 | Departments, people, master data, organisation corrections (2.3) |

## Structure

```
Front-End/
├─ next.config.ts           rewrites /api/* to the backend
├─ src/
│  ├─ middleware.ts         coarse gate: logged in or not (never decides permissions)
│  ├─ app/
│  │  ├─ (public)/          Open awards, award pages
│  │  ├─ (auth)/            login, register
│  │  ├─ me/                My profile
│  │  ├─ applicant/         organisation, applications, payment, form, status
│  │  ├─ staff/             awards, cycle setup, applications, proof check, masking, jury pool,
│  │  │                     assignment, judging, approval, results
│  │  ├─ jury/              assignments, scoring
│  │  ├─ dept/              brand kit, approval queue, round review
│  │  └─ leader/            dashboard
│  ├─ components/
│  │  ├─ ui/                shadcn/ui
│  │  ├─ form-builder/      questionnaire builder (staff)
│  │  ├─ form-renderer/     renders any form version (applicant, staff, jury)
│  │  ├─ scoring-sheet/     builder (staff) and scorer (jury)
│  │  └─ layout/            role shells and navigation
│  ├─ features/<area>/      API calls (TanStack Query) and feature components
│  └─ lib/                  api-client (maps 400/401/403/404/409 to messages), format (₹ from paise, India time)
└─ tests/e2e/               browser tests with Playwright (Phase 2, package 2.8)
```

## Running it locally

Available from Step 1.1. Start the backend first ([Backend/README.md](../Backend/README.md)), then:

```bash
cd Front-End
cp .env.example .env.local  # BACKEND_URL=http://localhost:4000
npm ci
npm run dev                 # screens on http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm run lint` · `npm run typecheck` | Code checks (CI runs them too) |
| `npm run build` · `npm start` | Production build and start |

## Online (Step 1.5, 14 Oct)

A Vercel project built from this folder, with `BACKEND_URL` set to the Render API. The steps will be written down in `docs/DEPLOYMENT.md`.
