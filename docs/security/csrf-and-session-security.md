# SICOT - CSRF & Session Security

The actual current posture of session/token handling, CSRF mitigation, CORS,
and rate limiting - including gaps, stated plainly rather than softened.

## Sessions / tokens

JWT-based, dual-token, delivered as cookies (not a header-based bearer
scheme) -
[`utils/jwt.ts`](../../packages/server/src/utils/jwt.ts),
[`middleware/auth.ts`](../../packages/server/src/middleware/auth.ts).

| | Access token | Refresh token |
|---|---|---|
| Cookie name | `sicot_access` | `sicot_refresh` |
| TTL | 15 minutes (5 minutes for the temporary first-login token) | 7 days |
| `HttpOnly` | yes | yes |
| `Secure` | only when `NODE_ENV === 'production'` - **not set in development** | same |
| `SameSite` | `strict` | same |
| Path/domain | not set (defaults) | same |

`SameSite=strict` means the cookie is not sent on cross-site navigations or
requests at all, including top-level GET navigations from an external link -
the strictest setting available.

**Logout is client-side cookie clearing only, not server-side session
revocation.** `POST /api/auth/logout` calls `clearAuthCookies()` (clears both
cookies) and writes an audit entry; it does not invalidate the token
itself. Because access and refresh tokens are stateless JWTs with no
revocation store (no denylist/allowlist table), **a token issued before
logout remains cryptographically valid until it naturally expires**, even
though the browser has discarded its cookie. This is standard stateless-JWT
behavior, not a bug - documenting it explicitly because it's easy to assume
otherwise.

`POST /api/auth/refresh` issues a new access token from a valid refresh
token; it does **not** rotate the refresh token itself - the same refresh
token remains valid for its full 7-day lifetime across multiple refreshes.

**Known inconsistency:** `.env.example` files define a `SESSION_TIMEOUT_MINUTES`
variable, but it is not read anywhere in the server source - actual token
TTLs are hardcoded (15m/7d) in `utils/jwt.ts`, not configurable via that
variable. Treat `SESSION_TIMEOUT_MINUTES` as currently inert.

## CSRF

**Current security gap: there is no dedicated CSRF token or CSRF-specific
middleware anywhere in the server.** No synchronizer-token pattern, no
`csurf`-equivalent package, no `X-CSRF-Token` header check.

The current mitigation is:

- `SameSite=strict` cookies (above) - blocks the cookie from being attached
  to cross-site requests in the first place, in every modern browser that
  honors the attribute.
- CORS origin restriction with `credentials: true` -
  [`index.ts`](../../packages/server/src/index.ts) allows only the single
  origin configured via `CORS_ORIGIN`, with credentialed requests permitted
  only from that origin.

**This combination is not equivalent to a dedicated CSRF defense.** It
depends entirely on correct, universal browser support for `SameSite`
(no fallback for older or misconfigured clients) and on the CORS
configuration never being loosened. There is no independent,
request-specific proof that a request actually originated from the SICOT
frontend. Treat this as a current gap to close before any wider exposure of
the API, not as a solved problem.

## CORS

Single configurable allowed origin -
[`index.ts`](../../packages/server/src/index.ts): `cors({ origin:
process.env.CORS_ORIGIN, credentials: true })`. CORS is a **browser-enforced**
policy evaluated against the request's origin as the browser sees it - it
has nothing to do with how containers reach each other over the Docker
network; server-to-server or container-to-container calls are never subject
to it. What matters is the origin the *browser* loaded the frontend from
versus the origin it's calling:

