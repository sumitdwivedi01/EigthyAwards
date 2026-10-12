# API contract

The contract between `Front-End/` and `Backend/` (GAPS G-B10). It's updated in every step that adds endpoints. Every endpoint lives under `/api`. The browser calls it through the frontend's own `/api/*` proxy, so the session cookie stays first-party (ADR 0003).

Status: **Step 1.3** (identity, My profile, master data, organisations; departments and people; award setup; the award page and Open awards; **applying**: starting, the demo fee, autosaved answers, files, the employment proof, submitting, the deadline lock; the staff's applications list, proof check and release; reading files). Assignment and judging arrive in Step 1.4.

## Conventions

- **JSON in, JSON out.** Request bodies are limited to 1 MB. Files never go through the JSON routes: they use short-lived upload links (below).
- **Session.** Logging in or registering sets an `awards_session` cookie (httpOnly, SameSite=Lax, Secure online). It names only the user and their session version; roles are read from the database on every request. A password change ends every other session at once.
- **Writes from another site are refused.** A `POST`, `PUT`, `PATCH` or `DELETE` whose `Origin` header isn't the frontend gets 403 (GAPS G-B11).
- **Never cached.** Every response carries `Cache-Control: no-store` (GAPS G-B16).
- **Errors** always have this shape:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.", "details": [{ "path": "pan", "message": "..." }] } }
  ```

  | Status | `code` | When |
  |---|---|---|
  | 400 | `VALIDATION_ERROR`, `MALFORMED_JSON` | Input failed its checks (`details` lists each field), or the body isn't JSON |
  | 401 | `UNAUTHENTICATED` | Not logged in, or the session ended |
  | 403 | `FORBIDDEN` | Role or scope doesn't allow it, the account is of the wrong kind (ADR 0016), the write came from another site, or the account is still on a temporary password (`details.reason: "PASSWORD_CHANGE_REQUIRED"`, ADR 0017) |
  | 404 | `NOT_FOUND` | Missing, or exists but isn't yours to see |
  | 409 | `STATE_CONFLICT` | Valid, but the current state forbids it. `details.reason` may name it, e.g. `PAN_REGISTERED`, `SETTINGS_FIXED`, `PUBLISH_BLOCKED` with `details.issues` (a list of sentences), `ALREADY_STARTED`, `FEE_UNPAID`, `DEADLINE_PASSED`, `ENTRY_LIMIT` |
  | 413 | `PAYLOAD_TOO_LARGE` | Body over 1 MB |
  | 429 | `TOO_MANY_REQUESTS` | Too many failed logins (per visitor and per email, 15 minutes) |
  | 500 | `INTERNAL` | Unexpected; no details are ever sent |

- **Request id.** Every response carries `x-request-id` (sent back if the client supplied a valid one). Quote it when reporting a problem.
- **Times** are ISO 8601 in UTC; the frontend shows them in India time. **Money** is integer paise (₹1 = 100 paise).
- **Values are normalised by the API** before saving (spec §5.18): emails lower case, names trimmed with single spaces, PAN/GSTIN/CIN upper case without spaces or hyphens, phones as `+91` and 10 digits, PIN codes as 6 digits. Responses show the stored form.

## Platform

| Method | Path | Who | Response |
|---|---|---|---|
| GET | `/api/health` | Anyone | `200 { "status": "ok", "db": "up" }`, or `503 { "status": "degraded", "db": "down" }` |

## Accounts and My profile (identity)

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | Anyone: creates an **applicant account** | `{ name, email, password }` (password 8 to 72 bytes) | `201` Me, and the session cookie. `409` if the email has an account (letter case ignored) |
| POST | `/api/auth/login` | Anyone | `{ email, password }` | `200` Me, and the session cookie. `401` for a wrong email or password (the same message for both), or a deactivated account. `429` after repeated failures |
| POST | `/api/auth/logout` | Anyone | — | `204`; the cookie is cleared |
| GET | `/api/me` | Signed in | — | `200` Me |
| PATCH | `/api/me/profile` | Signed in | `{ name?, phone? }`; `phone: null` removes it | `200` Me |
| POST | `/api/me/password` | Signed in | `{ currentPassword, newPassword }` | `200` Me, and a renewed cookie. Other sessions end; a "password changed" email is queued; audited without the password. `400` for a wrong current password |
| PUT | `/api/me/linkedin` | Applicant accounts | `{ url }`: a LinkedIn profile (`https://…linkedin.com/…`), or `null` to remove | `200` Me |
| POST | `/api/me/identity-document/uploads` | Applicant accounts | `{ fileName, contentType, sizeBytes, consent: true }`; PDF, JPG or PNG, up to 10 MB | `201 { fileId, upload: { url, method: "PUT", headers, expiresAt } }` |
| PUT | `/api/me/identity-document` | Applicant accounts | `{ fileId }`, after the file is uploaded | `200` Me. The content must match the declared type. `409` if not uploaded yet; audited (added or replaced) |

**Me** (the signed-in user's own view; never the password hash or session version):

An applicant:

```json
{
  "id": "…", "email": "kiran@example.test", "accountType": "APPLICANT", "name": "Kiran Desai", "phone": "+919876543210",
  "passwordChangedAt": null, "linkedinUrl": "https://www.linkedin.com/in/kiran-desai",
  "identityDocument": { "fileName": "passport.pdf", "uploadedAt": "2026-10-10T17:07:00.000Z" },
  "roles": [],
  "organisations": [{ "id": "…", "legalName": "Acme Steel Ltd" }],
  "areas": ["applicant"],
  "home": "applicant"
}
```

A staff member:

```json
{
  "id": "…", "email": "asha@example.test", "accountType": "PLATFORM", "name": "Asha Rao", "phone": null,
  "passwordChangedAt": null, "mustChangePassword": false, "linkedinUrl": null, "identityDocument": null,
  "roles": [
    { "role": "DEPT_STAFF", "department": { "id": "…", "name": "FPO Awards team" }, "award": null },
    { "role": "AWARD_STAFF", "department": null, "award": { "id": "…", "name": "FPO Excellence Awards" } }
  ],
  "organisations": [],
  "areas": ["staff"],
  "home": "staff"
}
```

- `accountType` (ADR 0016): `APPLICANT` (made by registering; applies for its organisation, keeps the LinkedIn link and identity document, never holds a role) or `PLATFORM` (the leader, department heads, staff and jury; holds roles, never applies). Someone who does both has two accounts, with two emails.
- `areas` are the parts of the app the user may open (`leader`, `department`, `staff`, `jury`, `applicant`). An applicant account has exactly `["applicant"]`; a platform account has one area per kind of role it holds.
- `mustChangePassword` (ADR 0017) is `true` while the account is on a temporary password. Until the person sets their own (`POST /api/me/password`, with the temporary one as `currentPassword`), every other request except `GET /api/health`, `GET /api/me` and logging out answers `403` with `details.reason: "PASSWORD_CHANGE_REQUIRED"`. A temporary password expires after 7 days; logging in with an expired one gets `401` ("ask the person who added you for a new one").
- `roles` name the department or award behind each role; a juror's role names the department whose jury list they are on (ADR 0017).
- `home` is where they land after logging in. A platform account with no role yet (for example a seeded juror before a head lists them) has no area, and `home` is `null`.

## Uploading a file (signed links, GAPS G-B03)

1. The endpoint that owns the file (for example `POST /api/me/identity-document/uploads`) checks access, records the file and returns an upload link that expires in 10 minutes.
2. The browser sends the bytes with `fetch(upload.url, { method: "PUT", headers: upload.headers, body: file })`. The link names one storage key, one content type and a size ceiling, and works once: a second upload to it gets `409`.
3. The owning endpoint (for example `PUT /api/me/identity-document`) checks the stored file and puts it to use.

Locally the disk driver serves these links at `PUT /api/uploads/:token` (and downloads at `GET /api/downloads/:token`); online, Supabase Storage serves its own signed URLs (Step 1.5). A changed or expired token gets `403`.

## Master data

Public, read-only. Only values that aren't retired are listed (spec §5.18).

| Method | Path | Response |
|---|---|---|
| GET | `/api/master-data/organisation-types` | `[{ id, name }]` |
| GET | `/api/master-data/award-domains` | `[{ id, name }]` |
| GET | `/api/master-data/states` | `[{ code, name }]`: states and union territories with their GST codes |

## Organisations

The award goes to the organisation, one record per PAN (spec §5.2). Only applicant accounts register, join or list organisations; a platform account gets `403` (ADR 0016). Members see and edit it; anyone else gets `404`.

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/organisations` | Applicant accounts | `{ pan, legalName, gstin?, addressLine, city, stateCode, pincode, officialEmail, phone, orgTypeId?, cin?, website? }` | `201 { organisation, warnings }`; the caller becomes a member. `400` lists every invalid field (PAN format; a GSTIN must contain the PAN; a retired organisation type). `409` with `reason: "PAN_REGISTERED"` if the PAN exists: join instead |
| POST | `/api/organisations/join` | Applicant accounts | `{ pan, gstin }`, or `{ pan, officialEmail }` when the organisation has no GSTIN | `200 { organisation, warnings: [] }`. `404` for an unknown PAN; `400` if the GSTIN or email doesn't match (a wrong GSTIN names the state of the one on record) |
| GET | `/api/organisations/mine` | Applicant accounts | — | `[Organisation]` |
| GET | `/api/organisations/:id` | Members | — | `Organisation` |
| PATCH | `/api/organisations/:id` | Members | Any profile field except `pan` (sending `pan` is refused) | `200 { organisation, warnings }`; audited with before and after |

`warnings` holds things worth a second look that didn't stop the save, such as a GSTIN registered in another state than the address (spec assumption A17).

**Organisation**:

```json
{
  "id": "…", "legalName": "Acme Steel Ltd", "pan": "ABCDE1234F", "gstin": "27ABCDE1234F1Z5",
  "addressLine": "12 MIDC Road, Bhosari", "city": "Pune", "state": { "code": "27", "name": "Maharashtra" },
  "pincode": "411026", "officialEmail": "office@acmesteel.example", "phone": "+912025678901",
  "organisationType": { "id": "…", "name": "Public Limited Company" }, "cin": null, "website": null
}
```

## Departments and people (ADR 0017, ADR 0020)

The leader creates departments, each with its head, and from then on **only views** them (ADR 0020): the head keeps the department's two lists, its **staff** and its **jury**, and chooses its **theme**. The responses say which actions the caller has (`canManage`, `canIssuePassword`, `canRemove`, `canEdit`), so the screens show only those. Someone new gets a platform account with a **temporary password**, returned once in the response that creates it (never stored in plain text, never logged), valid 7 days and changed at the first login. Someone who already has a platform account is found by email and gets no new password. Applicant accounts are refused everywhere here (ADR 0016).

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| GET | `/api/departments` | The leader (all), a head (their own) | — | `[DepartmentSummary]` |
| POST | `/api/departments` | The leader | `{ name, externalOrganiser?, head: { name, email } }`; any other field (such as colours) is refused with `400`: the head chooses the theme | `201 { department: DepartmentSummary, head: Person, temporaryPassword }`. `400` on `name` if the name is taken (letter case ignored), on `head.email` for an applicant or deactivated account. The department, its default theme, the head's role and the audit event share one transaction |
| GET | `/api/departments/:id/people` | The department's head; the leader, to view | — | `People` |
| POST | `/api/departments/:id/staff` | The department's head (the leader gets `403`) | `{ name, email }` | `201 { person: Person, temporaryPassword }`. `400` on `email` for an applicant account, the leader, someone already on the list, the department's head, or someone on its jury list |
| POST | `/api/departments/:id/jury` | The department's head (the leader gets `403`) | `{ name, email }` | As above; also refused for the department's staff, including the staff of its awards (spec A36, G-K26) |
| DELETE | `/api/departments/:id/staff/:userId` and `/jury/:userId` | The department's head (the leader gets `403`) | — | `204`. `409` while the person has work there (awards they run; applications assigned to them) (G-K27) |
| POST | `/api/departments/:id/people/:userId/temporary-password` | The head, for its staff and jury; the leader, only for someone who heads a department (a locked-out head) | — | `200 { person, temporaryPassword }`: the old password stops working and every session ends; audited without the password. `409` for your own account (use My profile) |
| GET | `/api/departments/:id/theme` | The department's head; the leader, to view | — | `Theme` |
| PUT | `/api/departments/:id/theme` | The department's head | `{ primaryColour, accentColour, footerText? }`; colours as `#RRGGBB`, the footer up to 200 characters (empty shows the department's name) | `200 Theme`. Every award page of the department shows it at once; audited with before and after |

**DepartmentSummary**: `{ id, name, externalOrganiser, colours: { primary, accent } | null, heads: [Person], counts: { staff, jury, awards }, award: { id, name } | null }` (an award department runs at most one award, ADR 0021)

**Person**: `{ id, name, email, waitingForFirstLogin }` (`waitingForFirstLogin`: still on the temporary password)

**People**: `{ department: { id, name, externalOrganiser }, canManage, heads: [Person & { canIssuePassword }], staff: [ListedPerson], jury: [ListedPerson] }`. `canManage` is true for the department's head (never the leader). A ListedPerson adds `canIssuePassword`, `workCount` (staff: awards in the department; jury: assignments there) and `canRemove` (the caller manages the lists and the person has no work there).

**Theme**: `{ department: { id, name }, primaryColour, accentColour, footerText, canEdit, awards: [{ id, name, slug, live }] }`. `canEdit` is true for the department's head; `live` means an edition is published, so the page is public.

## Award setup (staff of the award)

Staff create their award department's **one award** (ADR 0021); every staff member of the department then runs it, and only they see or change it (others get `403`). Each year's run of an award is an **edition** (a cycle), and **one edition runs at a time**. A new edition starts as a draft with one written round (document review, 1 juror per application, results Shortlisted / Rejected), no categories, an empty questionnaire and an empty scoring sheet. Times are sent as ISO 8601 with their offset (the screens send India time, `+05:30`); money is whole paise.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/awards/mine` | — | `[Award]`: every award the caller runs, across departments |
| POST | `/api/awards` | `{ departmentId, name, domainId, description }` (the domain from `/api/master-data/award-domains`) | `201 Award`; its page address is made from the name (`-2`, `-3` if taken). `409 { reason: "DEPARTMENT_HAS_AWARD" }` if the award department already runs its award (also when two staff create one at once); `403` if the caller isn't the department's staff |
| GET | `/api/awards/:id` | — | `Award` |
| PUT | `/api/awards/:id/site` | `{ slug }`: 2 to 60 lower-case letters, digits and single hyphens | `200 { slug }`. Also the department's head (ADR 0020); the leader gets `403`. `400` on `slug` if another award uses it; audited |
| POST | `/api/awards/:id/cycles` | `{ label, opensAt, deadlineAt }` | `201 CycleSetup` (draft). `400` if the deadline isn't after the opening, or the label is taken in this award. `409 { reason: "EDITION_RUNNING" }` while another edition is still being set up or running: the next one starts once its results are published, or once its deadline passed with nothing submitted |
| GET | `/api/cycles/:id` | — | `CycleSetup` |
| PATCH | `/api/cycles/:id` | Any of `{ label, opensAt, deadlineAt, feePaise, blindJudging, maxEntries }`; `maxEntries: null` means no limit | `200 CycleSetup`. Once published, only `maxEntries` may change (`409 SETTINGS_FIXED` otherwise); `400` on `maxEntries` below the number already submitted; audited |
| POST | `/api/cycles/:id/categories` | `{ name, feePaise? }`; `feePaise: null` uses the edition's fee | `201 CycleSetup`. `400` on `name` for a duplicate (letter case ignored); `409 SETTINGS_FIXED` once published |
| PATCH / DELETE | `/api/cycles/:id/categories/:categoryId` | `{ name?, feePaise? }` | `200 CycleSetup`; only in a draft |
| PATCH | `/api/rounds/:id` | Any of `{ juryMin, juryMax, resultLabels: [{ label, advances }] }` (at least 1 juror; 2 to 6 results with different names) | `200 CycleSetup`. `400` if the minimum is above the maximum; `409` once judging has started in the round; audited |
| POST | `/api/cycles/:id/publish` | — | `200 CycleSetup`. `409` with `details.reason: "PUBLISH_BLOCKED"` and `details.issues` listing everything still missing, or if already published; the award page goes live with it |

**Award**: `{ id, name, description, department: { id, name }, domain: { id, name }, siteSlug, cycles: [{ id, label, status, state, opensAt, deadlineAt, roundId }], newEditionBlockedReason }` (`roundId`: the edition's judging round, Step 1.4; `newEditionBlockedReason`: why a new edition can't start yet, or `null`). `GET /api/awards/mine` lists the award of every award department the caller is staff of

**CycleSetup**:

```json
{
  "id": "…", "label": "2026", "status": "DRAFT", "state": "DRAFT",
  "opensAt": "2026-10-11T03:30:00.000Z", "deadlineAt": "2026-11-15T18:29:00.000Z", "publishedAt": null,
  "feePaise": 1000000, "blindJudging": true, "maxEntries": null,
  "award": { "id": "…", "name": "Safety Excellence Award", "department": { "id": "…", "name": "Safety, Health and Environment" }, "siteSlug": "safety-excellence" },
  "categories": [{ "id": "…", "name": "Manufacturing sites", "feePaise": null }],
  "round": { "id": "…", "number": 1, "type": "DOCUMENT_REVIEW", "juryMin": 2, "juryMax": 3,
             "resultLabels": [{ "label": "Shortlisted", "advances": true }, { "label": "Rejected", "advances": false }],
             "juryAvailable": 3 },
  "publishIssues": ["Publish the questions first: there is no published version yet.", "Scoring sheet: The scoring sheet needs at least one section with an indicator."],
  "settingsFixed": false
}
```

- `state` is worked out from the status and the clock: `DRAFT`, `SCHEDULED` (published, not open yet), `OPEN`, `CLOSED` (past the deadline).
- `publishIssues` is what still stops publishing, as sentences staff can act on: at least one category, a future deadline, a published question version, a complete scoring sheet, at least two results, and a jury list at least as long as `juryMax`. `juryAvailable` is the number of people on the department's jury list.
- `settingsFixed`: published, so the name, dates, fee, blind judging and categories can't change.

## Questions (form versions, rule R4)

Staff edit a draft and publish it as numbered versions. A published version never changes (the database refuses it too), and an application keeps the version it started with. Inside an edition a published section, question or choice can't be removed and a published question can't change its type. Keys (`sec_…`, `q_…`, `opt_…`) are made by the server and never reused; the builder sends `key` only for items that already exist. After the deadline the questions can't change (`409`).

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/cycles/:id/form` | — | `FormBuilder` |
| PUT | `/api/cycles/:id/form-draft` | `{ sections: [{ key?, title, description?, questions: [Question] }] }` | `200 FormBuilder`. `400` with a `details` entry per problem, by path (`sections.0.questions.2.label`) |
| POST | `/api/cycles/:id/form-versions` | `{ changeSummary }` | `201 FormBuilder`: the saved draft becomes the next version. `400` if a section has no questions or the form is empty; `409` if nothing changed since the last version |
| GET | `/api/cycles/:id/form-versions/:version` | — | `{ version, changeSummary, publishedAt, publishedBy, definition: { sections } }` |

**Question**: `{ key?, type, label, help, required }` plus, by type: `SHORT_TEXT` and `LONG_TEXT` `maxLength` (empty: 300 and 5,000; at most 1,000 and 20,000) · `NUMBER` `min`, `max` · `SINGLE_CHOICE` `options: [{ key?, label }]` (at least two, different wording) · `YES_NO` nothing more · `FILE_UPLOAD` `maxFiles` (1–10), `fileTypes` (`pdf`, `jpg`, `png`, `docx`, `xlsx`). Only the fields a type uses are stored.

**FormBuilder**: `{ cycleId, draft: { sections }, versions: [{ version, changeSummary, publishedAt, publishedBy }], latestVersion, hasUnpublishedChanges, publishedKeys, locked }`

## Scoring sheet (ADR 0019)

One sheet per round: sections with whole-percent weights, each holding indicators with their own whole-percent weights; each indicator scores one question and is marked 0 to 10 (`SCORE`) or Yes/No (`YES_NO`, counted as 10 or 0). Applicants never see it. Staff can save it in any state while building it; the publish check needs every total at 100% and every indicator pointing at a published question. It locks when the first score is saved (Step 1.4).

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/rounds/:id/scoring-sheet` | — | `ScoringSheet` |
| PUT | `/api/rounds/:id/scoring-sheet` | `{ sections: [{ key?, title, weight, indicators: [{ key?, label, type, weight, questionKey }] }] }`; weights whole numbers 1–100 | `200 ScoringSheet`. `400` by path for a missing name or weight, or a question that isn't in the form; `409` once locked |

**ScoringSheet**: `{ roundId, sections, locked, totals: { sections, bySection: { [sectionKey]: total } }, issues: [string], questions: [{ key, label, type, published }] }`

The arithmetic, used from Step 1.4: one juror's points `P = Σ W × w × v` (a whole number from 0 to 100,000); the final score over `n` submitted evaluations `F = ⌊(ΣP + 5n) ÷ (10n)⌋ ÷ 100`, rounded once, half up, to two decimals; equal scores share a rank (1, 2, 2, 4).

## Award pages and Open awards (public, no login)

Each award has one public page at `/awards/<slug>` in its department's colours. The dates, categories, fees and the entry counter are read live from the edition, never copied (spec §5.19). Drafts are never public. The department's head chooses the theme (`PUT /api/departments/:id/theme`); the award's staff or the head choose the address (`PUT /api/awards/:id/site`); the full site builder is package 2.2.

| Method | Path | Response |
|---|---|---|
| GET | `/api/public/awards` | `[PublicAward]`: published editions between their opening date and their deadline, nearest deadline first |
| GET | `/api/public/awards/:slug` | `PublicAward`: the open edition, or else the latest published one. `404` for an unknown address or an award with only drafts |

**PublicAward**:

```json
{
  "slug": "fpo-excellence", "name": "FPO Excellence Awards", "description": "…", "domain": "Agriculture and Farmer Producer Organisations",
  "department": { "name": "FPO Awards team", "externalOrganiser": true, "colours": { "primary": "#2E7D32", "accent": "#F9A825" }, "footerText": "…" },
  "cycle": {
    "id": "…", "label": "2026", "opensAt": "…", "deadlineAt": "…", "state": "OPEN", "blindJudging": false,
    "categories": [{ "name": "Women-led FPO", "feePaise": 0 }],
    "fee": { "fromPaise": 0, "toPaise": 0 },
    "entries": { "submitted": 0, "limit": 500 }
  }
}
```

Never in a public response: people, applications, or anything an applicant entered.

## Applying (applicant accounts; spec §5.2, §5.6, §5.20)

Only an applicant account applies, for an organisation it belongs to (ADR 0016). **One application per organisation per edition, blocked at the start** (ADR 0011): the service checks, and a partial unique index decides when two colleagues start at the same moment. Only the person who started an application opens and changes it; a colleague sees its status in My applications, never who started it, and anyone else gets `404`. Every write checks the deadline (`409 DEADLINE_PASSED` after it).

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/cycles/:id/apply` | — | `ApplyInfo`: the edition, its categories with their fees, the counter, and each of the user's organisations with its active application (status only, unless the user started it). `404` for a draft |
| POST | `/api/cycles/:id/applications` | `{ categoryId, organisationId? }` (`organisationId` only when the user belongs to several) | `201 Application`. `409 ALREADY_STARTED` with `details.status` ("Your organisation already has an application for this award (Pending)."); `409 NO_ORGANISATION`; `409` before the opening or after the deadline; `400` on `categoryId` for another award's category |
| GET | `/api/applications/mine` | — | `[MyApplicationRow]`: the user's own applications, and their colleagues' active ones (status only) |
| GET | `/api/applications/:id` | — | `Application` (the starter only) |
| PATCH | `/api/applications/:id` | `{ categoryId }` | `200 Application`: the category can change while it is a draft and the fee isn't paid (`409 FEE_PAID` after) |
| POST | `/api/applications/:id/payment` | — | `200 Application`: the **demo payment** of the fee (the category's own fee, else the edition's) with a made-up reference `DEMO-…`; the form opens. `409` if free or already paid |
| PUT | `/api/applications/:id/answers` | `{ answers: { [questionKey]: value \| null } }`: text, a number, a choice's option key, or `true`/`false`; `null` or empty text clears | `200 { application, problems: [{ questionKey, message }] }`. **Autosave:** each answer is checked against its question; a wrong one is reported in `problems` with its own message and not saved, while the others are. `409 FEE_UNPAID` until the fee is paid; `409 NOT_A_DRAFT` once submitted |
| POST | `/api/applications/:id/files` | `{ questionKey, fileName, contentType, sizeBytes }` | `201 { fileId, upload }`: a file for a file question, within the kinds and the number of files it takes; up to 10 MB. `409 TOO_MANY_FILES` |
| PUT | `/api/applications/:id/files/:fileId` | — | `200 Application`, after the upload: the content must match the declared type |
| DELETE | `/api/applications/:id/files/:fileId` | — | `200 Application`: takes a file off a draft (kept, marked removed) |
| POST | `/api/applications/:id/employment-proof/uploads` | `{ fileName, contentType, sizeBytes, documentDate: "YYYY-MM-DD", consent: true }` | `201 { fileId, upload }`. The date on the document must be within the 3 months before today (India time) and not in the future (`400` on `documentDate`). Allowed on a draft, or after staff reject the proof, until the deadline |
| PUT | `/api/applications/:id/employment-proof` | `{ fileId }` | `200 Application`: the new proof becomes the current one (the old one is kept, marked replaced); after a rejection the check is pending again |
| POST | `/api/applications/:id/submit` | — | `200 Application`. `400` with every missing item in `details` (`answers.<key>`, `fee`, `employmentProof`, `profile.identityDocument`, `profile.linkedinUrl`); `409 ENTRY_LIMIT` ("This award has reached its entry limit."). The limit is checked in the same transaction that locks the cycle, so two applicants never both take the last place. Records the version of the questions (R4), the organisation's snapshot, and the identity document and LinkedIn link it uses; queues the confirmation to the applicant and the organisation's official email |

**Application** (the starter's view):

```json
{
  "id": "…", "status": { "code": "PENDING", "label": "Pending", "message": "Your application is not submitted yet." },
  "award": { "name": "Safety Excellence Award", "slug": "safety-excellence" },
  "cycle": { "id": "…", "label": "2026", "opensAt": "…", "deadlineAt": "…", "blindJudging": true },
  "organisation": { "id": "…", "legalName": "Acme Steel Ltd" }, "category": { "id": "…", "name": "Manufacturing sites" },
  "categories": [], "canChangeCategory": false,
  "fee": { "amountPaise": 1000000, "paid": true, "paidAt": "…", "reference": "DEMO-4F2A91C0D3" },
  "form": { "version": 1, "sections": [] }, "answers": { "q_…": "Every shift starts with a safety talk." },
  "files": { "q_…": [{ "id": "…", "fileName": "audit.pdf", "mimeType": "application/pdf", "sizeBytes": 20480, "uploadedAt": "…" }] },
  "employmentProof": { "id": "…", "fileName": "id-card.pdf", "documentDate": "2026-10-05", "mimeType": "…", "sizeBytes": 1, "uploadedAt": "…" },
  "profile": { "identityDocument": { "fileName": "passport.pdf", "uploadedAt": "…" }, "linkedinUrl": "https://www.linkedin.com/in/…" },
  "proof": { "status": "PENDING", "note": null, "checkedAt": null },
  "progress": { "answered": 4, "total": 6, "sections": [{ "key": "sec_…", "answered": 2, "total": 3 }] },
  "missing": [{ "path": "answers.q_…", "message": "\"Employees\" needs an answer." }],
  "entries": { "submitted": 41, "limit": null },
  "editable": true, "canReplaceProof": true, "submittedAt": null, "lockedAt": null
}
```

- `status` is what the applicant sees (spec §4): **Pending**, **Submitted**, **Under review** (submitted, past the deadline), **Not submitted** (a draft past the deadline), **Withdrawn**, **Closed** (released by staff, with the reason). Result labels arrive with Step 1.4.
- `form` is the latest published version while the application is a draft, and its own pinned version from submitting on (rule R4).
- `missing` lists what still stops submitting, only for an open draft.
- **The deadline lock** runs on the first use of the edition after its deadline (no scheduled job): the edition becomes Closed, drafts become Not submitted, and submitted applications keep their final organisation snapshot and proof.

**MyApplicationRow**: `{ id, mine, award: { name, slug }, cycle: { id, label, deadlineAt }, organisation: { id, legalName }, status, category, proof }`; `category` and `proof` only on the user's own rows.

## Checking applications (staff of the award; spec §5.20, §5.2)

The award's staff list the applications, check each one's proof and release a wrong one. The department's head and the leader may read the list and the applications, never change them; jury get `403`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/cycles/:id/applications` | Query: `status`, `categoryId`, `proof` (`proof` looks at submitted applications) | `200 { cycle, entries, counts: { byStatus, byProof }, categories, applications: [StaffApplicationRow] }` |
| GET | `/api/applications/:id/review` | — | `StaffApplication`: the organisation (the snapshot once submitted, frozen at the deadline), who started it, the fee, the answers and files, the employment proof with its date, the identity document and LinkedIn link it uses, the proof check, `canCheckProof`, `canRelease` |
| POST | `/api/applications/:id/proof-check` | `{ decision: "VERIFIED" }` or `{ decision: "REJECTED", note }` (a rejection needs its reason) | `200 StaffApplication`. Only a submitted application; audited. A rejection emails the applicant, who can fix it until the deadline (on the profile, or with a new employment proof), after which the check is pending again. Once verified, the application keeps the identity document and link staff checked |
| POST | `/api/applications/:id/release` | `{ reason }` | `200 StaffApplication`: the application is kept as Released with the reason, and the organisation can start a new one. One transaction with its audit event; refused once judging has started. API only in Phase 1 (the screen is Phase 2) |

**StaffApplicationRow**: `{ id, organisation: { id, legalName }, startedBy: { name, email }, category, status, statusLabel, proofStatus, feeUnpaid, createdAt, submittedAt }`. The list's `cycle` carries `roundId` (its judging round, Step 1.4).

Once judging has started for an application (it has an evaluation), or the round has gone for approval, its proof check can't change (`409`, Step 1.4).

## Conflicts of interest (rule R2; spec §5.8)

"Jury member X has a conflict with organisation Y", for every award. Recorded in an edition's context by the award's staff or its department's head (the leader and jury get `403`): the juror must be on the department's jury list and the organisation must have applied to the edition.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/cycles/:id/conflicts` | `{ juryUserId, organisationId, note? }` | `201 { conflict: ConflictRow, revoked, flagged }`. Every unsubmitted evaluation of the pair, in any award still being judged, is taken back with the reason "A conflict of interest with this organisation was recorded." (`revoked`); submitted ones are flagged for staff and still count (`flagged`; decided 11 Oct). `409` if already recorded |
| POST | `/api/cycles/:id/conflicts/:conflictId/remove` | `{ reason }` | `204`. A conflict recorded by mistake is kept, marked removed with who, when and why (decided 11 Oct); the pair can be assigned again |

**ConflictRow**: `{ id, juror: { id, name, email }, organisation: { id, name }, note, recordedBy, recordedAt }`

## Assigning applications to jury (staff of the award; spec §5.8, ADR 0013, ADR 0017)

After the deadline, staff give each application between the round's minimum and maximum of different jury from the award's department list. The department's head and the leader read the board; only the award's staff change it.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/rounds/:id/assignment-board` | — | `AssignmentBoard`: the round, the jury on the list, the most jury any application has, each submitted application (`eligible` when its proof is verified; `assigned`, `submitted`, `needs`, `full`, its evaluations and the jury it is conflicted with), each juror (`assigned`, `submitted`, `pending`), the conflicts, the organisations that applied, counts, and `can: { assign, changeJuryPerApplication, recordConflicts }` with `assignBlockedReason` |
| POST | `/api/rounds/:id/assignments` | `{ applicationIds: [...], juryUserIds: [...] }` | `201 AssignmentBoard`. Each application gets every juror, all or nothing. Refused with `409 { reason: "ASSIGNMENT_REFUSED", problems: [{ applicationId, juryUserId, message }] }` for: before the deadline, a juror off the list (or one of the award's organisers), a recorded conflict, an application whose proof isn't verified or that isn't in the edition, the same juror twice, or going above the maximum (counted under a lock on each application, so two staff at once can't overfill one). The round moves to Judging; each juror gets one email with the count |
| POST | `/api/evaluations/:id/revoke` | `{ reason }` | `200 AssignmentBoard`. Only before the evaluation is submitted and before the round is sent; it is kept as Revoked with its draft marks |
| PATCH | `/api/rounds/:id` | `{ juryMin?, juryMax? }` | As in award setup. Once the edition is published the maximum can't exceed the department's jury list; it can change until the round is first sent for approval, never below the jury an application already has. The result names change only before judging starts |

## Judging (spec §5.9, rule R1, ADR 0018, ADR 0019)

A jury member reads and scores only their own evaluations: anyone else's, and a taken-back one, answer `404`. In a blind award the jury view has no organisation, applicant, file, proof or payment; in an award that isn't blind it has the organisation's name, type, city and state and the evidence files (decided 11 Oct), never its PAN, GSTIN, contacts or address, the applicant or the proof documents. No jury response carries a total, an average or another juror's work.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/jury/evaluations` | — | `JuryHome`: per department and award, the juror's evaluations (`reference`, `organisationName` only when not blind, `category`, `status`) with counts |
| GET | `/api/evaluations/:id` | — | `JuryEvaluation`: the sections and questions of the application's pinned version (R4), each with its answer as typed, its files (never in a blind award: `filesHidden`) and its indicators with weights; the juror's marks, comments and overall note; `canEdit`; `missing` (what still stops submitting) |
| PUT | `/api/evaluations/:id/scores` | `{ scores?: { [indicatorKey]: 0–10 or null }, comments?: { [questionKey]: text }, overallNote? }` | `200 JuryEvaluation`. A draft save (not audited): a score is a whole number 0 to 10, a Yes/No 1 or 0; `null` or an empty comment clears it. The first mark in the round locks its scoring sheet. `409` once submitted or once the round is no longer being judged |
| POST | `/api/evaluations/:id/submit` | — | `200 JuryEvaluation`. Needs every indicator and the overall note (`400` names what is missing); audited with the marks and points. Then the juror can't change it |
| GET | `/api/rounds/:id/judging` | — | `Judging` (staff, the head, the leader): the sheet, each submitted application with every juror's marks, points `P`, score and note, its final score `{ totalPoints: ΣP, count: n, display: F₂ }` (live while judging, as stored once approved), its rank within the category, `tied`, `minimumMet` and result; the categories, the approval requests, `sendBlockers`, the result labels and `can: { correctScores, sendForApproval, approve, decideResults, publishResults }` |
| POST | `/api/evaluations/:id/score-changes` | `{ changes: [{ indicatorKey, value }], reason }` | `200 Judging`. Staff only, on a submitted evaluation, while the round is judging or waiting for approval (decided 11 Oct). Each change and its audit event (who, role, when, old value, new value, reason) are one transaction (rule R3). `409` after approval; the database refuses it too |

## Approval (department head; spec §5.11)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/rounds/:id/send-for-approval` | — | `200 Judging`. Staff only. Refused with `409 { reason: "SEND_BLOCKED", issues }` while an application's proof is still unchecked (decided 11 Oct), no application is judged, one has fewer submitted evaluations than the minimum, or an evaluation is unfinished. The round waits for approval; the department's heads are emailed; assignments and the jury per application are fixed from then on |
| GET | `/api/approvals` | — | `{ pending, decided }`: the rounds sent to the heads of the actor's departments (the leader sees all of them, read-only) |
| POST | `/api/rounds/:id/approve` | `{ remark? }` | `200 Judging`. Only the head of the award's department (`403` for the leader and staff). In one transaction under the round's lock: each application's final score `F₂` is stored with `ΣP` and `n` and its rank within its category; an application whose proof was rejected gets the round's not-advancing result, unjudged; the round locks for good. Send back comes in Phase 2 |

## Results (staff of the award; spec §5.12)

| Method | Path | Body | Response |
|---|---|---|---|
| PUT | `/api/rounds/:id/results` | `{ mode: "TOP_N", n, selected?, others? }`, `{ mode: "MIN_SCORE", minScore: "70.00", selected?, others? }` or `{ mode: "MANUAL", labels: [{ applicationId, label }] }` | `200 Judging`. Only after approval. Top N is the top N of each category (ties at the cut all get in); the minimum compares the stored final score. `selected` defaults to the round's advancing result, `others` to its first not-advancing one. An unjudged application's result is fixed |
| POST | `/api/rounds/:id/publish-results` | — | `200 Judging`. Needs a result for every application. Applicants then see it (`status.code: "RESULT"`, the label and its message); each applicant and organisation official email gets an email; after the cycle's last round the cycle becomes Results published |

## History and the dashboard (spec §5.14, §5.15)

| Method | Path | Response |
|---|---|---|
| GET | `/api/applications/:id/history` | `[HistoryEvent]`, newest first: `{ id, at, action, summary, actor, actorRole, reason, before, after }`. The award's staff, its department's head and the leader; jury and applicants get `403` |
| GET | `/api/reports/dashboard` | `Dashboard`: the leader sees every department (`scope: "PLATFORM"`), a department head their own (`"DEPARTMENTS"`); staff, jury and applicants get `403`. Totals, rounds waiting for approval, deadlines in the next 30 days, and per department, award and edition: its state, applications by status, proof checks, and the round's status with evaluations submitted and applications at the minimum. Counts only |

## Reading a file (GAPS G-B03)

| Method | Path | Response |
|---|---|---|
| GET | `/api/files/:id` | `200 { url, fileName, contentType, expiresAt }`: a link valid for 2 minutes that downloads the file as an attachment. The applicant reads their application's files and their own identity document; the award's staff, its department's head and the leader read an application's files and the identity document it uses. A jury member reads the evidence files of an application assigned to them in an award that isn't blind (Step 1.4); never in a blind award and never a proof document. Anyone else gets `404` |
