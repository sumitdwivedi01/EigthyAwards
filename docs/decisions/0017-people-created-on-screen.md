# 0017. Departments, heads, staff and jury are created on screen in Phase 1

- Status: **Accepted** (owner, 2026-10-11)
- Date: 2026-10-11
- Related: the brief's addendum ("the leader creates a department for it, makes the organiser's person its head, and they then add their own staff and jury"); spec §3, §5.1, §5.3, §5.8; [ADR 0013](0013-several-jury-per-application.md) (jury per application), [ADR 0016](0016-applicant-and-platform-accounts.md) (platform accounts); GAPS G-K14, G-K19, G-K23, G-K24

## Context

The 10 Oct plan created departments, heads, staff and jury **only in the starter data** (the seed), with their admin screens and email invites in Phase 2. Jury got their role per cycle, when staff or the head added them to a cycle's **pool**. On 11 Oct the owner asked for the hierarchy to work on screen in Phase 1: the leader creates a department and its head, the head creates their own staff and jury, and each person logs in and sees the department they work for. There is still no email provider (GAPS A4), so an invite link can't reach anyone.

## Options

1. **Keep the seed only** (the 10 Oct plan). No new work, but the walkthrough can't show an organiser being set up, which the brief's addendum asks for.
2. **Email invites now.** The real flow, but it needs an email provider and a set-password page, and in Phase 1 emails only reach the local test inbox.
3. **The creator makes the account and passes on a temporary password** ← chosen. Works without email; invites replace the temporary password in Phase 2.

For the jury:

- **A. A pool per cycle** (the 10 Oct plan): the head creates jury, then staff or the head add them to each cycle's pool, then staff assign. One more step for every award.
- **B. The department's jury list, assigned by hand** ← chosen: the head keeps one jury list for the department; after the deadline staff assign each application to listed jury, with no pool step.

## Decision

Option 3, and B for the jury.

- **The leader** creates a **department** (name, whether it is an external award organiser, its brand colours) together with its **head**: a new platform account (name and email) or an existing platform account (by email). One person may head several departments.
- **The department head** adds **staff** and **jury** to their department: a new platform account, or an existing one by email (someone already in another department is added, not created again). The leader can do the same in any department.
- **Temporary password.** A new account gets a strong, random, one-time password, shown **once** to the creator to pass on privately. It is stored only as a hash and is valid for 7 days. At first login the person must set their own password before anything else works. The creator (the leader for heads; the head or the leader for staff and jury) can issue a new temporary password if it is lost: the old one stops working, the person's sessions end, and it is audited.
- **Who can't be added.** An applicant account is refused (ADR 0016). On the jury list, the department's own head and staff are refused: the head approves the department's written rounds, and staff assign applications. The leader is never staff or jury.
- **Removing** someone from a department is allowed while they have no work there yet (staff with no award, a juror with no assignment); otherwise it waits for package 2.3.
- **What each person sees after logging in:** staff see the departments they work in and their awards; jury see the departments they judge for and the applications assigned to them, with counts; a head sees the departments they head and their people.
- **The jury role belongs to a department** (its jury list), no longer to a cycle. Which applications a juror judges is decided only by staff assignments (spec §5.8), and conflicts still block a juror for every award (rule 2).
- **The seed stays** for tests and the online demo data; the walkthrough shows the hierarchy being created live.

## Why

- The brief's addendum asks for exactly this: an organiser set up by the leader adds their own staff and jury and sees only its own data.
- A temporary password needs no email provider, and forcing the change at first login means the creator never keeps knowing the person's password.
- One jury list per department matches how the owner describes the work: the head knows the experts, and after the deadline staff assign applications to them. A pool per cycle added a step without adding a rule.

## Consequences

- About 8 hours of work in Step 1.2, paid for by dropping masking (ADR 0018), a simpler award page and one online site in Phase 1 (PLAN.md).
- The temporary password is passed on by hand (phone, chat): it can leak on the way. It works once, for 7 days at most, and must be changed at first login (G-K23).
- A head can issue a new temporary password for anyone on their department's lists, including someone who also works in another department; it is audited (G-K24).
- Package 2.3 shrinks: invitations by email replace temporary passwords; replacing a head, assigning more staff to an award, removing people who have work, deactivation, master lists and company corrections stay there.
- The jury per application maximum is checked against the department's jury list instead of a cycle's pool (ADR 0013).

## What would change our mind

- An email provider is chosen early: invites with a set-password link replace the temporary password, with the same screens.
- Departments want a smaller, award-specific jury: a per-award list on top of the department's list, chosen when staff assign.
