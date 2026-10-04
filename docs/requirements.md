> Source: `Awards Platform — Product & Technical Specification.docx` (2 Oct 2026, Priyanshu Phulara), converted to Markdown so it lives in the repo. The docx is the original; if they disagree, raise it in docs/GAPS.md. Diagrams from the docx are not reproduced here — see docs/architecture/Awards_Platform_High_Level_Architecture.pdf.

# Awards Platform — Product & Technical Specification

Oct 2, 2026 · @Priyanshu Phulara

## 1. Overview

We are building one configurable platform that can run every award of an Indian industry body. In 10 working days we deliver a working version that proves one claim: several awards with different rules run on the same engine, and staff set those differences in the UI without any code change.

Background. The body runs about 80 awards: business excellence, energy, safety, design, innovation, sustainability, regional awards and shop-floor competitions (Kaizen, 5S). Today the whole process is manual. An average award receives 300 to 500 applications. The largest scores applicants on about 250 indicators across 15 areas, runs six months and has two rounds; round 2 is a live presentation.

The core idea. An award is data, not code. The code knows the parts every award shares (cycles, applications, masking, jury, scoring, approval, results, audit). Each award's configuration fills in what differs (questions, indicators, weights, dates, fee, blind judging, categories). No line of code ever names a specific award.

Success criteria for the 10-day build:

- The leader creates a department and appoints its head, the department head adds staff, and staff create and configure the full award in the UI: questionnaire, scoring sheet with weights, deadline, fee and blind judging.
- At least two awards with clearly different settings run end to end: apply, lock, mask (blind only), assign, score, approve, shortlist, publish results.
- The four rules of the brief (blind judging, conflict of interest, score audit, question versioning) are enforced on the server and covered by automated tests.
- The repository holds the code, a README a stranger can run from, user journeys, an architecture drawing, decision records, a daily log and a list of what the tests check and do not check.

Who this document is for. Developers and AI coding agents building the platform, and the reviewer reading the work. Section 18 lists every open question with the default we build if it stays unanswered.

## 2. Glossary

Every word below means exactly one thing in code, UI and docs. Two different things were both called "category" in our discussion; here they are split into award domain and entry category.

| Term | Meaning | Example |
|---|---|---|
| Department | A unit of the organising body that owns awards in one area; created by the leader and run by a department head | Energy department |
| Award domain | The subject area staff pick when creating an award | Energy, Safety, Innovation |
| Award | A permanent award programme | National Energy Excellence Award |
| Cycle | One edition of an award, with its own dates, questionnaire and scoring sheet | 2026 edition |
| Entry category | A category inside a cycle that an applicant competes in; one award can have many | Large manufacturing, MSME |
| Organisation | The legal body that applies, identified by PAN | Acme Steel Ltd |
| Applicant user | A person who applies on behalf of an organisation | Plant HR manager |
| Authorisation letter | A letter from the platform's template, signed by the organisation's officials, uploaded before submitting | PDF on letterhead |
| Questionnaire | The form applicants fill: sections that contain questions |   |
| Section (area) | A group of questions; also carries a weight in scoring | Environment |
| Question | One item in a section, with a stable key that never changes across versions | Describe your tree plantation |
| Identity field | A field that reveals who applied; never shown to jury | Org name, PAN, GST, address, official email |
| Form version | An immutable snapshot of the questionnaire; every published change creates a new version | v1, v2 |
| Indicator | A jury-only scoring item attached to one question; scored 0 to 10 or Yes/No; has a weight | Oxygen efficiency of trees |
| Scoring sheet | All indicators and weights of one round (the client calls it the judgement sheet) |   |
| Round | One judging stage; round 1 is document review, round 2 is the live round (future) | Round 1 |
| Jury pool | Jury members selected for a cycle by staff and the department head |   |
| Evaluation | One jury member's scoring of multiple applications in one round but one application is only reviewed by one jury at a time means one application can be only assigned to one judge not multiple |   |
| Overall note | The required comment a jury member writes per application |   |
| Masking | Staff creating a jury-safe copy of answers and documents after the deadline |   |
| Disqualification | Marking an application ineligible, with a reason; reversible, never deleted | Fake application |
| Approval | The department head's decision on a round's results: approve or send back |   |
| Send back (redo) | The department head returns results with a remark so staff and jury can correct them |   |
| Shortlist | Applications selected after approval to move forward (to the live round) | Top 10 per category |
| Results publication | Staff making final statuses visible to applicants |   |

## 3. Users, roles and permissions

Five roles use the platform, and every role except the leader is held inside a scope. One person can hold different roles in different scopes, for example jury in one cycle and applicant user for an organization in another.

| Role | Scope | Who they are |
|---|---|---|
| Leader | Whole platform | The single top authority and platform admin. Creates departments and appoints their heads. Sees everything in every award, read-only: cannot change any award data |
| Department head | One department | The second-level leader. Adds staff to the department and assigns them to awards, selects jury together with staff, and reviews and approves the department's judgements |
| Staff | One or more awards (can span departments) | Does the general work: creates and runs awards, selects jury together with the department head, and is the only role that assigns applications to jury |
| Jury | One cycle | Senior expert who scores the applications assigned to them; each application has exactly one jury member |
| Applicant user | One or more organisations | Person applying on behalf of an organisation |

