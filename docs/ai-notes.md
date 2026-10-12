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

## 10. Every account could apply, because one sentence of the spec was read too widely (Step 1.1, 10 Oct)

- **What looked right.** `GET /me` gave every account the Applying area, with the comment "anyone can apply on behalf of their organisation, whatever else they do (spec §3)". The spec does say one person can be "jury in one cycle and applicant user for an organisation in another", and §5.1 that such a person "uses the same account with two roles". The tests passed and every role could log in.
- **How it was caught.** The owner logged in as the leader and found "Proof for applying" on My profile and an Applying link. The permission matrix in the same §3 gives applying and the profile proof to the Applicant column only, and PHASES Step 1.1 says "the proof tab for applicants": the code followed one sentence and missed the table.
- **Fix.** The owner decided that applicants and the people who run and judge awards use separate accounts (ADR 0016): `User.accountType`, `requireApplicantAccount` in the services, triggers and a CHECK in the database, the applying screens shown only to applicant accounts, and tests for each kind of account.
- **Lesson.** When a sentence and a table disagree, ask instead of picking the reading that is easiest to build; and look at every screen as each role, not only as the role the feature is for.

## 11. An enum change that PostgreSQL refused because of CHECK constraints (Step 1.2, 11 Oct)

- **What looked right.** Removing the masked-file kind from the `FileKind` enum the usual way: create `FileKind_new`, `ALTER COLUMN kind TYPE "FileKind_new" USING kind::text::"FileKind_new"`, drop the old type, rename. It is the pattern every guide shows, and the SQL is valid.
- **How it was caught.** Running the migration locally failed with `operator does not exist: "FileKind_new" = "FileKind"`, and left both local databases half migrated.
- **Why.** Three CHECK constraints on `file_assets` (the file's owner, the proof's document date, the consent) compare `kind` with literals typed as the **old** enum. While the column changes type, PostgreSQL re-checks them and can't compare the new type with the old one.
- **Fix.** Inside one `BEGIN … COMMIT`, drop the three CHECKs, swap the enum, and create them again with the same rules. The half-applied local databases were finished by hand and marked applied (`prisma migrate resolve`); the drift check proves that the migrations still build the schema from nothing.
- **Lesson.** A pattern that is right in general can still meet this database's own rules; run every migration against a database that has all its constraints before pushing.

## 12. A seed that type-checked but no longer ran (Step 1.2, 11 Oct)

- **What looked right.** After the jury role moved from a cycle to a department (ADR 0017), `tsc` was clean on the whole backend, the seed included.
- **How it was caught.** Running `npm run db:seed` stopped with Prisma's "Unknown argument `cycleId`": the seed's `grant()` still looked roles up with `cycleId: null`, a column the migration had removed.
- **Why.** Prisma's query methods are generic: the argument's type is inferred from the object and then compared with the allowed shape, and TypeScript's check for unknown properties only applies at the top level of that object. An unknown field inside `where` slips through; only Prisma's run-time validation sees it.
- **Fix.** The field removed from the seed, and CI now seeds a fresh database **twice** (it must work, and be safe to repeat), so this kind of mistake fails the pull request.
- **Lesson.** A clean type check doesn't prove a query is right; code that only runs by hand (seeds, scripts) needs to run in CI too.

## 13. Two builders that each worked, but not on the same page (Step 1.2, 11 Oct)

- **What looked right.** The question builder and the scoring-sheet builder each gave their inputs ids made from the item's path (`sections.0-title`), so every label was tied to its input. Each builder worked and passed lint and the type check.
- **How it was caught.** In the browser check of the edition setup, a script listed the element ids on the page and found duplicates: both tabs stay mounted (so unsaved work survives switching tabs), and both had a `sections.0-title`. Clicking a label in one tab could focus an input in the hidden other tab.
- **Fix.** Each builder prefixes its ids (`form-…`, `sheet-…`). The page check now finds no duplicate ids.
- **Lesson.** Components that are fine alone can clash once composed; check the whole page, not each part.

