# 0003. Our own authentication in the API; session cookie through the Next.js proxy

- Status: **Accepted** (6 Oct 2026, GAPS A3). Verified on the real hosts in the Phase 5 skeleton check (renumbered on 7 Oct).
- Date: 2026-10-04
- Related gaps: G-B02, G-B11, G-B15, G-C05, G-C12

## Context

The spec chose Auth.js inside the single Next.js app (§9). After ADR 0001 the API lives on another site (`*.onrender.com`) from the frontend (`*.vercel.app`). The spec's requirements still hold:

- Email and password login for everyone.
- Applicants register themselves; everyone else is invited (leader → PAs; leader or PA → department heads; department head, leader or PA → staff; staff or department head → jury). Accounts can be deactivated (ADR 0005), and deactivation ends sessions at once through `sessionVersion`.
- Expiring password-reset links.
- **Role assignments loaded from our database on every request.** The UI never decides permissions.

## Options

1. **Supabase Auth.** Hosted, handles reset emails. But our roles would still live in our tables; invites, scopes and emails would be split between two systems; and the spec turned down hosted auth "for control over roles".
2. **Auth.js in Next.js, with the API verifying its JWT.** Two places own identity, the secret must be shared, and invites and resets still have to live in the API.
3. **Our own auth in the API** ← chosen. Passwords hashed with bcrypt. An `AuthToken` table for invite and reset links (hashed, single use, expiring). A signed session JWT that carries only the user id and a session version, stored in an **httpOnly, Secure, SameSite=Lax** cookie. The actor middleware loads the user and all scoped roles from the database on every request.

How the cookie travels:

- **a. Through the Next.js rewrite proxy** ← chosen. The browser only talks to the Vercel origin. `/api/*` is rewritten to the Render API, so the cookie is first-party.
- b. A direct cross-site call with a `SameSite=None` cookie. Safari blocks it, so this is not reliable.
- c. A bearer token held in browser memory or storage. It works everywhere, but JavaScript can read the token (an XSS risk) and refreshing pages needs extra code. This is the **fallback** if (a) fails.

## Decision

Option 3 with transport (a).

## Why

- One place owns identity, sessions, invites and resets: the identity module.
- Roles are always read fresh from the database, as the spec requires. The token only names the user.
- JavaScript cannot read the cookie, and no third-party cookies are needed.
- Logging out everywhere and resetting a password both just increment `sessionVersion`.

## Consequences

- Every API call goes through one extra hop (Vercel → Render). **File bytes must not go through the proxy**; they use signed storage URLs (G-B03).
- CSRF protection: SameSite=Lax, the `Origin` header is checked on writes, and the CORS allowlist holds only the frontend origin (G-B11).
- Rate limiting on login and reset (G-C12).
- In local development, Next.js rewrites `/api/*` to `http://localhost:4000`, so production and local behave the same.
- Must be **verified on the real hosts**. That happens in the Phase 5 skeleton check (GAPS A2), and again in Phase 14.

## What would change our mind

- The Vercel proxy turns out unreliable (timeouts, header stripping, latency): switch to transport (c) behind the same api-client.
- The client asks for single sign-on with their member portal: add an OIDC provider and keep our role tables.
