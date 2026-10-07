> Source: `Awards Platform — Product & Technical Specification.docx` (2 Oct 2026, Priyanshu Phulara), converted to Markdown so it lives in the repo. The docx is the original; if they disagree, raise it in docs/GAPS.md. Diagrams from the docx are not reproduced here. The plain-language diagrams are in docs/overview/ (the old architecture PDF was removed on 7 Oct 2026 as out of date; it is in git history at tag `phase-00-done`).

## Revision log

| Date | Change | Source |
|---|---|---|
| 2026-10-02 | First version (the docx). | Days 1–2 questions and design |
| 2026-10-04 | §8, §9, §11, §16 and §17 partly superseded: two apps instead of one Next.js app; own login instead of Auth.js; phase plan instead of §17. | ADR 0001, 0003, 0004; docs/PHASES.md |
| 2026-10-05 | **Leader call.** (1) A staff member can be assigned many awards. (2) The award goes to the organisation, never to its plants or units (Q1 answered). (3) **No signed authorisation letter**: removed everywhere; for now any member of the organisation applies on its behalf. (4) New role **Leader's PA**: the leader's personal team, created by the leader, doing the leader's organisational work (new §5.17). (5) **Data consistency** was the main problem before this platform: new §5.18, master data, normalisation and constraints. Sections changed: 1, 2, 3, 5.1, 5.2, 5.3, 5.6, 5.13–5.15, 5.17, 5.18, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18. | ADR 0005, 0006, 0007 |
| 2026-10-06 | **Answers on shop-floor and open questions.** **On-site rounds** are now built, not future: one round type serves both the live round 2 of large awards and shop-floor competitions (Kaizen, 5S) judged on site. A panel of 2–5 jury, each scoring separately; the final score is the average; no approval; staff close the round. Results: document rounds give Shortlisted / Rejected, on-site rounds give **Gold / Silver / Bronze** (others: Participated). The questionnaire may be empty for on-site-only cycles. Only one real application per organisation per award (extras accepted, flagged, resolved). GSTIN optional. Fees can differ per entry category. The department head's approval is final for document rounds. Sections changed: 1, 2, 3, 4, 5.2–5.6, 5.9, 5.11–5.13, 5.16, 6, 7, 8, 10–15, 18. | ADR 0008 |
| 2026-10-06 | **Final decisions before building.** One set of medals per award cycle: Gold, Silver and Bronze for ranks 1 to 3 of the whole on-site round, not per category. Indicator scores are whole numbers 0 to 10. A submitted application is edited with an explicit Save changes that runs full checks. "Update requested" shows as Submitted. Sections changed: 4, 5.5, 5.6, 5.12, 5.16, 7, 10, 15, 18. | GAPS §A (A8, A9), G-D03, G-I05 |
| 2026-10-07 | **New issues and the owner's answers.** **Branded award sites**: a brand kit per department and a site per award, built from ready-made sections that staff choose, arrange and re-design at any time, also after publishing; for **all** awards; no approval needed (new §5.19). A department can be an **external award organiser** that runs its awards on its own; one person may head several departments. **Proof of identity and employment** uploaded with every application (new §5.20). An optional **entry limit** per cycle, shown publicly as "499 / 500". Own domains designed for, not built. Only staff create awards. Sections changed: 1, 2, 3, 5.2, 5.3, 5.6, 5.14, 5.19, 5.20, 7, 8, 10–15, 18. | ADR 0009, 0010; GAPS §J |

# Awards Platform — Product & Technical Specification

Oct 2, 2026 · @Priyanshu Phulara

## 1. Overview

We are building one configurable platform that can run every award of an Indian industry body. In 10 working days we deliver a working version that proves one claim: several awards with different rules run on the same engine, and staff set those differences in the UI without any code change.

Background. The body runs about 80 awards: business excellence, energy, safety, design, innovation, sustainability, regional awards and shop-floor competitions (Kaizen, 5S). Today the whole process is manual. An average award receives 300 to 500 applications. The largest scores applicants on about 250 indicators across 15 areas, runs six months and has two rounds; round 2 is a live presentation.

The core idea. An award is data, not code. The code knows the parts every award shares (cycles, applications, masking, jury, scoring, approval, results, audit). Each award's configuration fills in what differs (questions, indicators, weights, dates, fee, blind judging, categories). No line of code ever names a specific award.

Success criteria for the 10-day build:

