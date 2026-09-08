# SICOT API - Conventions

The actual conventions in use across the API - **including the
inconsistencies**. Nothing here is aspirational; every claim is backed by
reading the route/controller/error-handling code directly.

## Status codes actually used

| Code | Meaning here | Where |
|---|---|---|
| 200 | Success (read or mutation with a body) | everywhere |
| 201 | Resource created | uploads, creates (users, accords, missions, demandes, glossary terms, contacts, ad-hoc reports, portal tokens, bootstrap init) |
| 204 | Success, no body | `PATCH /api/analytics/rapports/:id/analyse-ia` (validate/reject) only |
| 207 | Created, but a likely duplicate was detected | `POST /api/documents/upload` only (`result.doublon === true`) |
| 400 | Validation failure (missing/invalid field, invalid id, invalid state transition) | everywhere - see Validation below |
| 401 | Not authenticated, or session expired | `authenticate` middleware |
| 403 | Authenticated but lacks the required capability, or a contextual ownership check failed | `requireCapability`/service-layer checks |
| 404 | Resource not found | most `:id` lookups |
| 409 | Conflict (duplicate matricule/email, duplicate glossary term, locked request already taken) | users, glossaire, `demandes prendre-en-charge` |
| 410 | Gone - a public portal token has expired | `GET /api/portal/telecharger/:token` only |
| 413 | Payload too large | multer file-size limit exceeded |
| 415 | Unsupported media type | multer MIME-type rejection |
| 422 | Semantically invalid but well-formed (an OCR engine error surfaced as a business error) | `documents` OCR routes only |
| 423 | Locked - account lockout | `POST /api/auth/login` only |
| 429 | Rate limit / quota exceeded | portal rate limiters; `POST /api/analytics/rapports/:id/analyse-ia` daily-quota check |
| 502 | The operation ran but failed internally (job execution failure, notification email send failure) | `POST /api/jobs/:cle/executer`, `POST /api/notifications/envoyer` |
| 503 | An upstream dependency is unreachable (OCR service, translation engine) | documents OCR, traduction relance |
| 504 | An upstream dependency timed out | documents OCR |
| 500 | Unmapped/unexpected error | the catch-all in every module's error handler, and Express's own top-level handler |

Only codes actually observed in the audited controllers/error-maps are
listed - this is not a generic HTTP status reference.

## Error responses - shape varies by module, stated plainly

Most modules use a shared factory
(`createErrorHandler`/`handleXError`, in
[`packages/server/src/utils/error.ts`](../../packages/server/src/utils/error.ts))
that maps a thrown `Error(CODE_STRING)` to `{ message, code }`, where `code`
is the thrown string. **Unmapped errors** from that same factory produce
`{ message: 'Erreur interne du serveur.' }` with **no `code` field** - the
presence of `code` is not a reliable signal you can always depend on.

**This is not a global, uniform envelope. Real exceptions found in this
audit:**

- `GET /api/auth/me` and every pre-service-call 400 in `users.controller.ts`
  (missing/invalid fields, the self-deactivation 403 check) hand-roll
  `res.status(...).json({ message })` directly in the controller - **never**
  a `code` field, even for what look like the same class of error elsewhere.
- `contacts.controller.ts` (`GET /api/contacts`) doesn't use the shared
  error-map factory at all - it inlines its own `try/catch` with a bare
  `{ message: 'Erreur interne du serveur.' }` on any failure, unlike every
  other module.
- `dashboard.controller.ts` (`GET /api/dashboard`) is the same - inline
  `try/catch`, no shared factory.
- `jobs.controller.ts`'s `GET /api/jobs` has **no try/catch at all** - an
  unexpected error there falls through to Express's default handler, not
  this module's own error shape.
- `handleAnalyticsError`'s error map is **empty** - every analytics/rapports
  error not explicitly caught inline (only `LIMITE_QUOTIDIENNE_ATTEINTE` is)
  falls through to a generic 500, even ones that conceptually should be 404
  (e.g. `RAPPORT_INTROUVABLE` on `GET /api/analytics/rapports/:id` becomes a
  500, not a 404 - worth knowing when integrating against that endpoint).
- Export/download endpoints on error still return JSON (the shared shape),
  not a binary error body.

**Do not assume `{ message, code }` is a guaranteed contract everywhere.**
Check the specific endpoint's doc for its actual error behavior before
writing client code that depends on `code`.

## Validation - ad hoc and manual everywhere, no Zod

**Zod is not used anywhere on the server**, despite being a listed
dependency in `packages/server/package.json` (confirmed unused in `src/`
across every module audited for this documentation). Every controller
validates by hand:

- `parseInt(req.params.id)` + `isNaN` guard, repeated per-handler in every
  module with an `:id` route.
- Truthiness checks for required body fields (`if (!x) { ... 400 ... }`).
- `typeof` checks for booleans (e.g. `typeof actif !== 'boolean'`).
- Hardcoded whitelist arrays checked with `.includes(...)` for enum-like
  fields (roles, statuses, directions, categories) - each module defines
  its own array; there is no shared enum-validation utility.
