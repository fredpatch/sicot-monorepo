# SICOT - Data Model

Explains the major persistent data domains and their relationships. This is
**not** a column-by-column schema reference - for exact field definitions,
read [`packages/server/src/db/schema.ts`](../../packages/server/src/db/schema.ts)
directly (632 lines, comments group tables by module code M1–M11).

## Persistence stack

- **PostgreSQL** (16), single database.
- **Drizzle ORM** - connection pool in
  [`packages/server/src/db/index.ts`](../../packages/server/src/db/index.ts)
  (`drizzle-orm/node-postgres`, `pg.Pool`).
- **Schema**: one file,
  [`packages/server/src/db/schema.ts`](../../packages/server/src/db/schema.ts)
  - 24 tables.
- **Migrations**: [`packages/server/drizzle/`](../../packages/server/drizzle/),
  driven by [`packages/server/drizzle.config.ts`](../../packages/server/drizzle.config.ts).

## Migration baseline

`packages/server/drizzle/0000_initial_schema.sql` is currently the **sole**
migration - confirmed via `packages/server/drizzle/meta/_journal.json`,
which has exactly one entry. No migrations have been appended since.

**Rule going forward:** once staging/production has consumed this baseline,
**do not rewrite `0000_initial_schema.sql`**. All future schema changes must
be new, appended migrations (`0001_...` and onward), generated with
`npm run db:generate` and reviewed before `npm run db:migrate` is run against
a shared environment. Migration procedure detail (review workflow, rollback,
when to run `db:generate` vs `db:migrate`) belongs in the future
`docs/operations/migrations.md`, not here.

## Major domain groups

Grouped by business concept. Line references point at `schema.ts`.

### Identity / authentication

- `users` - accounts: matricule, name, email, password hash, OTP fields,
  `role` (`agent`/`operateur`/`admin`/`super_admin`), lockout fields.
- `parametres` - key/value system settings, type-checked (`entier` /
  `booleen` / `texte`).

### Partenaires / contacts

- `organisations` - foreign partner organisations (foreign ANAC, international
  org, other).
- `contacts` - people within an `organisation`.

### Accords

- `accords` - agreement records (status, dates, linked document, versioning
  via `parentId`).
- `accordsOrganisations` - many-to-many join, `accords` ↔ `organisations`.

### Missions / recommandations

- `missions` - trip records, logistics checklist, one official
  `rapportDocumentId` + `rapportResponsableId` per mission.
- `missionParticipants` - many-to-many join, `missions` ↔ `users`.
- `recommandations` - action items produced from a mission, each with its own
  `responsableId`.

### Courriers

- `courriers` - incoming/outgoing correspondence, with response tracking.
- `courrierDocuments` - join table, `courriers` ↔ `documents`; the current
  source of truth for multi-attachment (superseding a legacy single
  `courriers.documentId` column that still exists on the table).
- `courriersCriticiteSnapshots` - daily snapshot of correspondence
  criticality counts, written by the nightly `criticite-snapshot` job.

### Demandes / traductions

- `demandesTraduction` - translation requests (priority, status, lock flag).
- `traductions` - translation content/state, distinguishing AI-draft text
  from final reviewed text; `traducteurId`/`relecteurId` name the currently
  assigned translator/reviewer (see [overview.md](./overview.md) - these are
  domain assignments, not persistent roles).

### Glossaire

- `glossaire` - FR/EN term pairs.
- `glossaireHistorique` - change history per term.

### Documents / versioning / publication

- `documents` - filename, storage path (`chemin`, a filesystem path - no
  cloud storage key/bucket columns), mime type, size, category, OCR status
  and extracted text, MD5 hash, `version` + `parentId` (versioning chain),
  soft delete (`deletedAt`), and public-portal visibility flags
  (`visibilitePortail`, `portailTokenDureeJours`).
- `portailTokens` - single-document download tokens issued by the public
  portal (UUID, optional expiry, requester email/IP).
- **Documents is referenced-from, not referencing-to**: `accords`,
  `courriers`, `missions`, `traductions`, `demandesTraduction`, `rapports`,
  and `portailTokens` each hold a `documentId` pointing at `documents` - the
  `documents` table itself does not carry typed foreign keys out to those
  entities.

### Analytics / rapports

- `rapports` - generated report metadata, including the Gemini-drafted
  narrative (pending review) and its validated final text.
- `geminiUsageQuotidien` - daily Gemini call quota tracking, per model.
- `rapportsIAQuotidien` - daily count of on-demand AI report generations
  (a separate, global rate limit).

