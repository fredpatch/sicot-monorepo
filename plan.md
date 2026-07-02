● I've scheduled a check-in and will compile the complete prioritized refactoring plan once the background exploration finishes.

✻ Waiting for 1 background agent to finish

● Agent "Survey remaining module services/controllers" finished · 1m 12s

● Survey complete. Here's the prioritized refactoring plan for packages/server/src/modules, ordered biggest file → smallest.

Reference pattern (already done — use as the template)

- document/services/{documents.service.ts, documents.types.ts, documents.helpers.ts, documents.constants.ts} and
  document/controllers/documents.errors.ts
- users/controllers/users.controller.ts imports handleUsersError from @/utils/error.ts — no inline map
- The createErrorHandler(errorMap, logPrefix) factory in utils/error.ts (built last session) — but it only supports exact key
  lookup, not prefix-matching. Two controllers below need a factory enhancement before they can adopt it.

Priority list

#: 1
File: missions/services/missions.service.ts
Lines: 557
Extract → .types.ts: 12 interfaces/types (MissionStatut, RecommandationStatut, LogistiqueStatut, ContactResume,
Create/UpdateMissionParams, Create/UpdateRecommandationParams, MissionFilters, ParticipantResume, RecommandationView,
MissionView)
Extract → .helpers.ts: getParticipantsMission, getRecommandationsMission, toMissionView, getContactSurPlace
Extract → .constants.ts: —
Notes: RecommandationView shaping is duplicated 3x (inajouterRecommandation, mettreAJourRecommandation,
getRecommandationsMission/getRecommandationsEnAttente) — consolidate into one toRecommandationView helper first, biggest win
in the file
────────────────────────────────────────
#: 2
File: dasboard/services/dashboard.service.ts
Lines: 471
Extract → .types.ts: 1 large DashboardData interface (nested)
Extract → .helpers.ts: day-diff calc (Math.floor/ceil on ms) repeated 3x inline — extract getDaysDiff(a, b)
Extract → .constants.ts: thresholds already come from parametres service, no static table
Notes: Whole file is basically one 350-line getDashboardData function — split into named per-section query functions (e.g.
getMissionsSummary, getAccordsSummary) inside a .helpers.ts or keep in service but break up
────────────────────────────────────────
#: 3
File: courriers/services/courriers.service.ts
Lines: 433
Extract → .types.ts: 9 exports (CourrierDirection, ...Statut x3, ...Criticite, Create/UpdateCourrierParams, CourrierFilters,
OrganisationResume, CourrierView)
Extract → .helpers.ts: calculerCriticite, genererReference, toCourrierView, getOrganisationAvecContact
Extract → .constants.ts: —
Notes: seuils ({surveiller, critique}) reloaded via getValeurEntier 5 separate times — extract a chargerSeuils() helper,
second-biggest duplication win
────────────────────────────────────────
#: 4
File: traduction/services/traduction.service.ts
Lines: 413
Extract → .types.ts: TraductionStatut + 3 interfaces
Extract → .helpers.ts: toTraductionView (8x reuse), enrichirGlossaireDepuisCorrection
Extract → .constants.ts: —
Notes: Already funnels through one shaping helper — noinline duplication beyond the types/helpers split
────────────────────────────────────────
#: 5
File: accords/services/accords.service.ts
Lines: 411
Extract → .types.ts: AccordStatut + 4 interfaces
Extract → .helpers.ts: genererReference, toAccordView,getPartenairesAccord
Extract → .constants.ts: —
Notes: Controller has a prefix-matched error code (ORGANISATION_INTROUVABLE:ID) — factory caveat applies
────────────────────────────────────────
#: 6
File: partenaires/services/organisations.service.ts
Lines: 392
Extract → .types.ts: OrganisationType + 6 interfaces
Extract → .helpers.ts: toOrganisationView, toContactView
Extract → .constants.ts: —
Notes: Clean already, just a mechanical split
────────────────────────────────────────
#: 7
File: demandes/services/demandes.service.ts
Lines: 378
Extract → .types.ts: DemandeStatut, DemandePriorite + 3 interfaces
Extract → .helpers.ts: toDemandeView (async, 5x), getTexteDocument
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 8
File: glossaire/services/glossaire.service.ts
Lines: 312
Extract → .types.ts: 5 interfaces
Extract → .helpers.ts: toTermeView (6x)
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 9
File: users/services/users.service.ts
Lines: 257
Extract → .types.ts: 4 interfaces
Extract → .helpers.ts: toUserView (6x, trivial)
Extract → .constants.ts: —
Notes: Low priority — file is small and simple already
────────────────────────────────────────
#: 10
File: auth/services/auth.service.ts
Lines: 246
Extract → .types.ts: AuthTokens, UserPublic, LoginResult
Extract → .helpers.ts: handleEchecConnexion, resetTentatives, buildTokens, buildUserPublic
Extract → .constants.ts: SALT_ROUNDS, MAX_LOGIN_ATTEMPTS, BLOCAGE_MINUTES
Notes: Caution: hosts logAudit, imported repo-wide (missions, accords, courriers, documents, etc.) — do not relocate that
export
without a repo-wide import sweep
────────────────────────────────────────
#: 11
File: notifications/services/notifications.service.ts
Lines: 161
Extract → .types.ts: NotificationType, NotificationStatut + 2 interfaces
Extract → .helpers.ts: toNotificationView, verifierDejaNotifieAujourdhui
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 12
File: audit/services/audit.service.ts
Lines: 151
Extract → .types.ts: AuditFilters, AuditLogView
Extract → .helpers.ts: row→view mapping is inline and duplicated in listerAuditLogs + getAuditLog — extract toAuditLogView
Extract → .constants.ts: —
Notes: Currently has no helpers file at all; this is astraightforward de-dup
────────────────────────────────────────
#: 13
File: parametres/services/parametres.service.ts
Lines: 140
Extract → .types.ts: ParametreType, ParametreView
Extract → .helpers.ts: toParametreView, validerValeur
Extract → .constants.ts: —
Notes: Smallest, lowest priority