- Regex for email format (`/^\S+@\S+\.\S+$/`, one variant per module - not
  centralized).
- Business-rule validation (state transitions, ownership, locking) lives in
  the service layer, thrown as plain `Error(CODE)` strings, not surfaced as
  structured field-level validation errors.

**Consequence for integrators:** a 400 response's `message` is the only
reliable description of what was wrong - there is no structured
field-by-field validation-error array anywhere in this API.

## Pagination - two different query-parameter conventions coexist

Most list endpoints share the shape `{ data, total }` with `page`/`pageSize`
query params, defaulting to `page=1`, `pageSize=20`. But **not every module
agrees on parameter names**:

| Module | Query params | Defaults | Response shape |
|---|---|---|---|
| Most modules (users, documents, courriers, missions, accords, organisations, traductions, demandes, glossaire, portal, audit) | `page`, `pageSize` | `page=1`, `pageSize=20` | `{ data, total }` (page/pageSize not echoed back) |
| `personnel-anac` (`GET /api/personnel-anac`) | `page`, **`limit`** (not `pageSize`), `sortBy`, `order` | `page=1`, `limit=20`, `sortBy='lastName'`, `order='asc'` | `{ data, total, page, limit }` (echoed back) |
| `contacts` (`GET /api/contacts`) | `pageSize` only, **no `page`/offset param at all** | n/a | `{ data }` (no `total`) |

`search` is reused widely as a free-text filter name, but what it matches
against is module-specific (name, reference, object/subject line, etc.) -
check each endpoint doc, don't assume identical matching behavior.

## Dates

Outgoing: Postgres/Drizzle `Date` objects are returned as-is in
`res.json(...)` - Express's JSON serialization converts them to ISO 8601
strings on the wire. No manual date formatting happens server-side for API
responses.

Incoming: date-shaped body/query fields (e.g. `dateSignature`,
`dateReception`, `dateDebut`/`dateFin`) are parsed with plain `new Date(...)`
in the controller - no format validation beyond what `Date` itself accepts
(an unparseable string becomes `Invalid Date`, which typically surfaces
later as a database error, not a clean 400). Treat these as "send an ISO
8601 string" by convention, not as a validated/enforced contract.

## File uploads

`multipart/form-data`, handled by `multer` with **memory storage** (the
buffer is passed directly to downstream processing - OCR, hashing - never
written to a temp file first).

- Size limit: **50 MB** (`TAILLE_MAX = 50 * 1024 * 1024`).
- Allowed MIME types: `application/pdf`, `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `application/vnd.ms-excel`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `text/plain`, `image/jpeg`, `image/png`, `image/tiff`.
- Oversize -> `413`, code `FICHIER_TROP_GRAND`. Wrong MIME type -> `415`,
  code `FORMAT_NON_SUPPORTE` (response includes the accepted list as
  `formatsAcceptes`).
- Used only by document upload/new-version routes - see
  [endpoints/documents.md](./endpoints/documents.md).

## Downloads

Binary responses set `Content-Type` for the actual file type and
`Content-Disposition` explicitly. **Inline vs attachment is not uniform** -
check each endpoint:

- Authenticated document download (`GET /api/documents/:id/telecharger`) -
  **inline**.
- Public portal in-browser view (`GET /api/portal/documents/:id/consulter`)
  - **inline**.
- Public portal emailed-token download (`GET /api/portal/telecharger/:token`)
  - **attachment** (forces a save dialog) - the one deliberately different
  case, since this is the "I clicked a download link in an email" flow.
- PDF/DOCX exports (missions, accords, courriers, traductions) - inline when
  `?apercu=1` is passed, attachment otherwise. Audit exports (PDF/Excel) are
  always attachment (no preview mode).

## Authorization errors - 401 vs 403

- **401** = not authenticated at all, or the access token has expired
  (distinguished by `code: 'TOKEN_EXPIRED'` - see
  [authentication.md](./authentication.md)).
- **403** = authenticated, but either the role's capability set doesn't
  include what the route requires (`requireCapability` failure - fixed
  message `"Accès refusé - droits insuffisants."`), or a **contextual**
  check failed even though the capability was present (e.g. "you're not the
  request's own demandeur," "you're not this mission's designated report
  responsible"). The message differs per contextual check - see the
  relevant endpoint doc. See
  [../security/authorization.md](../security/authorization.md) for the full
  model.

## Idempotency

**No endpoint in this API makes an idempotency guarantee.** There is no
idempotency-key mechanism, no dedup-on-retry logic beyond the incidental
duplicate-file-hash check on document upload (which flags, but does not
block, a likely duplicate - see [endpoints/documents.md](./endpoints/documents.md)).
Retrying a POST/PATCH after a timeout or an ambiguous response can create a
duplicate side effect (e.g. a second document, a second glossary term where
the uniqueness check happens to miss it, a second notification email).
Do not assume otherwise when writing client retry logic.