- The leader (or one of the leader's PAs) creates a department and appoints its head, the department head adds staff and assigns them to one or more awards, and staff create and configure the full award in the UI: questionnaire, scoring sheet with weights, deadline, fee and blind judging.
- At least three differently configured cycles run end to end with no code change: a blind document-review award with a fee (apply, lock, mask, assign, score, approve, shortlist, publish); a free award whose shortlisted entries then present on site to a panel and win Gold, Silver or Bronze; and a shop-floor competition judged only on site.
- The four rules of the brief (blind judging, conflict of interest, score audit, question versioning) are enforced on the server and covered by automated tests.
- Every award has its own **branded award site** that its staff build and change without a developer (§5.19).
- Shared data stays consistent across all awards: one record per organisation, person and department, normalised on save, with controlled lists instead of free text (§5.18).
- The repository holds the code, a README a stranger can run from, user journeys, an architecture drawing, decision records, a daily log and a list of what the tests check and do not check.

Who this document is for. Developers and AI coding agents building the platform, and the reviewer reading the work. Section 18 lists every open question with the default we build if it stays unanswered.

## 2. Glossary

Every word below means exactly one thing in code, UI and docs. Two different things were both called "category" in our discussion; here they are split into award domain and entry category.

| Term | Meaning | Example |
|---|---|---|
| Department | A unit that owns and runs awards; created by the leader or a PA and run by a department head. It can be part of the industry body, or an **external award organiser** that runs its awards on the platform on its own | Energy department; the FPO Awards team |
| Award domain | The subject area picked when creating an award, from a controlled list (master data) | Energy, Safety, Innovation |
| Award | A permanent award programme | National Energy Excellence Award |
| Cycle | One edition of an award, with its own dates, questionnaire and scoring sheet | 2026 edition |
| Entry category | A category inside a cycle that an applicant competes in; one award can have many | Large manufacturing, MSME |
| Organisation | The legal body that applies and receives the award, identified by PAN. Its plants or units never apply separately | Acme Steel Ltd |
| Applicant user | A person who applies on behalf of an organisation | Plant HR manager |
| Questionnaire | The form applicants fill: sections that contain questions |   |
| Section (area) | A group of questions; also carries a weight in scoring | Environment |
| Question | One item in a section, with a stable key that never changes across versions | Describe your tree plantation |
| Identity field | A field that reveals who applied; never shown to jury | Org name, PAN, GST, address, official email |
| Form version | An immutable snapshot of the questionnaire; every published change creates a new version | v1, v2 |
| Indicator | A jury-only scoring item attached to one question; scored 0 to 10 or Yes/No; has a weight | Oxygen efficiency of trees |
| Scoring sheet | All indicators and weights of one round (the client calls it the judgement sheet) |   |
| Round | One judging stage of a cycle. Its type is **document review** (jury score the written application) or **on-site** (a panel scores a live presentation). A cycle has one or more rounds in order | Round 1 document review, round 2 on-site |
| On-site round | A round judged in person: each entry presents at a set time and place, and a panel of jury score it there on their own devices. Never blind. No approval step | Kaizen presentations; round 2 of a large award |
| Shop-floor competition | A competition (Kaizen, 5S) whose only round is on site; its form may hold little more than the organisation's details | Kaizen competition 2026 |
| Panel | The 2 to 5 jury members who score one entry in an on-site round, each on their own | 3 jury for one presentation |
| Presentation slot | The date, time and venue at which an entry presents in an on-site round | 12 Nov, 10:30, Pune plant hall |
| Result label | The outcome staff give an entry when a round's results are decided. Each round has its own list | Shortlisted, Rejected; Gold, Silver, Bronze, Participated |
| Jury pool | Jury members selected for a cycle by staff and the department head |   |
| Evaluation | One jury member's scoring of one application in one round. In a document review round each application has exactly one evaluation (one jury member); in an on-site round it has one per panel member. One jury member has many evaluations |   |
| Overall note | The required comment a jury member writes per application |   |
| Masking | Staff creating a jury-safe copy of answers and documents after the deadline |   |
| Disqualification | Marking an application ineligible, with a reason; reversible, never deleted | Fake application |
| Approval | The department head's decision on a round's results: approve or send back |   |
| Send back (redo) | The department head returns results with a remark so staff and jury can correct them |   |
| Shortlist | Applications given the "Shortlisted" label after a document review round; they move on to the next round, if there is one | Top 10 per category |
| Results publication | Staff making final statuses visible to applicants |   |
| Leader's PA | A member of the leader's personal team, created by the leader, who does the leader's organisational work on their behalf | The leader's executive assistant |
| Master data | Shared lists every award uses, managed in one place instead of typed as free text | Award domains, organisation types, Indian states |
| Deactivated account | A user who can no longer log in; everything they did stays on record | A staff member who left |
| Brand kit | A department's logo, colours, font and social links, used by all its award sites | FPO green, FPO logo |
| Award site | An award's own public website on the platform, made of pages | /awards/fpo |
| Section | One ready-made building block of a page that staff fill in and place, such as a banner, a gallery or past winners | Photo gallery |
| Entry limit | The optional maximum number of submitted applications a cycle accepts | 500 |
| Proof documents | A photo identity document and a proof of employment, uploaded by the applicant with each application | PAN card; company ID card |

## 3. Users, roles and permissions

Six roles use the platform. The leader and the leader's PAs work across the whole platform; every other role is held inside a scope. One person can hold different roles in different scopes, for example jury in one cycle and applicant user for an organisation in another.

| Role | Scope | Who they are |
|---|---|---|
| Leader | Whole platform | The single top authority. Creates departments and appoints their heads, and creates the PAs who do this work on their behalf. Sees everything in every award, read-only: never changes judging data (cycle setup, applications, scores, decisions) |
| Leader's PA | Whole platform | The leader's personal team, created only by the leader. Does the leader's organisational work on their behalf: departments, department heads, staff, award creation, master data, organisation record fixes, accounts. Sees what the leader sees. Cannot create other PAs or touch judging data |
| Department head | One or more departments | The second-level leader, or the lead of an external award organiser. Adds staff to the department and assigns them to awards, selects jury together with staff, and reviews and approves the department's judgements |
| Staff | One or more awards (can span departments) | Does the general work: creates and runs awards, selects jury together with the department head, and is the only role that assigns applications to jury. **One staff member can be assigned many awards at once** |
| Jury | One cycle | Senior expert who scores the applications assigned to them; each application has exactly one jury member |
| Applicant user | One or more organisations | Person applying on behalf of an organisation |

### Permission matrix

✓ = allowed. Blank = not allowed. "Own" = only inside the role's scope. "Any" = in every department.

| Action | Leader | Leader's PA | Dept head | Staff | Jury | Applicant |
|---|---|---|---|---|---|---|
| Create departments; appoint or replace department heads | ✓ | ✓ |   |   |   |   |
| Create, or remove, the leader's PAs | ✓ |   |   |   |   |   |
| Add staff to a department and assign staff to awards (one staff member, many awards) | ✓ any | ✓ any | ✓ own |   |   |   |
| Create an award (name, domain, description) | ✓ any | ✓ any |   | ✓ own dept |   |   |
| Manage master data (award domains, organisation types) | ✓ | ✓ |   |   |   |   |
| Correct an organisation's record, with a reason | ✓ | ✓ |   |   |   |   |
| Resend invites; deactivate or reactivate accounts | ✓ | ✓ |   |   |   |   |
| Configure a cycle: questionnaire, scoring sheet, dates, fee, blind, categories, entry limit |   |   |   | ✓ own |   |   |
| Edit the department's brand kit |   |   | ✓ own | ✓ own dept |   |   |
| Build, change and publish an award site, at any time (also after publishing) |   |   | ✓ own | ✓ own |   |   |
| Check applicants' proof documents (Verified or Rejected, with a reason) |   |   |   | ✓ own |   |   |
| Publish a cycle, edit questions before deadline, extend deadline |   |   |   | ✓ own |   |   |
| Select jury for a cycle's pool, record conflicts |   |   | ✓ own | ✓ own |   |   |
| Register or join an organisation, apply (with proof documents), edit, withdraw |   |   |   |   |   | ✓ |
| Edit their organisation's profile |   |   |   |   |   | ✓ own org |
| Resolve duplicate applications |   |   |   | ✓ own |   |   |
| Mask applications |   |   |   | ✓ own |   |   |
| Assign applications to jury (document rounds) and choose on-site panels |   |   |   | ✓ own |   |   |
| Schedule presentation slots for an on-site round |   |   |   | ✓ own |   |   |
| Score, comment, write overall note (document round, or as an on-site panel member) |   |   | ✓ when on a panel |   | ✓ assigned |   |
| Enter a panel member's on-site scores on their behalf (backup) |   |   |   | ✓ own |   |   |
| Close an on-site round (locks its scores) |   |   |   | ✓ own |   |   |
| Disqualify with a reason |   |   |   | ✓ own | ✓ assigned |   |
| Reinstate a disqualified application |   |   |   | ✓ own |   |   |
| Edit scores after jury submission, with a reason, before approval |   |   |   | ✓ own | ✓ only in redo |   |
| Send a round for approval |   |   |   | ✓ own |   |   |
| Approve, or send back with a remark (document rounds only) |   |   | ✓ own |   |   |   |
| Give result labels (Shortlisted, Rejected; Gold, Silver, Bronze, Participated) and publish results |   |   |   | ✓ own |   |   |
| See every award, application, score and decision (read-only) | ✓ | ✓ | ✓ own | ✓ own |   |   |
| See applicant identity in a blind award | ✓ | ✓ | ✓ own | ✓ own |   | ✓ own org |
| Dashboard | ✓ all awards | ✓ all awards | ✓ own |   |   |   |
| View audit history | ✓ | ✓ | ✓ own | ✓ own |   |   |
| See what each PA did (PA activity) | ✓ |   |   |   |   |   |

Rules that follow from the client's answers:

- The leader and the PAs never change judging data. Their writes are organisational only: departments, people and their roles, award creation, master data, organisation record fixes and accounts. Cycle setup, applications, masking, scores, approvals and results belong to staff, jury and department heads.
- Only the leader creates or removes PAs. A PA cannot give anyone, including themselves, the PA or leader role.
- Every PA action is recorded with the PA as the actor and "Leader's PA" as the role, so the leader can always see who did what.
- An external award organiser is set up as a department: the leader or a PA creates it and appoints the organiser's lead as department head. From then on the organiser runs its awards alone (staff, jury, award sites, approvals), and sees only its own department. One person may head several departments.
- Award sites go live without the leader's or a PA's approval; the leader and PAs can see them but not edit them.
- Only staff create awards; department heads add staff and assign them.
- The department head approves **document review** rounds: staff send the round's results to them, and they approve or send back with a remark. They do not edit scores. Their approval is final; the leader does not sign off after it.
- **On-site rounds have no approval** (client answer, 6 Oct 2026). When every panel member has submitted, staff close the round, and its scores lock just as an approved round's do.
- The department head may sit on an on-site panel as a juror. They hold the jury role for that cycle while scoring, and are never a juror in a document review round of their own department, because they approve those rounds.
- A staff member can be assigned to any number of awards, in one or more departments. Their "My awards" view lists all of them.
- Jury selection is shared: staff and the department head can both add jury to a cycle's pool. Assigning applications to jury is staff only.
- In a document review round each application is assigned to exactly one jury member. In an on-site round each entry is scored by a panel of 2 to 5 jury members, each on their own; the final score is their average. One jury member scores many applications.
- After the department head approves a round, nobody can change its scores.
- Jury see only applications assigned to them, and in blind awards only the masked copy.

## 4. Lifecycle and statuses

An application follows one main path from draft to result, and every side exit keeps the record. Cycles, rounds and evaluations have their own simpler statuses, and applicants see a short, friendly version of all this.

*[Diagram in the original docx: application lifecycle · 7 main states, 4 side exits. See the status tables below, and the journey diagram in docs/overview/README.md §4.]*

Disqualification can happen anywhere from locked to evaluated and is reversible. A department head's send back returns the round to correction, with scores unchanged until staff or jury edit them with a reason.

### Cycle status

| Status | Meaning | Next |
|---|---|---|
| Draft | Staff are configuring | Published |
| Published | Visible on Open awards; accepts applications until the deadline | Closed, automatically at the deadline |
| Closed | Applications locked; the rounds run one after another | Results published, when the last round's results are published |
| Results published | The final round's results are visible to applicants | Final |

### Round status

A document review round:

| Status | Meaning | Next |
|---|---|---|
| Not started | No evaluation exists yet | Judging |
| Judging | Jury are scoring | Pending approval, once every evaluation is submitted and staff send it |
| Pending approval | Waiting for the department head | Approved, or sent back |
| Sent back | Staff and jury correcting, with the remark visible | Pending approval again |
| Approved | Scores locked forever | Results published |
| Results published | Labels (Shortlisted, Rejected) visible to applicants; shortlisted entries move to the next round | Final |

An on-site round:

| Status | Meaning | Next |
|---|---|---|
| Not started | Entries known; slots and panels being set | Judging, once the first panel is set |
| Judging | Presentations happening; panel members scoring | Closed, when every active panel evaluation is submitted and staff close it |
| Closed | Scores locked forever; final scores are panel averages | Results published |
| Results published | Labels (Gold, Silver, Bronze, Participated) visible to applicants | Final |

### Evaluation status

| Status | Meaning | Next |
|---|---|---|
| Assigned | Given to a jury member, not opened | In progress |
| In progress | Draft scores saved | Submitted |
| Submitted | All indicators and the overall note done | Redo, if staff reopen it after a send back (document rounds) |
| Revoked | Taken away from this jury member with a reason (reassigned, a late conflict, or absent from an on-site panel); draft scores kept | Final |
| Redo | Reopened for the jury to correct | Submitted |

### What the applicant sees

Result labels appear only after staff publish a round's results; until then a judged application shows Under review.

| Internal state | Applicant sees | Message |
|---|---|---|
| Draft | Pending | Your application is not submitted yet |
| Submitted, with Update requested | Submitted, update requested | Questions changed; please review the highlighted ones before the deadline |
| Submitted | Submitted | We received your application |
| Locked, Masked, Evaluated, Approved, Disqualified | Under review | Your application is being reviewed |
| Shortlisted (published), no further round | Shortlisted | Keep an eye on your email; we will contact you soon |
| Shortlisted (published) or entered in an on-site round, slot set | Presentation scheduled | Your presentation is on <date> at <time>, <venue> |
| Gold, Silver or Bronze (published) | Gold, Silver or Bronze | Congratulations! You have won <label> |
| Participated (published) | Participated | Thank you for taking part |
| Rejected, Rejected as duplicate, Disqualified (published) | Rejected | Better luck next time |

A cycle can rename these labels for its rounds (§5.3); the table shows the defaults.
| Withdrawn | Withdrawn | You withdrew this application |
| Not submitted | Not submitted | The deadline passed before submission |

## 5. Functional requirements

Each module below lists its rules and the acceptance checks that tell us it is done. "Assumption" marks a default we chose where the client has not answered; each one is repeated in section 18. Sections 5.17 (Leader's PA team) and 5.18 (Data consistency) were added after the leader call on 5 October 2026; 5.19 (Branded award sites) and 5.20 (Proof documents and entry limit) on 7 October 2026.

### 5.1 Accounts and login

- Everyone logs in with email and password. Passwords are hashed, never stored plain.
- Applicant users register themselves. The leader's account is created at setup. The leader invites PAs; the leader or a PA invites department heads; department heads, the leader or a PA invite staff; staff or department heads invite jury. Each invitee sets their own password from the invite link.
- One account per person: an email address can belong to only one user, compared without regard to case. A person who is both a juror and an applicant uses the same account with two roles.
- A deactivated account cannot log in, and its sessions end at once. Nothing it did is removed. Only the leader or a PA can deactivate or reactivate an account, and nobody can deactivate the leader.
- Password reset works through an emailed link that expires.
- Every request loads the user's role assignments from the database; the UI never decides permissions on its own.
- Accept when: a jury user opening any staff page gets "forbidden"; an applicant can never open another organisation's application; a deactivated user cannot log in; registering `Asha@Example.com` when `asha@example.com` exists is refused.

### 5.2 Organisations and duplicate applications

- **The award goes to the organisation, the legal entity identified by PAN.** Its plants, units or branches never apply separately and never get their own record (client answer, 5 Oct 2026).
- Organisation profile fields. Required: legal name, PAN, registered address (line, city, state, PIN code), official email, phone. Optional: GSTIN (small units, NGOs and government bodies may not have one; client answer, 6 Oct 2026), organisation type, CIN, website. More fields can be added later. State and organisation type are picked from controlled lists, never typed (§5.18).
- PAN is unique: one organisation record per PAN. PAN format is checked (5 letters, 4 digits, 1 letter). When a GSTIN is given, its format is checked and characters 3 to 12 must equal the PAN.
- To join an organisation that already exists, a user must enter its PAN and its GSTIN, or, if it has no GSTIN, its PAN and its official email address.
- **No signed authorisation letter** (client decision, 5 Oct 2026). Instead, with every application the applicant uploads a **photo identity document** and a **proof of employment** at this organisation, and gives their LinkedIn profile; staff check them (§5.20, decided 7 Oct 2026). Joining an organisation with PAN and GSTIN alone proves little (the PAN is part of the GSTIN, which is printed on every invoice), so these documents are what staff rely on.
- The application belongs to the organisation, not to the person. All formal communication goes to the organisation's official email as well as the applicant user.
- Duplicate rule: **only one real application per organisation per award cycle** (client answer, 6 Oct 2026). Every application is accepted, but a second one from the same organisation is most likely fake or a mistake, so it is flagged and staff keep exactly one. Withdrawn applications and applications rejected as duplicates do not count.
- When a second user from the same organisation starts an application in the same cycle, they see: "Your organisation already has an application for this award." Assumption: they may still continue; both applications are then flagged "Possible duplicate".
- Staff resolve flagged duplicates by contacting the organisation: they keep one and mark the other "Rejected as duplicate" with a reason. Nothing is deleted.
- Profile edits by the organisation's users, and corrections by the leader or a PA (which need a reason), are audited with before and after values. The PAN cannot be changed by the organisation's users; a wrong PAN is corrected by a PA with a reason.
- Accept when: a second application from the same PAN in the same cycle is flagged; resolving keeps exactly one active application and records who decided and why; a profile edit appears in the organisation's history.

### 5.3 Departments, awards and cycle setup

- The leader or a PA creates departments and appoints one department head for each. Department names are unique, compared without regard to case.
- The department head adds staff to the department and assigns staff to awards. The leader or a PA can do the same in any department. **A staff member can be assigned to many awards at once**, and can belong to several departments.
- Staff create an award in their department: name, domain (from the award domain list), short description. The creator is assigned to it automatically, and the department head can add or remove staff on any award in the department. The leader or a PA can also create an award in any department and assign its staff; configuring its cycles is then the staff's work. Award names are unique inside a department, compared without regard to case.
- Staff create a cycle (for example "2026") and configure:
  - dates: opening date and deadline (date and time, India time);
  - entry categories: at least one;
  - entry fee in rupees for the cycle, optionally a different fee for an entry category; 0 means free;
  - an optional **entry limit**: the maximum number of submitted applications (§5.20);
  - blind judging: on or off;
  - rounds, in order: document review only; document review then on-site; or on-site only (shop-floor competitions). Each round has a scoring sheet and its result labels (defaults: document review → Shortlisted, Rejected; on-site → Gold, Silver, Bronze, Participated). An on-site round also has a panel size (default 2 to 5 jury);
  - the questionnaire (5.4) and the scoring sheet (5.5).
- Before publishing, the system checks: at least one round; at least one section and question when the first round is a document review (an on-site-only cycle may have no questions beyond the identity section); every document-review indicator points to an existing question; every round's scoring sheet has weights adding up to 100% at each level; every round has at least two result labels; the deadline is after the opening date; at least one entry category.
- A published cycle appears on the public "Open awards" page from its opening date until its deadline.
- Assumption: fee and blind judging cannot change once the cycle is published.
- Accept when: staff create, configure and publish a complete award through the UI only, and a second award with different settings needs no code change.

### 5.4 Questionnaire and versioning

- Structure: sections contain questions. Question types: short text, long text, number, date, single choice, multiple choice, yes/no, file upload (allowed types, maximum files, maximum size), team members (a list of name and designation).
- The questionnaire may be **empty** when the cycle starts with an on-site round, as in shop-floor competitions. The applicant then confirms the organisation's details, picks the entry category, optionally lists team members, and submits.
- Team member names reveal who applied, so a team members answer is treated like the identity section: it is never sent to jury in a blind document review round.
- Every question has a system-generated key that never changes and is never reused, plus label, help text and a required flag.
- A fixed identity section is filled from the organisation profile: organisation name, PAN, GSTIN, address, official email, phone. It is never sent to jury, so it never needs manual masking.
- Before the deadline, staff may add sections and questions, and edit wording, help text and the required flag. They may add choice options but not remove them. They may not remove a question or change its type within a cycle.
- Every publish of a change creates a new immutable version with a short change summary. Published versions can never be edited.
- Answers are stored by question key, so they carry over to the new version automatically.
- When a new version is published, every applicant with a draft or submitted application in the cycle gets an email listing the new and changed questions. Inside the form, those questions are marked "New" or "Updated".
- Assumption: a submitted application stays submitted when questions are added. It is flagged "Update requested"; the applicant can edit until the deadline. At the deadline it is locked as it stands.
- Between cycles, the next cycle starts its own versions and may drop questions. Each application stores the version it was last saved against, and that version is pinned at the deadline. An application always opens with its own pinned version, never with a newer one.
- Accept when: a 2025 application still opens correctly after the 2026 cycle removed questions from it; editing a published version is refused; removing a question inside a cycle is refused.

### 5.5 Scoring sheet, weights and score formula

- Indicators are jury-only. They are never sent to applicants.
- In a document review round, each indicator belongs to exactly one question; a question can have zero, one or many indicators. In an on-site round, criteria score the presentation, so they stand on their own: the score sheet has its own sections and criteria, with the same weight rules.
- Indicator fields: key, label, type (score 0 to 10 in whole numbers, or Yes/No), weight.
- Weights (assumption): each section has a weight as a share of the total, and all section weights add up to 100%. Each indicator has a weight as a share of its section, and the indicator weights in one section add up to 100%. The builder shows running totals and blocks publishing until every total is 100%.
- A simple award with no areas uses one section with weight 100%.
- The jury sees each indicator's weight next to it. There is no scoring guidance text; marks are the jury's judgement.
- Assumption: the scoring sheet can be edited until the first score is saved in that round, then it is locked.
- Value used in the formula: a 0 to 10 score counts as score ÷ 10; Yes counts as 1 and No as 0. The application's score is out of 100, rounded to 2 decimals:

```
Score = 100 × Σ over sections s of ( W_s × Σ over indicators i in s of ( w_i × v_i ) )
```

- Here W is the section weight and w the indicator weight (both as fractions of 1), and v the indicator value from 0 to 1.
- Worked example: section Environment has weight 40%. Its indicators are oxygen efficiency (weight 60%, scored 8) and shade (weight 40%, scored 5). Environment contributes 100 × 0.4 × (0.6 × 0.8 + 0.4 × 0.5) = 27.2 points.
- Accept when: the computed score matches hand-calculated values in tests, including Yes/No indicators and rounding.

### 5.6 Applying

- The public "Open awards" page lists each published award: name, domain, description, deadline, fee and entry categories.
- To start an application, the user must be logged in and linked to an organisation, and must choose an entry category.
- Fee: the fee is the entry category's fee if it has one, otherwise the cycle's fee. If it is above 0, the user sees the amount and a demo payment screen. "Pay" records a payment with a fake reference and unlocks the form. There are no refunds.
- Drafts save automatically a few seconds after each change and on moving between sections. The user can leave and continue later; progress shows per section.
- Submit checks all required answers and files, the two proof documents and the LinkedIn profile link (§5.20), checks the entry limit, sets the status to Submitted, takes a snapshot of the organisation's identity fields onto the application (§5.18), and sends a confirmation email.
- Until the deadline, the applicant can edit a submitted application. It stays Submitted. Drafts autosave, but a submitted application is edited with an explicit **Save changes** that runs the same checks as submitting (no autosave), so it is always valid (decided 6 Oct 2026).
- Withdraw is possible before the deadline, with an optional reason. The application is kept as Withdrawn. The organisation may start a new application in the same cycle; assumption: the fee is paid again.
- At the deadline every application is locked. Drafts that were never submitted become "Not submitted" and go no further.
- Staff can extend the deadline. This reopens editing for everyone until the new deadline. Assumption: not allowed once masking has started.
- Files: PDF, JPG, PNG, DOCX, XLSX; up to 10 MB per file (assumption).
- Accept when: the form is locked until a fee is paid; drafts survive a browser close; a locked application refuses edits; a withdrawn organisation can apply again.

### 5.7 Locking and masking (blind judging)

- An application is locked when the current time passes the cycle's deadline. The check runs in the service on every write, so no scheduled job is required.
- Blind judging on: every locked application becomes "Masking pending".
- The masking screen shows each original answer beside an editable masked copy, pre-filled with the original. For each uploaded file, staff upload a masked copy or mark it "safe as is".
- Staff mark the application "Masking done". It becomes Masked and visible to its assigned jury. Staff can mask one by one, so judging of masked applications can start while others are still pending.
- Originals and masked copies are stored separately. Jury screens only ever read masked copies, and original files can never be downloaded by jury.
- Staff can reopen masking for an application whose evaluation is not yet submitted; this is logged.
- Blind judging off: there is no masking step. Locked applications are ready for judging at once, and jury see answers and files as submitted.
- If jury notice identity information that masking missed, there is no special flow; they score normally (client decision).
- Accept when: in a blind award, no jury response ever contains an identity field or an original file, and an unmasked application cannot be opened by jury.

### 5.8 Jury pool, assignment and conflicts

- Staff and the department head both select jury for the cycle's pool: an existing user, or a new invite by email. Either can remove a pool member who has no submitted evaluation.
- Each application is assigned to exactly one jury member, never to several. A jury member can have many applications. Only staff assign applications to jury.
- Staff assign in bulk: select applications, choose a jury member. Reassigning is allowed until the evaluation is submitted; it is logged.
- Assignment is allowed any time after locking. Jury see a blind application only after it is masked.
- Disqualified applications cannot be assigned.
- Conflicts: the client says staff already know who is conflicted. To meet rule 2 at almost no cost, staff or the department head can record "jury member X has a conflict with organisation Y". Once recorded, the system refuses that assignment and hides that jury member in the assignment list. A conflict applies across all awards.
- If a conflict is recorded after assignment, the assignment is removed if the evaluation is not submitted; otherwise it is flagged for staff.
- Jury get one email per assignment action, listing how many new applications they have.
- Accept when: assigning a recorded conflict is refused by the server even if the UI is bypassed.

### 5.9 Judging a document review round

- The jury dashboard lists assigned applications per cycle with their state: not started, in progress, submitted, sent back. It shows counts (for example "6 assigned, 2 submitted").
- The scoring screen shows each question with its answer (masked copy in blind awards) and files. Under each question sit its indicators with their weights: a 0 to 10 input or a Yes/No toggle, plus an optional comment per question. A required overall note sits at the end.
- Scores save automatically as a draft. Submitting requires every indicator to have a value and the overall note to be filled.
- After submitting, the jury member cannot change scores unless the round is sent back and staff reopen that evaluation.
- The overall note is visible to staff, the department head, the leader and that jury member.
- Assumption: the jury does not see the computed total, only their own inputs. Staff, the department head and the leader see totals.
- Staff see round progress: how many evaluations are submitted out of how many assigned.
- Accept when: submit is refused with a missing indicator or empty overall note; a submitted evaluation refuses jury edits.

### 5.10 Disqualification and reinstatement

- Staff can disqualify any application in their award, and jury can disqualify an application assigned to them. A reason is mandatory.
- A disqualified application leaves assignment lists and rankings but is never deleted. Its evaluation work is kept.
- Staff can reinstate it with a mandatory reason. It returns to the state it was in, and judging can continue or be redone.
- The full history (who, when, which role, reason) is visible to staff, the department head and the leader.
- Assumption: the applicant sees nothing special; at results a disqualified application shows "Rejected".
- Accept when: disqualify without a reason is refused; reinstating restores the previous state; both events appear in the audit history.

### 5.11 Approval (document review rounds)

- Only document review rounds go to the department head. On-site rounds have no approval; staff close them (§5.16).
- Staff can "Send for approval" only when every non-disqualified application in the round has a submitted evaluation. The batch is the whole round of the cycle, and it goes to the head of the award's department.
- Before sending, staff can edit any score; a reason is required and recorded (rule 3).
- The department head sees the ranked list per entry category: each application's score, overall note, indicator details, and the disqualified list with reasons.
- The department head can approve: the round is locked and no score can ever change again.
- Or the department head can send back: an overall remark is required, and remarks on specific applications are optional. Scores stay as they are.
- After a send back, the remarks are visible to staff and to the jury of the named applications. Staff can edit scores with a reason, or reopen specific evaluations so their jury can correct and resubmit. Then staff send for approval again.
- The leader can see every round, its scores and every decision, but cannot approve, send back or edit.
- Every submission and decision is kept as history.
- Accept when: approve locks every score; a send back without a remark is refused; editing a score after approval is refused; the leader's approve or send back is refused.

### 5.12 Results of a round

- Staff decide a round's results once its scores are locked: after the department head approves a document review round, or after staff close an on-site round. Assumption: no further approval is needed for the results.
- The ranked list of a document review round is per entry category or overall. An on-site round's medals use the overall ranking of the round. Ties show the same rank, and staff decide manually.
- **Document review round:** staff give each application **Shortlisted** or **Rejected**, using top N, a minimum score or manual selection. Shortlisted applications move on to the next round, if the cycle has one.
- **On-site round:** the system suggests **Gold, Silver and Bronze** for ranks 1 to 3 of the whole round (one set per award cycle, across all entry categories; decided 6 Oct 2026) and **Participated** for the rest. Staff can change any label before publishing.
- A cycle can rename a round's labels, and mark which label moves an entry on to the next round, without any code change.
- Staff publish a round's results: applicants see their label, and emails go out. Disqualified applications show Rejected. When the last round is published, the cycle becomes Results published.
- Accept when: published results show the correct label to every applicant; nothing gets a label before the round's scores are locked; only shortlisted entries enter the following on-site round.

### 5.13 Notifications (email)

In development, emails are caught by a local mail catcher. Every email sent is also recorded in an email log.

| Event | Recipient | Content |
|---|---|---|
| Account invite | New PA, department head, staff or jury member | Link to set a password |
| Password reset | The user | Reset link |
| Application submitted | Applicant user and organisation official email | Confirmation with award and category |
| Questionnaire updated | Every applicant with a draft or submitted application in the cycle | List of new and changed questions, the deadline |
| Deadline extended | The same applicants | The new deadline |
| Jury assigned | The jury member | Count of new applications (document round), or entries with their slots (on-site panel), link |
| Presentation scheduled or moved | Applicant user and organisation official email | Date, time and venue of the presentation |
| Sent for approval | Department head of the award's department | Link to the round |
| Sent back | Staff of the award and the jury of named applications | The department head's remark |
| Results published | Applicant user and organisation official email | The status message |

### 5.14 Leadership dashboard

- The leader and the PAs see every award and cycle: status, applications by status, masking progress, judging progress, pending approvals and upcoming deadlines.
- A department head sees the same view for their department only. This is a **must have**: external organisers run their awards from it.
- It is read-only, with a drill-down to each cycle's summary.

### 5.15 Audit history

- Append-only. Application code can add records but never edit or delete them.
- Recorded events: score changes after a jury submission (old value, new value, who, when, reason); disqualify and reinstate; approval submissions and decisions with remarks; masking done and reopened; deadline changes; form versions published; assignment changes; conflicts recorded; duplicate resolutions; withdrawals; results published; departments and department heads; staff added to departments and assigned to or removed from awards; PAs created and removed; accounts deactivated and reactivated; master data changes; organisation profile edits and corrections.
- Every event stores the actor **and the role they acted in**, so the leader can see exactly what each PA did.
- A jury member's typing in a draft is not audited; their submission and every change after it are.
- Staff, the department head, the leader and PAs see an application's history on its page.

### 5.16 On-site rounds: live presentations and shop-floor competitions (built; updated 6 Oct 2026)

One round type covers both the live round 2 of large awards and shop-floor competitions such as Kaizen and 5S, whose only round is on site. Nothing in the code names either; staff choose the cycle's rounds.

- **Who takes part.** If the on-site round is the cycle's first round: every application submitted at the deadline that is not withdrawn, rejected as a duplicate or disqualified. Otherwise: the applications given a label that moves them on (by default "Shortlisted") in the previous round's published results.
- **Slots.** Staff give each entry a presentation slot (date, time, venue, optional note). The applicant user and the organisation's official email get an email, and the applicant sees "Presentation scheduled". A slot can be moved until the entry has scores; a move sends a new email.
- **Panels.** For each entry, staff choose a panel of 2 to 5 jury members (the round's panel size) from the cycle's jury pool, and can apply one panel to many entries at once. Every member is checked for recorded conflicts (rule 2). The department head of the award's department may sit on a panel.
- **Not blind.** The panel meets the team, so the on-site scoring screen shows the organisation's name, the team members and the slot. Blind judging applies to document review rounds only.
- **Scoring.** Each panel member scores on their own device (phone, tablet or laptop) against the round's score sheet: criteria with weights, 0 to 10 or Yes/No, an optional comment per criterion and a required overall note. Scores save as a draft; submitting needs every criterion and the note. A panel member never sees another member's scores.
- **Backup entry.** If a panel member can't use a device, staff can enter that member's scores from the paper sheet. The evaluation records that staff entered it on the member's behalf, and the entry is audited. After submission, every change needs a reason (rule 3).
- **Absent panel member.** Staff take them off the entry's panel with a reason. Their evaluation becomes Revoked and their draft scores are kept. An entry needs at least one submitted evaluation.
- **Final score.** The average of the submitted panel members' scores (each from the score formula, §5.5), rounded to 2 decimals. Staff, the department head, the leader and PAs see each member's score and the average; jury see only their own.
- **No approval** (client answer, 6 Oct 2026). When every active panel evaluation is submitted, staff close the round. Its scores then lock forever.
- **Results.** After closing, see §5.12: Gold, Silver and Bronze for the top three of the round, then publish.
- Assumptions: there is internet at the venue (client answer), so there is no offline mode; there is no live scoreboard, and staff watch a progress page.
- Accept when: an on-site-only cycle with no questions publishes; adding a conflicted panel member is refused; a panel member cannot read another member's scores; the final score equals the average; staff-entered scores are marked and audited; any change after closing is refused; published medals show to the applicant.

### 5.17 Leader's PA team (added 5 Oct 2026)

The leader has a personal team who take tasks from the leader, often by phone, and carry them out in the platform. The leader gives each of them access by making them a PA.

- Only the leader creates a PA (by invite) or removes one. Removing a PA ends their access at their next request, because roles are loaded on every request. Their past actions stay on record.
- A PA can do every organisational task the leader can: create departments and appoint or replace their heads; add staff to any department and assign staff to awards; create awards in any department; manage master data (§5.18); correct an organisation's record with a reason; resend invites; deactivate or reactivate accounts (never the leader's or another PA's).
- A PA sees what the leader sees: the dashboard, every award read-only, and audit history.
- A PA cannot: create or remove PAs, change their own roles, configure or publish cycles, mask, assign applications to jury, score, approve or send back rounds, or publish results. These stay with staff, jury and department heads, so the four rules keep the same owners.
- Every PA action is audited with the PA as actor and "Leader's PA" as role. The leader has a **PA activity** view: what each PA did, and when.
- Assumption: every PA has the same set of powers. Per-PA permission switches are later work.
- Accept when: a PA creates a department and appoints its head, and the audit shows the PA; a PA trying to create a PA, approve a round, edit a score or assign an application gets "forbidden"; a removed PA is refused on their next request.

### 5.18 Data consistency (added 5 Oct 2026)

Before this platform, each award kept its own records, so the same organisation, person or category was written differently in each place, and nobody could trust a combined view. The platform keeps **one clean version of shared data** and enforces it on the server.

- **One record per real thing, reused everywhere.** One organisation per PAN, one user per email address, one department per name. Awards point to these records; they never copy them.
- **Normalised on save, by the server** (the UI can help, but the server decides):
  - PAN, GSTIN and CIN: upper case, spaces removed.
  - Email addresses: trimmed and lower case.
  - Names (people, organisations, departments, awards, categories): trimmed, repeated spaces collapsed. The original letter case is kept, because legal names have their own casing.
  - Phone: stored as `+91` followed by 10 digits.
  - PIN code: exactly 6 digits.
- **Unique without regard to case**: user email; department name; award name inside a department; cycle label inside an award; entry category name inside a cycle; master data names.
- **Cross-field checks**: characters 3 to 12 of the GSTIN must equal the PAN (refused if not). The first two digits of the GSTIN are a GST state code; if it differs from the address state, the user sees a warning but may continue, because a GSTIN can belong to a branch in another state.
- **Controlled lists instead of free text (master data).** Award domains and organisation types are lists the leader and PAs manage. Indian states and union territories are a fixed list with their GST state codes. A list value is never deleted, only retired: retired values stay readable on old records but can't be picked for new ones.
- **History stays true.** At submit, the application takes a snapshot of the organisation's identity fields (name, PAN, GSTIN, address, official email, phone). The snapshot follows profile edits until the deadline and is frozen at the lock. An old application always shows the organisation as it was.
- **Statuses only change through the platform's own actions**, never by hand. Time-based statuses are worked out from the clock.
- **One active application per organisation per cycle** (§5.2), and nothing is ever hard-deleted. Corrections are new, audited records with a reason.
- Accept when: a PAN typed as `abcde 1234f` is stored as `ABCDE1234F` and joins the existing organisation; a second department called "energy " next to "Energy" is refused; a GSTIN that doesn't contain the PAN is refused; a retired award domain still shows on old awards but can't be picked for a new one; a 2025 application shows the organisation's 2025 name after the name changed in 2026.

### 5.19 Branded award sites (added 7 Oct 2026)

Award organisers (for example the team behind FPO Awards) have their own brand and websites. On this platform every award gets its **own branded site** that its staff build and change themselves, with no developer. Applies to **all** awards (decided 7 Oct 2026). See ADR 0009.

- **Brand kit (per department).** Logo, primary and accent colours, a font from a safe list, social links and footer text. The department head and department staff edit it. Every award site of the department uses it; an award site can override the colours and banner.
- **Award site (per award).** A short address name (slug, e.g. `fpo`) at `/awards/<slug>`, a **Home** page and any number of **extra pages** (for example Categories, Process, Past winners, Gallery), shown in the site's menu.
- **Pages are built from sections.** Staff decide **what to show and where**: which sections, on which page, in which order, and each section's layout choice (for example gallery as grid or slider; cards in 2, 3 or 4 columns). Section types:

  | Section | Staff fill in | Filled automatically from the platform |
  |---|---|---|
  | Banner | Title, tagline, image | Deadline, **entry count against the limit** (e.g. 499 / 500), the Apply button |
  | Rich text | Headings, paragraphs, lists, links | — |
  | Icon cards | Objectives, benefits | — |
  | Categories | Description and icon per category | Category names and fees of the open cycle |
  | Eligibility | Text and bullets | — |
  | Process / timeline | Steps | Key dates of the cycle |
  | Photo gallery | Images with captions | — |
  | Past winners | Which years and labels to show | Published results of earlier cycles |
  | Jury | Which jury members to show | Names from the jury pool; hidden in a blind award while judging runs |
  | Partners | Logos and links | — |
  | FAQ | Questions and answers | — |
  | Contacts | Names, emails | — |
  | Video | A YouTube or Vimeo link | — |

- **Publish, and change any time.** Staff edit a draft, preview it on desktop and phone, and publish. They can keep changing content and design **after publishing**; each publish creates a new immutable version (like form versions), so the live site never shows half-edited work, and an earlier version can be restored. Every publish is audited.
- **No approval** from the leader or a PA (decided 7 Oct 2026). The department is responsible for its sites. The leader and PAs can view them, not edit them.
- **Guardrails.** No custom HTML or scripts; rich text allows bold, italic, headings, lists and links only. Colours come from the brand kit, with a warning when text would be hard to read. Images are JPG, PNG or WebP up to 5 MB, re-encoded and resized for phones, and need alt text. Site images live in a **public** storage bucket, never next to applicants' private files.
- **Sharing.** Each page has a title, description and share image for search engines and social media previews.
- **The Open awards page** shows each award as a branded card (logo, banner, colours) that links to its site.
- **Own domains: designed for, not built.** Every site has a slug and an empty `customDomain` field. Later steps: a sub-domain (`fpo.<platform domain>`), then the organiser's own domain (`fpoawards.in`), added by configuration.
- Accept when: staff build a site with three pages and five section types and publish it with no developer; the deadline, categories and entry count on the site match the cycle; a change after publishing goes live only when republished, and the previous version can be restored; a script typed into rich text is shown as text, never run; the leader cannot edit a site.

### 5.20 Proof documents and the entry limit (added 7 Oct 2026)

**Proof documents** (decided 7 Oct 2026; ADR 0010):

- With **every application**, before submitting, the applicant uploads two documents and gives one link:
  - a **photo identity document**: PAN card, passport, driving licence, voter ID, or **masked** Aadhaar (only the last four digits visible; a full Aadhaar number is never accepted);
  - a **proof of employment** at the applying organisation: a company ID card, a letter on company letterhead, or an appointment letter or payslip with the salary hidden;
  - their **LinkedIn profile** link.
- **Submit is refused** without them. The application then shows **Proof: pending**.
- **Staff check** them and mark **Verified**, or **Rejected** with a reason (audited). If rejected before the deadline, the applicant is emailed and can upload new documents until the deadline. An application whose proof isn't verified **can't be assigned to jury**; staff may disqualify it with a reason.
- **Privacy (India's DPDP Act 2023).** Consent is asked at upload, with the purpose stated. The documents are seen only by the award's staff, its department head, the leader and PAs: **never by jury**, in any award. They are deleted **12 months after the cycle's results are published** (default, decided by not overriding it on 7 Oct), keeping only "Verified / Rejected on <date> by <staff>". This is a written exception to "nothing is ever hard-deleted".
- Accept when: submit without proof documents is refused; a jury response never contains a proof document; an unverified application can't be assigned; the documents are gone after the retention period while the check record stays.

**Entry limit** (decided 7 Oct 2026):

- Staff may set a maximum number of **submitted** applications per cycle (drafts, withdrawn and rejected-as-duplicate applications don't count; an organisation's flagged duplicates count once).
- The award site and the application page always show the count against the limit, for example **"499 / 500 entries submitted"**.
- When the limit is reached, submitting is refused with "This award has reached its entry limit"; drafts stay saved. Staff can raise the limit. A withdrawal frees a place. Two applicants racing for the last place can't both get it (the check and the submit happen in one transaction that locks the cycle's count).
- Accept when: the 501st submission is refused at a limit of 500; the counter shows 500 / 500; a withdrawal makes it 499 / 500 and a new submission succeeds.

## 6. The four rules: enforcement and tests

Each rule is enforced in the server's service layer, never only in the UI, and each has automated tests written from the rule itself. Each also has a known limit, stated openly.

| Rule | How it is enforced | Tests | Known limit |
|---|---|---|---|
| 1. Blind judging hides who applied | Identity section is never part of any jury response. Jury read only masked answers and masked files. Jury cannot open an application until it is masked. The file download route refuses original files for jury. | Jury response for a blind award contains no identity fields; jury downloading an original file is refused; jury opening an unmasked application is refused; staff see both copies; in a non-blind award jury see originals | Masking quality depends on staff; identity left inside a document by mistake cannot be detected. Applies to document review rounds only: an on-site panel meets the team, so on-site rounds are never blind |
| 2. No assignment with a conflict of interest | Staff or the department head record known conflicts (jury member and organisation). The assignment service refuses a conflicted pair, for document-round assignments and for every on-site panel member; the lists hide conflicted jury. | Assigning a recorded conflict is refused even through a direct API call; a conflict recorded later removes an unsubmitted assignment | A conflict staff never recorded cannot be caught (client decision: staff hold this knowledge) |
| 3. Who changed a score, and why | After a jury submission, every score change requires a reason. The change and its audit record are written in one database transaction. Audit records are append-only. Approved document rounds and closed on-site rounds refuse all changes. Scores staff enter on a panel member's behalf are recorded as such. | A change without a reason is refused; a change writes old value, new value, actor, time, reason; a failed audit write rolls back the score change; any change after approval or after closing an on-site round is refused | Draft scores before the first submission are not audited, by design |
| 4. Last year's applications still read correctly | Published form versions are immutable. Answers are stored by stable question key. Each application pins the version it was locked with and always opens with it. | Editing a published version is refused; removing a question inside a cycle is refused; a 2025 application opens with its 2025 version after 2026 drops questions; answers carry over between versions inside a cycle | Removing a question still requires a new cycle, by design |

## 7. User journeys through one award cycle

Each journey starts from the person's real day, then lists what they do in the system, in order.

### Leader

The single top authority, who sets up the structure, delegates the day-to-day organisational work to a personal team, and watches everything without changing judging data.

- Creates PA accounts for the personal team; from now on gives them tasks, often over a call.
- Creates a department and appoints its department head (or asks a PA to).
- Opens the dashboard: every award and cycle, applications by status, masking and judging progress, rounds waiting for approval, deadlines.
- Opens any award to read its applications, scores, notes and decisions; nothing can be edited.
- Checks the PA activity view to see what each PA did.

### Leader's PA

A member of the leader's personal team. Gets tasks from the leader during the day and carries them out.

- Accepts the invite and sets a password.
- After a call with the leader: creates the new "Water Conservation" department and appoints its head.
- Adds a staff member to two departments and assigns them three awards.
- Creates a new award in a department for its staff to configure.
- Adds a new award domain to the master data list, and retires a misspelt one.
- Fixes an organisation's legal name that was entered wrongly, giving a reason.
- Deactivates the account of a staff member who left, after moving their awards to someone else.
- Follows the dashboard and reports back to the leader.

### Department head

The second-level leader: decides who runs the department's awards and has the final say on their judgements.

- (External organiser) Is appointed department head of the organiser's department by the leader or a PA, then runs everything alone.
- Sets the department's brand kit: logo, colours, font, social links.
- Adds staff to the department and assigns them to awards.
- Selects jury for each cycle's pool together with staff.
- Follows the department's awards on the dashboard.
- Gets an email that a round is ready. Opens the ranked list, reads scores, overall notes and the disqualified list.
- Approves, or sends back with a remark and optional remarks on specific applications.
- Sometimes sits on an on-site panel and scores presentations like any other juror.
- After a send back, reviews the resubmitted round and approves.

### Staff

Works in the system every day while a cycle runs.

- Sees all the awards assigned to them, possibly in several departments, on "My awards".
- Creates the award in their department (or picks up one a PA created), then its 2026 cycle.
- Sets dates, entry categories, fee and blind judging.
- Builds the questionnaire section by section.
- Builds the scoring sheet: indicators on questions, weights per section and indicator, until every total is 100%.
- Selects jury for the pool together with the department head, and records known conflicts.
- Builds the award site: picks sections (banner, categories, gallery, past winners, FAQ…), places them on the Home page and extra pages, previews on phone and desktop.
- Publishes the cycle and the site. The award appears on the Open awards page as a branded card. Keeps improving the site later and republishes; the previous version can be restored.
- Checks each application's proof documents and marks them Verified or Rejected.
- Watches applications arrive; resolves duplicate flags by contacting the organisation.
- Adds a question mid-cycle; the system emails applicants and marks the new question in their forms. Extends the deadline if needed.
- After the deadline, masks applications one by one (blind awards only).
- Assigns each masked application to exactly one jury member.
- Tracks judging progress; disqualifies a fake application with a reason; reinstates one disqualified by mistake.
- Corrects a score with a reason, then sends the round to the department head for approval.
- If sent back, reads the remark, fixes scores or reopens evaluations for jury, and resubmits.
- After approval, builds the shortlist and publishes results.
- For an on-site round: gives each entry a presentation slot (the applicants get an email) and a panel of 2 to 5 jury; on the day, watches the progress page and enters a panel member's scores from paper if their device fails; takes an absent member off a panel with a reason; closes the round when every panel member has submitted.
- Reviews the suggested Gold, Silver and Bronze (the top three of the round), settles any ties, and publishes.

### Applicant user

Comes once or twice a year, close to the deadline, with a long form and evidence to collect.

- Registers, then creates the organisation profile (PAN, GSTIN, address, official email, phone; state and organisation type from lists) or joins it with PAN and GSTIN.
- Browses Open awards and picks one and an entry category.
- Pays the fee on the demo payment screen, if there is one.
- Finds the award through its branded site, sees how many places are left ("499 / 500").
- Fills the form over several sittings; autosave keeps everything.
- Uploads a photo identity document and a proof of employment, and adds a LinkedIn profile link, before submitting.
- Submits and gets a confirmation email.
- Gets an email that questions changed; updates the highlighted questions before the deadline.
- Sees the status: Pending, Submitted, Under review.
- After results: Shortlisted ("we will contact you soon by email") or Rejected ("better luck next time").
- If shortlisted for an on-site round, or entering a shop-floor competition (which may have almost no form beyond the organisation's details and team members): gets an email with the presentation slot, presents on the day, then sees Gold, Silver, Bronze or Participated.

### Jury member

A senior expert who scores in short gaps between other work.

- Receives an invite, sets a password, then gets an email: "6 applications assigned to you."
- Opens the dashboard and the first application: the masked answers, files and the indicator sheet with weights.
- Enters marks, adds comments on some questions, and stops halfway; everything is saved.
- Returns later, finishes, writes the overall note, submits.
- Disqualifies an obviously fake application with a reason.
- If the department head sends back their application, reads the remark, corrects scores and resubmits.
- On-site: gets an email listing the entries on their panel and the slots. At the venue, opens each entry on a phone or tablet while the team presents, scores the criteria, writes the overall note and submits. They never see the other panel members' scores.

## 8. High-level architecture

The platform is a modular monolith: one Next.js app and one PostgreSQL database, with the code split into modules behind a single access layer. Award settings live in the database as versioned configuration, and every row is tied to its cycle, so all awards share tables without sharing data.

*[Diagram in the original docx: high-level architecture · one app, one access layer, 12 modules, 3 stores. Superseded by ADR 0001 for the frontend/backend split; a plain-language drawing is in docs/overview/README.md §8.]*

The access layer is the one place where identity, scope, blind judging and conflicts are checked, so no screen or route can skip them.

### Why a modular monolith

- One builder, 10 days, one client, about 40,000 applications a year: nothing here needs separate services.
- Microservices were turned down: they add deployment, networking and debugging cost with no benefit at this size.
- Module boundaries are strict (each module owns its service, access checks and views), so any module could be split out later if a real need appears.

### Where each award's settings live

| Setting | Stored in | Can change |
|---|---|---|
| Name, domain, department | Award row | By staff at creation |
| Dates, fee, blind judging, status | Cycle row | Dates until masking starts; fee and blind fixed after publish |
| Entry categories | EntryCategory rows | Before publish |
| Questionnaire | FormVersion rows, one immutable JSON snapshot per publish | New version until the deadline; additions and edits only |
| Indicators and weights | ScoringSheet per round, JSON | Until the first score is saved |
| Rounds, their order, result labels and panel size | Round rows (type DOCUMENT_REVIEW or ON_SITE) | Before publish |
| Fee per entry category | EntryCategory rows (optional fee) | Before publish |
| Entry limit | Cycle row (maxEntries) | Any time; never below the current count |
| Brand (logo, colours, font, links) | BrandKit row per department | Any time |
| Award site pages and sections | AwardSite, SitePage (draft) and SitePageVersion rows (published, immutable) | Any time, by republishing |
| Award domains, organisation types (shared by all awards) | AwardDomain and OrganisationType rows (master data) | By the leader or a PA; retired, never deleted |

Every configuration is checked by a Zod schema before saving, and publishing is refused if anything is invalid. Code reads behaviour from these settings, for example cycle.blindJudging, and never names an award.

### How one award's data stays apart from another's

| Option | How it works | Decision |
|---|---|---|
| A database per award | 80 databases | Turned down: the leader's cross-award view becomes hard; heavy to run for one client |
| Tables per award | kaizen_applications and so on | Turned down: a new award would need a database change, which breaks "no developer needed" |
| Shared tables, every row tied to its cycle, access enforced in one layer | application.cycleId on every row | Chosen: simple; supports the cross-award view; a new award is only new rows |

Shared tables are safe only when the separation is enforced. Four safeguards do that:

- Foreign keys tie every award-related row to its cycle, so the database refuses mixed-up or orphan rows.
- Role assignments carry a scope: "staff of award X", "jury of cycle Y", never just "staff" or "jury".
- Route handlers never query the database. They call service functions that apply the actor's scope to every query, so a forgotten filter has no path to happen.
- Each role gets its own view model. In a blind award the jury view is built from masked data only, so identity never leaves the server.

Later, PostgreSQL row-level security could add a second safety net inside the database. If other client bodies ever use the platform, an organisation level would sit above awards; that would be true multi-tenancy, which this version does not need.

### One request end to end

A jury member opens a blind application:

- The session gives the actor.
- The judging service checks that this evaluation belongs to the actor in this cycle; otherwise it answers "not found".
- It checks the application is masked and not disqualified.
- It loads the masked answers, masked files and the round's scoring sheet.
- It builds the jury view, with no identity section, and returns it.

Staff correct a score after submission:

- The service checks the actor is staff of this cycle and the round is not approved.
- A reason is required.
- In one transaction it updates the score and inserts an audit event with the old value, new value, actor, time and reason. If either write fails, both are undone.

### Where the model breaks

- Identity left inside an uploaded document depends on staff masking it.
- On-site rounds need internet at the venue; there is no offline mode.
- Team members are only listed on the entry; they don't get accounts of their own.
- An award needing an extra step between rounds, such as a site visit, needs a new round type.
- Proof that an applicant may act for their organisation: with no authorisation letter, membership through PAN and GSTIN (or official email) is taken on trust for now (§5.2).

## 9. Tech stack

> Partly superseded: the framework, login, files and hosting rows are replaced by ADR 0001, 0002 and 0003 (two apps: Next.js on Vercel, Express API on Render, Supabase).

The stack is Next.js with TypeScript on PostgreSQL, using Prisma. It keeps one codebase and one deployable, fits the builder's TypeScript and React skills, and gives the database guarantees that rules 2, 3 and 4 depend on. Check each library's current stable version at setup and pin it.

| Layer | Choice | Why | Turned down |
|---|---|---|---|
| Framework | Next.js (App Router), TypeScript in strict mode | UI and server in one codebase; route handlers feel like Express | Separate Express API plus React app: two deployables and more glue for one person in 10 days |
| Database | PostgreSQL | Foreign keys, unique constraints and transactions protect the rules; JSONB stores flexible form and scoring schemas | MongoDB: flexible, but weaker guarantees for audit transactions and relations |
| Data access | Prisma | Typed queries, migrations, seed script | Drizzle: equally good; Prisma is more familiar |
| Validation | Zod | One schema checks API input, forms and award configurations | Hand-written checks |
| Login | Auth.js with email and password | Runs inside Next.js; roles stay in our own database | Clerk or another hosted service: external dependency, less control over roles |
| UI | Tailwind CSS, shadcn/ui, React Hook Form | Fast, consistent screens; React Hook Form handles large dynamic forms | A heavy component suite |
| Files | A storage interface: local disk in development, S3-compatible storage in production | Swap storage without touching modules | Storing files inside the database |
| Email | Nodemailer; Mailpit catches mail in development | See every email locally without sending real mail | A paid provider during the build |
| Tests | Vitest against a real PostgreSQL; Playwright for end-to-end journeys | Rule tests must hit the real database, transactions and constraints | Mocking the database |
| Local setup | Docker Compose: PostgreSQL and Mailpit | A stranger runs it with one command | Manual installs |
| CI | GitHub Actions: lint, type check, tests with a PostgreSQL service | Every pull request proves itself |   |
| Hosting | Vercel with a managed PostgreSQL (Neon or Supabase), or one container on Railway or Render | Low setup cost; final choice recorded as a decision | Self-managed server |
| Background jobs | None in this version | Locking is computed from time; emails send during the request | A job queue: not needed at this size |

What would change this choice: if award configurations became so varied that nearly everything lived in JSON and relational rules mattered less, MongoDB would become reasonable. If a mobile app needed the same API, a separate API service would be worth its cost.

## 10. Data model

All awards share the same tables. Every award-related row carries its cycle (and through it, its award), and foreign keys stop rows from mixing across awards. Money is stored as integer paise, times in UTC, and nothing an applicant, jury member or staff member produced is ever hard-deleted.

### Entities

| Entity | Key fields | Constraints and notes |
|---|---|---|
| User | id, email, name, passwordHash, sessionVersion, deactivatedAt? | email stored lower case and unique. Deactivated users cannot log in |
| Department | id, name | name unique without regard to case |
| RoleAssignment | userId, role (LEADER, LEADER_PA, DEPT_HEAD, DEPT_STAFF, AWARD_STAFF, JURY), departmentId?, awardId?, cycleId?, grantedById, revokedAt? | Leader and LEADER_PA have no scope; dept head → department; dept staff → department (may create awards there); award staff → award (a user may hold many); jury → cycle. Unique per user, role and scope among active rows. LEADER_PA rows are granted only by the leader. Removing a role sets revokedAt; rows are kept |
| Organisation | id, legalName, pan, gstin?, addressLine, city, stateCode, pincode, officialEmail, phone, orgTypeId?, cin?, website? | pan unique (stored upper case); GSTIN optional, and when present its characters 3 to 12 equal PAN; stateCode from the fixed list of states; values normalised on save (§5.18) |
| OrganisationMember | organisationId, userId | Unique pair |
| Award | id, name, domainId, departmentId, description, createdById | Unique (departmentId, name) without regard to case; domainId → AwardDomain |
| Cycle | id, awardId, label, opensAt, deadlineAt, feePaise, blindJudging, maxEntries?, status, draftFormSchema | Unique (awardId, label). draftFormSchema holds unpublished edits |
| EntryCategory | id, cycleId, name, feePaise? | Unique (cycleId, name) without regard to case. feePaise overrides the cycle's fee when set |
| FormVersion | id, cycleId, version, schema (JSONB), changeSummary, publishedAt, publishedById | Unique (cycleId, version). Never updated after insert |
| Round | id, cycleId, number, type (DOCUMENT_REVIEW, ON_SITE), status, resultLabels (JSONB: label, advances?), panelMin?, panelMax?, closedAt?, closedById? | Unique (cycleId, number). Panel size only for ON_SITE (default 2 to 5) |
| PresentationSlot | id, roundId, applicationId, startsAt, venue, note?, scheduledById | ON_SITE rounds only. Unique (roundId, applicationId); moves are audited |
| RoundResult | id, roundId, applicationId, finalScore, rank, resultLabel, decidedById, publishedAt? | Unique (roundId, applicationId). finalScore is the one evaluation's score (document round) or the panel average (on-site). Snapshot taken when scores lock |
| ScoringSheet | id, roundId, schema (JSONB), lockedAt | One per round; locked after the first saved score. In ON_SITE rounds criteria carry no questionKey |
| Application | id, cycleId, organisationId, createdById, categoryId, formVersionId, status, maskingStatus, duplicateFlag, updateRequested, identitySnapshot (JSONB), submittedAt, lockedAt, withdrawnAt, withdrawReason | One active per organisation per cycle, checked in the service (flagged duplicates are allowed). identitySnapshot is taken at submit and frozen at the lock. Also: linkedinUrl, proofStatus (PENDING, VERIFIED, REJECTED), proofCheckedById?, proofCheckedAt?, proofNote? (§5.20) |
| Answer | applicationId, questionKey, value (JSONB), updatedAt | Unique (applicationId, questionKey) |
| MaskedAnswer | applicationId, questionKey, value (JSONB), maskedById, maskedAt | Unique (applicationId, questionKey) |
| FileAsset | id, applicationId, questionKey?, kind (EVIDENCE, MASKED_EVIDENCE, IDENTITY_PROOF, EMPLOYMENT_PROOF), maskedFromId?, storageKey, fileName, mimeType, sizeBytes, uploadedById, purgedAt? | Jury may read only MASKED_EVIDENCE in blind awards, and **never** a proof document. Proof files are deleted after the retention period; the row stays with purgedAt |
| Payment | id, applicationId, amountPaise, status, reference, paidAt | Demo only |
| Conflict | id, juryUserId, organisationId, note, recordedById, createdAt | Unique (juryUserId, organisationId); applies across all awards |
| Evaluation | id, roundId, applicationId, juryUserId, status (ASSIGNED, IN_PROGRESS, SUBMITTED, REDO, REVOKED), overallNote, submittedAt, enteredById?, revokedReason? | Unique (roundId, applicationId, juryUserId). The service allows exactly one active evaluation per application in a DOCUMENT_REVIEW round, and panelMin to panelMax in an ON_SITE round. enteredById is set when staff typed the scores on the juror's behalf |
| IndicatorScore | evaluationId, indicatorKey, value, updatedAt | Unique (evaluationId, indicatorKey); value a whole number 0 to 10, or 0/1 for Yes/No |
| QuestionComment | evaluationId, questionKey, comment | Unique (evaluationId, questionKey) |
| ApprovalRequest | id, roundId, submittedById, submittedAt, decision (PENDING, APPROVED, SENT_BACK), decidedById, decidedAt, remark | One row per submission; history kept |
| ApprovalRemark | approvalRequestId, applicationId, remark | Optional remarks on specific applications |
| DisqualificationEvent | id, applicationId, action (DISQUALIFY, REINSTATE), byUserId, byRole, reason, createdAt | Current state = latest event |
| AuditEvent | id, actorId, actorRole, action, entityType, entityId, cycleId, before (JSONB), after (JSONB), reason, createdAt | Insert only; indexed by (cycleId, entityType, entityId) |
| EmailLog | id, to, template, payload, status, createdAt |   |
| AwardDomain | id, name, retiredAt? | Master data. name unique without regard to case; retired, never deleted |
| OrganisationType | id, name, retiredAt? | Master data. Same rules as AwardDomain |
| BrandKit | id, departmentId, logoAssetId?, primaryColour, accentColour, fontKey, socialLinks (JSONB), footerText, updatedAt | One per department |
| AwardSite | id, awardId, slug, status (DRAFT, PUBLISHED, UNPUBLISHED), themeOverrides (JSONB), customDomain?, publishedAt? | One per award; slug unique regardless of case; customDomain designed for, unused |
| SitePage | id, siteId, slug, title, navOrder, showInNav, draftSections (JSONB), draftSeo (JSONB) | Unique (siteId, slug) |
| SitePageVersion | id, pageId, version, sections (JSONB), seo (JSONB), publishedAt, publishedById | Unique (pageId, version); never updated after insert, like FormVersion |
| MediaAsset | id, departmentId, storageKey, fileName, mimeType, sizeBytes, width, height, altText, uploadedById, createdAt | Site images in the **public** bucket; images only |

### Questionnaire schema (stored in FormVersion.schema)

Keys are generated by the system and never change or get reused. The identity section is fixed by the system and is not part of this schema.

```json
{
  "sections": [
    {
      "key": "sec_k3f9",
      "title": "Environment",
      "description": "Your environmental work in the last year",
      "questions": [
        {
          "key": "q_8d2a",
          "type": "LONG_TEXT",
          "label": "Describe your tree plantation work",
          "helpText": "Species, numbers and locations",
          "required": true,
          "change": "UNCHANGED"
        },
        {
          "key": "q_1b7c",
          "type": "FILE",
          "label": "Upload plantation evidence",
          "required": false,
          "file": {
            "maxFiles": 5,
            "types": [
              "pdf",
              "jpg",
              "png"
            ],
            "maxSizeMb": 10
          },
          "change": "NEW"
        }
      ]
    }
  ]
}
```

The change field (NEW, UPDATED, UNCHANGED) is computed against the previous version when publishing, so the form can mark changed questions for applicants.

### Scoring sheet schema (stored in ScoringSheet.schema)

```json
{
  "sections": [
    {
      "sectionKey": "sec_k3f9",
      "weight": 40,
      "indicators": [
        {
          "key": "ind_o2",
          "questionKey": "q_8d2a",
          "label": "Oxygen efficiency of trees",
          "type": "SCORE_0_10",
          "weight": 60
        },
        {
          "key": "ind_shade",
          "questionKey": "q_8d2a",
          "label": "Shade provided",
          "type": "SCORE_0_10",
          "weight": 30
        },
        {
          "key": "ind_native",
          "questionKey": "q_8d2a",
          "label": "Native species used",
          "type": "YES_NO",
          "weight": 10
        }
      ]
    }
  ]
}
```

Weights are whole-number percentages. Section weights add up to 100, and indicator weights inside each section add up to 100. In an ON_SITE round's sheet, sections have their own `key` and `title` instead of `sectionKey`, and criteria have no `questionKey`.

### Field types in the questionnaire

SHORT_TEXT, LONG_TEXT, NUMBER, DATE, SINGLE_CHOICE (with options), MULTI_CHOICE (with options), YES_NO, FILE, TEAM_MEMBERS (list of name and designation; treated as identity in blind document rounds).

## 11. Access control, services and API conventions

Every read and write goes through a service function that receives the acting user first and checks permission and scope itself. Route handlers and server actions stay thin; they never touch the database directly.

### Layers

- Screen (page or component): shows data, collects input.
- Server action or route handler: parses input with Zod, gets the actor from the session, calls one service function, maps errors to responses.
- Service (one per module): checks permission and scope, applies business rules, runs transactions, writes audit events, returns a view model.
- Database through Prisma: every query on award data filters by the cycle or award the actor is allowed to touch.

### Conventions

- The actor object holds the user id and all role assignments. Every service function takes it as its first argument, for example scoreIndicator(actor, evaluationId, indicatorKey, value, reason?).
- Permission helpers live in each module's access file, for example requireStaffOfCycle(actor, cycleId) and requireAssignedJury(actor, evaluationId).
- View models are explicit: applicantView, juryView, staffView, leaderView (also used for PAs). Raw database objects never reach the browser. In a blind award, juryView is built only from masked answers and masked files.
- Typed errors map to responses: ValidationError → 400, ForbiddenError → 403, NotFoundError → 404, StateError (wrong status, past deadline, approved round) → 409. A jury member asking for an application not assigned to them gets 404, so its existence is not revealed.
- Transactions are required for: a score change plus its audit event; an approval decision plus the round status; masking done plus the application status; resolving a duplicate.
- File downloads go through one route that checks the actor may read that file and that file kind.
- Time comes from one clock helper, so tests can move past a deadline.
- No code branches on a specific award. Behaviour comes only from configuration such as cycle.blindJudging or cycle.feePaise. Code review checks this on every pull request.

### Main service operations

| Module | Operations | Who |
|---|---|---|
| Identity | register, login, inviteUser, resetPassword, assignRole | Public, leader, PA, dept head, staff |
| Identity | invitePA, removePA | Leader only |
| Identity | resendInvite, deactivateUser, reactivateUser | Leader, PA |
| Departments | createDepartment, appointDepartmentHead | Leader, PA |
| Departments | addStaffToDepartment, assignStaffToAward, removeStaffFromAward | Dept head (own), leader, PA (any) |
| Master data | listAwardDomains, listOrganisationTypes | Everyone |
| Master data | createValue, renameValue, retireValue | Leader, PA |
| Organisations | createOrganisation, joinOrganisation, getOrganisation, updateOrganisation | Applicant (member) |
| Organisations | correctOrganisation (with a reason) | Leader, PA |
| Awards | createAward | Staff (own dept), leader, PA (any dept) |
| Awards | createCycle, updateCycleSettings, publishCycle, extendDeadline | Staff |
| Forms | editDraftForm, publishFormVersion, getFormVersion, diffVersions | Staff (read: applicant, jury) |
| Scoring | editScoringSheet, validateWeights, computeScore | Staff (read: jury) |
| Applications | startApplication, payFee (demo), saveAnswers, uploadFile, uploadProof, submit, withdraw, resolveDuplicate | Applicant, staff |
| Applications | checkProof (Verified or Rejected with a reason), entryCount | Staff (entryCount: public) |
| Sites | editBrandKit, createSite, editPageDraft, uploadImage, previewPage, publishPage, restoreVersion, unpublishSite | Department head and staff (brand kit: department head and department staff) |
| Sites | getPublishedSite, getPublishedPage | Public |
| Masking | getMaskingWorkspace, saveMaskedAnswer, uploadMaskedFile, markMaskingDone, reopenMasking | Staff |
| Jury pool | addPoolMember, removePoolMember, recordConflict | Staff, dept head |
| Judging | assign, reassign | Staff only |
| Judging | saveScores, submitEvaluation, disqualify | Jury (assigned; also on-site panel members) |
| Judging | reopenEvaluation, editScoreWithReason, disqualify, reinstate | Staff |
| On-site | scheduleSlot, moveSlot, setPanel, removePanelMember, enterScoresOnBehalf, roundProgress, closeRound | Staff |
| Approval | sendForApproval (document rounds) | Staff |
| Approval | approve, sendBack | Dept head |
| Results | rankRound, suggestLabels, setResultLabels, publishResults | Staff |
| Reporting | leaderDashboard, departmentDashboard, cycleSummary, awardReadOnlyView | Leader, PA, dept head |
| Reporting | paActivity | Leader |
| Audit | listHistory | Leader, PA, dept head, staff |

## 12. Screens

The app has about 38 screens grouped by role. Each role sees only its own area after login.

| Area | Screen | Purpose |
|---|---|---|
| Public | Open awards | Published awards as branded cards (logo, banner, colours) with deadline and fee |
| Public | Award site | The award's own branded pages built from sections, with the entry count and the Apply button |
| Public | Login, register, forgot password | Account access |
| Applicant | My organisation | Create, or join with PAN and GSTIN; edit profile (state and type from lists) |
| Applicant | My applications | Each application with its applicant-facing status |
| Applicant | Payment (demo) | Shows the fee; "Pay" unlocks the form |
| Applicant | Application form | Sections, autosave, progress, New and Updated markers, submit |
| Applicant | Application status | Status message and dates; presentation slot; result label; withdraw before deadline |
| Staff | My awards | Every award and cycle assigned to them, across departments |
| Staff | Create award | Name, domain and description, in one of their departments |
| Staff | Cycle setup | Tabs: basics and dates, entry categories, questionnaire builder, scoring sheet builder, settings (fee, blind, rounds), publish |
| Staff | Applications | List with filters: status, category, duplicate flag, proof status, masking status |
| Staff | Proof check | Each application's identity and employment documents and LinkedIn link; Verified or Rejected with a reason |
| Staff | Site builder | Pages and sections: add, arrange, choose layouts, fill in; preview on phone and desktop; publish; version history and restore |
| Department head | Brand kit | Logo, colours, font, social links, footer |
| Staff | Application detail | Original and masked copies, files, identity snapshot, history |
| Staff | Masking workspace | Original beside masked copy; file masking; mark done |
| Staff | Jury pool and conflicts | Select jury together with the department head; record conflicts |
| Staff | Assignment | Assign each application to one jury member; reassign |
| Staff | Judging progress | Submitted out of assigned; open evaluations; edit score with reason |
| Staff | Approval | Send for approval to the department head; read remarks; resubmit |
| Staff | On-site schedule and panels | Slot per entry; panel of 2 to 5 per entry, in bulk; conflicted jury hidden |
| Staff | On-site progress | Per entry: panel members and their status; enter scores on a member's behalf; remove an absent member; averages; close the round |
| Staff | Results | Ranked list per category; Shortlisted or Rejected (top N, cut-off or manual); suggested Gold, Silver, Bronze; publish |
| Jury | My assignments | Applications per cycle with progress |
| Jury | Scoring | Answers and files, indicators with weights, question comments, overall note, submit, disqualify |
| Jury | On-site scoring | Phone-friendly: the entry's organisation, team and slot; criteria with weights; overall note; submit |
| Department head | Department awards | Awards in the department and their progress |
| Department head | Staff | Add staff to the department; assign them to awards |
| Department head | Jury pool | Select jury for a cycle together with staff |
| Department head | Approval queue | Rounds waiting for a decision |
| Department head | Round review | Ranked list, notes, disqualified list; approve or send back with remarks |
| Leader and PA | Dashboard | Every award and cycle with progress, approvals and deadlines |
| Leader and PA | Departments | Create departments; appoint or replace department heads |
| Leader and PA | People | Find any user; add staff to departments; assign staff to awards; resend invites; deactivate or reactivate |
| Leader and PA | Awards | Create an award in any department; award view (read-only) with its applications, scores, notes and decisions |
| Leader and PA | Master data | Award domains and organisation types: add, rename, retire |
| Leader and PA | Organisations | Find an organisation; correct its record with a reason; see its history |
| Leader only | PA team | Invite or remove PAs |
| Leader only | PA activity | What each PA did, newest first |

## 13. Non-functional requirements

The load is small for a single PostgreSQL database, so the design favours correctness and simplicity over scaling machinery.

| Area | Requirement |
|---|---|
| Volume | About 80 awards × 300 to 500 applications = 24,000 to 40,000 applications a year. The largest award: 500 applications × 250 indicators = about 125,000 scores per round |
| Peak load | The days before a deadline; assume a few hundred applicants online at once. No caching layer needed |
| Speed | Typical pages load in under 2 seconds; autosave never blocks typing |
| Files | PDF, JPG, PNG, DOCX, XLSX; 10 MB per file; stored outside the web root; served only through the checked download route |
| Security | Hashed passwords; every permission checked on the server; all input validated with Zod; secrets only in environment variables, with a committed .env.example |
| Privacy | PAN, GSTIN, address and contact details visible only to the organisation's own users, to staff and the department head of that award, and to the leader and PAs. Proof documents: the same people, never jury; deleted 12 months after results (§5.20, India's DPDP Act 2023) |
| Public sites | Award sites load fast on phones (cached, images resized) and have share previews for search and social media |
| Data consistency | One record per organisation, user and department; values normalised on save; controlled lists; case-insensitive uniqueness; identity snapshots on applications (§5.18) |
| Time | Stored in UTC, shown in India time (Asia/Kolkata); a deadline closes at its exact configured time |
| Data keeping | Applications, evaluations, disqualifications and audit events are never hard-deleted |
| Devices | Responsive layout: jury and staff work on laptops and tablets; applicants mostly on laptops; the on-site scoring screen works on a phone. Internet at venues is assumed (no offline mode) |
| Accessibility | Labelled form fields, keyboard navigation, readable contrast |
| Browsers | Current Chrome, Edge, Firefox and Safari |
| Backups | Managed database backups in production |

## 14. Scope for the 10-day build

With about 40 working hours, the build covers the full cycle at its core and cuts depth, not steps. The priorities below decide what drops first if time runs short.

### Must have

- Branded award sites with the page builder (§5.19), the brand kit, and branded cards on Open awards.
- Proof documents with every application and the staff check; the entry limit with its public counter (§5.20).
- The department head's dashboard (external organisers run their awards from it).
- Login and roles with scopes; a seeded leader, with PAs, departments, department heads, staff and jury created through the hierarchy.
- The leader's PA role with its permissions and the PA activity view (§5.17).
- Data consistency rules: normalisation, case-insensitive uniqueness, controlled lists for award domains, organisation types and states, identity snapshots (§5.18).
- Organisation profile with PAN and GSTIN checks.
- Departments and department heads (leader or PA), staff assignment to many awards (department head, leader or PA), award and cycle setup (staff), all in the UI.
- Questionnaire builder and immutable form versions (rule 4).
- Scoring sheet builder with weight validation and the score formula.
- Applicant flow: demo fee, dynamic form, autosave, submit, edit until deadline, withdraw.
- Deadline locking and the masking workspace (rule 1).
- Jury pool, conflicts and assignment (rule 2).
- Scoring, overall note, submit, staff edits with reason, audit history (rule 3).
- Approval by the department head: send for approval, approve, send back with remarks, resubmit.
- Shortlist and publish results.
- On-site rounds (§5.16): slots, panels of 2 to 5, independent panel scoring, staff backup entry, averages, closing, and Gold, Silver and Bronze results.
- Three seeded cycles with clearly different settings (blind document review with a fee; document review then on-site with medals; shop-floor on-site only), plus one more configured live in the UI during the walkthrough.

### Should have

- Duplicate flagging and resolution.
- Disqualify and reinstate.
- Emails for: questionnaire updated, jury assigned, results published (others if time allows).
- Leader and PA dashboard with basic counts.
- Master data screens (until built, the lists come from the seed).
- Organisation record correction and account deactivation screens.

### Could have

- Leader drill-down screens beyond the dashboard.
- Remaining email templates.
- Reminders the PAs can send: to department heads with rounds waiting for approval, and to jury with unfinished evaluations.
- Export of cross-award reports as CSV for the leader.
- A "possible duplicate organisations" list for PAs (same name, different PAN) to clean up.

### Designed for, not built (room kept)

- A live scoreboard for on-site rounds.
- Several jury members per application in a document review round.
- Copying last year's cycle setup.
- Transferring an application to another member of the organisation.
- More organisation fields.
- Own domains for award sites: a sub-domain first, then the organiser's own domain (slug and customDomain field already stored).
- Drag-and-drop free layout, uploaded custom fonts, and page-visit analytics for award sites.
- Per-PA permission switches.

### Out of scope

- Real payment gateway and refunds.
- Automatic removal of names from documents.
- Integration with the client's member portal or single sign-on.
- Importing past cycles' data.
- Multiple languages, a mobile app, feedback reports for applicants.
- Virus scanning of uploads.
- Offline scoring at venues without internet.
- Booking of presentation slots by applicants.

## 15. Testing strategy

Tests for each rule are written on the day that rule is built, against a real PostgreSQL database, and CI runs all of them on every pull request.

### Levels

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Score formula, weight validation, PAN and GSTIN checks, version diff (New, Updated) |
| Service | Vitest with a test database | The four rules, status transitions, permissions, transactions |
| End to end | Playwright | Three journeys: staff configures and publishes; applicant pays, fills and submits; jury scores and staff gets approval |

### What the tests check

- Rule 1: no identity field or original file in any jury response for a blind award; unmasked applications refused to jury.
- Rule 2: a recorded conflict blocks assignment through the service, not only the UI.
- Rule 3: score changes after submission need a reason, write an audit event in the same transaction, and fail after approval.
- Rule 4: published versions refuse edits; question removal refused inside a cycle; old applications open with their pinned version.
- Duplicates flagged per organisation per cycle; withdrawn applications ignored.
- Writes refused after the deadline; deadline extension reopens editing.
- Fee gating: the form stays locked until payment is recorded.
- Approval (document rounds): allowed only when every evaluation is submitted; send back requires a remark; approval locks scores.
- On-site rounds: a conflicted panel member is refused; a panel member can't read another's scores; the final score is the average; staff-entered scores are marked and audited; closing needs every active evaluation submitted; nothing changes after closing; only shortlisted entries take part in a following on-site round; an on-site-only cycle publishes with an empty questionnaire.
- Award sites: publish needs no developer; automatic sections match the cycle; republish replaces the live version and restore works; scripts in rich text are never run; the leader can't edit a site.
- Proof documents: submit refused without them; never in any jury response; unverified applications can't be assigned; documents deleted after the retention period.
- Entry limit: refused past the limit; counter correct; a withdrawal frees a place; no overfill when two submit at once.
- Results: no label before scores lock; suggested medals go to ranks 1 to 3 of the whole round; published labels show correctly to applicants.
- Disqualify and reinstate require reasons and restore the previous state.
- Permissions: each role refused outside its scope; the leader and PAs refused on every judging write (cycle setup, masking, assignment, scores, approval, results); only the leader creates or removes PAs; a removed PA is refused; only staff can assign applications to jury.
- Data consistency: values are normalised on save; case-insensitive duplicates are refused; a GSTIN without the PAN is refused; retired list values stay readable but can't be picked; an application keeps its identity snapshot after the profile changes.

### What the tests do not check

- Whether staff masked documents well; that is a human task.
- Real email delivery to inboxes; only that emails are created and logged.
- Load and performance under real traffic.
- Browsers other than Chromium in end-to-end tests.
- Security beyond permission checks (no penetration testing).
- The content of uploaded files.

### Test data

A seed script creates: two departments; one leader, one PA, one department head per department, two staff (one of them on awards in both departments), four jury members; the master data lists; three cycles with different settings (one blind document review with a fee and 3 sections; one non-blind and free with entry categories, a document round then an on-site round; one shop-floor competition, on-site only, with a near-empty form); about 20 organisations and applications in mixed states; one recorded conflict.

## 16. Repository, workflow and conventions

The repository is the single source of truth: code, plan, decisions, daily log and this specification all live in it, so the reviewer can open it at any moment and see where things stand.

### Folder structure

```
/
├─ docs/
│  ├─ requirements.md        this specification
│  ├─ plan.md                current plan; every change noted at the top
│  ├─ daily-log.md           done, next, stuck — one entry per day
│  ├─ questions.md           questions asked, answers, defaults
│  ├─ decisions/             one file per decision: 0001-tech-stack.md …
│  ├─ architecture.md        drawing and explanation
│  ├─ user-journeys.md       one page, every role
│  ├─ testing.md             what tests check and do not check
│  └─ ai-notes.md            where AI output looked right but was wrong
├─ prisma/                   schema.prisma, migrations/, seed.ts
├─ src/
│  ├─ app/                   routes: (public), applicant, staff, jury, leader, dept, api
│  ├─ modules/               identity, organisations, awards, forms, scoring, applications,
│  │                         masking, judging, approval, results, audit, notifications, reporting
│  │    └─ <module>/         service.ts, access.ts, schemas.ts, views.ts, *.test.ts
│  ├─ components/            ui, form-renderer, form-builder, scoring-sheet
│  └─ lib/                   db, auth, clock, errors, storage, mailer
├─ tests/e2e/                Playwright journeys
├─ .github/                  workflows/ci.yml, pull_request_template.md
├─ docker-compose.yml        PostgreSQL and Mailpit
├─ .env.example
└─ README.md                 run from a fresh clone in under 10 minutes
```

### Git workflow

- main: always stable and demo-ready; protected; updated only from develop when CI is green.
- develop: the testing branch where features come together.
- feature/<short-name> and fix/<short-name>: one per issue, merged into develop through a pull request.
- Commit messages follow Conventional Commits: feat:, fix:, test:, docs:, refactor:, chore:.
- Every feature starts as a GitHub issue with acceptance criteria copied from section 5. A GitHub Project board tracks issues; milestones follow section 17.

### Definition of done (pull request checklist)

- ☐ Acceptance criteria of the issue are met
- ☐ Tests added or updated, including any rule this change touches
- ☐ Lint, type check and tests pass in CI
- ☐ No code branches on a specific award
- ☐ Every new service function checks permission and scope
- ☐ Responses use a view model, never raw database objects
- ☐ Docs and decision records updated if behaviour or design changed
- ☐ Diff reviewed line by line before merging

### Coding conventions

- TypeScript strict mode; no any.
- Zod at every boundary: input, configuration, environment variables.
- Services know nothing about HTTP; route handlers know nothing about business rules.
- Money as integer paise; times in UTC; keys generated by the system.

### Rules for AI coding agents using this spec

- Follow this document; when something is unclear, stop and ask instead of guessing.
- Never add award-specific code; read behaviour from configuration.
- Never return raw database objects; never skip the access check in a service.
- Write the rule tests before or with the feature, not after.
- Record any wrong-but-plausible output in docs/ai-notes.md: what it was, how it was caught, the fix.

### Daily update format

Three lines: Done · Next · Stuck. Add Plan changed when the plan was updated, with the reason.

## 17. Build plan

> Superseded by [PHASES.md](PHASES.md), which is the live plan. Kept for history.

Days 1 and 2 went to understanding, questions and design. Days 3 to 8 build one vertical slice per day, each ending with its rule tests green; days 9 and 10 finish. If the actual day count differs, shift the rows and note the change in plan.md.

| Day | Focus | Done when |
|---|---|---|
| 3 | Project skeleton, CI, Prisma schema, seed, login, roles and scopes, departments and department heads, organisation profile | Seeded users log in and land on their role's area; PAN and GSTIN checks tested |
| 4 | Award creation, staff assignment, cycle setup, questionnaire builder, form versions, scoring sheet builder | Staff publish a complete cycle in the UI; rule 4 and weight tests green |
| 5 | Open awards, demo fee, form renderer with autosave, submit, edit, withdraw, duplicate flag | An applicant submits end to end; deadline and fee tests green |
| 6 | Deadline lock, masking workspace, jury pool, conflicts, assignment | A blind application reaches its jury masked; rule 1 and 2 tests green |
| 7 | Scoring screen, submit evaluation, staff edits with reason, disqualify and reinstate, audit history | A jury submits; staff corrections are audited; rule 3 tests green |
| 8 | Approval and send back, shortlist, publish results, key emails, leader dashboard; configure a second award in the UI only | One full cycle runs for both awards with no code change |
| 9 | README from a fresh clone, user journeys page, architecture drawing, testing.md, ai-notes.md, deploy | A stranger can run it; every brief deliverable is in the repo |
| 10 | Self-review of every module, fixes, walkthrough rehearsal | The 20-minute walkthrough runs without surprises |

Cut order if behind: remaining email templates → department head dashboard → duplicate resolution screen (keep the flag) → jury-side disqualification (keep staff-side). The four rules and the end-to-end cycle are never cut.

Each day: open the issues for that day's slice, merge through pull requests into develop, merge develop into main when CI is green, write the daily update.

## 18. Open questions and assumptions

Sixteen questions were asked. The leader call on 5 October 2026 answered question 1 and part of question 3; the answers on 6 October answered questions 2, 7, 8, 14 and 15 (see below). The rest stay open with their defaults. Questions 1 to 7 change the data model or the roles, so they matter most.

### Answered on 7 Oct 2026

| # | Answer |
|---|---|
| New | Award organisers keep their brand: every award gets a branded site built by its staff from ready-made sections, for **all** awards. Staff decide what to show and where, and can change the design after publishing. No approval from the leader. |
| New | An external organiser is set up as a department and runs its awards alone; one person may head several departments. Only staff create awards. |
| New | Every application carries a photo identity document, a proof of employment and a LinkedIn link; staff check them. |
| New | Staff can set an entry limit; the public sees the count, e.g. 499 / 500. |
| New | The 10-day deadline can move: the plan is extended rather than cut, as long as every detail is covered. |

### Answered on 6 Oct 2026

| # | Answer |
|---|---|
| 2 | The department head's approval is final for document review rounds. On-site rounds have no approval. |
| 7 | Yes: an on-site panel of 2 to 5 jury, each scoring on their own; the final score is the average. Document review rounds keep one jury member per application. |
| 8 | Only one real application per organisation per award. All are accepted; extras are flagged and staff keep one. |
| 14 | GSTIN is optional. Without one, joining needs the PAN and the official email. |
| 15 | Shop-floor competitions register as usual, with a small (sometimes empty) form, and are judged on site by a panel using a score sheet. Modelled as an on-site round (§5.16). |
| New | Scores are entered on devices at the venue, and internet is assumed. Staff can enter a juror's scores as a backup. |
| New | Document rounds end in Shortlisted / Rejected; on-site rounds end in Gold / Silver / Bronze. |
| New | Fees can differ per entry category. |

### Answered in the leader call (5 Oct 2026)

| # | Answer |
|---|---|
| 1 | The award goes to the organisation (legal entity, by PAN). Plants and units never apply separately. |
| 3 | Staff accounts are created by the department head, or by the leader's PAs on the leader's behalf. |
| New | A staff member can be assigned to many awards. |
| New | No signed authorisation letter. For now every application from a member of the organisation is accepted; proof of authority is to be decided. |
| New | The leader has a personal team (PAs), created by the leader, who carry out the leader's organisational tasks. |
| New | Data inconsistency across the old award systems was the main problem; the platform must keep shared data consistent. |

### Questions for you

| # | Question | Default until you answer |
|---|---|---|
| 1 | Does the award go to the legal company, or can each plant or unit apply separately? | **Answered:** the legal company (organisation, by PAN); one application per organisation per cycle |
| 2 | Is the department head's approval final, or does the leader also sign off after it? | **Answered:** final, for document rounds; on-site rounds have no approval |
| 3 | Who creates staff accounts: the department head or the leader? | **Answered:** the department head, or the leader's PAs |
| 4 | Can a department head also create awards, or only staff? | Only staff |
| 5 | Can a department head edit scores, or only approve and send back? | Only approve and send back |
| 6 | Is there exactly one leader, or can there be a backup leader account? | Exactly one |
| 7 | In the future live round, can several judges score the same shortlisted application? In round 1 each application has one jury member. | **Answered:** yes, a panel of 2 to 5; the average counts |
| 8 | On a duplicate: block the second application, or allow it and let staff choose? | **Answered:** allow, flag both, staff keep the one real application |
| 9 | When a required question is added after submission, must the applicant resubmit? | No: stays submitted, flagged "Update requested", locked as it stands |
| 10 | Weights: section and indicator-within-section, or indicator-within-question? | Section weights, then indicator weights inside each section |
| 11 | Does anyone approve the shortlist? | No: staff shortlist after the department head approves |
| 12 | What does an applicant see when disqualified? | "Under review" until results, then "Rejected" |
| 13 | The brief requires the system to block conflicted assignments; the client says staff handle it. Is recording conflicts acceptable? | Staff or the department head record known conflicts; the system blocks them |
| 14 | Must every organisation have GST? Some NGOs and government bodies may not | **Answered:** GSTIN optional |
| 15 | How are shop-floor competitions entered and judged (question 32)? | **Answered:** registered as usual, judged on site by a panel; an on-site round (§5.16) |
| 16 | Can an applicant withdraw after the deadline? | No |

### Assumptions

| # | Assumption we build on | If it is wrong |
|---|---|---|
| A1 | The leader's account is created once at setup; the leader and their PAs do the platform's admin work | Add a separate admin role |
| A2 | Staff pick the award domain when creating an award; entry categories are separate and set per cycle | Merge the two fields |
| A3 | A staff member can belong to several departments; each department head adds them to their own department | Limit staff to one department |
| A4 | The staff member who creates an award is assigned to it automatically | The department head assigns every award's staff |
| A5 | Staff and department heads can both add jury to a pool and remove a jury member with no submitted evaluation | Restrict removal to one role |
| A6 | The leader and department head can see applicant identity in blind awards | Hide identity from them too |
| A7 | Fee and blind judging cannot change after publishing | Allow changes before the first application |
| A8 | The deadline cannot be extended once masking has started | Allow it; masked applications would need re-masking |
| A9 | Indicators lock once the first score is saved | Version the scoring sheet like the form |
| A10 | Reapplying after withdrawal means paying the fee again | Carry the payment over |
| A11 | Jury do not see the computed total | Show it |
| A12 | Non-blind awards skip masking | Add optional masking |
| A13 | Transferring an application to another member of the organisation is later work | Build it now |
| A14 | Every PA has the same powers (§5.17) | Add per-PA permission switches |
| A15 | PAs can create awards in any department; configuring the cycles stays with staff | Only staff create awards |
| A16 | Any member of an organisation may apply for it; only one application per organisation per cycle is real, so extras are flagged (confirmed 6 Oct) | Require proof of authority |
| A17 | A GSTIN whose state differs from the address state gives a warning, not a refusal | Refuse it |
| A18 | The department head is never a juror in a document round of their own department (they approve it), but may sit on on-site panels | Allow it, with someone else approving |
| A19 | An absent panel member is removed with a reason; the average uses the members who submitted (at least one) | Require the full panel |
| A20 | **Decided 6 Oct:** one set of medals per award cycle: Gold, Silver and Bronze for ranks 1 to 3 of the on-site round across all categories; staff settle ties | Medals per entry category |
| A21 | A presentation slot can move until the entry has scores | Lock slots once set |
| A22 | Team members are listed on the entry (name and designation), never given accounts | Give team members accounts |
| A23 | The brand kit is per department, with per-award overrides of colours and banner (default kept 7 Oct) | Per award only |
| A24 | Proof documents are deleted 12 months after the cycle's results are published, keeping the check record (default kept 7 Oct) | Keep them longer, or delete at results |
| A25 | Own domains are designed for but built after the first release | Build sub-domains now |

Improvement ideas already offered to the client: a fixed identity section that hides itself from jury, masking only after the deadline, one organisation profile reused across awards, highlighting changed questions, flagging large disagreements in a future multi-judge setup, copying last year's setup, and feedback reports for applicants.

