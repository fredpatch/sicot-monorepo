# SICOT - Authentication

How identities authenticate to SICOT. See also
[architecture/overview.md](../architecture/overview.md) for where auth fits
in the overall request flow.

## Login identity

Users authenticate with their **matricule** (staff/badge ID), not an email
address, plus a password -
[`auth.service.ts:login`](../../packages/server/src/modules/auth/services/auth.service.ts).
Email is used only for delivery (OTP, alerts), never as a login identifier.

## Password storage

Passwords are hashed with **bcrypt** (`bcryptjs`), cost factor **10**
(`SALT_ROUNDS`,
[`auth.constants.ts`](../../packages/server/src/modules/auth/services/auth.constants.ts)).
Never stored or logged in plaintext. Server-side complexity policy
(`validerForceMotDePasse`,
[`utils/password.ts`](../../packages/server/src/utils/password.ts)): minimum
8 characters, at least one uppercase letter, one digit, one non-alphanumeric
character. Enforced on every password-setting path (first-login activation,
self-service change) - not just displayed client-side.

## Initial activation / OTP

- **When used:** account activation (first login) and admin-triggered
  password reset. **Not used as ongoing multi-factor authentication** - a
  normal login after activation is matricule + password only, no recurring
  OTP step.
- **Generation:** 6-digit numeric code via `crypto.randomInt` (CSPRNG, not
  `Math.random`) -
  [`utils/otp.ts`](../../packages/server/src/utils/otp.ts).
- **Storage protection:** hashed with bcrypt before storage, same as
  passwords - never stored in plaintext.
- **Expiry:** configurable via the `otp_expiration_minutes` system parameter
  (default 10 minutes for reset OTPs; the initial-activation OTP generated at
  account creation uses a separate 15-minute default in
  [`users.service.ts`](../../packages/server/src/modules/users/services/users.service.ts)
  - two different call sites with different defaults, worth reconciling but
    not a security defect).
- **First-login flow:** matricule + valid OTP grants a **temporary access
  token, 5-minute lifetime**, scoped only to unlock `POST
  /api/auth/set-password`. This temporary token carries a sentinel role
  (`'premier_login'`) that has no entry in the capability registry, so it
  cannot authorize anything else.

## Account states

- **Active/inactive:** `users.actif` gates login entirely - an inactive
  account cannot authenticate (`COMPTE_INTROUVABLE`).
- **First login:** `users.premiereConnexion` routes the login flow through
  OTP instead of password (see above).
- **Failed-login tracking:** every failed OTP or password attempt increments
  `tentativesEchouees`
  ([`auth.helpers.ts:handleEchecConnexion`](../../packages/server/src/modules/auth/services/auth.helpers.ts)).
- **Account lockout:** after a configurable threshold
  (`lockout_max_tentatives`, default 5), the account is locked for a
  configurable duration (`lockout_duree_minutes`, default 30) via
  `users.bloqueJusquA`. Both thresholds are system parameters, not
  hardcoded.

## Password recovery

**Recovery is admin-triggered, not self-service.** There is no "forgot
password" endpoint. An administrator calls `POST
/api/users/:id/reinitialiser-otp`
([`users.route.ts`](../../packages/server/src/modules/users/routes/users.route.ts)),
which regenerates an OTP and routes the user back through the same
first-login OTP -> set-password flow described above.

## Trust boundaries

- **SMTP dependence:** OTP delivery (activation and reset) depends entirely
  on outbound email
  ([`utils/email.ts`](../../packages/server/src/utils/email.ts)). If SMTP is
  unavailable, no user can activate a new account or complete an
  admin-triggered reset until it recovers.
- **Personnel ANAC is not the authentication authority.** The external
  Personnel ANAC directory
  ([`utils/personnel-anac.ts`](../../packages/server/src/utils/personnel-anac.ts))
  is used for staff lookup/directory features only - the login flow never
  calls it. Authentication is entirely local to SICOT's own `users` table.
