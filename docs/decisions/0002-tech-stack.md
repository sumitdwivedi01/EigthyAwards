# 0002. Tech stack for the backend and the frontend

- Status: **Accepted** (6 Oct 2026, confirmed before Phase 1). Versions are pinned during Phase 1 (backend) and Phase 4 (frontend), and the exact versions are recorded in PROGRESS.md.
- Date: 2026-10-04
- Related gaps: G-B14

## Context

ADR 0001 splits the app in two. The spec's stack (§9) still applies to the database, validation and testing, but the server framework and the login approach must be chosen again. The builder knows TypeScript and React, and there are about 8 days of building left.

## Decision: backend (`Backend/`, Render)

| Concern | Choice | Turned down |
|---|---|---|
| Runtime | Node.js 22 LTS (matches the local machine; Render supports it) | Bun or Deno: less familiar, more hosting risk |
| HTTP framework | **Express 5** + TypeScript strict | NestJS (a good structure, but decorators and DI cost time to learn in 8 days); Fastify (faster, but Express is more familiar and the spec's route design "feels like Express") |
| Database | PostgreSQL 16 locally (Docker); Supabase PostgreSQL in production | MongoDB (spec §9: weaker guarantees for audit transactions) |
| Data access | **Prisma** (typed queries, migrations, seed), plus raw SQL migrations for triggers and partial indexes | Drizzle (equally good; Prisma is more familiar), TypeORM |
| Validation | **Zod**, for input, award configuration and environment | Hand-written checks |
| Passwords and sessions | bcrypt (`bcryptjs`, no native build on Windows) and a signed JWT (`jose`) in an httpOnly cookie (ADR 0003) | Supabase Auth, Auth.js (ADR 0003) |
| Files | A storage interface: a disk driver locally, an S3-compatible driver for Supabase Storage in production | Storing files in the database; Render's disk (wiped on deploy) |
| Email | A mailer interface: SMTP to Mailpit locally, an HTTP email API in production (G-B06). EmailLog doubles as the outbox | A paid provider during the build |
| Logging and security | pino, helmet, express-rate-limit, a CORS allowlist | — |
| Tests | **Vitest + Supertest against a real PostgreSQL** (`awards_test` database) | Jest (slower TypeScript setup), mocking the database (the rules depend on real transactions and constraints) |
| Quality | ESLint (typescript-eslint, `no-explicit-any`) and Prettier | — |

## Decision: frontend (`Front-End/`, Vercel)

| Concern | Choice | Turned down |
|---|---|---|
| Framework | **Next.js (App Router)** + TypeScript strict | A Vite React SPA (would work, but Next.js gives the `/api` rewrite proxy, a middleware gate, file-based routes for about 30 screens, and first-class Vercel hosting) |
| Server data | **TanStack Query** (caching, retries, autosave mutations) | Redux (more code for the same job) |
| Forms | **React Hook Form + Zod** (large dynamic forms rendered from FormVersion schemas) | Formik (slower on large forms) |
| UI | **Tailwind CSS + shadcn/ui** | MUI or Ant Design (heavy; turned down in spec §9) |
| E2E tests | **Playwright** (Chromium) | Cypress |

## Why

Each choice is either the spec's own (Prisma, Zod, PostgreSQL, Vitest, Tailwind, shadcn/ui, React Hook Form, Playwright) or the most familiar standard option for the new piece (Express, TanStack Query). Speed of building and confidence in correctness matter more than raw performance at about 40,000 applications a year.

## What would change our mind

- If the module wiring in Express turns messy by Phase 3: adopt a light structure, such as one router factory per module. NestJS isn't worth the switching cost mid-build.
- If a Prisma version gets in the way of the raw SQL we need (triggers, partial indexes): keep Prisma for queries and manage those pieces through SQL migrations, which is already the plan.
