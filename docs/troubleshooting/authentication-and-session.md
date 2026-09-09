# Authentication & Session

Session/cookie mechanics and CSRF posture in depth:
[../security/authentication.md](../security/authentication.md) and
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md).
This document covers diagnosis only.

**401 vs. 403 - always distinguish these:**
- **401** = authentication/session problem (no valid token, expired token,
  not logged in).
- **403** = authenticated successfully, but the account lacks the
  capability/permission for that action.

## Symptom: login rejected

### Likely causes
- Wrong password - `MOT_DE_PASSE_INVALIDE`.
- Account has no password set yet (first login expects OTP instead) -
  `MOT_DE_PASSE_NON_DEFINI`.
- Account locked from repeated failures - `COMPTE_BLOQUE`.
- Account inactive.
- Matricule doesn't exist - `COMPTE_INTROUVABLE`.

### Checks
Read the response body's `code` field - the server returns a distinct code
per cause (see above), not a generic failure message. Do not guess from the
HTTP status alone.

### Safe corrective actions
Confirm the matricule format matches the documented convention (4-digit,
leading zeros preserved) before assuming the password is wrong. For a
locked or genuinely forgotten-password account, use the password-reset
flow rather than repeated login attempts, which extends the lockout.

### Escalate when
The account is confirmed active, matricule and password are confirmed
correct, and login still fails with `COMPTE_INTROUVABLE` or an unexpected
code.

---

## Symptom: account locked

### Likely causes
Repeated failed login/OTP attempts trip a lockout (`COMPTE_BLOQUE`,
enforced via a `bloqueJusquA` timestamp on the user record).

### Checks
Response code `COMPTE_BLOQUE` confirms this directly - no further
diagnosis needed to identify the cause.

### Safe corrective actions
Wait out the lockout window, or have an admin/super_admin unlock the
account through the user management screen if that capability exists in
the UI. Do not attempt to bypass the lockout by calling the endpoint
repeatedly - it will not help and may extend the lock.

### Escalate when
The lockout doesn't clear after its expected window, or the account locks
again immediately after being unlocked (possible credential-stuffing
attempt against that account, not just user error).

---

## Symptom: first-login OTP expired, or OTP email not received

### Likely causes
- OTP validity window passed (`OTP_EXPIRE`) - `OTP_EXPIRY_MINUTES`
  (default 10) controls this.
- OTP was never generated for this login attempt (`OTP_NON_GENERE`).
- Wrong code entered (`OTP_INVALIDE`) - this also counts as a failed
  attempt toward lockout.
- Email never sent or never arrived - most commonly because SMTP isn't
  configured/reachable in this environment (see
  [startup-and-bootstrap.md](./startup-and-bootstrap.md) - SMTP failures at
  boot are logged as a non-fatal warning, not surfaced to the end user).

### Checks
```bash
docker compose logs api | grep -i smtp
```
Confirms whether the server believes SMTP is working at all in this
environment - a failed SMTP connection explains a missing OTP email
directly.