Controller errorMap → .errors.ts (mechanical, using existing createErrorHandler)

Clean fits (no code changes needed to the factory):

- demandes.controller.ts (9 entries)
- traduction.controller.ts (7 entries)
- courriers.controller.ts (4 entries)
- organisations.controller.ts (3 entries)
- parametres.controller.ts (3 entries)
- glossaire.controller.ts (1 entry)

Needs factory work first — both have a dynamic prefix-matched code (e.g. PARTICIPANT_INTROUVABLE:${id}) that exact-match lookup
can't handle:

- missions.controller.ts (5 entries + prefix case)
- accords.controller.ts (3 entries + prefix case)

Suggested fix: add an optional prefixHandlers param tocreateErrorHandler, or keep the prefix check as a thin wrapper around
the factory's returned handler.

Suggested execution order

1. audit.service.ts and parametres.controller.ts/glossaire.controller.ts/organisations.controller.ts — smallest, safest, builds
   confidence in the mechanical pattern.
2. Roll the same mechanical .types.ts/.helpers.ts split through demandes → glossaire → traduction → organisations → accords
   (all "clean", no special cases).
3. missions.service.ts — biggest file, includes the recommand

Reference pattern (already done — use as the template)

- document/services/{documents.service.ts,
  documents.types.ts, documents.helpers.ts,
  documents.constants.ts} and
  document/controllers/documents.errors.ts
- users/controllers/users.controller.ts imports
  handleUsersError from @/utils/error.ts — no inline map
- The createErrorHandler(errorMap, logPrefix) factory in
  utils/error.ts (built last session) — but it only supports
  exact key lookup, not prefix-matching. Two controllersbelow
  need a factory enhancement before they can adopt it.

Priority list

#: 1
File: missions/services/missions.service.ts
Lines: 557
Extract → .types.ts: 12 interfaces/types (MissionStatut,
RecommandationStatut, LogistiqueStatut, ContactResume,
Create/UpdateMissionParams,
Create/UpdateRecommandationParams, MissionFilters,
ParticipantResume, RecommandationView, MissionView)
Extract → .helpers.ts: getParticipantsMission,
getRecommandationsMission, toMissionView,
getContactSurPlace
Extract → .constants.ts: —
Notes: RecommandationView shaping is duplicated 3x (in
ajouterRecommandation, mettreAJourRecommandation,
getRecommandationsMission/getRecommandationsEnAttente) —
consolidate into one toRecommandationView helper first,
biggest win in the file
────────────────────────────────────────
#: 2
File: dasboard/services/dashboard.service.ts
Lines: 471
Extract → .types.ts: 1 large DashboardData interface (nested)
Extract → .helpers.ts: day-diff calc (Math.floor/ceil on ms)
repeated 3x inline — extract getDaysDiff(a, b)
Extract → .constants.ts: thresholds already come from
parametres service, no static table
Notes: Whole file is basically one 350-line getDashboardData
function — split into named per-section query functions
(e.g. getMissionsSummary, getAccordsSummary) inside a
.helpers.ts or keep in service but break up
────────────────────────────────────────
#: 3
File: courriers/services/courriers.service.ts
Lines: 433
Extract → .types.ts: 9 exports (CourrierDirection, ...Statut
x3, ...Criticite, Create/UpdateCourrierParams,
CourrierFilters, OrganisationResume, CourrierView)
Extract → .helpers.ts: calculerCriticite, genererReference,
toCourrierView, getOrganisationAvecContact
Extract → .constants.ts: —
Notes: seuils ({surveiller, critique}) reloaded via
getValeurEntier 5 separate times — extract a
chargerSeuils()
helper, second-biggest duplication win
────────────────────────────────────────
#: 4
File: traduction/services/traduction.service.ts
Lines: 413
Extract → .types.ts: TraductionStatut + 3 interfaces
Extract → .helpers.ts: toTraductionView (8x reuse),
enrichirGlossaireDepuisCorrection
Extract → .constants.ts: —
Notes: Already funnels through one shaping helper — noinline

    duplication beyond the types/helpers split

