# 0016. Applicant accounts and platform accounts are separate

- Status: **Accepted** (owner, 2026-10-10)
- Update (2026-10-11, [ADR 0017](0017-people-created-on-screen.md)): jury are added to a department's jury list by its head, not to a cycle's pool; an applicant account is refused there, as below.
- Date: 2026-10-10
- Related: changes spec §3 and §5.1 ("a person who is both a juror and an applicant uses the same account with two roles"); [ADR 0012](0012-proof-once-on-profile-and-account-settings.md) (proof once on the profile), [ADR 0014](0014-no-pa-role.md) (five roles); GAPS G-K19, G-K21

## Context

Step 1.1 first gave every account the Applying area. The leader, department heads, staff and jury could all create or join an organisation, and My profile showed them the "Proof for applying" tab (identity document and LinkedIn link). The code had read spec §3 ("jury in one cycle and applicant user for an organisation in another") and §5.1 ("the same account with two roles") as "everyone may apply". The owner saw the proof tab on the leader's profile and decided: only applicants apply, and nobody else gets the applying screens.

## Options

1. **One account per person, with any mix of roles and applying** (the spec as written). Simple for someone who is both, but the leader and staff see screens they must never use, and nothing stops a staff member's account from applying, even to an award they run.
2. **One account, with the applying screens hidden from anyone who holds a role.** A seeded juror has no role until staff add them to a pool, so they would still look like an applicant; a role granted later would land on an account that has already applied.
3. **Two kinds of account, set when the account is made** ← chosen. An applicant account registers itself and applies; a platform account (leader, department head, staff, jury) is given by the platform and holds roles. Neither does the other's work.

## Decision

Option 3.

- **`User.accountType`** is `APPLICANT` or `PLATFORM`.
  - **Applicant account:** made by registering. It creates or joins its organisation, applies, and keeps the profile proof (identity document, LinkedIn link). It never holds a role and never judges.
  - **Platform account:** the leader, department heads, staff and jury. Made by the seed in Phase 1 and by invites from Phase 2 (package 2.3). It holds roles, and never joins an organisation, applies or keeps profile proof.
- **Someone who does both** (a juror who also wants to apply for their company) registers a separate applicant account with another email address. An email still belongs to one account only (spec §5.1).
- **Everyone** keeps My profile's details and change password (§5.21).
- **The API:** `requireApplicantAccount` guards organisations (register, join, list mine), the LinkedIn link and the identity document, and from Step 1.3 every applying action; a platform account gets `403`. `GET /me` gives an applicant account only the `applicant` area, and a platform account one area per kind of role it holds. A platform account with no role yet (a juror before joining a pool) gets no area and sees "Nothing is assigned to you yet".
- **The database** repeats it: triggers refuse a role or an evaluation for an applicant account, and an organisation membership, an application or an identity document for a platform account; a CHECK keeps the LinkedIn link and identity document off platform accounts; the type can't change once the account is in use.
- **Adding jury to a pool** (Step 1.4) finds platform accounts only; an applicant account's email is refused.

## Why

- The leader, heads and staff run awards. If their accounts could apply, the platform would have to trust them not to apply to their own awards; with separate accounts it simply can't happen.
- Every screen and every check has one answer: an account either applies or works on awards.
- A seeded juror no longer looks like an applicant before joining a pool.

## Consequences

- Someone who is both needs two email addresses and logs in to each separately (G-K21).
- The platform doesn't know that a juror's second account applied for a company: staff still record that conflict, as spec §5.8 already asks (rule 2).
- Spec §3, §5.1, §5.2, §5.8, §5.21 and §10 change. The seed sets the type of every account it makes. The jury pool (Step 1.4) and invites (package 2.3) find or create platform accounts only.
- One migration, `20261010180000_applicant_accounts`: existing accounts with an active role became platform accounts, all others applicant accounts; the seed then marks its jury accounts.

## What would change our mind

- Many people need both kinds and two emails become a burden: one login that switches between two linked accounts, still kept apart in the data.
- The client wants staff to apply for other departments' awards: allow it per department in configuration, never by default.
