# 0015. A `staging` branch between the step branches and `main`

- Status: **Accepted** (owner, 2026-10-10)
- Update (2026-10-11, owner): in Phase 1 only **production** goes online; `staging` is tested by CI and locally (this ADR's own fallback, "what would change our mind"). The staging site comes in Phase 2.
- Date: 2026-10-10
- Related: supersedes the branch flow of [ADR 0004](0004-git-branching-workflow.md) (naming, Conventional Commits, merge commits and tags still apply); GAPS G-D05, G-G03, G-K18

## Context

Until now (ADR 0004) each phase or step had its own branch, merged straight into `main` through a pull request. Phase 1 now produces working code every day, and `main` is what the lead and the reviewer open, and from 14 Oct what runs online as production. The owner wants each step **tested on a staging branch first**, and merged into `main` (production) only after that.

## Options

1. **Keep ADR 0004:** step branch → `main`. One merge per step, but nothing sits between a finished step and production.
2. **Step branch → `staging` → `main`, merged into `main` after each step is tested on `staging`** ← chosen.
3. **Work directly on `staging`**, merge `staging` → `main` at checkpoints. Faster, but loses the one-PR-per-step review the reviewer reads.
4. **Four levels:** step → `staging` → `main` → a separate `production` branch. One more long-lived branch to keep in sync, with no gain for one builder.
5. **Merge `staging` → `main` once, at the end of Phase 1.** `main` would show nothing working until 15 Oct, and a late problem would block everything at once.

## Decision

Option 2.

- **Long-lived branches:** `main` is production: always working, and only steps already tested on `staging` reach it. `staging` collects finished steps and is where they are tested. Both are protected on GitHub (a pull request and green CI), and neither gets direct commits.
- **Each step:**
  1. Cut `phase-1.<n>-<word>` from an up-to-date `staging`.
  2. Build it there (backend and its tests first, then its screens) until its exit checklist ([PHASES.md §1](../PHASES.md)) is ticked.
  3. Pull request **into `staging`**, CI green, the diff read line by line; merge with a merge commit.
  4. **Test on `staging`:** CI on the `staging` push, and the step's manual check run on the `staging` branch (locally until 14 Oct; on the staging site from 14 Oct).
  5. Pull request **`staging` → `main`**, CI green; merge with a merge commit. Tag `phase-1.<n>-done` on `main`.
- **Docs phases** (0.x) follow the same path.
- **Fixes:** `fix/<short-name>` from `staging`, through `staging`. Only a fix that can't wait for the next step goes from `main` to `main`, and `main` is then merged back into `staging` the same day.
- **Online (from Step 1.5, 14 Oct):** two environments. The `staging` branch deploys to a staging site, `main` to the production site. Each has its own database and storage, so testing never touches the lead's demo data. Nothing is deployed before Step 1.5.
- **`main` stays the default branch on GitHub**, so a fresh clone (the README test) gets production. Step pull requests pick `staging` as their base by hand.

## Why

- A step is tested again after it lands next to the steps before it, before anyone else sees it on `main`.
- `main` stays what the lead and the reviewer can trust at any moment, and from 14 Oct it is exactly what runs online.
- One pull request per step stays the review point. The `staging` → `main` pull request is short, because it only carries an already reviewed step.

## Consequences

- **Two pull requests per step** (step → `staging`, `staging` → `main`): about 15 extra minutes a day.
- **CI runs on pushes to both branches.** The backend CI (brought over in Step 1.1) and the frontend CI (new in Step 1.1) trigger on pull requests and on pushes to `main` and `staging`.
- **Step 1.5 sets up two environments**: two Supabase projects, two Render services and two sets of Vercel environment variables. That is more work on 14 Oct, and the free-tier limits for running two of each must be checked first (G-K18).
- `main` gains one merge commit per step that `staging` doesn't have; that is normal and harmless. A fix made on `main` must be merged back into `staging`.
- The owner protects `staging` on GitHub as well as `main` (G-G03). That is a repository setting only the owner can change.

## What would change our mind

- The extra pull request per day costs more than it catches: go back to ADR 0004 for the rest of Phase 1.
- A second developer joins: their feature branches go into the step branch, or straight into `staging`.
- Running two online environments costs too much or hits the free-tier limits: keep `staging` as a branch tested by CI and locally, with only production online.
