# Correspondence endpoints (courriers)

Base path: `/api/courriers`. Every route requires `authenticate`. No
per-user ownership model - courriers are institutional records; the
capability check is the only authorization boundary (no contextual/ownership
checks in this module, confirmed by reading the controller/service).

## GET /api/courriers/sans-reponse
**Capability:** none. Incoming courriers still awaiting a response.

## GET /api/courriers/aggregates
**Capability:** none.

**Response:** `{ total, aTraiter, enAttenteReponse, enDepassement, envoyes }`.

## GET /api/courriers
**Capability:** none

**Request:** query `search`, `direction` (`entrant|sortant`),
`suiviStatut`, `reponseRequise`, `sansReponse`, `enDepassement`,
`organisationId`, `dateDebut`, `dateFin`, `page`, `pageSize`.

## GET /api/courriers/:id
**Capability:** none. **Important errors:** 404 `COURRIER_INTROUVABLE`.

## GET /api/courriers/:id/fil
**Capability:** none

Purpose: the correspondence thread - every courrier whose `reponseAId`
points at this one, ordered oldest first. Returns `[]` if the parent id
doesn't exist (no existence check).

## GET /api/courriers/:id/export/pdf
**Capability:** none. `Content-Type: application/pdf`, inline if
`?apercu=1`, filename `courrier-{reference}.pdf`. No Excel export exists.

## POST /api/courriers
**Capability:** `CORRESPONDENCE_MANAGE`

**Request:** body `direction` (required, `entrant|sortant`), `objet`
(required), `dateReception` (required), `reponseRequise` (required,
`oui|non|pour_information`), `expediteurOrganisationId`/
`destinataireOrganisationId`, `expediteurContactId`/`destinataireContactId`,
`dateLimiteReponse`, `reponseAId` (reply/thread link - create-only, not
accepted on update), `accordId`, `missionId`, `documentIds` (array -
attaches documents inline at creation, in addition to the dedicated
attach endpoint below).

**Business logic:** if `reponseAId` is given, the parent must exist
(`COURRIER_PARENT_INTROUVABLE`); if this is a `sortant` reply, the parent
is auto-marked `suiviStatut:'repondu'`; `reference` is auto-generated.

**Response:** `201 CourrierView`.

**Important errors:** 400 missing/invalid required fields; 404
`COURRIER_PARENT_INTROUVABLE`/`ACCORD_INTROUVABLE`/`MISSION_INTROUVABLE`.
**Note:** `CONTACT_EXPEDITEUR_INVALIDE`/`CONTACT_DESTINATAIRE_INVALIDE`
(contact doesn't belong to the given organisation) are **not** in this
module's error map - they currently fall through to a generic 500 rather
than a 400. Flagged as a finding, not fixed here.

## PATCH /api/courriers/:id
**Capability:** `CORRESPONDENCE_MANAGE`

**Request:** body (≥1 required): `objet`, `dateReception`,
`reponseRequise`, `expediteurOrganisationId`/`destinataireOrganisationId`,
`expediteurContactId`/`destinataireContactId` (explicit `null` clears the
field, distinct from omitting it), `suiviStatut`
(`en_attente|repondu|archive`), `dateLimiteReponse`, `accordId`,
`missionId`. `reponseAId` is not accepted here.

**Important errors:** same `CONTACT_*_INVALIDE` caveat as create.

## POST /api/courriers/:id/documents
**Capability:** `CORRESPONDENCE_MANAGE`

Purpose: attach an existing document to a courrier.

**Request:** body `documentId` (required).

**Response:** `CourrierView`.

**Notes:** the returned courrier's `documents` array is **not refreshed**
post-insert (it reflects the pre-fetched row) - a client relying on the
response to show the newly attached document should re-fetch instead.

**Important errors:** 404 `COURRIER_INTROUVABLE`. `DOCUMENT_INTROUVABLE`
is not in this module's error map - falls through to 500.

## DELETE /api/courriers/:id/documents/:documentId
**Capability:** `CORRESPONDENCE_MANAGE`

Purpose: detach a document from a courrier. No-op (still 200) if the
attachment didn't exist.

**Notes:** same stale-response caveat as the add endpoint above.
