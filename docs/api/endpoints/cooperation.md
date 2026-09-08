# Cooperation endpoints (accords, partenaires, contacts)

Three base paths for one business domain: `/api/accords`, `/api/organisations`
(partner organisations and their contacts), `/api/contacts` (a read-only
cross-organisation directory). Every route requires `authenticate`.

## Accords (`/api/accords`)

### GET /api/accords/expirant
**Capability:** none. **Request:** query `jours` (default 90).

### GET /api/accords
**Capability:** none. **Request:** query `search`, `statut`,
`partenairesId`, `expirantAvant`, `page`, `pageSize`.

### GET /api/accords/:id
**Capability:** none. **Response:** `AccordView` with its partenaires.
**Important errors:** 404 `ACCORD_INTROUVABLE`.

### GET /api/accords/:id/export/pdf
**Capability:** none. `Content-Type: application/pdf`, inline if
`?apercu=1`, filename `accord-{reference}.pdf`.

### POST /api/accords
**Capability:** `AGREEMENT_MANAGE`

**Request:** body `titre`, `dateSignature` (required),
`partenairesIds` (required, non-empty array), `dateExpiration`,
`documentId`, `notes` (optional).

**Response:** `201 AccordView` (auto-generated `reference`).

**Important errors:** 400 `PARTENAIRES_REQUIS`; 404
`ORGANISATION_INTROUVABLE:{id}`.

### PATCH /api/accords/:id
**Capability:** `AGREEMENT_MANAGE`

**Request:** body (≥1 required) `titre`, `statut`
(`actif|expire|suspendu|en_renouvellement`), `dateSignature`,
`dateExpiration`, `partenairesIds`, `documentId`, `notes`.

**Note:** `documentId` uses a plain truthy check, not an explicit-null
check like missions' `rapportDocumentId` - `documentId: 0` would be treated
as absent here, a minor inconsistency worth knowing if a document could ever
have id `0` (it can't, in practice, since Postgres serial ids start at 1).

### POST /api/accords/:id/renouveler
**Capability:** `AGREEMENT_MANAGE`

Purpose: renew an accord - creates a new accord linked via `parentId` to
`:id`, with a new auto-generated reference.

**Request:** body `dateSignature` (required), `dateExpiration`, `notes`.

**Response:** `201 { accord, message }`.

**Notes:** no Excel export exists for accords - PDF only.

---

## Partenaires / Organisations (`/api/organisations`)

### GET /api/organisations/meta/pays, GET /api/organisations/meta/regions
**Capability:** none. Distinct country/region lists for filter dropdowns.

### GET /api/organisations
**Capability:** none

**Request:** query `search`, `pays`, `region`, `type`, `actif`, `page`,
`pageSize`, `sortBy` (`nom|type|pays|region|actif|createdAt`), `sortOrder`
(`asc|desc`), `contactQuality`
(`avec_principal|avec_contact_sans_principal|sans_contact_actif`).

### POST /api/organisations
**Capability:** `PARTNER_MANAGE`

**Request:** body `nom`, `pays`, `type` (required; `type` must be
`anac_etrangere|organisation_internationale|autre`), `region`, `actif`,
`notes` (optional).

**Important errors:** 400 invalid `type`; 409 `ORGANISATION_EXISTANTE`.

### GET /api/organisations/:id
**Capability:** none. **Important errors:** 404 `ORGANISATION_INTROUVABLE`.

### PATCH /api/organisations/:id
**Capability:** `PARTNER_MANAGE`. Body (≥1 required): `nom`, `pays`,
`region`, `type`, `actif`, `notes`. 409 on name conflict.

### GET /api/organisations/:id/contacts
**Capability:** none. Contacts belonging to one organisation.

### POST /api/organisations/:id/contacts
**Capability:** `PARTNER_MANAGE`

**Request:** body `nom`, `prenom` (required), `email`, `telephone`,
`poste`, `principal` (optional).

**Important errors:** 404 `ORGANISATION_INTROUVABLE`.

### PATCH /api/organisations/contacts/:contactId
**Capability:** `PARTNER_MANAGE`. Body (≥1 required): `nom`, `prenom`,
`email`, `telephone`, `poste`, `actif`. 404 `CONTACT_INTROUVABLE`.

### PATCH /api/organisations/contacts/:contactId/principal
**Capability:** `PARTNER_MANAGE`

Purpose: mark a contact as the organisation's principal contact.

**Response:** `{ contact, message }`.

**Notes:** all contact write operations are nested under `/api/organisations/...`
- there is no write access to contacts under `/api/contacts` (see below).
No export routes exist for organisations.

---

## Contacts directory (`/api/contacts`)

### GET /api/contacts
**Capability:** `USER_DIRECTORY_VIEW` (effectively any authenticated user
in practice)

Purpose: a flat, searchable, **read-only** contact directory across every
organisation - built to back the mission "contact on site" picker without
an N+1 fetch per organisation.

**Request:** query `search` (matches name or organisation name),
`actif`, `organisationId`, `pageSize` (no `page`/offset parameter exists on
this endpoint).

**Response:** `{ data: ContactListItem[] }` -
`{ id, nom, prenom, email?, telephone?, poste?, organisationId, organisationNom }`.

**Notes:** this endpoint does not use the shared error-handler pattern used
elsewhere - see [../conventions.md](../conventions.md). Contacts are not
writable here; use the nested `/api/organisations/:id/contacts` routes
above for mutations.
