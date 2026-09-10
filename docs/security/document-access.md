# SICOT - Document Access

Security boundaries around document access: who can see a file, under what
condition it becomes publicly reachable, and how the public download flow
actually works. See [architecture/data-model.md](../architecture/data-model.md)
for the underlying `documents` schema.

## Three distinct states

SICOT tracks three separate, independently-controlled properties for any
uploaded file - conflating them is the most common way to misreason about
document security here:

1. **File stored** - the bytes exist on disk (`UPLOAD_DIR`) and a `documents`
   row exists with its metadata. This alone grants no one access.
2. **Document internally visible** - `documents.visibiliteInterne` (a
   boolean on the `documents` row) controls whether authenticated users
   *other than the uploader* can see it, for users below `DOCUMENT_UPLOAD`
   capability tier. See below.
3. **Document publicly exposed** - `documents.visibilitePortail`, a
   completely separate flag, controls whether the document appears on the
   unauthenticated public portal at all. A document can be internally
   visible without being public, or (in principle) public while not being
   internally visible - the two flags are independent.

## Authenticated document access

Route-level: `packages/server/src/modules/document/routes/documents.route.ts`
requires `authenticate` for every route in the module; specific mutations
(`nouvelle-version`, `:id/ocr`, `:id/categorie`, `:id/visibilite-interne`,
delete, restore, retraiter-ocr) are additionally gated by dedicated
capabilities (`DOCUMENT_UPLOAD`, `DOCUMENT_OCR_MANAGE`,
`DOCUMENT_CATEGORY_MANAGE`, `DOCUMENT_INTERNAL_VISIBILITY_MANAGE`,
`DOCUMENT_DELETE`).