### Permission matrix

✓ = allowed. Blank = not allowed. "Own" = only inside the role's scope.

| Action | Leader | Dept head | Staff | Jury | Applicant |
|---|---|---|---|---|---|
| Create departments and appoint department heads | ✓ |   |   |   |   |
| Add staff to the department and assign staff to awards |   | ✓ own |   |   |   |
| Create an award (name, domain, description) |   |   | ✓ own dept |   |   |
| Configure a cycle: questionnaire, scoring sheet, dates, fee, blind, categories |   |   | ✓ own |   |   |
| Publish a cycle, edit questions before deadline, extend deadline |   |   | ✓ own |   |   |
| Select jury for a cycle's pool, record conflicts |   | ✓ own | ✓ own |   |   |
| Register or join an organisation, apply, edit, withdraw |   |   |   |   | ✓ |
| Verify authorisation letters, resolve duplicates |   |   | ✓ own |   |   |
| Mask applications |   |   | ✓ own |   |   |
| Assign applications to jury |   |   | ✓ own |   |   |
| Score, comment, write overall note |   |   |   | ✓ assigned |   |
| Disqualify with a reason |   |   | ✓ own | ✓ assigned |   |
| Reinstate a disqualified application |   |   | ✓ own |   |   |
| Edit scores after jury submission, with a reason, before approval |   |   | ✓ own | ✓ only in redo |   |
| Send a round for approval |   |   | ✓ own |   |   |
| Approve, or send back with a remark |   | ✓ own |   |   |   |
| Shortlist and publish results |   |   | ✓ own |   |   |
| See every award, application, score and decision (read-only) | ✓ | ✓ own | ✓ own |   |   |
| See applicant identity in a blind award | ✓ | ✓ own | ✓ own |   | ✓ own org |
| Dashboard | ✓ all awards | ✓ own |   |   |   |
| View audit history | ✓ | ✓ own | ✓ own |   |   |

Rules that follow from the client's answers:

- The leader changes no award data. They see everything; their only writes are creating departments and appointing department heads.
- The department head is the approver. Staff send each round's results to them, and they approve or send back with a remark. They do not edit scores.
- Jury selection is shared: staff and the department head can both add jury to a cycle's pool. Assigning applications to jury is staff only.
- Each application is assigned to exactly one jury member; one jury member scores many applications.
- After the department head approves a round, nobody can change its scores.
- Jury see only applications assigned to them, and in blind awards only the masked copy.

## 4. Lifecycle and statuses

An application follows one main path from draft to result, and every side exit keeps the record. Cycles, rounds and evaluations have their own simpler statuses, and applicants see a short, friendly version of all this.

*[Diagram in the original docx: application lifecycle · 7 main states, 4 side exits. See the status tables below and page 6 of docs/architecture/Awards_Platform_High_Level_Architecture.pdf.]*

Disqualification can happen anywhere from locked to evaluated and is reversible. A department head's send back returns the round to correction, with scores unchanged until staff or jury edit them with a reason.

### Cycle status

| Status | Meaning | Next |
|---|---|---|
| Draft | Staff are configuring | Published |
| Published | Visible on Open awards; accepts applications until the deadline | Closed, automatically at the deadline |
| Closed | Applications locked; masking, assignment and judging run in rounds | Results published |
| Results published | Statuses visible to applicants | Final (the live round would follow in future) |

### Round status

| Status | Meaning | Next |
|---|---|---|
| Not started | No evaluation submitted yet | Judging |
| Judging | Jury are scoring | Pending approval, once every evaluation is submitted and staff send it |
| Pending approval | Waiting for the department head | Approved, or sent back |
| Sent back | Staff and jury correcting, with the remark visible | Pending approval again |
| Approved | Scores locked forever | Final |

### Evaluation status

| Status | Meaning | Next |
|---|---|---|
| Assigned | Given to a jury member, not opened | In progress |
| In progress | Draft scores saved | Submitted |
| Submitted | All indicators and the overall note done | Redo, if staff reopen it after a send back |
| Redo | Reopened for the jury to correct | Submitted |

### What the applicant sees

Shortlisted and Rejected appear only after staff publish results; until then a judged application shows Under review.

| Internal state | Applicant sees | Message |
|---|---|---|
| Draft, Update requested | Pending | Your application is not submitted yet |
| Submitted | Submitted | We received your application |
| Locked, Masked, Evaluated, Approved, Disqualified | Under review | Your application is being reviewed |
| Shortlisted (published) | Shortlisted | Keep an eye on your email; we will contact you soon |
| Rejected, Rejected as duplicate, Disqualified (published) | Rejected | Better luck next time |
| Withdrawn | Withdrawn | You withdrew this application |
| Not submitted | Not submitted | The deadline passed before submission |

