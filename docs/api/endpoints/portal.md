# Public portal endpoints

Base path: `/api/portal`. **Mostly public** - the exception is the last
route below. Trust-boundary/risk analysis (same API/DB as the authenticated
app, no isolation): [../../security/document-access.md](../../security/document-access.md) -
not re-explained here, only linked. This document covers how to call each
route.

## GET /api/portal/documents/aggregates
**Authentication:** public. Rate limit: 120 req / 15 min.

**Response:** `{ total, parCategorie: Record<string, number> }`.

## GET /api/portal/documents
**Authentication:** public. Rate limit: 120 req / 15 min.

**Request:** query `search`, `categorie`, `page`, `pageSize`.

**Response:** `{ data: DocumentPortailView[], total }` - each item
`{ id, nomOriginal, categorie, langue?, taille, mimeType, portailTokenDureeJours?, createdAt }`.
Scoped server-side to `visibilitePortail=true`, not deleted, and
`statutOCR='traite'`.

## GET /api/portal/documents/:id
**Authentication:** public. Rate limit: 60 req / 15 min (shared with
`consulter` and `telecharger` below - Phase 12.4).

**Response:** `DocumentPortailView`.

**Important errors:** 404 `DOCUMENT_PORTAIL_INTROUVABLE` (not exposed or
not found - the two cases aren't distinguished).

## GET /api/portal/documents/:id/consulter
**Authentication:** public, no token required. Rate limit: 60 req / 15 min
(same limiter/bucket as `GET /api/portal/documents/:id` and
`GET /api/portal/telecharger/:token` - Phase 12.4).

Purpose: stream the file inline for in-browser viewing - no download token
needed for this one.

**Response:** binary stream, `Content-Disposition: inline`.

**Important errors:** 404 not exposed/not found, or file missing on disk.

## POST /api/portal/documents/:id/token
**Authentication:** public. Rate limit: 10 req / 15 min (custom message).

Purpose: request an emailed download link.

**Request:** body `email` (required, must contain `@`).

**Response:** `201 { message, expiresAt }`.

**Token behavior:** a `randomUUID()`, stored as a database row - **not** a
cryptographically signed URL. Expiry is optional, configured per-document
(`portailTokenDureeJours`); if unset, the token **never expires**. Delivered
only via the emailed link, never returned in the API response.

**Important errors:** 400 invalid `id`/email; 404 `DOCUMENT_PORTAIL_INTROUVABLE`.

## GET /api/portal/telecharger/:token
**Authentication:** public. Rate limit: 60 req / 15 min (Phase 12.4 - same
limiter/bucket as `GET /api/portal/documents/:id` and `.../consulter`
above; issuance, `POST .../token`, has its own separate, stricter 10/15min
limiter).

**Response:** binary stream, `Content-Disposition: attachment` (forces
download - the one route in this API that differs from the general
inline-download convention, matching an emailed-link user flow).

**Current reuse-until-expiry behavior:** the token is checked for existence
and expiry only - a "used" timestamp is recorded but **never checked as a
gate**. The same token can be used to download repeatedly until its expiry
date (or forever, if none was configured). This is documented in detail,
including its security classification, in
[../../security/document-access.md](../../security/document-access.md).

**Important errors:** 404 `TOKEN_INTROUVABLE` / `DOCUMENT_PORTAIL_INTROUVABLE`
/ file missing on disk; **410** `TOKEN_EXPIRE`.

## PATCH /api/portal/documents/:id/visibilite
**Authentication:** required. **Capability:** `PORTAL_PUBLICATION_MANAGE`

Purpose: the only non-public route in this router - admin toggles whether a
document is exposed on the portal, and sets its token-validity duration.

**Request:** body `visible` (required boolean), `portailTokenDureeJours`
(optional int - only applied when `visible=true`, otherwise forced to
`null`).

**Response:** `{ message }` - no document body returned.

**Important errors:** 400 missing `visible`; 404 `DOCUMENT_INTROUVABLE`.
