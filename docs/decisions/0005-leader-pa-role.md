# 0005. A "Leader's PA" role for the leader's personal team

> **Superseded on 9 Oct 2026 by [ADR 0014](0014-no-pa-role.md):** there is no PA role; the leader's team works from the leader's account. Kept for history.

- Status: **Accepted** (leader call, 2026-10-05). The exact list of PA powers is **Proposed**: see GAPS A11 and A12.
- Date: 2026-10-05
- Related: spec §3, §5.17; GAPS G-H02 to G-H04

## Context

The leader has a personal team who take tasks from the leader, often during calls, and carry them out: creating departments, appointing department heads, assigning staff. The leader wants to give these people access by making them PAs. Until now only the leader could do this organisational work, and the leader is busy.

## Options

1. **Share the leader's login.** Zero work to build, but nobody could tell who did what. It breaks rule 3's spirit (who changed what, and why) and is a security risk. Turned down.
2. **Make PAs full "second leaders"** (the same role, LEADER). Simple, but then PAs could create more PAs, and "exactly one leader" (Q6) breaks. Turned down.
3. **A separate role, `LEADER_PA`, platform-wide, created only by the leader**, doing the leader's organisational work and nothing on the judging side. ← chosen
4. Per-PA permission switches (the leader ticks what each PA may do). The most flexible option, but more screens and more tests. Deferred.

## Decision

Option 3. A PA can do what the leader does organisationally:

- departments and their heads
- staff in any department, and staff assigned to awards
- creating awards in any department
- master data (award domains, organisation types)
- correcting organisation records, with a reason
- resending invites, and deactivating or reactivating accounts

A PA also sees what the leader sees: the dashboard, every award read-only, and audit history.

A PA **cannot**:

- create or remove PAs, or change their own roles
- configure or publish cycles
- mask applications
- assign applications to jury
- score
- approve or send back rounds
- publish results

## Why

- Every action is done under the PA's **own** account, and the audit records the PA and the role they acted in. The leader gets a "PA activity" view.
- Keeping PAs off the judging side means the four rules keep exactly the same owners and the same tests. Adding the PA role cannot weaken them.
- Roles are loaded from the database on every request, so removing a PA takes effect immediately.

## Consequences

- The role list grows to six. RoleAssignment gets `LEADER_PA`, `grantedById` and `revokedAt`. AuditEvent gets `actorRole`.
- New screens: PA team (leader only), PA activity (leader only). The leader's area becomes "Leader and PA".
- New permission tests: a PA is refused on every judging write; a PA cannot create a PA; a removed PA is refused.

## What would change our mind

- The leader wants different PAs to have different powers: add per-PA permission switches (option 4) on top of this role.
- The leader wants PAs to approve rounds on their behalf: that would move the approval rule. It needs the leader's explicit say-so and a new ADR.
