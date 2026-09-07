# SICOT - Security Checklist

A living, SICOT-specific technical checklist for maintainers and
pre-production review - not a generic OWASP list. Every item below is
grounded in the current codebase; see the linked document for detail and
the exact source path for verification. Update this file when the
underlying code changes, not the other way around.

## Implemented

- [x] Password hashing - bcrypt, cost factor 10.
      [`auth.constants.ts`](../../packages/server/src/modules/auth/services/auth.constants.ts) -
      see [authentication.md](./authentication.md).
- [x] `HttpOnly` cookies for both access and refresh tokens.
      [`middleware/auth.ts`](../../packages/server/src/middleware/auth.ts) -
      see [csrf-and-session-security.md](./csrf-and-session-security.md).
- [x] `SameSite=strict` cookies.
      [`middleware/auth.ts`](../../packages/server/src/middleware/auth.ts) -
      see [csrf-and-session-security.md](./csrf-and-session-security.md).
- [x] Capability-based authorization middleware (`requireCapability`,
      `requireAnyCapability`, `requireAllCapabilities`), fail-closed on
      unrecognized roles.
      [`middleware/requireCapability.ts`](../../packages/server/src/middleware/requireCapability.ts) -
      see [authorization.md](./authorization.md).
- [x] Contextual ownership policies layered on top of capability checks
      (own request, designated mission report responsible, document
      internal-visibility/ownership scoping). See
      [authorization.md](./authorization.md),
      [document-access.md](./document-access.md).
- [x] Public portal download tokens support configurable expiry (optional
      per-document `portailTokenDureeJours`).
      [`portal.service.ts`](../../packages/server/src/modules/portal/services/portal.service.ts) -
      see [document-access.md](./document-access.md) for the accompanying
      **reuse gap**, listed separately below.
- [x] Account lockout after repeated failed login/OTP attempts, threshold
      and duration both configurable.
      [`auth.helpers.ts`](../../packages/server/src/modules/auth/services/auth.helpers.ts) -
      see [authentication.md](./authentication.md).
- [x] Audit logging exists and is used across every module verified in this
      phase (auth, documents, portal, users) - see
      [audit-and-traceability.md](./audit-and-traceability.md) for the
      important caveat that coverage is manual, not automatic (listed again
      under Known gaps).
- [x] The SMTP credential previously committed in a tracked example file has
      been removed from the current tree and rewritten out of Git history
      (Remediated separately, prior to this phase - not re-detailed here).
      **External rotation/revocation of that credential on the mail-account
      side is a separate action, outside this repository, and is listed as
      an item to confirm below rather than assumed complete here.**

## Known gaps

- [ ] **No dedicated CSRF token or CSRF middleware.** Current mitigation is
      `SameSite=strict` + CORS origin restriction only - not a substitute
      for a dedicated defense. See
      [csrf-and-session-security.md](./csrf-and-session-security.md).
- [ ] **Global and auth-specific request-rate limiting are implemented in
      code but not enabled** (`app.use(limiter)` and the auth router's
      `authLimiter` are both commented out in
      [`index.ts`](../../packages/server/src/index.ts)). Only the public
      portal has active rate limiting. See
      [csrf-and-session-security.md](./csrf-and-session-security.md).
- [ ] **No server-side session/token revocation.** Logout clears cookies
      client-side only; a previously issued access or refresh token remains
      valid until its natural expiry (up to 15 minutes / 7 days
      respectively) even after logout or an admin deactivating the account.
      See [csrf-and-session-security.md](./csrf-and-session-security.md).
- [ ] **Public portal download tokens are not single-use** - valid
      repeatedly until expiry (or indefinitely, if no expiry was
      configured for that document). See
      [document-access.md](./document-access.md).
- [ ] **Authenticated direct document access does not enforce `deletedAt`** -
      `GET /documents/:id` and `GET /documents/:id/telecharger` both go
      through `verifierAccesDocument()`, which does not check whether the
      document is soft-deleted. An otherwise-authorized user who knows the
      document ID can retrieve/download a soft-deleted document directly,
      even though it is correctly excluded from listings, aggregates, and
      the public portal. Classified as an access/lifecycle enforcement gap.
      See [document-access.md](./document-access.md).