## 5. Functional requirements

Each module below lists its rules and the acceptance checks that tell us it is done. "Assumption" marks a default we chose where the client has not answered; each one is repeated in section 18.

### 5.1 Accounts and login

- Everyone logs in with email and password. Passwords are hashed, never stored plain.
- Applicant users register themselves. The leader's account is created at setup. The leader invites department heads, department heads invite staff, and staff or department heads invite jury. Each invitee sets their own password from the invite link.
- Password reset works through an emailed link that expires.
- Every request loads the user's role assignments from the database; the UI never decides permissions on its own.
- Accept when: a jury user opening any staff page gets "forbidden"; an applicant can never open another organisation's application.

### 5.2 Organisations and duplicate applications

- Organisation profile fields. Required: legal name, PAN, GSTIN, registered address (line, city, state, PIN code), official email, phone. Optional: organisation type, CIN, website. More fields can be added later.
- PAN is unique: one organisation record per PAN. PAN format is checked (5 letters, 4 digits, 1 letter). GSTIN format is checked, and characters 3 to 12 of the GSTIN must equal the PAN.
- To join an organisation that already exists, a user must enter both its PAN and GSTIN correctly. Real proof of authority comes from the authorisation letter on each application.
- The application belongs to the organisation, not to the person. All formal communication goes to the organisation's official email as well as the applicant user.
- Duplicate rule: one active application per organisation per award cycle. Withdrawn applications and applications rejected as duplicates do not count.
- When a second user from the same organisation starts an application in the same cycle, they see: "Your organisation already has an application for this award." Assumption: they may still continue; both applications are then flagged "Possible duplicate".
- Staff resolve flagged duplicates by contacting the organisation: they keep one and mark the other "Rejected as duplicate" with a reason. Nothing is deleted.
- Accept when: a second application from the same PAN in the same cycle is flagged; resolving keeps exactly one active application and records who decided and why.

### 5.3 Departments, awards and cycle setup

- The leader creates departments and appoints one department head for each.
- The department head adds staff to the department and assigns staff to awards. A staff member can belong to several departments.
- Staff create an award in their department: name, domain, short description. The creator is assigned to it automatically, and the department head can add or remove staff on any award in the department.
- Staff create a cycle (for example "2026") and configure:
  - dates: opening date and deadline (date and time, India time);
  - entry categories: at least one;
  - entry fee in rupees; 0 means free;
  - blind judging: on or off;
  - rounds: round 1 document review always; a round 2 live round can be marked as planned;
  - the questionnaire (5.4) and the scoring sheet (5.5);
  - the authorisation letter template (a platform default, downloadable).
- Before publishing, the system checks: at least one section and question; every indicator points to an existing question; weights add up to 100% at each level; the deadline is after the opening date; at least one entry category.
- A published cycle appears on the public "Open awards" page from its opening date until its deadline.
- Assumption: fee and blind judging cannot change once the cycle is published.
- Accept when: staff create, configure and publish a complete award through the UI only, and a second award with different settings needs no code change.

### 5.4 Questionnaire and versioning

- Structure: sections contain questions. Question types: short text, long text, number, date, single choice, multiple choice, yes/no, file upload (allowed types, maximum files, maximum size).
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
- Each indicator belongs to exactly one question. A question can have zero, one or many indicators.
- Indicator fields: key, label, type (score 0 to 10, or Yes/No), weight.
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
- Fee: if the fee is above 0, the user sees the amount and a demo payment screen. "Pay" records a payment with a fake reference and unlocks the form. There are no refunds.
- Drafts save automatically a few seconds after each change and on moving between sections. The user can leave and continue later; progress shows per section.
- Authorisation letter: the user downloads the template, pre-filled with organisation and award names, has it signed, and uploads it. It is required to submit.
- Submit checks all required answers and files, sets the status to Submitted, and sends a confirmation email.
- Until the deadline, the applicant can edit a submitted application. Assumption: it stays Submitted, and each save must pass the same checks as submitting.
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

### 5.9 Judging (round 1)

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

### 5.11 Approval

- Staff can "Send for approval" only when every non-disqualified application in the round has a submitted evaluation. The batch is the whole round of the cycle, and it goes to the head of the award's department.
- Before sending, staff can edit any score; a reason is required and recorded (rule 3).
- The department head sees the ranked list per entry category: each application's score, overall note, indicator details, and the disqualified list with reasons.
- The department head can approve: the round is locked and no score can ever change again.
- Or the department head can send back: an overall remark is required, and remarks on specific applications are optional. Scores stay as they are.
- After a send back, the remarks are visible to staff and to the jury of the named applications. Staff can edit scores with a reason, or reopen specific evaluations so their jury can correct and resubmit. Then staff send for approval again.
- The leader can see every round, its scores and every decision, but cannot approve, send back or edit.
- Every submission and decision is kept as history.
- Accept when: approve locks every score; a send back without a remark is refused; editing a score after approval is refused; the leader's approve or send back is refused.

### 5.12 Shortlisting and results

