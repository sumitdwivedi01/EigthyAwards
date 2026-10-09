# Front-End: Awards Platform UI

A Next.js (App Router) + TypeScript + Tailwind + shadcn/ui app, deployed to **Vercel**. It holds **no business rules**: every decision comes from the API, which it reaches through a same-origin `/api/*` proxy ([ADR 0003](../docs/decisions/0003-authentication-and-sessions.md)).

> **Status:** not started. It is built in Phases 4, 5, 7, 10 and 13 ([docs/PHASES.md](../docs/PHASES.md)).

## Planned structure

```
Front-End/
├─ next.config.ts           rewrites /api/* → backend
├─ src/
│  ├─ middleware.ts         coarse gate: logged in or not
│  ├─ app/
│  │  ├─ (public)/          Open awards, award details
│  │  ├─ (auth)/            login, register, forgot/reset password, accept invite
│  │  ├─ applicant/         organisation, applications, payment, form, status
│  │  ├─ staff/             awards, cycle setup (rounds, labels), applications, masking, jury pool, assignment,
│  │  │                     judging, approval, on-site schedule and panels, on-site progress, results
│  │  ├─ jury/              assignments, scoring, on-site scoring (phone-friendly)
│  │  ├─ dept/              staff, jury pool, approval queue, round review, dashboard
│  │  └─ leader/            leader: dashboard, departments, people, awards, master data,
│  │                        organisations, read-only award view
│  ├─ components/
│  │  ├─ ui/                shadcn/ui
│  │  ├─ form-builder/      questionnaire builder (staff)
│  │  ├─ form-renderer/     renders any FormVersion (applicant, staff, jury)
│  │  ├─ scoring-sheet/     builder (staff) and scorer (jury)
│  │  └─ layout/            role shells, navigation
│  ├─ features/<area>/      API hooks (TanStack Query) and feature components
│  └─ lib/                  api-client, auth, format (₹ from paise, IST), query client
└─ tests/e2e/               Playwright journeys (Phase 14)
```

## Running it

Added in Phase 4.
