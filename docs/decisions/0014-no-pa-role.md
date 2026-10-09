# 0014. No separate PA role: the leader's team works from the leader's account

- Status: **Accepted** (owner, 2026-10-09)
- Date: 2026-10-09
- Related: supersedes [ADR 0005](0005-leader-pa-role.md); spec §3, §5.17; GAPS A11, A12, H02, H03, H11, K16

## Context

On 5 Oct we added a **Leader's PA** role (ADR 0005). It let the leader invite team members who did the leader's organisational work under their own names, with a "PA activity" view of what each one did. On 9 Oct the owner decided this role isn't needed: the people who help the leader simply **work from the leader's account**. It also makes Phase 1 smaller and easier.

## Options

1. **Keep the PA role** (ADR 0005). Every person is traceable, but it adds a sixth role, invite and remove flows, permission tests and a PA activity screen. Turned down by the owner.
2. **No PA role; the team uses the leader's account.** ← chosen.
3. **Several leader accounts with the same powers.** Each person is named and there's no new role, but "exactly one leader" goes, and leader accounts must be managed. Kept as the fallback.

## Decision

- **Five roles**: leader, department head, staff, jury, applicant user.
- Everything the PA could do is done by the **leader**:
  - create departments and appoint heads;
  - add staff to departments and assign them to awards;
  - create awards in any department;
  - manage master data;
  - correct organisation records with a reason;
  - resend invites;
  - deactivate or reactivate accounts.
- The leader still **never writes judging data** (cycle setup, masking, assignment, scores, approvals, results), so the four rules keep the same owners.
- **Removed:** the `LEADER_PA` role, `invitePA` and `removePA`, the PA team and PA activity screens, and every PA permission test.
- Every audit event still stores the actor and their role. For the leader's team that is always the leader's account.

## Why

- The owner's decision. The team already works on the leader's behalf.
- It removes a role, two flows, two screens and a set of permission tests from the build. Phase 1 has 4 build days.

## Consequences

- **Traceability:** the audit history can't tell which team member did something; it shows the leader's account (spec A33, GAPS K16).
- **Shared password:** several people know one password. When a team member leaves, the leader changes the password, which signs out every device (spec §5.21).
- **Code (parked branch):** remove `LEADER_PA` from the `Role` enum and from the role-scope CHECK, and update two tests (the audit test that used `LEADER_PA` as the actor's role, and the scope test). Listed in [proposals/0.7-backend-changes.md](../proposals/0.7-backend-changes.md).

## What would change our mind

- The leader needs to know **who** in the team did something, or an auditor asks for it: give each member a named account (option 3), or bring back a role like ADR 0005.
- The team grows beyond a few people, which makes a shared password risky.