- After the department head approves, staff build the shortlist. Assumption: no further approval is needed for it.
- Shortlist tools: per entry category or overall; top N; minimum score; or manual selection. Ties show the same rank, and staff decide manually.
- Staff publish results. Applicant statuses change to Shortlisted or Rejected and emails go out. Disqualified applications show Rejected.
- Shortlisted applications become the input of the live round in future (5.16).
- Accept when: published results show the correct status to every applicant, and nothing can be shortlisted before approval.

### 5.13 Notifications (email)

In development, emails are caught by a local mail catcher. Every email sent is also recorded in an email log.

| Event | Recipient | Content |
|---|---|---|
| Account invite | New department head, staff or jury member | Link to set a password |
| Password reset | The user | Reset link |
| Application submitted | Applicant user and organisation official email | Confirmation with award and category |
| Questionnaire updated | Every applicant with a draft or submitted application in the cycle | List of new and changed questions, the deadline |
| Deadline extended | The same applicants | The new deadline |
| Jury assigned | The jury member | Count of new applications, link |
| Sent for approval | Department head of the award's department | Link to the round |
| Sent back | Staff of the award and the jury of named applications | The department head's remark |
| Results published | Applicant user and organisation official email | The status message |

### 5.14 Leadership dashboard

- The leader sees every award and cycle: status, applications by status, masking progress, judging progress, pending approvals and upcoming deadlines.
- A department head sees the same view for their department only.
- It is read-only, with a drill-down to each cycle's summary.

### 5.15 Audit history

- Append-only. Application code can add records but never edit or delete them.
- Recorded events: score changes after a jury submission (old value, new value, who, when, reason); disqualify and reinstate; approval submissions and decisions with remarks; masking done and reopened; deadline changes; form versions published; assignment changes; conflicts recorded; duplicate resolutions; withdrawals; results published.
- A jury member's typing in a draft is not audited; their submission and every change after it are.
- Staff, the department head and the leader see an application's history on its page.

### 5.16 Live rounds (future, room kept)

- Not built in the 10 days. The design must not block it.
- A cycle has an ordered list of rounds; each round has a type: document review or live.
- In a live round, shortlisted applications from the previous round present on site. Several judges score the same application in real time in a "live room", and the scoreboard updates. No approval step is needed.
- The data model already allows several evaluations per application in a round, so live rounds need new screens, not a new model.

## 6. The four rules: enforcement and tests

Each rule is enforced in the server's service layer, never only in the UI, and each has automated tests written from the rule itself. Each also has a known limit, stated openly.

| Rule | How it is enforced | Tests | Known limit |
|---|---|---|---|
| 1. Blind judging hides who applied | Identity section is never part of any jury response. Jury read only masked answers and masked files. Jury cannot open an application until it is masked. The file download route refuses original files for jury. | Jury response for a blind award contains no identity fields; jury downloading an original file is refused; jury opening an unmasked application is refused; staff see both copies; in a non-blind award jury see originals | Masking quality depends on staff; identity left inside a document by mistake cannot be detected |
| 2. No assignment with a conflict of interest | Staff or the department head record known conflicts (jury member and organisation). The assignment service refuses a conflicted pair; the assignment list hides conflicted jury. | Assigning a recorded conflict is refused even through a direct API call; a conflict recorded later removes an unsubmitted assignment | A conflict staff never recorded cannot be caught (client decision: staff hold this knowledge) |
| 3. Who changed a score, and why | After a jury submission, every score change requires a reason. The change and its audit record are written in one database transaction. Audit records are append-only. Approved rounds refuse all changes. | A change without a reason is refused; a change writes old value, new value, actor, time, reason; a failed audit write rolls back the score change; any change after approval is refused | Draft scores before the first submission are not audited, by design |
| 4. Last year's applications still read correctly | Published form versions are immutable. Answers are stored by stable question key. Each application pins the version it was locked with and always opens with it. | Editing a published version is refused; removing a question inside a cycle is refused; a 2025 application opens with its 2025 version after 2026 drops questions; answers carry over between versions inside a cycle | Removing a question still requires a new cycle, by design |

## 7. User journeys through one award cycle

Each journey starts from the person's real day, then lists what they do in the system, in order.

### Leader

The single top authority and platform admin, who sets up the structure and watches everything without changing any data.

- Creates a department and appoints its department head.
- Opens the dashboard: every award and cycle, applications by status, masking and judging progress, rounds waiting for approval, deadlines.
- Opens any award to read its applications, scores, notes and decisions; nothing can be edited.

### Department head

The second-level leader: decides who runs the department's awards and has the final say on their judgements.

- Adds staff to the department and assigns them to awards.
- Selects jury for each cycle's pool together with staff.
- Follows the department's awards on the dashboard.
- Gets an email that a round is ready. Opens the ranked list, reads scores, overall notes and the disqualified list.
- Approves, or sends back with a remark and optional remarks on specific applications.
- After a send back, reviews the resubmitted round and approves.

### Staff

Works in the system every day while a cycle runs.

