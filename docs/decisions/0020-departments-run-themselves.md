# 0020. Departments run themselves; the leader brings them on and only watches

- Status: **Accepted** (owner, 2026-10-11); changed by [ADR 0021](0021-one-award-per-department.md) (one award per department, run by all its staff)
- Date: 2026-10-11
- Changes: [ADR 0017](0017-people-created-on-screen.md) (the leader no longer adds staff or jury, sets a department's colours, or issues passwords to its staff and jury); spec §3, §5.1, §5.3, §5.19, §7, §15
- Related: [ADR 0009](0009-branded-award-sites.md) (branded award sites; external organisers as departments, spec §3); GAPS G-E03, G-J06, G-K24, G-K31

## Context

ADR 0017 let the leader do everything a head does, in any department: add and remove staff and jury, issue their temporary passwords, and choose a new department's colours. On 11 Oct the owner pointed out that the leader is a **service provider**. External award organisers come to the platform to announce and run their awards; they won't hand control of their department, their people or their look to someone outside it. The leader's job is to bring a department onto the platform and to see across all of them, not to run them.

## Decision

**A department is run by its head. The leader creates it with its head, and from then on can see it but not change it.**

| | Leader | Department head | Staff |
|---|---|---|---|
| Create a department with its head | ✓ | | |
| See every department, its people, its theme and its award pages | ✓ | own | |
| Add or remove staff and jury | | ✓ own | |
| A new temporary password for staff and jury | | ✓ own | |
| A new temporary password for someone who heads a department | ✓ | | |
| Choose the department's **theme** (colours, footer) | | ✓ own | |
| Change an award page's address | | ✓ own | ✓ own awards |

- **No theme at creation.** A new department starts with the default colours; the head chooses its theme on the department page (main colour, accent colour, footer line, with a preview). Every award page of the department reads it live. Logo, font and social links come with the full brand-kit screen in package 2.2.
- **The leader keeps one thing:** issuing a new temporary password to a department head who is locked out. Without email there is no other way back in until the email reset of package 2.3. It ends the head's sessions, must be changed at the next login, and is audited as the leader's action (G-K31).
- **The API says what each person may do.** The department view carries `canManage`, and each person `canIssuePassword` and `canRemove`; the theme view carries `canEdit`. The screens show only those buttons, and the API refuses everything else with `403`.
- Unchanged: the leader still creates departments and their heads, replaces a head (Phase 2), keeps master data and corrects organisation records, and sees every award, application and decision read-only. Only staff create awards (spec §3 had the leader able to as well; that is removed).

## Why

- External organisers keep their department to themselves: their people, their look and their pages are theirs.
- The leader sees everything, so oversight is not lost; nothing inside a department changes without its head or staff.
- One exception is unavoidable without email, and it is the narrowest one: a locked-out head.

## Consequences

- The leader's Departments screen has no colour fields; a department's page is read-only for the leader.
- The head's department page gains the theme and the list of the department's award pages.
- If a head leaves, the leader still can't add their staff: replacing the head (package 2.3) is the leader's way in, as it should be.
- The leader can still read a head's new temporary password once, when issuing it. The head notices: their sessions end and they must set a new password (G-K31).

## What would change our mind

- A department asks the platform to run its people or theme for it: add an explicit, audited "act for this department" permission that its head grants, rather than restoring the leader's general access.
