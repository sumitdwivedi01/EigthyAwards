# 0001. Split the frontend and the API; host on Vercel, Render and Supabase

- Status: **Accepted**. The hosting was chosen by the project owner on 2026-10-04.
- Date: 2026-10-04
- Related gaps: G-B01 to G-B13, G-C02

## Context

The spec (§8, §9) planned **one Next.js app** (pages, server actions and the business modules together) on Vercel, with PostgreSQL on Neon or Supabase, or one container on Railway or Render. It left the final hosting choice to a decision record. This is that record.

The project owner wants the **frontend on Vercel, the backend on Render and the database on Supabase**, with the code in two folders, `Front-End/` and `Backend/`.

## Options

1. **The spec as written: one Next.js app on Vercel, plus Supabase.**
   For: one deployable, one codebase, server actions, Auth.js.
   Against: Vercel functions cap request and response bodies at 4.5 MB, but files can be 10 MB. Function timeouts make bulk emails (about 1,000 per publish) risky. Serverless functions need careful database pooling. And it isn't the hosting we chose.
2. **One Next.js app as a single container on Render.**
   For: one codebase, and files can be streamed.
   Against: the frontend doesn't benefit from Vercel, and one process serves both UI and API.
3. **A Next.js frontend on Vercel + a Node.js/Express API on Render + Supabase (PostgreSQL and Storage).** ← chosen

## Decision

Option 3. `Front-End/` is a Next.js app deployed to Vercel. It holds **no business rules** and never touches the database. `Backend/` is an Express + TypeScript API deployed to Render: a **modular monolith** with the 15 modules from the architecture PDF plus `master-data` (16; ADR 0006), one PostgreSQL database on Supabase, and files in a private Supabase Storage bucket.

## Why

- It matches the hosting we are actually going to use.
- The API is a long-running process on Render, so it has no serverless body or timeout limits. It can stream files and run the email outbox after commit.
- It makes the spec's core principle stronger, not weaker. "Every check lives in a service" now holds **physically**: the UI cannot reach the database at all, only the API, and every API route goes through the actor-first services.
- Everything that makes the design good stays the same: shared tables tied to the cycle, scoped roles, view models per role, the four rules enforced on the server, and award behaviour read from configuration.

## Consequences

- **Two deployables, two CI workflows, two READMEs.**
- **An API contract to maintain.** `docs/API.md` is updated in every backend phase (G-B10).
- **Cross-site login.** The frontend proxies `/api/*` to the API so the session cookie is first-party (ADR 0003, G-B02).
- **Files** go through Supabase Storage with signed URLs issued after access checks (G-B03).
- **Supabase must be hardened**, because its Data API must not expose our tables (G-B04).
- **The free tiers sleep or pause** (G-B07, G-B08).
- These parts of the spec are **superseded**:
  - §8 "one Next.js app" becomes two apps. The module boundaries, the access layer and the data separation are unchanged.
  - §9 rows *Framework*, *Login*, *Files* and *Hosting* are replaced by ADRs 0002 and 0003.
  - §11 "server actions" become Express route handlers. The layering rule is unchanged: routes parse, services decide.
  - §16 folder structure is replaced by [PHASES.md §3](../PHASES.md).
  - The architecture PDF (pages 2, 3, 5 and 9) shows one deployable and needs redrawing in Phase 14 (G-F06).

## What would change our mind

- If hosting is no longer fixed and one deployable is preferred: the services are framework-free (they take an actor and return a view model), so the modules can move into Next.js route handlers with little rewriting.
- If Render's cold starts make the walkthrough unusable and paying isn't an option: consider hosting the API somewhere else that stays warm. The API itself would not change.