- Creates the award in their department, then its 2026 cycle.
- Sets dates, entry categories, fee and blind judging.
- Builds the questionnaire section by section.
- Builds the scoring sheet: indicators on questions, weights per section and indicator, until every total is 100%.
- Selects jury for the pool together with the department head, and records known conflicts.
- Publishes. The award appears on the Open awards page.
- Watches applications arrive; verifies authorisation letters; resolves duplicate flags by contacting the organisation.
- Adds a question mid-cycle; the system emails applicants and marks the new question in their forms. Extends the deadline if needed.
- After the deadline, masks applications one by one (blind awards only).
- Assigns each masked application to exactly one jury member.
- Tracks judging progress; disqualifies a fake application with a reason; reinstates one disqualified by mistake.
- Corrects a score with a reason, then sends the round to the department head for approval.
- If sent back, reads the remark, fixes scores or reopens evaluations for jury, and resubmits.
- After approval, builds the shortlist and publishes results.

### Applicant user

Comes once or twice a year, close to the deadline, with a long form and evidence to collect.

- Registers, then creates the organisation profile (PAN, GSTIN, address, official email, phone) or joins it with PAN and GSTIN.
- Browses Open awards and picks one and an entry category.
- Pays the fee on the demo payment screen, if there is one.
- Fills the form over several sittings; autosave keeps everything.
- Downloads the authorisation letter template, gets it signed, uploads it.
- Submits and gets a confirmation email.
- Gets an email that questions changed; updates the highlighted questions before the deadline.
- Sees the status: Pending, Submitted, Under review.
- After results: Shortlisted ("we will contact you soon by email") or Rejected ("better luck next time").

### Jury member

A senior expert who scores in short gaps between other work.

- Receives an invite, sets a password, then gets an email: "6 applications assigned to you."
- Opens the dashboard and the first application: the masked answers, files and the indicator sheet with weights.
- Enters marks, adds comments on some questions, and stops halfway; everything is saved.
- Returns later, finishes, writes the overall note, submits.
- Disqualifies an obviously fake application with a reason.
- If the department head sends back their application, reads the remark, corrects scores and resubmits.

## 8. High-level architecture

The platform is a modular monolith: one Next.js app and one PostgreSQL database, with the code split into modules behind a single access layer. Award settings live in the database as versioned configuration, and every row is tied to its cycle, so all awards share tables without sharing data.

*[Diagram in the original docx: high-level architecture · one app, one access layer, 12 modules, 3 stores. Superseded by page 3 of docs/architecture/Awards_Platform_High_Level_Architecture.pdf, and by ADR 0001 for the frontend/backend split.]*

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
| Rounds | Round rows with a type | Before publish |

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

- Shop-floor competitions judged on site with a checklist, by teams without their own email, do not fit "fill a form, then score".
- Identity left inside an uploaded document depends on staff masking it.
- Several jury per application with combined scores waits for the live round design.
- An award needing an extra step between rounds, such as a site visit, needs a new round type.

## 9. Tech stack

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
| User | id, email, name, passwordHash | email unique |
| Department | id, name | name unique |
| RoleAssignment | userId, role (LEADER, DEPT_HEAD, DEPT_STAFF, AWARD_STAFF, JURY), departmentId?, awardId?, cycleId? | Leader has no scope and is the platform admin; dept head → department; dept staff → department (may create awards there); award staff → award; jury → cycle. Unique per user, role and scope |
| Organisation | id, legalName, pan, gstin, addressLine, city, state, pincode, officialEmail, phone, orgType?, cin?, website? | pan unique; GSTIN characters 3 to 12 equal PAN |
| OrganisationMember | organisationId, userId | Unique pair |
| Award | id, name, domain, departmentId, description, createdById |   |
| Cycle | id, awardId, label, opensAt, deadlineAt, feePaise, blindJudging, status, draftFormSchema | Unique (awardId, label). draftFormSchema holds unpublished edits |
| EntryCategory | id, cycleId, name | Unique (cycleId, name) |
| FormVersion | id, cycleId, version, schema (JSONB), changeSummary, publishedAt, publishedById | Unique (cycleId, version). Never updated after insert |
| Round | id, cycleId, number, type (DOCUMENT_REVIEW, LIVE), status | Unique (cycleId, number) |
| ScoringSheet | id, roundId, schema (JSONB), lockedAt | One per round; locked after the first saved score |
| Application | id, cycleId, organisationId, createdById, categoryId, formVersionId, status, maskingStatus, result, duplicateFlag, updateRequested, submittedAt, lockedAt, withdrawnAt, withdrawReason | One active per organisation per cycle, checked in the service (flagged duplicates are allowed) |
| Answer | applicationId, questionKey, value (JSONB), updatedAt | Unique (applicationId, questionKey) |
| MaskedAnswer | applicationId, questionKey, value (JSONB), maskedById, maskedAt | Unique (applicationId, questionKey) |
| FileAsset | id, applicationId, questionKey?, kind (EVIDENCE, AUTH_LETTER, MASKED_EVIDENCE), maskedFromId?, storageKey, fileName, mimeType, sizeBytes, uploadedById | Jury may read only MASKED_EVIDENCE in blind awards |
| Payment | id, applicationId, amountPaise, status, reference, paidAt | Demo only |
| Conflict | id, juryUserId, organisationId, note, recordedById, createdAt | Unique (juryUserId, organisationId); applies across all awards |
| Evaluation | id, roundId, applicationId, juryUserId, status (ASSIGNED, IN_PROGRESS, SUBMITTED, REDO), overallNote, submittedAt | Unique (roundId, applicationId, juryUserId); the service allows exactly one jury member per application |
| IndicatorScore | evaluationId, indicatorKey, value, updatedAt | Unique (evaluationId, indicatorKey); value 0 to 10, or 0/1 for Yes/No |
| QuestionComment | evaluationId, questionKey, comment | Unique (evaluationId, questionKey) |
| ApprovalRequest | id, roundId, submittedById, submittedAt, decision (PENDING, APPROVED, SENT_BACK), decidedById, decidedAt, remark | One row per submission; history kept |
| ApprovalRemark | approvalRequestId, applicationId, remark | Optional remarks on specific applications |
| DisqualificationEvent | id, applicationId, action (DISQUALIFY, REINSTATE), byUserId, byRole, reason, createdAt | Current state = latest event |
| AuditEvent | id, actorId, action, entityType, entityId, cycleId, before (JSONB), after (JSONB), reason, createdAt | Insert only; indexed by (cycleId, entityType, entityId) |
| EmailLog | id, to, template, payload, status, createdAt |   |

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

