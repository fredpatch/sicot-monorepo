# Users & Personnel ANAC endpoints

Base paths: `/api/users`, `/api/personnel-anac`. All routes require
`authenticate`. Account activation/reset flow:
[../authentication.md](../authentication.md). Capability model:
[../../security/authorization.md](../../security/authorization.md).

## Users (`/api/users`)

### GET /api/users
**Capability:** `USER_DIRECTORY_VIEW`

Purpose: paginated/filterable user directory.

**Request:** query `search`, `role`, `actif` (`'true'` string), `page`,
`pageSize` (defaults `page=1`, `pageSize=20`).

**Response:** `{ data: UserView[], total }` -
`UserView = { id, matricule, nom, prenom, email, poste, service, direction, role, actif, premiereConnexion, createdAt, updatedAt }`.

## GET /api/users/aggregates
**Capability:** `USER_MANAGE`

Purpose: global user counters. **Response:** `{ total, actifs, inactifs, premiereConnexionEnAttente }`.

## POST /api/users
**Capability:** `USER_MANAGE`

Purpose: create a new user account; sends an activation OTP email.

**Request:** body `matricule`, `nom`, `prenom`, `email`, `role` (required;
`role` must be one of `agent|operateur|admin|super_admin`), `poste`,
`service`, `direction` (optional).

**Response:** `201 { ...UserView, emailEnvoye }`.

**Important errors:** 400 missing/invalid fields; 409 `MATRICULE_EXISTANT` /
`EMAIL_EXISTANT`.

## GET /api/users/:id
**Capability:** `USER_MANAGE`

**Response:** `UserView & { derniereConnexion }`.

**Important errors:** 404 `UTILISATEUR_INTROUVABLE`.

## PATCH /api/users/:id
**Capability:** `USER_MANAGE`

Purpose: partially update role, active status, and/or email.

**Request:** body `role`, `actif`, `email` (all optional, at least one
required; `email` regex-validated, `role` whitelist-validated).

**Response:** `UserView`.

**Important errors:** 400 no fields / invalid email / invalid role; 404
`UTILISATEUR_INTROUVABLE`; 409 `EMAIL_EXISTANT`.

## PATCH /api/users/:id/activation
**Capability:** `USER_MANAGE`

Purpose: activate/deactivate an account.

**Request:** body `actif` (required boolean).

**Response:** `UserView`.

**Important errors:** 400 non-boolean `actif`; 403 self-deactivation attempt
(hand-rolled, no `code`) or `SUPER_ADMIN_INDESACTIVABLE`; 404 not found.

## POST /api/users/:id/reinitialiser-otp
**Capability:** `USER_MANAGE`

Purpose: admin-triggered password reset - regenerates and re-sends an OTP,
routing the account back through the first-login flow.

**Response:** `{ message, emailEnvoye }`.

**Important errors:** 404 `UTILISATEUR_INTROUVABLE`; 400 `COMPTE_INACTIF`.

---

## Personnel ANAC directory lookup (`/api/personnel-anac`)

Used to search/prefill the external ANAC staff directory when creating a
user account (see `CreateUserDialog`). Every route requires **both**
`authenticate` and `USER_MANAGE` (router-wide).

### GET /api/personnel-anac
**Capability:** `USER_MANAGE`

**Request:** query `page` (default 1), `limit` (default 20, **not**
`pageSize` - see [../conventions.md](../conventions.md)), `sortBy`
(`'id'|'lastName'`, default `'lastName'`, **not runtime-validated against
this union** - any string passes through), `order` (`'asc'|'desc'`, same
caveat).

**Response:** `{ data: PersonnelAnacView[], total, page, limit }` -
`PersonnelAnacView = { matricule, nom, prenom, organisationLabel, poste, service, direction }`.
`matricule` is zero-padded to 4 digits server-side (the upstream API
represents it as a number, which cannot carry a leading zero on its own -
see the commit fixing this in `personnel-anac.service.ts`).

### GET /api/personnel-anac/rechercher
**Capability:** `USER_MANAGE`

**Request:** query `q` (free text, min 2 characters after trimming).

**Response:** `{ data: PersonnelAnacView[] }`.

**Important errors:** 400 `RECHERCHE_TROP_COURTE`.

### GET /api/personnel-anac/matricule/:matricule
**Capability:** `USER_MANAGE`

**Response:** `PersonnelAnacView` (single object, not wrapped in `data`).

**Important errors:** 400 `MATRICULE_INVALIDE`; 404 `PERSONNEL_INTROUVABLE`;
503 `PERSONNEL_ANAC_INDISPONIBLE`; 429 `PERSONNEL_ANAC_LIMITE_ATTEINTE`.