## 14. Stale seed passwords that weren't stale (Step 1.2, found in Step 1.3, 11 Oct)

- **What looked right.** In the Step 1.2 browser check, logging in a seeded staff member with `DEMO_PASSWORD` failed. The seed never changes an existing account's password, and the local database had been seeded days before, so the AI concluded the password in `.env` had changed since. It wrote that down as G-K29 and suggested resetting the local database.
- **How it was caught.** In Step 1.3 the same login failed on a database seeded minutes earlier from the same `.env`. Comparing the password as the helper script read it with `dotenv`'s own parse showed 39 characters against 17: the line has an inline comment, which `dotenv` (and so the seed) drops, and the script kept.
- **Why.** The helper read `.env` by hand (split on the first "=", strip quotes) instead of with the library the app uses. The diagnosis then built on a fact nobody had checked.
- **Fix.** The scripts read `.env` with `dotenv.parse`; the seeded hashes match `DEMO_PASSWORD` as `dotenv` reads it; G-K29 corrected.
- **Lesson.** Parse configuration with the same library the application uses, and test a diagnosis (here: compare the stored hash) before writing it down as a cause.

## 15. A trigger error code the repo had already fixed once (Step 1.4, 11 Oct)

- **What looked right.** Step 1.4's new database triggers (scores locked after approval, results kept) raised their errors with `ERRCODE = 'restrict_violation'`, copied from the first guards migration. The services refused the same changes first, so every service test passed.
- **How it was caught.** The rule tests that try a direct database update after approval expected the trigger's message ("locked") and got "Foreign key constraint violated" instead.
- **Why.** Prisma's pg adapter maps SQLSTATE 23001 to a generic foreign-key error and drops the message. The repo had found and fixed exactly this on 6 Oct (`20261006120200_fix_guard_errors_and_null_checks` switched to the default `P0001`), but the AI copied the pattern from the older migration, not the fix.
- **Fix.** The Step 1.4 triggers use the default SQLSTATE, with a comment pointing at the earlier fix; the step's local databases were recreated from the corrected migration (it had not left the branch).
- **Lesson.** When copying a pattern, copy it from the newest place it appears and check for a later fix; and test the database's own refusal, not only the service's.

## 16. A setup script that ran against someone else's API (Step 1.4, 11 Oct)

- **What looked right.** For the browser check, the AI started the Step 1.4 API on port 4100, waited for `/api/health` to answer "ok", and ran a script that set up an award with applications.
- **How it was caught.** The script failed on the third applicant ("Your organisation already has an application"), which couldn't happen in Step 1.4's fresh database. The process listening on 4100 was the owner's Step 1.3 API, started meanwhile from the same instructions; Step 1.4's API had failed to bind. The script had written an award and two applications into the owner's Step 1.3 test database.
- **Why.** A health check says that *an* API answers, not *which*. Two worktrees had been given the same ports at different times.
- **Fix.** Step 1.4 moved to ports 4200/3200; before running anything, the check now confirms that the process on the port belongs to the expected folder. The owner was told what was written to their database and decides whether to remove it.
- **Lesson.** Before writing through an endpoint, check that it is the one you mean (here: the process behind the port), especially with several copies of the app running.

## 17. A menu that closed itself from inside an effect (UI pass, 12 Oct)

- **What looked right.** In the new phone navigation, the AI closed the open menu whenever the page changed with `useEffect(() => setOpen(false), [pathname])`: the common pattern in older React code.
- **How it was caught.** The project's lint (React's compiler rules in Next.js 16) refused it: setting state synchronously inside an effect causes a second render on every page change.
- **Fix.** The menu now remembers the path it was opened on and closes during render when the path differs (the "adjust state from the previous render" pattern), with no effect at all.
- **Lesson.** Patterns that were idiomatic in React 17 can be wrong under the compiler rules; the lint is the source of truth, not memory.