- In **development**, the Vite dev server and the API genuinely run on
  different origins (different ports on `localhost`), so this is real
  cross-origin traffic from the browser's point of view - `credentials:
  true` is what allows the auth cookies to be sent on those cross-origin
  requests to the one configured origin.
- In **staging/production**, the browser reaches both the frontend and
  `/api/*` through the same nginx reverse proxy on the same public origin
  (see [architecture/runtime-topology.md](../architecture/runtime-topology.md)) -
  depending on that configured topology, requests may be same-origin from
  the browser's perspective, in which case CORS is not really in play for
  that traffic at all.

Only one origin is configurable at a time (`CORS_ORIGIN` is a single string,
not a list).

**CORS is not a CSRF control and must not be described as one.** It governs
whether a *browser* lets *JavaScript running on another origin* read the
response to a cross-origin request - it does not stop a browser from
*submitting* a cross-origin request in the first place (a plain form POST or
navigation is not restricted by CORS at all). Restricting the allowed origin
narrows who could read a credentialed JSON response, but it provides no
protection against a forged request being submitted and acted on by the
server. **The current CSRF mitigation remains primarily `SameSite=strict`
cookies, plus the restricted CORS/origin configuration as a secondary
narrowing - with no independent CSRF token.** See the CSRF section above:
this combination is still a current gap, not a resolved one.

## Rate limiting

**As of Phase 12.4, request-rate limiting is enabled**, built from shared
factories in
[`middleware/rateLimiters.ts`](../../packages/server/src/middleware/rateLimiters.ts):

- **Global safety net** - `app.use('/api', ...)` in
  [`index.ts`](../../packages/server/src/index.ts), 3000 req / 15 min,
  keyed by `req.ip`. Excludes `/api/health` explicitly (Docker/reverse-proxy
  healthchecks must never be throttled). This is a volume/flood backstop,
  not a precise per-user throttle - the number is deliberately generous
  given SICOT users may share one institutional/NAT public IP.
- **Login limiter** - applied only to `POST /api/auth/login` in
  [`auth.route.ts`](../../packages/server/src/modules/auth/routes/auth.route.ts),
  30 req / 15 min, keyed by `req.ip`, counting all requests (not
  failed-only). Deliberately **not** applied to the rest of `/api/auth`
  (`/refresh`, `/logout`, `/me`, password-change routes) - those are normal
  session traffic and would risk throttling legitimate shared-IP users
  alongside actual login attempts.
- **Portal limiters** - unchanged listing (120/15min) and token-issuance
  (10/15min) limiters, plus a new view/download limiter (60/15min) now
  covering `GET /documents/:id`, `GET /documents/:id/consulter`, and
  `GET /telecharger/:token` (previously unprotected - see
  [document-access.md](./document-access.md)).

**Account lockout remains the primary defense against brute force on one
account.** See [authentication.md](./authentication.md) -
`lockout_max_tentatives`/`lockout_duree_minutes`, enforced per-account in
the database (`bloqueJusquA`/`tentativesEchouees`), independent of and
unaffected by this phase. The IP-based login limiter is a *complementary*
control: it catches spray/enumeration across many accounts and
request-volume/CPU-exhaustion attempts that per-account lockout cannot see,
since lockout only ever looks at one account's own failure count.

**429 vs 423:** a `429 TROP_DE_REQUETES` response (rate limiter) and a
`423 COMPTE_BLOQUE` response (account lockout) are two independent
mechanisms with different scopes (IP vs. account) - do not conflate them
when diagnosing a login failure. See
[../troubleshooting/authentication-and-session.md](../troubleshooting/authentication-and-session.md).

**In-memory store, single instance:** all limiters use express-rate-limit's
default in-memory store. Counters reset on process/container restart and
are **not** shared across replicas - correct for the current single-`api`-
container deployment (see
[../operations/backups.md](../operations/backups.md) for the analogous
single-instance assumption in the backup job's mutex), but would need a
shared store (e.g. Redis) if SICOT ever runs multiple API replicas. Not
introduced in Phase 12.4.

**Reverse-proxy / `req.ip` correctness:** all IP-keyed limiters depend on
`TRUST_PROXY_HOPS` being configured correctly for the topology - see
[../operations/configuration-reference.md](../operations/configuration-reference.md).
Production and staging set it to `1` (exactly one Nginx hop); native/Docker
dev leaves it unset (no proxy in front of the API there), so a spoofed
`X-Forwarded-For` is never trusted in that environment.

## Logout / refresh - summary

Documented above under Sessions/tokens. To restate the key claim plainly:
**do not describe SICOT as having server-side session revocation.** Logout
and any admin-side "deactivate this user" action stop *new* logins/refreshes
for that account going forward (an inactive account fails the `actif` check
on login and on refresh), but any access token already issued for that
account remains valid, unrevoked, until it expires on its own (at most 15
minutes later).