Weights are whole-number percentages. Section weights add up to 100, and indicator weights inside each section add up to 100.

### Field types in the questionnaire

SHORT_TEXT, LONG_TEXT, NUMBER, DATE, SINGLE_CHOICE (with options), MULTI_CHOICE (with options), YES_NO, FILE.

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
- View models are explicit: applicantView, juryView, staffView, leaderView. Raw database objects never reach the browser. In a blind award, juryView is built only from masked answers and masked files.
- Typed errors map to responses: ValidationError → 400, ForbiddenError → 403, NotFoundError → 404, StateError (wrong status, past deadline, approved round) → 409. A jury member asking for an application not assigned to them gets 404, so its existence is not revealed.
- Transactions are required for: a score change plus its audit event; an approval decision plus the round status; masking done plus the application status; resolving a duplicate.
- File downloads go through one route that checks the actor may read that file and that file kind.
- Time comes from one clock helper, so tests can move past a deadline.
- No code branches on a specific award. Behaviour comes only from configuration such as cycle.blindJudging or cycle.feePaise. Code review checks this on every pull request.

### Main service operations

| Module | Operations | Who |
|---|---|---|
| Identity | register, login, inviteUser, resetPassword, assignRole | Public, leader, dept head, staff |
| Departments | createDepartment, appointDepartmentHead | Leader |
| Departments | addStaffToDepartment, assignStaffToAward | Dept head |
| Organisations | createOrganisation, joinOrganisation, getOrganisation | Applicant |
| Awards | createAward, createCycle, updateCycleSettings, publishCycle, extendDeadline | Staff |
| Forms | editDraftForm, publishFormVersion, getFormVersion, diffVersions | Staff (read: applicant, jury) |
| Scoring | editScoringSheet, validateWeights, computeScore | Staff (read: jury) |
| Applications | startApplication, payFee (demo), saveAnswers, uploadFile, submit, withdraw, resolveDuplicate | Applicant, staff |
| Masking | getMaskingWorkspace, saveMaskedAnswer, uploadMaskedFile, markMaskingDone, reopenMasking | Staff |
| Jury pool | addPoolMember, removePoolMember, recordConflict | Staff, dept head |
| Judging | assign, reassign | Staff only |
| Judging | saveScores, submitEvaluation, disqualify | Jury (assigned) |
| Judging | reopenEvaluation, editScoreWithReason, disqualify, reinstate | Staff |
| Approval | sendForApproval | Staff |
| Approval | approve, sendBack | Dept head |
| Results | buildShortlist, publishResults | Staff |
| Reporting | leaderDashboard, departmentDashboard, cycleSummary, awardReadOnlyView | Leader, dept head |
| Audit | listHistory | Leader, dept head, staff |

## 12. Screens

The app has about 30 screens grouped by role. Each role sees only its own area after login.

