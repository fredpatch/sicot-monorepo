# Glossary endpoints

Base path: `/api/glossaire`. Every route requires `authenticate`. No
per-user ownership - capability check only.

## GET /api/glossaire/aggregates
**Capability:** `GLOSSARY_VIEW`

**Response:** `{ total, actifs, inactifs, domaines }`.

## GET /api/glossaire/suggestions
**Capability:** `GLOSSARY_VIEW`

Purpose: prefix/substring autocomplete for the translation editor.

**Request:** query `q` (required), `limite` (default 5). Only active terms
are matched.

**Important errors:** 400 missing `q`.

## POST /api/glossaire/import
**Capability:** `GLOSSARY_MANAGE`

Purpose: bulk import terms (used by the seed script).

**Request:** body `termes` (required non-empty array of
`{ termeFr, termeEn, domaine?, contexte? }`). Items missing `termeFr`/
`termeEn` are silently skipped and counted as `ignores`, not rejected.

**Response:** `{ importes, ignores, message }`. **Status: 200**, not 201,
despite being a bulk-create operation.

## GET /api/glossaire
**Capability:** `GLOSSARY_VIEW`

**Request:** query `search`, `domaine`, `actif` (defaults to filtering
`actif=true` when not specified), `page`, `pageSize`.

**Response:** `{ data, total, domaines }` - `domaines` is the distinct list
of non-null domain values among active terms.

## GET /api/glossaire/:id
**Capability:** `GLOSSARY_VIEW`

**Response:** `TermeView & { historique: HistoriqueEntry[] }` - edit history
is embedded inline. **There is no separate history route** - this is the
only way to read a term's change history via the API.

**Important errors:** 404 `TERME_INTROUVABLE`.

## POST /api/glossaire
**Capability:** `GLOSSARY_MANAGE`

**Request:** body `termeFr`, `termeEn` (required), `domaine`, `contexte`
(optional).

**Response:** `201 TermeView`.

**Important errors:** 400 missing fields; 409 `TERME_DEJA_EXISTANT`
(case-insensitive duplicate check on the `termeFr`/`termeEn` pair).

## PATCH /api/glossaire/:id
**Capability:** `GLOSSARY_MANAGE`

**Request:** body (≥1 required) `termeFr`, `termeEn`, `domaine`,
`contexte`, `actif`.

**Notes:** if `termeFr`/`termeEn` changes, the **old values are archived
into the history** before the update - this is how `historique` above gets
populated.

## PATCH /api/glossaire/:id/desactiver
**Capability:** `GLOSSARY_MANAGE`

Purpose: soft-deactivate a term (never hard-deleted) - removes it from
autocomplete suggestions.

## PATCH /api/glossaire/:id/reactiver
**Capability:** `GLOSSARY_MANAGE`

**Important errors:** 400 `TERME_DEJA_ACTIF`.
