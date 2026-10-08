# 0011. One application per organisation, blocked at the start

- Status: **Accepted** (owner, 2026-10-08)
- Date: 2026-10-08
- Related: spec §5.2; supersedes the "accept all, flag, staff keep one" rule of 6 Oct; ADR 0010 (proof documents)

## Context

Only one real application per organisation is allowed per award cycle. Until now a second member of the same organisation could still start and submit another one; both were flagged and staff kept one. The owner wants a second application stopped **before** anyone fills it, not cleaned up after submission. Staff can also limit the number of entries, and extra applications from the same organisation would only cause trouble there.

## Options

1. **Accept all, flag duplicates, staff keep one** (the 6 Oct rule). Nobody is ever blocked, but people waste effort filling forms that will be thrown away, and staff have extra work. Superseded.
2. **Block only at submit.** Several colleagues can fill drafts at once; only the first can submit. People still waste effort.
3. **Block at the start.** ← chosen. Once any member starts an application for the cycle, no other member can start one.

## Decision

Option 3:

- A colleague who tries to start a second application sees *"Your organisation already has an application for this award (Draft)"*: the **status only**, never the starter's name.
- Colleagues see the organisation's application in *My applications*, **read-only**, marked "Started by a colleague". Only the starter edits and submits.
- Withdrawn and **released** applications don't block a new start.
- **Staff can release** a wrong, fake or abandoned application with a mandatory reason (audited, nothing deleted). The organisation can then start again.
- A **partial unique index** (one active application per organisation and cycle) backs the service check, so two colleagues starting at the same moment can't both succeed.

## Why

- Nobody fills a form that can never count; staff don't have to resolve duplicates afterwards.
- Data stays consistent: exactly one application per organisation per cycle, enforced by the database too.

## Consequences

- **The risk this creates:** a wrong or fake member who starts first blocks the real applicant. Mitigation: proof documents (ADR 0010) show staff who the person is, and staff can release the application. The real applicant contacts the award team.
- If the starter leaves the organisation, staff release the application and a colleague starts again; handing a draft over is later work.
- The application gains a `RELEASED` status and release fields; `duplicateFlag` is removed.

## What would change our mind

- Organisations often need several people to fill one long form: add shared editing for members (with clear "who submits" rules).
- Releases happen often because the wrong person starts: add an organisation admin who approves who may start applications.
