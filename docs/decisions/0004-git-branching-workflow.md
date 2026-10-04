# 0004. One branch per phase → pull request → `main`, tagged per phase

- Status: **Accepted**. This is the workflow the project owner asked for on 2026-10-04.
- Date: 2026-10-04
- Related gaps: G-D05, G-G03, G-G04

## Context

The brief wants the repository to show where we are at any moment. The spec (§16) proposed `feature/*` → `develop` → `main`. The project owner wants each phase built on its own branch, tested, then merged into `main`.

## Options

1. **The spec's flow:** a feature branch per issue → `develop` → `main` when CI is green. Good for teams, but a solo builder pays for two merges per change and gets no extra safety from it.
2. **A phase branch → pull request → `main`, tagged** ← chosen.
3. **Trunk-based:** commit straight to `main`. Fast, but no review point and no clear phase boundaries for the reviewer.

## Decision

Option 2.

- Branch names: `phase/NN-<track>-<name>` (for example `phase/03-be-award-config`). `fix/<short-name>` from `main` for bugs found after a phase has merged.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- A phase merges only when its **exit checklist** in [PHASES.md](../PHASES.md) is fully ticked: tests green, CI green, tracking docs updated, diff reviewed.
- Merge with a **merge commit** (not squash), so the phase's commits stay readable. Then tag `phase-NN-done`.
- `main` is always runnable locally. Nothing is deployed until Phase 13.

## Why

- It matches how the owner wants to work, and how the reviewer reads progress: one pull request per phase, with its tests and its notes.
- Tags give clean checkpoints. Rolling back a phase is a single `git revert -m 1 <merge>`.
- With one builder, a `develop` branch adds a merge step and no second integrator.

## Consequences

- `main` should be protected on GitHub (require a pull request and green CI). That's a setting only the repo owner can change (G-G03).
- Phases must be small enough to merge in about half a day. Otherwise the branch lives too long.

## What would change our mind

- A second developer joins: add short-lived feature branches per issue *inside* a phase, merging into the phase branch, or bring back `develop`.