| Area | Screen | Purpose |
|---|---|---|
| Public | Open awards | Published awards with deadline, fee and categories |
| Public | Award details | Description, categories, deadline, fee, "Apply" |
| Public | Login, register, forgot password | Account access |
| Applicant | My organisation | Create, or join with PAN and GSTIN; edit profile |
| Applicant | My applications | Each application with its applicant-facing status |
| Applicant | Payment (demo) | Shows the fee; "Pay" unlocks the form |
| Applicant | Application form | Sections, autosave, progress, New and Updated markers, authorisation letter, submit |
| Applicant | Application status | Status message and dates; withdraw before deadline |
| Staff | My awards | Awards and cycles assigned to them |
| Staff | Create award | Name, domain and description, in one of their departments |
| Staff | Cycle setup | Tabs: basics and dates, entry categories, questionnaire builder, scoring sheet builder, settings (fee, blind, rounds), publish |
| Staff | Applications | List with filters: status, category, duplicate flag, masking status |
| Staff | Application detail | Original and masked copies, files, authorisation letter, history |
| Staff | Masking workspace | Original beside masked copy; file masking; mark done |
| Staff | Jury pool and conflicts | Select jury together with the department head; record conflicts |
| Staff | Assignment | Assign each application to one jury member; reassign |
| Staff | Judging progress | Submitted out of assigned; open evaluations; edit score with reason |
| Staff | Approval | Send for approval to the department head; read remarks; resubmit |
| Staff | Shortlist and results | Ranked list per category; top N, cut-off or manual; publish |
| Jury | My assignments | Applications per cycle with progress |
| Jury | Scoring | Answers and files, indicators with weights, question comments, overall note, submit, disqualify |
| Department head | Department awards | Awards in the department and their progress |
| Department head | Staff | Add staff to the department; assign them to awards |
| Department head | Jury pool | Select jury for a cycle together with staff |
| Department head | Approval queue | Rounds waiting for a decision |
| Department head | Round review | Ranked list, notes, disqualified list; approve or send back with remarks |
| Leader | Dashboard | Every award and cycle with progress, approvals and deadlines |
| Leader | Departments | Create departments; appoint department heads |
| Leader | Award view (read-only) | Any award's applications, scores, notes and decisions |

## 13. Non-functional requirements

The load is small for a single PostgreSQL database, so the design favours correctness and simplicity over scaling machinery.

| Area | Requirement |
|---|---|
| Volume | About 80 awards × 300 to 500 applications = 24,000 to 40,000 applications a year. The largest award: 500 applications × 250 indicators = about 125,000 scores per round |
| Peak load | The days before a deadline; assume a few hundred applicants online at once. No caching layer needed |
| Speed | Typical pages load in under 2 seconds; autosave never blocks typing |
| Files | PDF, JPG, PNG, DOCX, XLSX; 10 MB per file; stored outside the web root; served only through the checked download route |
| Security | Hashed passwords; every permission checked on the server; all input validated with Zod; secrets only in environment variables, with a committed .env.example |
| Privacy | PAN, GSTIN, address and contact details visible only to the organisation's own users and to staff, department head and leader of that award |
| Time | Stored in UTC, shown in India time (Asia/Kolkata); a deadline closes at its exact configured time |
| Data keeping | Applications, evaluations, disqualifications and audit events are never hard-deleted |
| Devices | Responsive layout: jury and staff work on laptops and tablets; applicants mostly on laptops |
| Accessibility | Labelled form fields, keyboard navigation, readable contrast |
| Browsers | Current Chrome, Edge, Firefox and Safari |
| Backups | Managed database backups in production |

## 14. Scope for the 10-day build

With about 40 working hours, the build covers the full cycle at its core and cuts depth, not steps. The priorities below decide what drops first if time runs short.

### Must have

- Login and roles with scopes; a seeded leader, with departments, department heads, staff and jury created through the hierarchy.
- Organisation profile with PAN and GSTIN checks.
- Departments and department heads (leader), staff assignment (department head), award and cycle setup (staff), all in the UI.
- Questionnaire builder and immutable form versions (rule 4).
- Scoring sheet builder with weight validation and the score formula.
- Applicant flow: demo fee, dynamic form, autosave, authorisation letter upload, submit, edit until deadline, withdraw.
- Deadline locking and the masking workspace (rule 1).
- Jury pool, conflicts and assignment (rule 2).
- Scoring, overall note, submit, staff edits with reason, audit history (rule 3).
- Approval by the department head: send for approval, approve, send back with remarks, resubmit.
- Shortlist and publish results.
- Two seeded awards with clearly different settings, plus a third configured live in the UI during the walkthrough.

### Should have

- Duplicate flagging and resolution.
- Disqualify and reinstate.
- Emails for: questionnaire updated, jury assigned, results published (others if time allows).
- Leader dashboard with basic counts.

### Could have

- Department head dashboard.
- Leader drill-down screens beyond the dashboard.
- Remaining email templates.

### Designed for, not built (room kept)

- Live rounds with several judges and a live scoreboard.
- Several jury members per application with combined scores.
- Copying last year's cycle setup.
- Transferring an application to another member of the organisation.
- More organisation fields.

### Out of scope

- Real payment gateway and refunds.
- Automatic removal of names from documents.
- Integration with the client's member portal or single sign-on.
- Importing past cycles' data.
- Multiple languages, a mobile app, feedback reports for applicants.
- Virus scanning of uploads.
- A shop-floor-specific flow (waiting for question 32; documented as where the model may break).

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
- Approval: allowed only when every evaluation is submitted; send back requires a remark; approval locks scores.
- Disqualify and reinstate require reasons and restore the previous state.
- Permissions: each role refused outside its scope; the leader refused on every write except departments and department heads; only staff can assign applications to jury.