────────────────────────────────────────
#: 5
File: accords/services/accords.service.ts
Lines: 411
Extract → .types.ts: AccordStatut + 4 interfaces
Extract → .helpers.ts: genererReference, toAccordView,
getPartenairesAccord
Extract → .constants.ts: —
Notes: Controller has a prefix-matched error code
(ORGANISATION_INTROUVABLE:ID) — factory caveat applies
────────────────────────────────────────
#: 6
File: partenaires/services/organisations.service.ts
Lines: 392
Extract → .types.ts: OrganisationType + 6 interfaces
Extract → .helpers.ts: toOrganisationView, toContactView
Extract → .constants.ts: —
Notes: Clean already, just a mechanical split
────────────────────────────────────────
#: 7
File: demandes/services/demandes.service.ts
Lines: 378
Extract → .types.ts: DemandeStatut, DemandePriorite + 3
interfaces
Extract → .helpers.ts: toDemandeView (async, 5x),
getTexteDocument
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 8
File: glossaire/services/glossaire.service.ts
Lines: 312
Extract → .types.ts: 5 interfaces
Extract → .helpers.ts: toTermeView (6x)
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 9
File: users/services/users.service.ts
Lines: 257
Extract → .types.ts: 4 interfaces
Extract → .helpers.ts: toUserView (6x, trivial)
Extract → .constants.ts: —
Notes: Low priority — file is small and simple already
────────────────────────────────────────
#: 10
File: auth/services/auth.service.ts
Lines: 246
Extract → .types.ts: AuthTokens, UserPublic, LoginResult
Extract → .helpers.ts: handleEchecConnexion, resetTentatives,

    buildTokens, buildUserPublic

Extract → .constants.ts: SALT_ROUNDS, MAX_LOGIN_ATTEMPTS,
BLOCAGE_MINUTES
Notes: Caution: hosts logAudit, imported repo-wide (missions,

    accords, courriers, documents, etc.) — do not relocate that

    export without a repo-wide import sweep

────────────────────────────────────────
#: 11
File: notifications/services/notifications.service.ts
Lines: 161
Extract → .types.ts: NotificationType, NotificationStatut + 2

    interfaces

Extract → .helpers.ts: toNotificationView,
verifierDejaNotifieAujourdhui
Extract → .constants.ts: —
Notes: Clean split
────────────────────────────────────────
#: 12
File: audit/services/audit.service.ts
Lines: 151
Extract → .types.ts: AuditFilters, AuditLogView
Extract → .helpers.ts: row→view mapping is inline and
duplicated in listerAuditLogs + getAuditLog — extract
toAuditLogView
Extract → .constants.ts: —
Notes: Currently has no helpers file at all; this is a
straightforward de-dup
────────────────────────────────────────
#: 13
File: parametres/services/parametres.service.ts
Lines: 140
Extract → .types.ts: ParametreType, ParametreView
Extract → .helpers.ts: toParametreView, validerValeur
Extract → .constants.ts: —
Notes: Smallest, lowest priority

Controller errorMap → .errors.ts (mechanical, using existing
createErrorHandler)

Clean fits (no code changes needed to the factory):

- demandes.controller.ts (9 entries)
- traduction.controller.ts (7 entries)
- courriers.controller.ts (4 entries)
- organisations.controller.ts (3 entries)
- parametres.controller.ts (3 entries)
- glossaire.controller.ts (1 entry)

