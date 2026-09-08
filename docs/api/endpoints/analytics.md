# Analytics & reports endpoints

Base paths: `/api/analytics` (router-wide `authenticate` + `ANALYTICS_VIEW`,
applies to every route below unless a stricter capability is layered on
top) and `/api/dashboard`. AI-narrative governance detail (anonymization,
DG/RGPD approval status): [../../architecture/overview.md](../../architecture/overview.md).

**Error-shape note:** `handleAnalyticsError`'s error map is **empty** -
every thrown error not explicitly caught inline (only
`LIMITE_QUOTIDIENNE_ATTEINTE` is) becomes a generic 500, even ones that
conceptually should be 404 (e.g. `RAPPORT_INTROUVABLE` on
`GET /rapports/:id`). Do not assume a 404 where the underlying error isn't
explicitly listed below.

## Per-module analytics (all identical shape)

**GET /api/analytics/accords, /courriers, /missions, /traductions,
/demandes, /documents, /glossaire, /global**

Purpose: analytics for one business module (or `global` = cross-module).

**Request:** query `dateDebut`, `dateFin` (optional ISO dates; `dateFin`
normalized to end-of-day UTC).

**Response:** module-specific analytics object.

## GET /api/analytics/export
**Capability:** `ANALYTICS_VIEW`

**Request:** query `module` (must be a known module key), `format`
(`excel`|`csv`), optional `dateDebut`/`dateFin`.

**Response:** binary file - `.xlsx`
(`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) or
`.csv` (UTF-8, with a BOM prefix), filename `analytics-{module}-{date}.{ext}`.

**Important errors:** 400 unknown `module` or invalid `format`.

**Notes:** writes an audit entry (`ANALYTICS_EXPORT_EXCEL`/`_CSV`).

## GET /api/analytics/gemini-usage
**Capability:** `ANALYTICS_VIEW` **and** `ADMIN_MONITORING_VIEW`

**Response:** `{ modeles: [{modele, appelsAujourdhui, plafond, thinkingTokensAujourdhui}], rapportsIA: {utilises, max}, dernierRapportMensuel }`.

---

## Rapports (mounted under `/api/analytics/rapports*`)

These routes are served by the `report` module's controller/service, wired
directly into the analytics router - **`packages/server/src/modules/report/routes/rapports.route.ts`
itself is an empty, unmounted file; there is no `/api/report*` or
`/api/rapports*` path.** See [../overview.md](../overview.md) and the final
report for this phase.

### POST /api/analytics/rapports
**Capability:** `ANALYTICS_VIEW`

Purpose: generate an ad-hoc report document (PDF or Excel), persisted as a
`documents` row + a `rapports` row (`type: 'a_la_demande'`).

**Request:** body `periodeDebut`, `periodeFin` (required), `modules`
(required non-empty array), `format` (`pdf`|`excel`, required).

**Response:** `201 { rapportId, documentId }`.

### GET /api/analytics/rapports
**Capability:** `ANALYTICS_VIEW`

**Response:** array of report rows, including `contenuIA`,
`contenuIAValide`, `statutRelectureIA`, `moteurIA`, `relecteurIAId`,
`relusLeIA`.

### GET /api/analytics/rapports/:id
**Capability:** `ANALYTICS_VIEW`

**Response:** the full report row.

**Notes:** `RAPPORT_INTROUVABLE` is not explicitly mapped - becomes 500,
not 404 (see the error-shape note above).

### POST /api/analytics/rapports/:id/analyse-ia
**Capability:** `ANALYTICS_VIEW` **only** - generation is capability-narrow
by design, distinct from the validation route below.

Purpose: trigger the Gemini-generated narrative for a report. Enforces both
a per-model daily API quota and a separate daily manual-generation quota;
anonymizes personal data before sending anything to Gemini; if activity is
below a minimum threshold, no Gemini call is made at all and the report is
auto-marked `valide` with deterministic text.

**Response:** the updated report row.

**Important errors:** **429** `LIMITE_QUOTIDIENNE_ATTEINTE:{used}/{max}`
(daily manual-generation quota exceeded - the one error this module's
handler catches inline and maps explicitly); 500 if all Gemini models are
quota-exhausted for the day.

### PATCH /api/analytics/rapports/:id/analyse-ia
**Capability:** `ANALYTICS_VIEW` **and** `ADMIN_MONITORING_VIEW` -
deliberately kept as a distinct, additional capability from generation
(even though today's effective role set granting both is the same), so a
future broadening of `ANALYTICS_VIEW` to a wider role doesn't silently
expose validate/reject alongside it.

Purpose: human review of the AI-generated narrative - validate or reject.

**Request:** body `statutRelectureIA` (required, `'valide'|'rejete'`),
`contenuIAValide` (optional edited text, used only when validating).

**Response:** `204 No Content`.

**Important errors:** 400 invalid `statutRelectureIA`; `DEJA_TRAITE` (report
not currently `en_attente`) is not explicitly mapped - becomes 500.

**Confirmed capability split**: generation (`POST .../analyse-ia`) needs
only `ANALYTICS_VIEW`; validation/rejection (`PATCH .../analyse-ia`) and
quota monitoring (`GET /gemini-usage`) additionally need
`ADMIN_MONITORING_VIEW`. All other rapports/analytics routes need only
`ANALYTICS_VIEW`.

---

## Dashboard (`/api/dashboard`)

### GET /api/dashboard
**Capability:** `ANALYTICS_VIEW`

Purpose: the aggregated cross-module overview shown on the main dashboard
screen.

**Response:** a single opaque aggregate object (module-specific counts and
summaries).

**Notes:** error handling is hand-rolled inline here (`{ message }`, no
`code`), not the shared factory - see [../conventions.md](../conventions.md).
Previously open to any authenticated role; tightened to require
`ANALYTICS_VIEW` to match the frontend's route guard.