### What the tests do not check

- Whether staff masked documents well; that is a human task.
- Real email delivery to inboxes; only that emails are created and logged.
- Load and performance under real traffic.
- Browsers other than Chromium in end-to-end tests.
- Security beyond permission checks (no penetration testing).
- The content of uploaded files.

### Test data

A seed script creates: two departments; one leader, one department head, two staff, four jury members; two awards with different settings (one blind with a fee and 3 sections, one non-blind and free with entry categories); about 20 organisations and applications in mixed states; one recorded conflict.

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

Days 1 and 2 went to understanding, questions and design. Days 3 to 8 build one vertical slice per day, each ending with its rule tests green; days 9 and 10 finish. If the actual day count differs, shift the rows and note the change in plan.md.

| Day | Focus | Done when |
|---|---|---|
| 3 | Project skeleton, CI, Prisma schema, seed, login, roles and scopes, departments and department heads, organisation profile | Seeded users log in and land on their role's area; PAN and GSTIN checks tested |
| 4 | Award creation, staff assignment, cycle setup, questionnaire builder, form versions, scoring sheet builder | Staff publish a complete cycle in the UI; rule 4 and weight tests green |
| 5 | Open awards, demo fee, form renderer with autosave, authorisation letter, submit, edit, withdraw, duplicate flag | An applicant submits end to end; deadline and fee tests green |
| 6 | Deadline lock, masking workspace, jury pool, conflicts, assignment | A blind application reaches its jury masked; rule 1 and 2 tests green |
| 7 | Scoring screen, submit evaluation, staff edits with reason, disqualify and reinstate, audit history | A jury submits; staff corrections are audited; rule 3 tests green |
| 8 | Approval and send back, shortlist, publish results, key emails, leader dashboard; configure a second award in the UI only | One full cycle runs for both awards with no code change |
| 9 | README from a fresh clone, user journeys page, architecture drawing, testing.md, ai-notes.md, deploy | A stranger can run it; every brief deliverable is in the repo |
| 10 | Self-review of every module, fixes, walkthrough rehearsal | The 20-minute walkthrough runs without surprises |

Cut order if behind: remaining email templates → department head dashboard → duplicate resolution screen (keep the flag) → jury-side disqualification (keep staff-side). The four rules and the end-to-end cycle are never cut.

Each day: open the issues for that day's slice, merge through pull requests into develop, merge develop into main when CI is green, write the daily update.

## 18. Open questions and assumptions

Sixteen questions remain for you, and thirteen assumptions are built in until you say otherwise. Questions 1 to 7 change the data model or the roles, so they matter most.

### Questions for you

| # | Question | Default until you answer |
|---|---|---|
| 1 | Does the award go to the legal company, or can each plant or unit apply separately? | Organisation = legal entity by PAN; one application per organisation per cycle |
| 2 | Is the department head's approval final, or does the leader also sign off after it? | The department head's approval is final; the leader only watches |
| 3 | Who creates staff accounts: the department head or the leader? | The department head invites staff into the department |
| 4 | Can a department head also create awards, or only staff? | Only staff |
| 5 | Can a department head edit scores, or only approve and send back? | Only approve and send back |
| 6 | Is there exactly one leader, or can there be a backup leader account? | Exactly one |
| 7 | In the future live round, can several judges score the same shortlisted application? In round 1 each application has one jury member. | Yes, a live round has a panel; round 1 stays one jury member per application |
| 8 | On a duplicate: block the second application, or allow it and let staff choose? | Allow, flag both, staff resolve |
| 9 | When a required question is added after submission, must the applicant resubmit? | No: stays submitted, flagged "Update requested", locked as it stands |
| 10 | Weights: section and indicator-within-section, or indicator-within-question? | Section weights, then indicator weights inside each section |
| 11 | Does anyone approve the shortlist? | No: staff shortlist after the department head approves |
| 12 | What does an applicant see when disqualified? | "Under review" until results, then "Rejected" |
| 13 | The brief requires the system to block conflicted assignments; the client says staff handle it. Is recording conflicts acceptable? | Staff or the department head record known conflicts; the system blocks them |
| 14 | Must every organisation have GST? Some NGOs and government bodies may not | GST required, as stated |
| 15 | How are shop-floor competitions entered and judged (question 32)? | Not modelled; documented as a model limit |
| 16 | Can an applicant withdraw after the deadline? | No |

### Assumptions

| # | Assumption we build on | If it is wrong |
|---|---|---|
| A1 | The leader's account is created once at setup, and the leader is also the platform admin | Add a separate admin role |
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

Improvement ideas already offered to the client: a fixed identity section that hides itself from jury, masking only after the deadline, one organisation profile reused across awards, highlighting changed questions, flagging large disagreements in a future multi-judge setup, copying last year's setup, and feedback reports for applicants.