Needs factory work first — both have a dynamic prefix-matched
code (e.g. PARTICIPANT_INTROUVABLE:${id}) that exact-match
lookup can't handle:

- missions.controller.ts (5 entries + prefix case)
- accords.controller.ts (3 entries + prefix case)

Suggested fix: add an optional prefixHandlers param to
createErrorHandler, or keep the prefix check as a thin
wrapper around the factory's returned handler.

Suggested execution order

1.   audit.service.ts and parametres.controller.ts/glossaire.co
     ntroller.ts/organisations.controller.ts — smallest, safest,
     builds confidence in the mechanical pattern.
2.   Roll the same mechanical .types.ts/.helpers.ts split
     through demandes → glossaire → traduction → organisations →
     accords (all "clean", no special cases).
3.   missions.service.ts — biggest file, includes the
     recommandation-shaping de-dup.
4.   dashboard.service.ts — biggest structural change
     (splitting the monolithic function), do after the mechanical
     ────────────────────────────────────────
     #: 11
     File: notifications/services/notifications.service.ts
     Lines: 161
     Extract → .types.ts: NotificationType,
     NotificationStatut + 2 interfaces
     Extract → .helpers.ts: toNotificationView,
     verifierDejaNotifieAujourdhui
     Extract → .constants.ts: —
     Notes: Clean split
     ────────────────────────────────────────
     #: 12
     File: audit/services/audit.service.ts
     Lines: 151
     Extract → .types.ts: AuditFilters, AuditLogView
     Extract → .helpers.ts: row→view mapping is inline and
     duplicated in listerAuditLogs + getAuditLog — extract

    toAuditLogView

Extract → .constants.ts: —
Notes: Currently has no helpers file at all; this is a
straightforward de-dup
────────────────────────────────────────
#: 13
File: parametres/services/parametres.service.ts
Lines: 140
Extract → .types.ts: ParametreType, ParametreView
Extract → .helpers.ts: toParametreView, validerValeur
Extract → .constants.ts: —
Notes: Smallest, lowest priority

Controller errorMap → .errors.ts (mechanical, using
existing createErrorHandler)

Clean fits (no code changes needed to the factory):

- demandes.controller.ts (9 entries)
- traduction.controller.ts (7 entries)
- courriers.controller.ts (4 entries)
- organisations.controller.ts (3 entries)
- parametres.controller.ts (3 entries)
- glossaire.controller.ts (1 entry)

Needs factory work first — both have a dynamic
prefix-matched code (e.g.
PARTICIPANT_INTROUVABLE:${id}) that exact-match lookup
can't handle:

- missions.controller.ts (5 entries + prefix case)
- accords.controller.ts (3 entries + prefix case)

Suggested fix: add an optional prefixHandlers param to
createErrorHandler, or keep the prefix check as a thin
wrapper around the factory's returned handler.

Suggested execution order

1. audit.service.ts and parametres.controller.ts/glossa
   ire.controller.ts/organisations.controller.ts —
   smallest, safest, builds confidence in the mechanical
   pattern.
2. Roll the same mechanical .types.ts/.helpers.ts split
   through demandes → glossaire → traduction →
   organisations → accords (all "clean", no special
   cases).
3. missions.service.ts — biggest file, includes the
   recommandation-shaping de-dup.
4. dashboard.service.ts — biggest structural change
   (splitting the monolithic function), do after the
   mechanical patterns are proven elsewhere.
5. auth.service.ts last, carefully, because of the
   cross-module logAudit dependency.
6. Enhance createErrorHandler for prefix codes, then
   migrate missions.controller.ts and
   accords.controller.ts.

No files were changed — this is exploration only, ready
for you to approve before I start moving anything.

✻ Worked for 2m 38s

✻ Claude resuming /loop wakeup (Jul 1 7:59pm)

● The background survey already completed and I compiled
the full prioritized plan in my previous message —
nothing further is running. To recap briefly: 13
services and 9 controllers were surveyed, and the plan
above lists them ordered by line count
(missions.service.ts at 557 lines down to
parametres.service.ts at 140), each with concrete
.types.ts/.helpers.ts/.constants.ts/.errors.ts
extraction targets, flagged duplication (recommandation
shaping in missions, seuils reloading in courriers,
audit log mapping duplicated twice), the logAudit
cross-module caution on auth.service.ts, and the two
controllers (missions, accords) that need a small
factory enhancement for prefix-matched error codes
before they can adopt createErrorHandler.

No files have been changed. Want me to start executing
the plan, and if so, in the suggested order
(smallest/safest first) or a different one?
