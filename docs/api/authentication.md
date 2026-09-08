# SICOT API - Authentication

This is **API-facing behavior**: which endpoints exist, what to call and
when, what to expect back. For cryptographic detail (hashing algorithm,
JWT/cookie flags, CSRF posture, rate-limiting status), see
[../security/authentication.md](../security/authentication.md) and
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md) -
not duplicated here.

## Cookie-based, not Bearer-token

SICOT authenticates via **httpOnly cookies**, not an `Authorization: Bearer`
header. There is no bearer-token mode - every authenticated request must be
made with credentials/cookies included (e.g. `credentials: 'include'` in
`fetch`, or a client that persists cookies automatically). Cookie names:
`sicot_access` (15 min), `sicot_refresh` (7 days) - see the security doc for
flags.

## Endpoints

### POST /api/auth/login
**Authentication:** public

Log in with matricule + password, or matricule + OTP for first login.

- Body: `matricule` (required), `motDePasse` (normal login) or `otp`
  (first-login only) - `motDePasse` and `otp` are mutually exclusive paths,
  not both required.
- Normal login response: `{ premiereConnexion: false, user }` - sets both
  auth cookies.
- First-login OTP response: `{ premiereConnexion: true, message }` - sets
  only a temporary, 5-minute access cookie, scoped to unlock `set-password`
  below (it carries no real capabilities).
- Errors: 400 (missing matricule / missing password or OTP for that path),
  401 (`COMPTE_INTROUVABLE`, `OTP_EXPIRE`, `OTP_INVALIDE`,
  `MOT_DE_PASSE_INVALIDE`, etc.), 423 (`COMPTE_BLOQUE` - account locked out).

### POST /api/auth/set-password
**Authentication:** required (accepts the temporary 5-minute token from
first-login OTP validation)

Set the real password on first login, replacing the temporary token with
full session cookies.

- Body: `motDePasse`, `confirmation` (both required, must match, must pass
  the complexity policy - see security doc).
- Response: `{ message, user }` - sets both full-lifetime auth cookies.
- Errors: 400 (missing fields, password mismatch, complexity failure).

### POST /api/auth/changer-mot-de-passe
**Authentication:** required

Self-service password change (not first-login - requires knowing the
current password).

- Body: `motDePasseActuel`, `nouveauMotDePasse`, `confirmation` (all
  required).
- Response: `{ message }`.
- Errors: 400 (missing/mismatched fields, complexity failure), 401
  (`MOT_DE_PASSE_ACTUEL_INVALIDE`).

### POST /api/auth/refresh
**Authentication:** public (reads the refresh-token cookie itself, not the
access-token cookie)

Exchange a valid refresh-token cookie for a new access token.

- Body: none.
- Response: `{ message }` - sets a new access-token cookie.
- 401 if the refresh cookie is missing or invalid/expired - clears both
  cookies on failure, so the client should treat this as "must log in
  again," not retry.
- **This is when a 401 is expected as normal flow**, not an error state: a
  client should call this automatically whenever an API call returns 401
  with `code: 'TOKEN_EXPIRED'`, then retry the original request once.

### POST /api/auth/logout
**Authentication:** required

Clear both auth cookies and log a `DECONNEXION` audit entry.

- Body: none.
- Response: `{ message }` - always 200, even if the audit write itself
  fails (logged server-side, never surfaced to the client).
- **Important:** this does not revoke the tokens server-side - see
  [../security/csrf-and-session-security.md](../security/csrf-and-session-security.md).
  Any token issued before logout stays valid until it naturally expires.

### GET /api/auth/me
**Authentication:** required

Current session's user profile.

- Response: `{ id, matricule, nom, prenom, email, poste, service, direction, role, actif, createdAt, derniereConnexion }`.
  `derniereConnexion` is derived from the audit log (see
  [../security/audit-and-traceability.md](../security/audit-and-traceability.md)),
  not a stored column.
- Note: unlike the other five auth endpoints, this one's error responses are
  hand-rolled directly in the controller (`{ message }`, no `code` field) -
  see [conventions.md](./conventions.md) on error-shape inconsistency.

## When 401 is expected

- A request with no cookie at all, or an invalid one: `401 {"message":"Non authentifié."}`.
- A request with an expired access token: `401 {"message":"Session expirée.","code":"TOKEN_EXPIRED"}`
  - this is the signal to call `/api/auth/refresh` and retry, not a failure
  to surface to the user.
- Do not confuse 401 with 403 - 403 means the session is valid but lacks the
  required capability. See [conventions.md](./conventions.md).

## Admin-triggered reset

There is no self-service "forgot password" endpoint. Recovery goes through
`POST /api/users/:id/reinitialiser-otp` (documented in
[endpoints/users.md](./endpoints/users.md)) - an admin regenerates an OTP for
the target account, which then follows the same first-login OTP flow above.
