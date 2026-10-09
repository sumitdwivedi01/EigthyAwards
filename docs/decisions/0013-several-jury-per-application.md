# 0013. Several jury per application in document review rounds, with the average as the final score

- Status: **Accepted** (lead call and owner, 2026-10-09)
- Date: 2026-10-09
- Related: spec §5.5, §5.8, §5.9, §5.11, §5.12, §10; extends ADR 0008 (on-site panels); supersedes "exactly one jury member per application" in document review rounds

## Context

Until now a document review round (round 1) gave each application to **exactly one** jury member, and the score was that one person's judgement. In the 9 Oct call the lead asked for **several jury to judge the same application**, with the final score being the average, so that no single person's bias decides it. Staff set how many jury each application gets: a minimum and a maximum, which must then be met. One is still allowed, and the maximum is the number of jury in the award's pool. On-site (live) rounds already work this way with a panel of 2 to 5, so they stay as they are.

## Options

1. **Keep one jury member per application.** Simplest, but one person's bias decides the result. Turned down by the lead.
2. **A fixed number of jury per round** (for example always 3). Simple, but it can't handle a pool that is too small, or uneven workloads.
3. **A minimum and a maximum per round, set by staff, with the average as the final score.** ← chosen.
4. **Different numbers per entry category.** More flexible, but more settings and more to explain. Not needed now (owner, 9 Oct); it can be added on the same fields later.

## Decision

- Each document review round has `juryMin` and `juryMax`:
  - both are at least 1, and the minimum is never above the maximum;
  - the maximum is never more than the jury in the cycle's pool who may judge the round (the award's department head doesn't count, because they approve it);
  - the default is 1 and 1, the old behaviour.
- **Assignment:**
  - Staff give each application between the minimum and the maximum of different jury members.
  - Going above the maximum is refused, and so is giving the same person the same application twice.
  - Bulk assignment is all or nothing, and it counts under a lock on the application, so two staff working at once can't overfill it.
  - Conflicts (R2) are checked for every jury member.
- **Before approval:** "Send for approval" needs every eligible application to have at least the minimum of submitted evaluations, and no unfinished one.
- **Changing the numbers:** staff can change them until the round is first sent for approval. The maximum can't go below the jury an application already has.
- **Independent scoring:** a jury member never sees another jury member's scores, notes or the average, nor who else is scoring the same application.
- **Final score:**
  - It is the average of the submitted evaluations' scores; with one jury member, it is simply their score.
  - It is rounded to 2 decimals once, at the end.
  - The same rule serves on-site panels.
  - Staff and the department head see every jury member's score next to the average.
- **Disqualification:** any one of the application's jury can disqualify it, with a reason; staff can reinstate it.

## Why

- Averaging several independent judgements reduces one person's bias, which is what the lead asked for.
- A minimum and a maximum give staff room when the pool is small or busy, while still guaranteeing the minimum.
- The data model already allows several evaluations per application per round (one per jury member), so only the rule and two round fields change. On-site rounds already average in the same way, so one rule now covers both round types.

## Consequences

- **Data model:**
  - `Round.panelMin` and `Round.panelMax` become `juryMin` and `juryMax`, used by both round types: document review 1 ≤ min ≤ max; on-site 2 ≤ min ≤ max ≤ 5.
  - The "one active evaluation per application in a document round" trigger goes.
  - Evaluations get a partial unique index on (round, application, jury member) among non-revoked rows.
- **Screens:**
  - Assignment gets the min–max setting and a "needs more jury" list.
  - Judging progress and round review show every jury member's score and the average.
- **More work in the round:** masking still happens once per application, but jury workload grows with the minimum. Staff see this when setting it.
- **Tests:**
  - assignment above the maximum is refused, also when two staff assign at once;
  - approval is refused below the minimum;
  - the final score is the hand-calculated average;
  - no jury response contains another jury member's scores.

## What would change our mind

- Widely different scores turn out to be common: add a flag when the spread is large (listed as Could have), or a moderation step where the department head settles it.
- The client wants a different number of jury for each entry category: add per-category overrides on the same fields.
- The client prefers dropping the highest and lowest score (a trimmed mean) once there are enough jury: change only the average function.