**Upload itself is deliberately ungated at the route level** - `POST
/upload` carries no `requireCapability()`. This is intentional, not an
oversight: the same endpoint serves both the general document library and
personal workflows (e.g. attaching a file to one's own request or mission),
where any authenticated `agent` must be able to upload their own file. Real
scoping happens one layer down:

- A newly uploaded document is forced `visibiliteInterne: false` unless the
  uploader holds `DOCUMENT_UPLOAD` (i.e. `operateur` tier and above) -
  an `agent`'s upload is never automatically visible to other users.
- Every read/download path calls `verifierAccesDocument(id, user)`
  ([`documents.service.ts`](../../packages/server/src/modules/document/services/documents.service.ts)):
  a user with `DOCUMENT_UPLOAD` can access any document; a user without it
  can only access a document that is `visibiliteInterne = true` **or** that
  they uploaded themselves (`uploadePar === userId`).
- Listing/aggregates apply the same scope: a user without `DOCUMENT_UPLOAD`
  sees documents that are either `visibiliteInterne = true` or that they
  uploaded themselves (`uploadePar === userId`) - not only their own
  documents.

This is the "per-document capability/scoping logic" for the internal
(authenticated) surface: **capability tier decides the default breadth
(everything vs. own-and-shared); the `visibiliteInterne` flag and ownership
decide the exception for narrower roles.**

## Public portal

The public portal is **not a separate trust boundary** - it runs on the same
Express API and the same PostgreSQL database as the authenticated
application (see
[architecture/overview.md](../architecture/overview.md#request-flow)). Its
routes
([`portal.route.ts`](../../packages/server/src/modules/portal/routes/portal.route.ts))
are simply unauthenticated within that same app, filtered to documents where
`visibilitePortail = true`, `deletedAt IS NULL`, and `statutOCR = 'traite'`.
Only the visibility-toggle route (`PATCH .../visibilite`) requires
`authenticate` + `PORTAL_PUBLICATION_MANAGE`.

### Token generation and expiry

`POST /documents/:id/token`
([`portal.service.ts:genererTokenTelechargement`](../../packages/server/src/modules/portal/services/portal.service.ts))
issues a **UUID (`crypto.randomUUID()`), stored as a row in the
`portailTokens` table** alongside the requester's email and IP. This is an
**application/database-backed token, not a cryptographically signed URL** -
do not describe it as one. Expiry is optional and configured per document
(`portailTokenDureeJours`): if set, the token expires that many days after
issuance; if unset, the token has **no expiry at all**. The token is
delivered only via an emailed link, never returned directly in the API
response.

### Reuse - not single-use

**Current gap:** token consumption
(`validerEtConsumeToken`) checks only that the token exists and has not
expired. It records a `utiliseLe` (used-at) timestamp on first use, but does
**not** check that timestamp before granting access on a later request -
the same token remains valid and downloadable **repeatedly, until its
expiry date (or indefinitely, if no expiry was configured)**. State this
accurately: the token is expiry-gated, not single-use.

### Download flow

`GET /telecharger/:token` -> `validerEtConsumeToken()` re-checks
`visibilitePortail`/`deletedAt` at consumption time (not just at issuance),
returns the file's stored path/mime/original-name, streams it to the
requester, and writes an audit entry
(`PORTAIL_DOCUMENT_TELECHARGE`).

## Document version relationships

`documents.parentId` chains successive versions of the same logical
document (see
[architecture/data-model.md](../architecture/data-model.md) for the schema
detail, including that this column is not declared as a Drizzle foreign
key). Visibility flags (`visibiliteInterne`, `visibilitePortail`) are set
per version row, not inherited automatically down a version chain - check
the specific version being served, not the document's original version.

## Delete / restore

Soft delete only: `documents.deletedAt`, gated on `DOCUMENT_DELETE`.
`PATCH /:id/restaurer` reverses this, gated on the same `DOCUMENT_DELETE`
capability (there is no separate `DOCUMENT_RESTORE` capability, by
deliberate design - see [authorization.md](./authorization.md) on
capability proliferation).

**`deletedAt` exclusion is enforced uniformly across every access path
(Phase 12.2):**

| Access path | Excludes soft-deleted documents? |
|---|---|
| Internal listing (`GET /documents`) / aggregates | Yes - filters `isNull(deletedAt)`. |
| Public portal (listing, aggregates, download-token consumption) | Yes - every portal query filters `isNull(deletedAt)`, re-checked at token-consumption time. |
| Authenticated direct `GET /documents/:id` | Yes - `getDocument()` filters `isNull(deletedAt)`. |
| Authenticated direct `GET /documents/:id/telecharger` | Yes - `getCheminDocument()` filters `isNull(deletedAt)`. |

`verifierAccesDocument()` now checks `id + deletedAt IS NULL` **before**
evaluating `DOCUMENT_UPLOAD` or any other capability - the lifecycle state
is checked first, authorization breadth second, so no capability tier can
bypass it. **A soft-deleted document is treated identically to a
nonexistent one on these two direct-access paths: `404
DOCUMENT_INTROUVABLE`**, the same response an unknown ID would produce -
deliberately, so a caller cannot distinguish "never existed" from "was
deleted." `getDocument()`/`getCheminDocument()` enforce the same predicate
independently of `verifierAccesDocument()`, as defense in depth.

The only way to interact with a soft-deleted document is the explicit
restore path: `PATCH /documents/:id/restaurer`, gated on `DOCUMENT_DELETE`
(see below) - there is no ordinary read/download route that can see a
deleted row. This does not change physical file retention: soft delete
still only sets `deletedAt`, the file bytes remain on disk under
`UPLOAD_DIR` regardless (see [File storage](#file-storage) below) - what
changed is that the ordinary direct-access routes can no longer reach
those retained bytes for a deleted document.

## File storage

File bytes live outside PostgreSQL, on the filesystem under `UPLOAD_DIR`; only
metadata (path, name, hash, visibility flags, OCR status/text) lives in the
database - see
[architecture/data-model.md](../architecture/data-model.md#non-obvious-persistence-semantics).
Operational procedures for that storage (backup, NAS operations, volume
provisioning) belong in the future `docs/operations/`, not here.