### Safe corrective actions
Re-trigger login to generate a fresh OTP rather than reusing an expired
one. If SMTP is confirmed down in this environment, that's an
infrastructure/configuration issue (see
[../operations/configuration-reference.md](../operations/configuration-reference.md#smtp)),
not something to fix by disabling the OTP requirement.

### Escalate when
SMTP is confirmed reachable and correctly configured, but OTP emails still
don't arrive - check the mailbox side (spam filtering, quota) rather than
assuming the application is at fault.

---

## Symptom: password reset flow fails

### Likely causes
- Password/confirmation mismatch (`MOTS_DE_PASSE_DIFFERENTS`).
- Current password check fails during an authenticated change
  (`MOT_DE_PASSE_ACTUEL_INVALIDE`).
- Target user has no email on file (`EMAIL_MANQUANT`), if the flow is
  email-initiated.
- Password fails complexity requirements - same policy enforced at
  bootstrap (minimum length + uppercase + digit + special character).

### Checks
Read the response `code` field as above - each failure mode is distinct
and named.

### Safe corrective actions
Confirm the new password meets the documented complexity policy before
retrying. Do not weaken the password policy as a workaround.

### Escalate when
All inputs are confirmed valid and the reset still fails.

---

## Symptom: repeated 401 responses

### Likely causes
- Access token cookie (`sicot_access`, 15 min lifetime) expired -
  server explicitly returns `{code: 'TOKEN_EXPIRED'}` for this case,
  distinct from a plain "not authenticated" 401.
- No cookie present at all - browser never sent it (see cookie-missing
  symptom below), or client never called the refresh endpoint.
- Refresh token also expired (7 days) - a full re-login is required at
  that point, not just a refresh.

### Checks
Browser DevTools -> Application/Storage -> Cookies: confirm `sicot_access`
and `sicot_refresh` are actually present for the current origin. Check the
401 response body for `code: 'TOKEN_EXPIRED'` specifically - the client is
expected to call `POST /api/auth/refresh` automatically on that code.

### Safe corrective actions
Confirm the client is actually calling `/api/auth/refresh` when it sees
`TOKEN_EXPIRED` - if it isn't, that's a client-side integration bug, not a
server misconfiguration. If both cookies are absent, this is a cookie
delivery problem (see below), not a token-expiry problem.

### Escalate when
A valid, unexpired `sicot_access` cookie is confirmed present and the
server still returns 401.

---

## Symptom: repeated 403 responses

### Likely causes
The account is authenticated but lacks the required capability for that
specific action - this is authorization, not authentication. See
[../security/authorization.md](../security/authorization.md) for the
role → capability model.

### Checks
Confirm which capability the endpoint requires (per its entry under
[../api/endpoints/](../api/overview.md)) and whether the account's role
actually grants it.

### Safe corrective actions
If the account should have that capability, this is a role-assignment
question, not a bug to route around. Do not attempt to work around a 403
by hitting a different endpoint that happens to lack the same check -
verify the intended access model first.

### Escalate when
The account's role is confirmed to include the required capability per the
documented model, and the server still returns 403.

---

## Symptom: refresh fails

### Likely causes
- `sicot_refresh` cookie missing or expired (7-day lifetime).
- No server-side session revocation exists in this system - logout only
  clears cookies client-side, so a stolen/leaked refresh token remains
  valid until it naturally expires. This is a documented limitation, not a
  bug to diagnose around; see
  [../security/authentication.md](../security/authentication.md).

### Checks
Browser DevTools: confirm `sicot_refresh` is present and check its
expiry.

### Safe corrective actions
If the refresh cookie is genuinely expired, the correct outcome is a full
re-login - do not treat this as an error to suppress.

### Escalate when
A valid, unexpired refresh cookie is present and `/api/auth/refresh` still
fails.

---

## Symptom: cookies missing in the browser entirely

### Likely causes
- `secure: true` cookie flag (production only) combined with a non-HTTPS
  origin - the browser silently refuses to store the cookie.
- `sameSite: 'strict'` blocking the cookie on a cross-site navigation
  context.
- CORS misconfiguration preventing credentialed requests from succeeding at
  all.

### Checks
Browser DevTools -> Network tab: inspect the `Set-Cookie` header on the
login response directly, and check for console warnings about rejected
cookies (browsers usually explain why explicitly).

### Safe corrective actions
Confirm you're accessing the app over HTTPS in any environment where
`NODE_ENV=production` (which flips `secure: true`) - accessing a
production-configured backend over plain HTTP will silently drop cookies,
and this is expected behavior, not a bug.

**Do not disable `secure` or relax `sameSite` to "make login work"** -
these are deliberate CSRF/session protections documented in
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md).
If cookies genuinely can't be set given the real deployment topology,
that's a TLS/topology problem to fix at that layer, not a cookie-policy
problem to weaken.

### Escalate when
HTTPS is confirmed correct for the environment and cookies still aren't
set.

---

## Symptom: CORS / credentials misconfiguration

### Likely causes
`CORS_ORIGIN` doesn't exactly match the browser's origin (scheme + host +
port), or the client isn't sending credentials (`credentials: 'include'`)
on cross-origin requests.

### Checks
```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3001/api/health
```
Inspect the `Access-Control-Allow-Origin` and
`Access-Control-Allow-Credentials` response headers directly.

### Safe corrective actions
Set `CORS_ORIGIN` to the exact origin in use for that environment - see
[../operations/configuration-reference.md](../operations/configuration-reference.md#application--runtime).
**CORS is not a CSRF control** - do not treat a wildcard or overly-broad
`CORS_ORIGIN` as an acceptable quick fix; see
[../security/csrf-and-session-security.md](../security/csrf-and-session-security.md)
for why.

### Escalate when
The origin is confirmed exactly correct and CORS errors persist.