- [ ] **Audit coverage is manual, not automatic** - an action without an
      explicit `logAudit()` call in its code path leaves no trace. See
      [audit-and-traceability.md](./audit-and-traceability.md).
- [ ] **No formal data retention policy** for audit log entries, portal
      download tokens, or document versions - none currently expire or get
      pruned by any scheduled process found in the codebase.
- [ ] **Gemini AI report-narrative feature is explicitly test-only** per its
      own code comment, pending DG/RGPD approval before production use.
      [`.env.example`](../../packages/server/.env.example) - see
      [architecture/overview.md](../architecture/overview.md).
- [ ] `SESSION_TIMEOUT_MINUTES` is defined in tracked `.env.example` files
      but is not read anywhere in server source - it currently has no
      effect; actual token lifetimes are hardcoded. Documentation/config
      drift, not a vulnerability by itself, but worth fixing before it
      misleads an operator. See
      [csrf-and-session-security.md](./csrf-and-session-security.md).

## Verify before pre-production

- [ ] **Production domain** - the repository still uses a literal
      placeholder (`PLACEHOLDER-DOMAIN.com`) in `nginx/prod.conf` and
      `.env.prod.example`; must be filled in with the real domain before
      go-live. See
      [architecture/runtime-topology.md](../architecture/runtime-topology.md).
- [ ] **TLS** - only the production tier terminates TLS (via nginx +
      Let's Encrypt); staging is plain HTTP by design. Confirm this
      matches intended exposure before staging carries any real data.
- [ ] **CORS origin** - confirm `CORS_ORIGIN` is set to the exact production
      frontend origin in production configuration, not a development
      default.
- [ ] **Secret rotation policy** - no automated or documented rotation
      schedule exists for `JWT_SECRET`, `JWT_REFRESH_SECRET`, SMTP
      credentials, or third-party API keys. Establish one before
      pre-production, given the prior SMTP exposure incident.
- [ ] **SMTP credentials** - confirm with the mail-account owner that the
      Gmail App Password previously exposed in a tracked example file has
      actually been revoked/rotated on the Google-account side (Git-tree
      and history remediation are complete; external revocation is a
      separate action this repository cannot verify). Once rotated, confirm
      the new credential is stored only in the untracked, gitignored
      production environment file, never in a tracked example file again.
- [ ] **JWT secret strength** - no code enforces a minimum length/entropy
      for `JWT_SECRET`/`JWT_REFRESH_SECRET`; confirm the actual
      production values are strong, generated secrets, not left at any
      placeholder.
- [ ] **Tailscale connectivity** - the Personnel ANAC integration requires
      the production host to be joined to a specific Tailscale network;
      confirm this is provisioned before relying on that integration in
      production. See
      [architecture/runtime-topology.md](../architecture/runtime-topology.md).
- [ ] **Backup/restore validation** - backup creation exists
      (local + NAS, tiered rotation); restore has not been evidenced as
      tested anywhere in the repository. Validate an actual restore before
      relying on this for disaster recovery.

## Production decisions required

- [ ] Whether to enable global/auth rate limiting as currently coded, or
      replace it with a different mechanism (e.g. a reverse-proxy-level
      limiter) - a decision, not just a flip of a commented-out line, since
      thresholds (100 req/15min global, 10 req/15min auth) have not been
      validated against real traffic patterns.
- [ ] Whether to add a dedicated CSRF defense before broadening who can
      reach the authenticated API (e.g. before adding any new public or
      third-party integration surface).
- [ ] Whether/when to formally approve the Gemini AI feature for production
      use (DG/RGPD approval referenced in code comments, not evidenced as
      completed in this repository).
- [ ] Whether public portal tokens should become single-use, given the
      current reuse-until-expiry behavior.

## Notes on scope

This checklist reflects the modules re-audited for Phase 11.2:
authentication, authorization, session/CSRF, document access
(including the public portal), and audit/traceability. It does not cover
areas reserved for later phases (API-wide input validation posture,
infrastructure/deployment hardening, dependency vulnerability scanning) -
those will get their own documentation in `docs/api/` and
`docs/operations/` when those phases are written.
