# Front-End: Awards Platform UI

The screens for every role: visitors, applicants, staff, jury, department heads and the leader. It is a Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui app on **Vercel**. It holds **no business rules**: every decision comes from the API, which it reaches through a same-origin `/api/*` proxy, so the login cookie works in every browser ([ADR 0003](../docs/decisions/0003-authentication-and-sessions.md)).

What the screens look like: the clickable prototype in [docs/ui/](../docs/ui/README.md). The API it calls: [docs/API.md](../docs/API.md).

## Status

| | |
|---|---|
| **Built (Step 1.1)** | Login, register, logout; the signed-in shell with the areas the API gives each person; **My profile** (details, change password, LinkedIn link and identity document); **My organisation** (register, join, edit); a home page per role |
| **Next** | **Step 1.2 (11 Oct):** staff's award setup screens, Open awards and the branded award page |
| **Plan** | [PLAN.md](../docs/PLAN.md) (three phases) · [PHASES.md §4](../docs/PHASES.md#4-phase-1-steps-in-detail) (what each step builds) |

## What gets built when

| Area | Screens | Phase 1 step | Later |
|---|---|---|---|
| Account | Login, register, My profile (details, change password, ID and LinkedIn for applicants) | Built (1.1) | Forgot password, accept invite (2.3) |
| Applicant | My organisation | Built (1.1) | — |
| Applicant | My applications, start and demo payment, the form, proof of employment, review and submit, status | 1.3 | Edit after submit, withdraw, status timeline (2.5); on-site slot and medals (2.1) |
| Public | Open awards (branded cards), the award's branded page | 1.2 | Multi-page sites from the site builder (2.2) |
| Staff | My awards, create award, cycle setup (settings, questions, scoring sheet, jury per application, award page), applications, proof check | 1.2, 1.3 | Site builder and brand kit (2.2); release screen, full scoring-sheet builder (2.5) |
| Staff, judging | Masking of answers, jury pool and conflicts, assignment, judging progress, send for approval, results | 1.4 | Masking of files (2.5); on-site schedule, panels and progress (2.1) |
| Jury | My assignments, scoring | 1.4 | Phone scoring on site (2.1) |
| Department head | Approval queue, round review (approve) | 1.4 | Send back (2.5); brand kit (2.2); department dashboard, staff screens (2.3, 2.4) |
| Leader | Dashboard | 1.4 | Departments, people, master data, organisation corrections (2.3) |

## Structure

```
Front-End/
├─ next.config.ts           rewrites /api/* to the backend (BACKEND_URL)
├─ src/
│  ├─ proxy.ts              coarse gate: no session cookie → the login page (Next.js 16 renamed
│  │                        middleware.ts to proxy.ts); never decides permissions
│  ├─ app/
│  │  ├─ page.tsx           the public front door (Open awards from Step 1.2)
│  │  ├─ (auth)/            login, register
│  │  └─ (app)/             signed-in pages in the app shell: home, me, applicant (and its
│  │                        organisation page), staff, department, jury, leader
│  ├─ components/
│  │  ├─ ui/                shadcn/ui (Radix base, Nova preset)
│  │  ├─ layout/            the app shell, area guard, page titles
│  │  └─ form-field.tsx     label, control, hint and error, wired for screen readers
│  ├─ features/<area>/      feature components and API hooks (TanStack Query): auth, profile,
│  │                        organisations, areas
│  └─ lib/                  api-client (errors to messages, field errors to inputs, signed uploads),
│                           api-types (the API's shapes), format (₹ from paise, India time), forms, areas
└─ tests/e2e/               browser tests with Playwright (Phase 2, package 2.8)
```

Coming in later steps: `components/form-builder/` and `form-renderer/` (1.2, 1.3), `components/scoring-sheet/` (1.2, 1.4).

## Running it locally

Start the backend first ([Backend/README.md](../Backend/README.md)), then:

```bash
cd Front-End
cp .env.example .env.local  # BACKEND_URL=http://localhost:4000
npm ci
npm run dev                 # screens on http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload (Turbopack) |
| `npm run lint` | ESLint (Next.js 16 removed `next lint`) |
| `npm run typecheck` | Generates Next's route types (`next typegen`), then `tsc --noEmit` |
| `npm run build` · `npm start` | Production build and start |

Versions are pinned exactly (Next.js 16.3.6, React 19.2.8, Tailwind 4.3.3, TypeScript 6.0.3). ESLint stays on 9.x for now: ESLint 10 crashes inside the React plugin that `eslint-config-next` 16.3.6 bundles (GAPS G-K20).

## Online (Step 1.5, 14 Oct)

A Vercel project built from this folder: production from `main`, and a staging deployment from the `staging` branch, each with `BACKEND_URL` set to its own Render API (ADR 0015). On Vercel, a missing `BACKEND_URL` stops the build. The steps will be written down in `docs/DEPLOYMENT.md`.
