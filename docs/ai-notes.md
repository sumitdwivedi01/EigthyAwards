# AI notes: where AI output looked right but was wrong

The brief asks: *"Show me one place where it gave you something that looked right but was wrong, and how you caught it."* Every case goes here as soon as it happens: what it was, how it was caught, and the fix.

---

## 1. Prisma's own AI docs describe a config option that doesn't exist (Phase 1, 6 Oct)

- **What looked right.** Prisma 7.10's `init` installs AI-agent "skills" docs. Its `prisma-config.md` shows `datasource.directUrl` in `prisma.config.ts`, for a direct (non-pooled) connection used by migrations. That's exactly what Supabase needs (GAPS G-B05).
- **How it was caught.** Before using the option, we read the installed type definitions (`node_modules/@prisma/config/dist/index.d.ts`). The `Datasource` type only has `url` and `shadowDatabaseUrl`, and `directUrl` appears nowhere in the package.
- **Fix.** `prisma.config.ts` points the CLI (migrations) at `DIRECT_URL`, and the app connects at runtime with `DATABASE_URL` through the pg adapter. A comment in the file records why.
- **Lesson.** Docs written for AI agents can be wrong too. The installed types are the truth.

## 2. Remembered "real" GSTINs that couldn't be trusted (Phase 1, 6 Oct)

- **What looked right.** To check a GSTIN checksum algorithm, the AI produced five GSTINs from memory as test data. They looked authentic: correct format, real-looking company PANs.
- **How it was caught.** The algorithm matched the one widely published example, but disagreed with three of the five remembered GSTINs. Either the algorithm or the remembered data is wrong, and there is no authoritative source here to tell which.
- **Fix.** The checksum is **not enforced**. The spec only asks for a format check plus "the PAN must be inside the GSTIN", and a wrong checksum rule would reject genuine organisations. Recorded in `src/lib/normalize.ts`.
- **Lesson.** AI-recalled "facts" used as test data need an independent source. When there isn't one, don't build a hard rule on them.

## 3. An ESM setup that compiles but would fail at runtime (Phase 1, 6 Oct)

- **What looked right.** Prisma's ESM guide shows a `tsconfig.json` with `"moduleResolution": "bundler"` and plain `tsc` plus `node dist/index.js`.
- **How it was caught.** By reasoning before running: with `bundler` resolution, TypeScript accepts imports without file extensions, but Node's ESM loader needs `./file.js`. The build would succeed and the server would crash at start with `ERR_MODULE_NOT_FOUND`.
- **Fix.** `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` (TypeScript then demands `.js` extensions), and `importFileExtension = "js"` in the Prisma generator.

## 4. "Install the latest" would have installed unreleased software (Phase 1, 6 Oct)

- **What looked right.** The usual instruction is `npm install prisma typescript`.
- **How it was caught.** We checked the npm dist-tags before installing. Prisma's `latest` tag points at `8.0.0-rc.20`, a release candidate. TypeScript's `latest` is 7.0, which `typescript-eslint` doesn't support yet (peer range `<6.1.0`).
- **Fix.** Exact pinned versions: Prisma 7.10.0 (the last stable release) and TypeScript 6.0.3.

## 5. A database rule that silently let bad data in: the clearest example (Phase 1, 6 Oct)

- **What looked right.** The AI wrote this CHECK constraint for on-site rounds: `type = 'ON_SITE' AND "panelMin" >= 1 AND "panelMax" >= "panelMin"`. It reads as "an on-site round must have a panel size", and it passed review.
- **How it was caught.** By a test written from the rule ("an on-site round without a panel size is refused"), run against the real PostgreSQL. The insert **succeeded**.
- **Why.** In SQL, `NULL >= 1` is not false but *unknown*, and PostgreSQL accepts a row when a CHECK is unknown. A missing panel size made the whole condition unknown, so the row went in.
- **Fix.** A corrective migration (`20261006120200_fix_guard_errors_and_null_checks`) says `IS NOT NULL` explicitly. Every other CHECK was audited for the same trap; the rest are on non-null columns or already handle NULL.
- **Lesson.** This is why the spec insists on tests written **from the rule**, against a **real database**. A mocked database would have passed.

## 6. Correct triggers whose error messages vanished (Phase 1, 6 Oct)

- **What looked right.** The append-only and one-jury triggers raised standard error codes (`restrict_violation`, `unique_violation`) with clear messages.
- **How it was caught.** The tests expected the message ("append-only", "one active evaluation per application") but got Prisma's generic "Foreign key constraint violated" / "Unique constraint failed". Reading `@prisma/adapter-pg` showed it maps those two codes to its own error kinds and drops the original message.
- **Fix.** The triggers now raise the default code `P0001`, which the adapter passes through with the message intact (same corrective migration). The database still refused every bad write; only the explanation was lost.

## 7. A correct partial index that the drift check would never accept (Step 1.1, 10 Oct)

- **What looked right.** The rule "one active application per organisation per cycle" (ADR 0011), written as `CREATE UNIQUE INDEX … WHERE (status NOT IN ('WITHDRAWN', 'RELEASED'))`, with the same text in `schema.prisma`'s `where: raw(…)`. The SQL is valid and means exactly the rule.
- **How it was caught.** By the drift check CI runs (`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`), run locally before pushing. It reported the index as removed and added again, so CI would have failed on every pull request.
- **Why.** PostgreSQL stores an index predicate in its own rewritten form: `NOT IN (…)` becomes `<> ALL (ARRAY[…])`. Prisma compares that stored form with the schema's text and sees a difference. Comparisons joined with `AND` come back in a form it matches (the other partial indexes never drifted).
- **Fix.** `status <> 'WITHDRAWN' AND status <> 'RELEASED'`, in both the schema and the migration. Same meaning, no drift; the tests for the rule still pass.
- **Lesson.** "The SQL is right" isn't enough when a tool compares text; run the same checks CI runs before pushing.

## 8. A plan that named a file Next.js no longer uses (Step 1.1, 10 Oct)

- **What looked right.** Our own plan (PHASES.md §3, the Front-End README), written with AI help on 4–9 Oct, put the login gate in `src/middleware.ts`, the file every Next.js tutorial uses.
- **How it was caught.** `create-next-app` 16 now writes an `AGENTS.md` saying the version has breaking changes and pointing to the docs inside the package. The bundled upgrade guide (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`) says `middleware` was renamed to `proxy` (file `proxy.ts`, function `proxy`, Node.js runtime only), and that `next lint` was removed.
- **Fix.** The gate is `src/proxy.ts`; linting runs ESLint directly; the plan and the README now say so.
- **Lesson.** Read the docs shipped with the installed version before writing code against a framework that changes every year; a plan is only as current as the day it was written.

## 9. A check that looked like it cleaned input but refused it (Step 1.1, 10 Oct)

- **What looked right.** The registration schema: `email: z.email().max(254)`, with the service normalising the address (trim, lower case) before saving, as spec §5.18 asks.
- **How it was caught.** A test written from the rule ("a pasted `Asha@Example.TEST` with spaces is stored as `asha@example.test`") got 400 instead of 201.
- **Why.** Zod checks the email format on the raw value, before any trimming, so the leading space made it invalid; the normaliser never ran.
- **Fix.** `z.string().trim().max(254).pipe(z.email())`: trim first, then check. The same pattern is used for every email the API accepts.
- **Lesson.** Validation order matters; a test with realistic messy input catches what a happy-path test can't.
