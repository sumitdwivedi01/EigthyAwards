# API contract

The contract between `Front-End/` and `Backend/` (GAPS G-B10). It's updated in every backend phase. Every endpoint lives under `/api`. The frontend calls it through its own `/api/*` proxy, so the session cookie stays first-party (ADR 0003).

## Conventions

- **JSON in, JSON out.** Request bodies are limited to 1 MB (files use a separate upload flow, from Phase 6).
- **Errors** always have this shape:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.", "details": [{ "path": "pan", "message": "..." }] } }
  ```

  | Status | `code` | When |
  |---|---|---|
  | 400 | `VALIDATION_ERROR`, `MALFORMED_JSON` | Input failed its schema, or the body isn't JSON |
  | 401 | `UNAUTHENTICATED` | Not logged in |
  | 403 | `FORBIDDEN` | Role or scope doesn't allow it |
  | 404 | `NOT_FOUND` | Missing, or exists but isn't yours to see |
  | 409 | `STATE_CONFLICT` | Valid request, but the current state forbids it (past the deadline, approved round, …) |
  | 413 | `PAYLOAD_TOO_LARGE` | Body over 1 MB |
  | 500 | `INTERNAL` | Unexpected; no details are ever sent |

- **Request id.** Every response carries `x-request-id` (sent back if the client supplied a valid one). Quote it when reporting a problem.
- **Times** are ISO 8601 in UTC. The frontend shows them in India time.
- **Money** is integer paise (₹1 = 100 paise).

## Endpoints

### Platform

| Method | Path | Who | Response |
|---|---|---|---|
| GET | `/api/health` | Anyone | `200 { "status": "ok", "db": "up" }`, or `503 { "status": "degraded", "db": "down" }` |

*Phase 2 adds identity, departments, master data and organisations.*
