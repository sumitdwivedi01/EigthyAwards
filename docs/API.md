# API contract

The contract between `Front-End/` and `Backend/` (GAPS G-B10). It's updated in every step that adds endpoints. Every endpoint lives under `/api`. The browser calls it through the frontend's own `/api/*` proxy, so the session cookie stays first-party (ADR 0003).

Status: **Step 1.1** (identity, My profile, master data, organisations). Award setup arrives in Step 1.2.

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
  | 403 | `FORBIDDEN` | Role or scope doesn't allow it, the account is of the wrong kind (ADR 0016), or the write came from another site |
  | 404 | `NOT_FOUND` | Missing, or exists but isn't yours to see |
  | 409 | `STATE_CONFLICT` | Valid, but the current state forbids it. `details.reason` may name it, e.g. `PAN_REGISTERED` |
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
  "passwordChangedAt": null, "linkedinUrl": null, "identityDocument": null,
  "roles": [{ "role": "DEPT_STAFF", "department": { "id": "…", "name": "FPO Awards team" }, "award": null, "cycle": null }],
  "organisations": [],
  "areas": ["staff"],
  "home": "staff"
}
```

- `accountType` (ADR 0016): `APPLICANT` (made by registering; applies for its organisation, keeps the LinkedIn link and identity document, never holds a role) or `PLATFORM` (the leader, department heads, staff and jury; holds roles, never applies). Someone who does both has two accounts, with two emails.
- `areas` are the parts of the app the user may open (`leader`, `department`, `staff`, `jury`, `applicant`). An applicant account has exactly `["applicant"]`; a platform account has one area per kind of role it holds.
- `home` is where they land after logging in. A platform account with no role yet (a juror before staff add them to a cycle's pool) has no area, and `home` is `null`.

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
