# Document endpoints

Base path: `/api/documents`. Every route requires `authenticate`. Upload
size/MIME limits: [../conventions.md](../conventions.md). Trust-boundary
analysis (internal visibility vs public exposure, the soft-delete gap
below): [../../security/document-access.md](../../security/document-access.md) -
not re-derived here, only linked.

## GET /api/documents/doublon
**Capability:** none (any authenticated user)

Purpose: pre-upload duplicate check by file hash.

**Request:** query `hash` (required MD5 string).

**Important errors:** 400 missing/invalid `hash`.

## GET /api/documents/aggregates
**Capability:** none - scoped to the caller's own documents if they lack
`DOCUMENT_UPLOAD`.

Purpose: document counts for dashboard widgets.

## GET /api/documents
**Capability:** none - same personal scoping as aggregates.

**Request:** query `search`, `categorie`, `statutOCR`, `page`, `pageSize`,
`finalesUniquement` (`'1'` flag).

**Response:** `{ data, total, ... }`.

## GET /api/documents/:id
**Capability:** none directly - gated by `verifierAccesDocument`: a user
with `DOCUMENT_UPLOAD` can access any document; otherwise only if
`visibiliteInterne=true` **or** they uploaded it.

**Response:** `DocumentView`.

**Important errors:** 400 invalid id; 403 `DOCUMENT_NON_AUTORISE`; 404
`DOCUMENT_INTROUVABLE`.

**Notes:** does **not** filter `deletedAt` - see the soft-delete gap below.

## POST /api/documents/upload
**Capability:** deliberately **ungated** at the route level - see Notes.

Purpose: upload a document (general library or personal attachment use).

**Request:** `multipart/form-data`, field `file` (required); body
`categorie` (default `'autre'`), `visibiliteInterne` (only honored, and
forced `true`, when the value is `'1'` **and** the caller has
`DOCUMENT_UPLOAD`; otherwise forced `false`).

**Response:** `{ document, doublon, categorieProposee, message }`.

**Status:** 201 created; **207** if created but a hash-matching duplicate
was detected (`doublon: true`).

**Important errors:** 400 no file; 413 too large; 415 unsupported type.

**Notes:** real access scoping happens one layer down - the forced
`visibiliteInterne` value on creation, plus `verifierAccesDocument` on every
later read - not at this route's gate. Any authenticated user (`agent`+) can
upload; this is intentional, since the same endpoint serves personal
workflow attachments (request/mission uploads) as well as the general
library.

## POST /api/documents/:id/nouvelle-version
**Capability:** `DOCUMENT_UPLOAD`

**Request:** `multipart/form-data`, field `file`; body `categorie`
(optional, must be a valid category or ignored).

**Response:** `{ document, message }`.

**Status:** 201.

## PATCH /api/documents/:id/ocr
**Capability:** `DOCUMENT_OCR_MANAGE`

Purpose: manually correct OCR-extracted text.

**Request:** body `texte` (required non-empty).

**Important errors:** 400 missing `texte`.

## PATCH /api/documents/:id/categorie
**Capability:** `DOCUMENT_CATEGORY_MANAGE`

**Request:** body `categorie` - one of `accord|correspondance|mission|traduction|glossaire|rapport|autre`.

**Important errors:** 400 invalid category.

## PATCH /api/documents/:id/visibilite-interne
**Capability:** `DOCUMENT_INTERNAL_VISIBILITY_MANAGE`

**Request:** body `visible` (strict boolean).

## GET /api/documents/:id/telecharger
**Capability:** none directly - same `verifierAccesDocument` gate as `GET :id`.

**Response:** binary stream. `Content-Type: <mimeType>`,
`Content-Disposition: inline; filename="<name>"`.

**Important errors:** 400 invalid id; 403/404 as `GET :id`; 404 if the file
is missing on disk.

**Notes:** same soft-delete gap as `GET :id` - see below.

## DELETE /api/documents/:id
**Capability:** `DOCUMENT_DELETE`

Purpose: soft-delete (move to trash).

**Important errors:** 400 `DOCUMENT_DEJA_SUPPRIME`; 404 not found.

## PATCH /api/documents/:id/restaurer
**Capability:** `DOCUMENT_DELETE` (reused deliberately - no separate
`DOCUMENT_RESTORE` capability, to avoid capability proliferation).

**Important errors:** 400 `DOCUMENT_NON_SUPPRIME`; 404 not found.

## POST /api/documents/:id/retraiter-ocr
**Capability:** `DOCUMENT_OCR_MANAGE`

Purpose: re-run OCR extraction.

**Important errors:** 503 `OCR_SERVICE_INDISPONIBLE`; 504 `OCR_TIMEOUT`;
422 `OCR_ERREUR:*` (business error from the OCR engine, message passed
through).

---

## Soft-delete direct-access gap

`GET /api/documents/:id` and `GET /api/documents/:id/telecharger` do
**not** filter on `deletedAt` - a soft-deleted document remains directly
retrievable/downloadable by an otherwise-authorized user who knows the
document ID, even though it's correctly excluded from listings, aggregates,
and the public portal. This is a real, current gap, documented in detail
(impact, classification, suggested remediation) in
[../../security/document-access.md](../../security/document-access.md) -
not re-explained here to avoid drift between the two documents.
