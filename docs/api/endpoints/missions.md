# Mission endpoints

Base path: `/api/missions`. Every route requires `authenticate`. Data model
for the mission/participant/report relationships:
[../../architecture/data-model.md](../../architecture/data-model.md#special-architectural-data-rules).

## GET /api/missions/recommandations/en-attente
**Capability:** none

Purpose: all pending recommendations across missions (dashboard widget).

## GET /api/missions/aggregates
**Capability:** none. **Request:** query `participantId` - if the caller
lacks `MISSION_REGISTRY_VIEW`, any value other than their own id is
silently overridden to their own (not an error).

**Response:** `{ total, planifiees, enCours, terminees, annulees, aVenir30Jours, logistiqueARisque, rapportsEnAttente }`.

## GET /api/missions
**Capability:** none, same `participantId` scoping as aggregates.

**Request:** query `search`, `statut`, `pays`, `participantId`,
`confirmationLogistique`, `rapportStatut` (`'disponible'|'manquant'`),
`page`, `pageSize`.

## GET /api/missions/:id
**Capability:** none. **Response:** `MissionView` with participants,
recommendations, contact, logistics.

## GET /api/missions/:id/recommandations
**Capability:** none. **Response:** `RecommandationView[]`.

## GET /api/missions/:id/export/pdf
**Capability:** none. **Response:** `Content-Type: application/pdf`,
inline if `?apercu=1` else attachment, filename `mission-{id}-rapport.pdf`.

## POST /api/missions
**Capability:** `MISSION_MANAGE`

**Request:** body `titre`, `destination`, `pays`, `dateDebut`, `dateFin`
(required); `participantsIds` (optional array), `contactSurPlaceId`
(optional).

**Response:** `201 MissionView`.

**Important errors:** 400 `DATES_INVALIDES`; 404
`PARTICIPANT_INTROUVABLE:{id}` / `CONTACT_INTROUVABLE`.

## PATCH /api/missions/:id
**Capability:** `MISSION_MANAGE`

**Request:** body (all optional, ≥1 required) `titre`, `destination`,
`pays`, `dateDebut`, `dateFin`, `statut` (whitelist), `participantsIds`,
`rapportDocumentId` (int or explicit `null` to clear),
`rapportResponsableId` (int or explicit `null` to clear),
`logistiqueBilletReserve`/`logistiqueHebergementConfirme`/`logistiqueFinancementValide`
(booleans), `contactSurPlaceId`.

**The consolidated-report rule (still enforced):**
`rapportResponsableId`, if provided, **must be one of the mission's
current/incoming participants** - violation throws
`RESPONSABLE_RAPPORT_NON_PARTICIPANT` (400). If `participantsIds` is
updated and the *existing* responsible is no longer in the new list, it is
auto-cleared to `null` rather than the request failing. See
[../../architecture/data-model.md](../../architecture/data-model.md).

**Important errors:** 400 `MISSION_ANNULEE` (a cancelled mission cannot be
modified); 404 not found / participant/contact not found.

## PATCH /api/missions/:id/rapport
**Capability:** none at the router level - **contextual only**: allowed if
the caller has `MISSION_MANAGE`, **or** has `MISSION_VIEW_OWN` **and** is
this mission's current designated `rapportResponsableId`. Otherwise 403.

Purpose: attach/clear only the mission's official report document, without
touching any other field - the narrow path for the designated report-owner.

**Request:** body `documentId` (required - int, or explicit `null` to
remove).

**Important errors:** 400 missing `documentId`; 403 not the designated
responsible.

## POST /api/missions/:id/recommandations
**Capability:** `MISSION_RECOMMENDATION_MANAGE`

**Request:** body `texte` (required), `responsableId` (optional),
`dateLimite` (optional).

**Response:** `201 RecommandationView`.

## PATCH /api/missions/recommandations/:recId
**Capability:** `MISSION_RECOMMENDATION_MANAGE`

**Request:** body (≥1 required) `texte`, `responsableId`, `dateLimite`,
`statut` (`en_attente|en_cours|realisee`).

**Important errors:** 404 `RECOMMANDATION_INTROUVABLE`.

---

## Notes

- **No dedicated participant-management sub-route** - participants are set
  only via `participantsIds` on create/update (`PATCH` replaces the full
  set; an empty array explicitly clears all participants).
- **One official consolidated report per mission** - `rapportDocumentId`/
  `rapportResponsableId` are singular fields on the mission itself, not
  per-participant records.
- No Excel export exists for missions - PDF only.