### Audit

- `auditLogs` - actor (`userId`, nullable for system-triggered entries),
  free-text `action`, `module` code, generic `entiteId` (not FK'd - no
  paired `entiteType` column, so entity type must be inferred from
  `module`+`action`), freeform `jsonb details`, `ip`, timestamp.

### Outbound notifications

- `notifications` - an **outbound email send-log** for three reminder types
  (`accord_echeance`, `courrier_relance`, `recommandation_rappel`). It is
  **not an in-app notification/inbox system** - no read-state column, no
  recipient-user foreign key (recipient is captured as a raw email/name
  pair). Do not assume future in-app notification work can reuse this table
  as-is.

### Job execution history

- `jobExecutions` - append-only run log for cron/manual jobs (`jobCle`,
  `source` = `manuel`/`cron`, success flag, duration, error text, who
  triggered a manual run). **This table is history only, not a live
  schedule/queue** - actual cron schedules are defined in code
  ([`packages/server/src/jobs/`](../../packages/server/src/jobs/)), not
  persisted in the database.

## Key cross-domain relationships

Only relationships actually implemented (via `.references()` or, where
noted, a plain integer column that conceptually points elsewhere):

- `organisations` ↔ `contacts` - one organisation has many contacts.
- `accords` ↔ `organisations` - many-to-many via `accordsOrganisations`.
- `missions` ↔ `missionParticipants` ↔ `users` - many-to-many participation.
- `missions` ↔ official report - `missions.rapportDocumentId` →
  `documents.id`, `missions.rapportResponsableId` → `users.id`, and
  `rapportResponsableId` must always be one of the mission's current
  participants (enforced in
  [`missions.service.ts`](../../packages/server/src/modules/missions/services/missions.service.ts),
  `validerResponsableRapport`).
- `demandesTraduction` ↔ `traductions` ↔ `documents` - a request links to its
  translation record and source document.
- `courriers` ↔ responses/linked records - `courriers.reponseAId` links a
  correspondence to the one it replies to; `courriers.accordId` optionally
  links it to an agreement. Both are plain integer columns, not declared as
  Drizzle foreign keys (see Known implementation notes below).
- `documents` ↔ versions/public visibility - `documents.parentId` chains
  versions of the same document; `visibilitePortail` + `portailTokens`
  govern public exposure, gated on `statutOCR = 'traite'`.

## Special architectural data rules

Rules a future developer must not accidentally break:

- **One official consolidated report per mission** - a mission has a single
  `rapportDocumentId`/`rapportResponsableId` pair, not one report per
  participant.
- **`rapportResponsableId` must always name a current participant** of that
  mission - enforced at the service layer on every create/update, not just
  at creation time (if a participant is removed while holding this role, the
  service clears the field rather than leaving a dangling reference).
- **Single persistent role per user** - `users.role` is one value; there is
  no secondary/legacy role column and no numeric role hierarchy.
- **Workflow actor IDs are not persistent roles** - `traducteurId`,
  `relecteurId`, `responsableId`, `declenchePar`, etc. are all ordinary
  foreign keys to `users.id` representing "who is assigned to this specific
  record," independent of that user's `role`. Do not confuse a
  `traducteurId` value with a `traducteur` role - the latter does not exist.

## Non-obvious persistence semantics

- `notifications` is a send-log, not an inbox (see above).
- `jobExecutions` is history, not a scheduler - schedules live in code.
- Document **files** live on the filesystem (`UPLOAD_DIR`, a Docker volume in
  every compose tier); only document **metadata** lives in PostgreSQL.
  Losing the volume without the DB (or vice versa) breaks referential
  integrity between the two.

## Known implementation notes

Documented here as-is; not fixed in this phase, and this is not a bug
backlog - just what a maintainer needs to know before assuming Drizzle
enforces something it doesn't:

- `documents.parentId` (version self-reference) is a plain `integer` column,
  not declared with Drizzle's `.references()`.
- `courriers.missionId` and `courriers.reponseAId` are conceptually foreign
  keys (to `missions.id` and `courriers.id` respectively) but are likewise
  plain `integer` columns without `.references()`.
- `accords.parentId` (version self-reference) is the same pattern as
  `documents.parentId`.
- Explicit Drizzle `relations()` helpers exist only for a subset of tables
  (`users`, `organisations`, `accords`, `missions`) - most tables rely on raw
  column-level FKs only, with no `relations()` wrapper. This doesn't affect
  correctness (Drizzle FKs and constraints still work), only how relational
  queries can be written against them.
