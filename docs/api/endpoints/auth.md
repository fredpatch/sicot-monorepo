# Auth endpoints

Base path: `/api/auth`. Narrative usage flow: see
[../authentication.md](../authentication.md). Cryptographic/session detail:
[../../security/authentication.md](../../security/authentication.md),
[../../security/csrf-and-session-security.md](../../security/csrf-and-session-security.md).

## POST /api/auth/login
**Authentication:** public

Purpose: authenticate by matricule + password, or validate first-login OTP.

**Request**
- Body: `matricule` (required), `motDePasse` (normal login) or `otp`
  (first login).

**Response**
- Normal: `{ premiereConnexion: false, user }` + sets `sicot_access` and
  `sicot_refresh` cookies.
- First login: `{ premiereConnexion: true, message }` + sets a 5-minute
  temp `sicot_access` cookie only.

**Important errors:** 400 missing matricule; 401 `COMPTE_INTROUVABLE` /
`OTP_EXPIRE` / `OTP_INVALIDE` / `MOT_DE_PASSE_INVALIDE`; 423 `COMPTE_BLOQUE`.

## POST /api/auth/set-password
**Authentication:** required (temp token from OTP validation)

Purpose: set the real password on first login.

**Request:** body `motDePasse`, `confirmation` (required, must match, must
pass complexity policy).

**Response:** `{ message, user }` + sets full-lifetime cookies.

**Important errors:** 400 missing/mismatched fields, complexity failure.

## POST /api/auth/changer-mot-de-passe
**Authentication:** required

Purpose: self-service password change.

**Request:** body `motDePasseActuel`, `nouveauMotDePasse`, `confirmation`
(all required).

**Response:** `{ message }`.

**Important errors:** 400 missing/mismatched fields, complexity failure;
401 `MOT_DE_PASSE_ACTUEL_INVALIDE`.

## POST /api/auth/refresh
**Authentication:** public (reads the refresh cookie itself)

Purpose: exchange a valid refresh token for a new access token.

**Request:** none (cookie only).

**Response:** `{ message }` + sets a new access-token cookie.

**Important errors:** 401 missing/invalid refresh cookie (clears both
cookies on failure).

## POST /api/auth/logout
**Authentication:** required

Purpose: clear cookies and log a `DECONNEXION` audit entry.

**Request:** none.

**Response:** `{ message }` - always 200.

**Notes:** does not revoke tokens server-side - see the session-security
doc.

## GET /api/auth/me
**Authentication:** required

Purpose: current session's user profile.

**Response:** `{ id, matricule, nom, prenom, email, poste, service, direction, role, actif, createdAt, derniereConnexion }`.

**Important errors:** 404 if the user row is missing; 500 on failure.

**Notes:** error responses are hand-rolled here (`{ message }`, no `code`)
- see [../conventions.md](../conventions.md).
