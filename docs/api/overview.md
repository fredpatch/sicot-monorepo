# SICOT API - Overview

These documents describe **the implemented API as it exists in the code
today** - not a formal contract. There is no OpenAPI/Swagger specification
(see [OpenAPI decision](#openapi-decision) below for why, and when that could
change).

## Base prefix and architecture

Every route lives under `/api/*` on the single Express app in
[`packages/server/src/index.ts`](../../packages/server/src/index.ts). See
[architecture/overview.md](../architecture/overview.md) for the broader
system picture - this document only covers the API surface.

Each business domain is a module under `packages/server/src/modules/<name>/`,
following one consistent layering:

```
routes/<name>.route.ts       - Express router: authenticate + requireCapability wiring
  -> controllers/<name>.controller.ts   - request/response shaping, input validation
    -> services/<name>.service.ts       - business logic, Drizzle queries, outbound calls
```

## Module map

| Domain | Mounted at | Endpoint docs |
|---|---|---|
| Auth/session | `/api/auth` | [endpoints/auth.md](./endpoints/auth.md) |
| Users, Personnel ANAC lookup | `/api/users`, `/api/personnel-anac` | [endpoints/users.md](./endpoints/users.md) |
| Documents | `/api/documents` | [endpoints/documents.md](./endpoints/documents.md) |
| Translation (requests + processing) | `/api/demandes`, `/api/traductions` | [endpoints/translation.md](./endpoints/translation.md) |
| Missions | `/api/missions` | [endpoints/missions.md](./endpoints/missions.md) |
| Cooperation (accords, partenaires, contacts) | `/api/accords`, `/api/organisations`, `/api/contacts` | [endpoints/cooperation.md](./endpoints/cooperation.md) |
| Correspondence | `/api/courriers` | [endpoints/correspondence.md](./endpoints/correspondence.md) |
| Glossary | `/api/glossaire` | [endpoints/glossary.md](./endpoints/glossary.md) |
| Analytics & reports | `/api/analytics`, `/api/dashboard` | [endpoints/analytics.md](./endpoints/analytics.md) |
| Public portal | `/api/portal` | [endpoints/portal.md](./endpoints/portal.md) |
| Administration (audit, settings, jobs, notifications, bootstrap) | `/api/audit`, `/api/parametres`, `/api/jobs`, `/api/notifications`, `/api/bootstrap` | [endpoints/administration.md](./endpoints/administration.md) |

## Authenticated vs public surfaces

Almost every route requires a valid session (see
[authentication.md](./authentication.md)). The exceptions, confirmed by
reading each router directly:

- **`/api/auth/login`** and **`/api/auth/refresh`** - public, by necessity.
- **`/api/bootstrap/status`** and **`/api/bootstrap/init`** - public; `init`
  is self-guarded to only ever succeed once (before any `super_admin`
  account exists).
- **The public portal** (`/api/portal/documents*`, `/api/portal/telecharger/:token`)
  - deliberately unauthenticated; see
  [endpoints/portal.md](./endpoints/portal.md) and
  [../security/document-access.md](../security/document-access.md) for the
  trust-boundary analysis. Only `PATCH /api/portal/documents/:id/visibilite`
  in that same router requires authentication.

Every other mounted route requires `authenticate` (a valid `sicot_access`
cookie) at minimum, usually plus a specific capability - see
[../security/authorization.md](../security/authorization.md) for how that
model works, and each endpoint doc for the exact capability required.

## JSON API behavior, with two documented exceptions

The API is JSON-in/JSON-out (`express.json()`, 10MB body limit) for nearly
every route. Two categories of exception, both real and both documented per
endpoint:

- **File uploads** - `multipart/form-data`, handled by `multer` (memory
  storage). Only document upload/new-version routes
  ([endpoints/documents.md](./endpoints/documents.md)).
- **File downloads/exports** - binary responses (PDF, DOCX, XLSX, CSV), not
  JSON. Each such endpoint's doc states its exact `Content-Type` and
  `Content-Disposition` (inline vs attachment).

## Public portal surface

The public portal is not a separate API or deployment - its routes live in
the same `portal` module, mounted on the same Express app, reading the same
database, as everything else. See
[endpoints/portal.md](./endpoints/portal.md) and
[architecture/overview.md](../architecture/overview.md#component-architecture).

## External service calls are outbound only - no inbound webhook architecture

Every call to OCR, translation (LibreTranslate/DeepL), Gemini, SMTP, and the
Personnel ANAC directory is initiated **by** this API, never received by it.
**No inbound webhook or callback route exists anywhere in the codebase** -
confirmed by the route inventory built for this documentation pass (every
mounted route serves a browser/API client, none serve another service
calling back in). See
[architecture/overview.md](../architecture/overview.md#request-flow).

## OpenAPI decision

**Not introduced in this phase**, and not recommended yet. Current
rationale, based directly on this audit:

- Request validation is not standardized across modules (see
  [conventions.md](./conventions.md)) - generating a schema from code today
  would encode ad hoc, inconsistent validation as if it were a deliberate
  contract.
- Response/error shapes are not globally standardized either (see
  [conventions.md](./conventions.md)) - the same is true there.
- Generating OpenAPI now risks creating a **false sense of a formal
  contract** where none actually exists yet.

These Markdown documents are the canonical API reference for now.
**OpenAPI can be introduced later**, once request validation and
error/response shapes have been standardized enough that a generated schema
would describe a real contract rather than paper over inconsistency.
