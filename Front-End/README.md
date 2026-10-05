# Front-End: Awards Platform UI

A Next.js (App Router) + TypeScript + Tailwind + shadcn/ui app, deployed to **Vercel**. It holds **no business rules**: every decision comes from the API, which it reaches through a same-origin `/api/*` proxy ([ADR 0003](../docs/decisions/0003-authentication-and-sessions.md)).

> **Status:** not started. It is built in Phases 4, 5, 7, 10 and 12 ([docs/PHASES.md](../docs/PHASES.md)).

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
│  │  ├─ staff/             awards, cycle setup, applications, masking, jury pool, assignment, judging, approval, results
│  │  ├─ jury/              assignments, scoring
│  │  ├─ dept/              staff, jury pool, approval queue, round review, dashboard
│  │  └─ leader/            leader and PAs: dashboard, departments, people, awards, master data,
│  │                        organisations, read-only award view; PA team and PA activity (leader only)
│  ├─ components/
│  │  ├─ ui/                shadcn/ui
│  │  ├─ form-builder/      questionnaire builder (staff)
│  │  ├─ form-renderer/     renders any FormVersion (applicant, staff, jury)
│  │  ├─ scoring-sheet/     builder (staff) and scorer (jury)
│  │  └─ layout/            role shells, navigation
│  ├─ features/<area>/      API hooks (TanStack Query) and feature components
│  └─ lib/                  api-client, auth, format (₹ from paise, IST), query client
└─ tests/e2e/               Playwright journeys (Phase 13)
```

## Running it

Added in Phase 4.
