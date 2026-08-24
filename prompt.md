# SICOT — Missions Module Redesign Implementation Task

You are acting as a Senior Frontend Engineer, UX/UI Architect, and Product Usability Specialist.

Your task is to redesign and implement the complete “Missions” module of SICOT.

Repository:

```text
https://github.com/fredpatch/sicot-monorepo.git
```

Primary frontend location:

```text
packages/client
```

The attached image is the visual reference for the target direction.

Use it to understand:

- The normalized SICOT visual language
- Registry density
- Mission operational KPIs
- Guided planning workflow
- Three-column mission overview
- Logistics visibility
- Participants management
- Report workflow
- Recommendations and follow-up
- Responsive behavior

Do not reproduce the mockup blindly.

First inspect the current implementation and adapt the design to:

- Existing API contracts
- Existing business fields
- Existing routes
- Existing role rules
- Existing shadcn components
- Existing Tailwind tokens
- Existing React Query architecture
- The normalized Dashboard, Accords, and Partenaires patterns already implemented in the repository

The task covers:

1. Missions registry
2. Guided mission creation
3. Mission editing
4. Mission detail workspace
5. Participants
6. Logistics
7. Contact on site
8. Mission report
9. Recommendations
10. Follow-up and reminders

Do not modify unrelated modules.

Do not commit or push changes unless explicitly requested.

---

# 1. Working mode

Work collaboratively and incrementally.

Use this status format:

```text
✅ Done
⏳ Current
🔜 Next
```

Follow this sequence:

1. Audit the current implementation
2. Report existing architecture and constraints
3. Propose the implementation plan
4. Implement incrementally
5. Validate the result
6. Return a final report

Do not start implementation before returning the Phase 1 audit report.

Do not produce one monolithic replacement file.

Do not introduce a second design system.

Do not invent backend data.

---

# 2. Product context

SICOT means:

```text
Système Intégré de Coopération Internationale et de Traduction
```

The Missions module manages official missions, travel, participation in events, mission logistics, participants, reports, and resulting recommendations.

A mission currently includes at least:

- Title
- Destination
- Country
- Start date
- End date
- Status
- Participants
- Logistics confirmation status
- Optional contact on site
- Optional mission report document
- Recommendations
- Creation and update metadata

Known mission statuses:

```text
planifiee
en_cours
terminee
annulee
```

Known logistics statuses:

```text
a_planifier
en_cours
confirme
```

Known recommendation statuses:

```text
en_attente
en_cours
realisee
```

The module must help users answer:

- Which missions are upcoming?
- Which missions are currently in progress?
- Which missions have logistics risks?
- Which missions are completed without a report?
- Who is participating?
- Who is the on-site contact?
- Which recommendations are still pending?
- Which recommendations are overdue?
- What action is required next?

---

# 3. Important mockup constraint

The attached visual reference includes some fields that may not exist in the current SICOT domain model.

Examples:

- Mission reference
- Mission type
- Priority
- Responsible person
- Detailed objective
- Programme
- Budget
- Multiple documents
- Meetings
- Progress percentage
- Expenses
- Organiser
- Precise location

Do NOT implement these fields unless the repository audit confirms they genuinely exist.

The visual reference is for:

- Layout
- hierarchy
- spacing
- density
- navigation
- interaction design

It is NOT permission to invent new business fields.

If a desirable field is missing, report it as a future domain enhancement.

---

# 4. Files to inspect first

Inspect at least:

```text
packages/client/src/pages/MissionsPage.tsx
packages/client/src/pages/missions/components/MissionFormPage.tsx
packages/client/src/pages/missions/components/MissionDetails.tsx
packages/client/src/lib/missions.api.ts
packages/client/src/lib/documents.api.ts
packages/client/src/lib/users.api.ts
packages/client/src/lib/organisations.api.ts
packages/client/src/App.tsx
packages/client/src/components/layouts/Layout.tsx
packages/client/src/components/table
packages/client/src/components/ui
packages/client/src/index.css
packages/client/tailwind.config.*
packages/client/package.json
```

Also inspect the current normalized implementations of:

```text
packages/client/src/pages/dashboard
packages/client/src/pages/accords
packages/client/src/pages/partenaires
```

Use them as the primary style and architecture reference.

Inspect the server-side mission module for:

- List payload
- Detail payload
- Filters
- Pagination
- Create payload
- Update payload
- Participants
- Logistics
- Contact on site
- Reports
- Recommendations
- Recommendation updates

Confirm real backend behavior rather than inferring it.

---

# 5. Existing implementation to preserve

The current Missions module already supports:

- Search
- Status filtering
- Pagination
- Mission creation
- Mission editing
- Participants selection
- Mission status
- Logistics confirmation
- On-site contact
- Mission report attachment
- Existing report document selection
- Recommendations
- Recommendation assignment
- Recommendation deadline
- Recommendation status updates
- Reminder notifications
- Expired or urgent logistics warnings
- Missing-report warning

Preserve these capabilities unless the audit proves one is broken or obsolete.

Do not remove business functionality for visual simplicity.

---

# 6. Current UX problems to solve

The redesign should address these weaknesses:

- The registry still uses the old narrow split-pane pattern.
- Destination, participants, logistics state, and report state are hard to scan across multiple missions.
- There are no operational summary metrics.
- Search and filtering are too basic.
- Creation is a single long form.
- Participants selection is a long checkbox list.
- Logistics is mostly treated as an edit-time concern.
- Contact-on-site selection uses an expensive multi-request workaround.
- The detail view stacks information vertically rather than acting as an operational workspace.
- Participants, logistics, report, recommendations, and contact information compete for attention.
- Recommendations do not have enough visual prominence.
- Missing reports are warnings, but not integrated into the overall mission workflow.
- N+1-style contact loading should not be normalized into the new design.

---

# 7. Target information architecture

Implement three coherent experiences.

## Screen A — Missions registry

Route:

```text
/missions
```

Primary goal:

Provide an operational overview of all missions.

## Screen B — Guided mission creation

Route:

```text
/missions/new
```

Primary goal:

Guide users through mission planning without presenting all fields at once.

## Screen C — Mission detail workspace

Route:

```text
/missions/:id
```

Primary goal:

Provide a mission command center combining planning, participants, logistics, report, and recommendations.

Editing may use:

```text
/missions/:id/edit
```

Preserve current route conventions where practical.

---

# 8. Screen A — Missions registry

## 8.1 Page header

Display:

```text
Missions
```

Subtitle:

```text
Planifiez et suivez les missions et déplacements officiels.
```

Right-side actions:

- Exporter, only if genuinely supported
- Nouvelle mission

Do not create a non-functional export action.

---

# 8.2 Operational summary cards

Add compact metrics.

Suggested cards:

- Total missions
- Planifiées
- En cours
- À venir
- Terminées
- Annulées

Optional operational metric:

- Logistique à risque

Only display metrics that can be calculated accurately.

Do not derive full totals from the current paginated page.

Suggested wording:

```text
Total missions
32
Toutes périodes
```

```text
Planifiées
7
À préparer
```

```text
En cours
3
Actuellement en déplacement
```

```text
À venir
5
Dans les 30 prochains jours
```

```text
Terminées
17
Suivi terminé
```

```text
Annulées
0
Aucune annulation
```

If the backend does not provide aggregate counts, identify the minimum server-side change.

---

# 8.3 Operational risk indicators

The registry must surface mission health.

Useful risk states:

### Critical

- Mission starts within 14 days
- Logistics not confirmed

### Warning

- Mission completed
- No mission report

### Warning

- Pending overdue recommendations

Do not create a single generic “priority” field.

Derive risk from real business state.

Centralize this logic.

---

# 8.4 Search and filters

Provide a horizontal filter toolbar.

Search placeholder:

```text
Rechercher une mission, une destination ou un pays…
```

Filters:

- Statut
- Pays
- Période
- Participant, if supported
- Logistique
- Rapport
- Recommendation health, if practical

Suggested period filters:

```text
Toutes
À venir
En cours
30 prochains jours
Cette année
Terminées
```

Suggested logistics filters:

```text
Toutes
À planifier
En cours
Confirmée
À risque
```

Suggested report filters:

```text
Tous
Rapport disponible
Rapport manquant
```

Synchronize meaningful filters with URL search parameters.

Debounce remote search.

Reset page when filters change.

---

# 8.5 Registry table

Use a full-width table on desktop.

Suggested columns:

- Mission
- Destination
- Pays
- Dates
- Participants
- Statut
- Logistique
- Rapport
- Actions

Do not invent mission references unless the domain contains them.

Mission column:

- Mission title
- Optional operational warning

Destination:

```text
Montréal
Canada
```

Dates:

```text
02 juin 2026 → 06 juin 2026
```

Participants:

```text
4 participants
```

Logistics:

```text
Confirmée
En cours
À planifier
```

Report:

```text
Disponible
À déposer
Non requis / —
```

Use real rules.

Row click opens:

```text
/missions/:id
```

Actions menu:

- Voir
- Modifier
- Gérer la logistique
- Déposer le rapport
- Voir les recommandations

Only show valid actions.

---

# 8.6 Mobile behavior

Desktop:

- Full-width mission table

Tablet:

- Hide lower-priority columns
- Preserve title, destination, dates, status, logistics

Mobile:

- Mission cards
- Destination
- Period
- Status
- Logistics state
- Participant count
- Report health
- Actions menu

Do not require horizontal scrolling.

---

# 8.7 States

Implement:

- Loading skeleton
- Error with retry
- Empty mission registry
- Empty filtered result

Differentiate:

```text
Aucune mission enregistrée.
```

from:

```text
Aucune mission ne correspond aux filtres sélectionnés.
```

---

# 9. Screen B — Guided mission creation

Use a stepper.

Recommended steps based on current real fields:

1. Informations générales
2. Dates et destination
3. Participants
4. Contact et logistique
5. Vérification

Do not add Programme, Budget, Priority, Mission Type, Objectives, or Documents unless confirmed by the repository.

---

# 9.1 Step 1 — Informations générales

Fields:

- Titre de la mission

Potential contextual helper:

```text
Ex. Participation à l’Assemblée OACI 2026
```

Do not ask for status during creation unless there is a real business need.

Default status should remain consistent with backend behavior.

---

# 9.2 Step 2 — Dates et destination

Fields:

- Destination
- Pays
- Date de début
- Date de fin

Validation:

- Destination required
- Country required
- Start date required
- End date required
- End date >= start date

Show a concise summary:

```text
Montréal, Canada
02 juin 2026 → 06 juin 2026
Durée : 5 jours
```

Do not store duration.

Derive it.

Be careful with date-only timezone handling.

---

# 9.3 Step 3 — Participants

Improve the existing checkbox selector.

Provide:

- Search
- Selected count
- Agent name
- Matricule
- Selected agents panel

Suggested desktop layout:

Left:

```text
Agents disponibles
```

Right:

```text
Participants sélectionnés
```

Allow removal from the selected panel.

On mobile:

- Stack both sections

Do not fetch users repeatedly between steps.

Reuse React Query cache.

Participants remain optional if current backend permits it.

---

# 9.4 Step 4 — Contact et logistique

This should be a first-class planning step.

Fields supported by the current model:

- Contact on site
- Logistics status

However, audit current creation support carefully.

The API currently supports:

```text
contactSurPlaceId
```

Confirm whether it should be allowed during create.

For logistics:

Current known values:

```text
a_planifier
en_cours
confirme
```

Recommended creation default:

```text
a_planifier
```

Do not require users to manually select the default unless useful.

Display:

```text
État logistique
À planifier
```

Contact-on-site selector:

- Contact name
- Organisation
- Email
- Phone

Avoid the current workaround that fetches every organisation and then every contact.

Prefer:

```text
GET /contacts?actif=true
```

or another existing centralized contact endpoint.

If none exists, propose the minimum backend addition.

Do not normalize an N+1 request pattern.

Allow:

```text
Aucun contact sur place pour le moment
```

---

# 9.5 Step 5 — Verification

Display:

- Mission title
- Destination
- Country
- Dates
- Duration
- Participants
- Contact on site
- Logistics state

Primary action:

```text
Créer la mission
```

Secondary:

```text
Annuler
```

Allow navigation back to previous steps.

Do not add draft behavior unless it exists.

---

# 9.6 Stepper behavior

Desktop:

- Vertical stepper
- Form workspace

Tablet/mobile:

- Compact horizontal progress

Requirements:

- Current step identified
- Completed steps marked
- Per-step validation
- Values preserved
- Future invalid steps blocked
- Previous steps accessible
- Focus moves to step heading
- Accessible step labels
- Stable bottom navigation

Actions:

```text
Précédent
Suivant
Créer la mission
```

---

# 10. Editing behavior

Route:

```text
/missions/:id/edit
```

Do not force users through all creation steps for a minor operational update.

Use grouped sections:

- Informations
- Dates
- Participants
- Logistique
- Contact sur place
- Statut

Mission report and recommendations should not be mixed into the standard edit form.

Those are separate operational workflows.

---

# 11. Screen C — Mission detail workspace

Use the clean three-column operational layout.

The mission detail becomes the central command center.

---

# 11.1 Header

Breadcrumb:

```text
Missions / {mission title}
```

Header content:

- Mission title
- Mission status
- Destination
- Country
- Dates

Primary actions:

- Modifier
- Mettre à jour la logistique
- Déposer le rapport, when relevant
- Plus d’actions

Possible overflow actions:

- Annuler la mission, if supported
- Préparer une relance
- Voir notifications
- Open report

Do not invent actions.

---

# 11.2 Summary strip

Display:

- Statut
- Destination
- Période
- Participants
- Logistique

Optional:

- Rapport

Examples:

```text
Statut
En cours
```

```text
Destination
Montréal, Canada
```

```text
Période
02 → 06 juin 2026
```

```text
Participants
4
```

```text
Logistique
Confirmée
```

---

# 11.3 Local navigation

Recommended sections:

- Aperçu
- Participants
- Logistique
- Rapport
- Recommandations
- Notifications
- Historique

Implement only sections supported by real data.

Do not add Budget, Programme, or Documents unless the backend supports them.

Normalize style with Accords and Partenaires.

---

# 12. Three-column overview

Large desktop:

## Column 1 — Informations clés

Display:

- Title
- Destination
- Country
- Start date
- End date
- Status
- Created date

If appropriate:

- Contact on site

Keep it compact.

## Column 2 — Participants

Show:

- Participant name
- Matricule
- Email when available

Maximum preview:

```text
4 participants
```

Display a link:

```text
Voir tous les participants
```

Do not invent participant roles such as “Responsable” unless they exist.

## Column 3 — Operational follow-up

Display:

- Logistics state
- Contact on site
- Report state
- Recommendations count

Suggested layout:

```text
Logistique
Confirmée
```

```text
Rapport
À déposer
```

```text
Recommandations
3 en attente
1 dépassée
```

This column should answer:

```text
What still needs attention?
```

---

# 13. Logistics section

Make logistics a dedicated workflow section.

Current states:

```text
À planifier
En cours
Confirmée
```

Display:

- Current state
- Mission start date
- Countdown
- On-site contact
- Operational warning

Critical example:

```text
Départ dans 8 jours.
La logistique n’est pas encore confirmée.
```

Primary action:

```text
Mettre à jour la logistique
```

Use a small dialog or side sheet.

Do not require users to open the entire edit form just to change logistics.

---

# 14. Contact on site

Display:

- Name
- Organisation
- Position
- Email
- Phone

Actions:

- Email
- Copy contact data
- Change contact

Only expose data that exists.

Empty state:

```text
Aucun contact sur place défini.
```

Action:

```text
Définir un contact
```

Use centralized contact querying.

Do not fetch all organisation contacts individually.

---

# 15. Participants section

Display a full participant list.

Suggested columns:

- Agent
- Matricule
- Email
- Actions

Do not invent participant roles.

Allow participant management only through existing mission update behavior.

Potential action:

```text
Modifier les participants
```

This may open a compact participant-management dialog rather than full mission edit.

Prefer the simpler existing mutation path if splitting it creates unnecessary complexity.

---

# 16. Mission report section

The current model supports one report document:

```text
rapportDocumentId
```

Preserve this.

Display:

- Report status
- File name
- MIME type
- Open
- Download

For completed mission without report:

```text
Rapport de mission requis
```

Primary action:

```text
Déposer le rapport
```

Support both existing behaviors:

- Upload new file
- Link existing mission document

Do not redesign this as multiple report documents.

---

# 17. Report workflow

When mission status becomes:

```text
terminee
```

and no report is linked:

Show a warning.

Do not necessarily block mission completion unless current business rules require it.

Confirm server behavior.

Suggested status wording:

```text
Mission terminée — rapport non déposé
```

Once report exists:

```text
Rapport disponible
```

Do not duplicate the same warning across multiple cards.

---

# 18. Recommendations section

Recommendations are a first-class workflow.

Display each recommendation with:

- Text
- Responsible agent
- Deadline
- Status
- Overdue state

Statuses:

```text
En attente
En cours
Réalisée
```

Operational warning:

```text
Dépassée de 12 jours
```

Actions:

- Mark in progress
- Mark completed
- Edit where supported
- Send reminder
- Reassign responsible person if supported

Preserve existing update endpoint.

Do not use color alone.

---

# 19. Recommendations summary

At section header, display:

```text
5 recommandations
3 en attente
1 dépassée
```

Sort operationally:

1. Overdue
2. Due soon
3. In progress
4. No deadline
5. Completed

Provide filters if useful:

```text
Toutes
À traiter
Dépassées
Réalisées
```

Do not overbuild for a small dataset.

---

# 20. Add recommendation flow

Use a small dialog or side sheet.

Fields:

- Recommendation
- Responsible person
- Deadline

Current validation:

- Recommendation text required

Do not require responsible or deadline unless backend does.

Display helper:

```text
Une date limite permet d’activer le suivi et les alertes.
```

---

# 21. Notifications and reminders

Preserve existing reminder behavior.

For recommendation reminders:

Display:

- Recipient
- Recommendation
- Deadline
- Message preview

Do not send from an ambiguous single-click icon.

Prefer:

```text
Préparer une relance
```

Then review and send.

Keep notification history available if existing.

---

# 22. Mission lifecycle indicators

Derive lifecycle state from dates and mission status.

Possible indicators:

```text
À venir
En cours
Terminée
Annulée
```

Do not create a new stored status.

If mission is `planifiee` and start date is in the future:

Display:

```text
J-8
```

If dates indicate the mission should be underway but status is still planned:

Show a non-blocking consistency warning.

Example:

```text
La date de départ est atteinte mais la mission est toujours marquée “Planifiée”.
```

Do not automatically mutate state unless explicitly required.

---

# 23. Component architecture

Suggested structure:

```text
packages/client/src/pages/missions/
├── components/
│   ├── MissionStatusBadge.tsx
│   ├── MissionLogisticsBadge.tsx
│   ├── MissionHealthBadge.tsx
│   ├── MissionsSummaryCards.tsx
│   ├── MissionsFilters.tsx
│   ├── MissionsRegistryTable.tsx
│   ├── MissionRegistryCard.tsx
│   ├── MissionDetailHeader.tsx
│   ├── MissionSummaryStrip.tsx
│   ├── MissionOverview.tsx
│   ├── MissionParticipantsSection.tsx
│   ├── MissionLogisticsSection.tsx
│   ├── MissionReportSection.tsx
│   ├── MissionRecommendationsSection.tsx
│   ├── MissionNotificationsSection.tsx
│   ├── LogisticsDialog.tsx
│   ├── RecommendationDialog.tsx
│   └── form/
│       ├── MissionFormStepper.tsx
│       ├── GeneralInformationStep.tsx
│       ├── DestinationDatesStep.tsx
│       ├── ParticipantsStep.tsx
│       ├── LogisticsContactStep.tsx
│       └── ReviewStep.tsx
├── hooks/
│   ├── useMissionsQueries.ts
│   ├── useMissionDetailQueries.ts
│   └── useMissionsMutations.ts
├── mission.types.ts
├── mission.schemas.ts
├── mission.utils.ts
├── mission.constants.ts
├── MissionsPage.tsx
├── MissionDetailPage.tsx
└── MissionFormPage.tsx
```

Adapt to current conventions.

Do not rename everything unnecessarily.

Reuse existing working code where appropriate.

---

# 24. Shared normalization

Inspect the updated:

- Dashboard
- Accords
- Partenaires

Reuse shared visual and architectural patterns for:

- Page headers
- Breadcrumbs
- Summary metric cards
- Filter toolbars
- Full-width registries
- Mobile cards
- Stepper
- Detail summary strip
- Section navigation
- Error states
- Empty states
- Action menus
- Responsive spacing

Extract shared primitives only where useful.

Do not copy-paste large components.

---

# 25. Centralized business utilities

Create shared mission utilities.

Examples:

```text
getMissionLifecycleState
getMissionDuration
daysUntilMissionStart
isMissionLogisticsAtRisk
isMissionReportMissing
isRecommendationOverdue
getMissionHealth
formatMissionPeriod
```

Centralize thresholds.

Example:

```text
MISSION_LOGISTICS_RISK_DAYS = 14
```

Do not repeat:

```text
14 * 24 * 60 * 60 * 1000
```

throughout the UI.

Handle date-only values carefully.

---

# 26. Contact query problem

The current form loads:

1. All organisations
2. Then all contacts for each organisation

This creates an N+1 pattern.

Do not preserve this approach.

Audit whether a centralized contacts endpoint exists.

Preferred minimum API:

```text
GET /contacts?actif=true
```

Possible response:

```text
{
  data: [
    {
      id,
      nom,
      prenom,
      email,
      telephone,
      poste,
      organisationId,
      organisationNom
    }
  ]
}
```

If no endpoint exists, propose and implement the smallest safe server-side addition.

Do not redesign the Partenaires module.

---

# 27. Registry aggregates

Audit whether mission list response supports:

- Total
- By status
- Upcoming count
- Logistics-risk count
- Missing-report count

If unavailable, propose a lightweight aggregate response.

Example:

```text
{
  data,
  total,
  aggregates: {
    total,
    planned,
    inProgress,
    completed,
    cancelled,
    upcoming30Days,
    logisticsAtRisk,
    missingReport
  }
}
```

Do not calculate global KPIs from only one page.

---

# 28. Accessibility

Requirements:

- Full keyboard access
- Semantic table rows and links
- No invalid nested buttons
- Accessible menus
- Stepper exposes current/completed state
- Visible field labels
- Validation errors linked to fields
- Status not conveyed by color alone
- Icon-only buttons have accessible names
- Dialog focus trapped/restored
- Focus moves to step heading
- Report upload progress announced
- Recommendations deadlines readable without color
- Mobile cards preserve logical order

---

# 29. Responsive behavior

Desktop:

- Full-width registry
- Vertical guided stepper
- Three-column detail overview

Tablet:

- Reduced registry columns
- Compact stepper
- Two-column detail layout

Mobile:

- Mission cards
- Filters stacked or in sheet
- One creation step at a time
- Detail sections stacked
- Header actions collapsed
- Participants displayed as cards
- Recommendations displayed as cards
- No horizontal overflow

---

# 30. Error handling

Implement meaningful states for:

- Mission list failure
- Mission detail failure
- Invalid ID
- Missing mission
- Users list failure
- Contacts list failure
- Mission creation failure
- Mission update failure
- Logistics update failure
- Report upload failure
- Existing-report selection failure
- Recommendation creation failure
- Recommendation update failure
- Reminder failure
- Related notification history failure

Do not return null for expected errors.

Use existing toast and alert patterns.

---

# 31. Performance

- Debounce registry search
- Preserve server-side pagination
- Reuse users cache
- Replace contact N+1 loading
- Lazy-load notification history if appropriate
- Lazy-load report details where useful
- Avoid refetching full mission after every minor action if optimistic or targeted update is safe
- Invalidate only relevant queries

Do not overengineer for a small internal user base.

---

# 32. Testing and validation

Run relevant project commands.

At minimum validate:

- TypeScript
- ESLint
- Production build
- `/missions`
- `/missions/new`
- `/missions/:id`
- `/missions/:id/edit`
- Search
- Status filter
- Country filter
- Period filter
- Logistics filter
- Report filter
- Pagination
- URL restoration
- Mission creation
- Step validation
- Participants selection
- Date-range validation
- Contact selection
- Creation without contact
- Mission editing
- Logistics update
- Report upload
- Existing report linking
- Mission completed without report
- Mission completed with report
- Recommendation creation
- Recommendation status update
- Overdue recommendation display
- Reminder flow
- Upcoming mission countdown
- Logistics risk warning
- Loading states
- Error states
- Empty states
- Keyboard navigation
- Desktop
- Tablet
- Mobile
- No horizontal overflow
- No console errors

Do not claim checks passed unless executed.

---

# 33. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current file structure
2. Current routes
3. Current API payloads
4. Mission status rules
5. Logistics rules
6. Participant rules
7. Report workflow
8. Recommendation rules
9. Contact-on-site behavior
10. Existing reusable UI
11. Dashboard/Accords/Partenaires patterns to reuse
12. Data limitations
13. Backend dependencies
14. Proposed file changes
15. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Registry component map
2. Summary metrics strategy
3. Guided creation steps
4. Detail workspace design
5. Logistics workflow
6. Report workflow
7. Recommendations workflow
8. Contact querying strategy
9. Shared normalization plan
10. Responsive strategy
11. Accessibility strategy
12. Backend changes if unavoidable
13. Implementation order

## Phase 3 — Registry implementation

Implement:

1. Shared types/utilities
2. Header
3. Summary cards
4. Search/filters
5. Desktop table
6. Mobile cards
7. Pagination
8. Health indicators
9. Loading/error/empty states

Validate.

## Phase 4 — Guided creation

Implement:

1. Stepper
2. General information
3. Destination/dates
4. Participants
5. Contact/logistics
6. Review
7. Submission
8. Unsaved-change handling
9. Responsive behavior

Validate.

## Phase 5 — Detail workspace

Implement:

1. Header
2. Summary strip
3. Overview
4. Participants
5. Logistics
6. Contact on site
7. Report
8. Recommendations
9. Notifications
10. States
11. Responsive behavior

Validate.

## Phase 6 — Final validation

Run project checks and fix regressions.

## Phase 7 — Final report

Return:

1. Summary
2. Files created
3. Files modified
4. Registry changes
5. Guided form changes
6. Detail workspace changes
7. Logistics changes
8. Contact-query changes
9. Report workflow
10. Recommendations workflow
11. Shared components
12. Backend/API changes
13. Accessibility decisions
14. Responsive behavior
15. Validation commands
16. Validation results
17. Remaining recommendations

---

# 34. Acceptance criteria

The task is complete when:

- Missions follows the normalized SICOT visual style.
- The registry is full-width and operationally useful.
- Mission KPIs are accurate.
- Logistics risks are immediately visible.
- Missing reports are visible.
- Search, filters, and pagination work.
- URL filters persist.
- Mobile uses mission cards.
- Mission creation uses a guided stepper.
- The stepper uses only real domain fields.
- Dates validate correctly.
- Participants selection is searchable and manageable.
- Contact on site can be selected efficiently.
- The N+1 contact-loading workaround is removed.
- Mission detail uses the three-column operational layout.
- Logistics has a dedicated workflow.
- Participants are visible and manageable.
- Report workflow remains supported.
- Recommendations are a first-class section.
- Overdue recommendations are explicit.
- Reminder functionality remains available.
- Loading, error, empty, and missing-record states exist.
- Mission business rules are centralized.
- The design aligns with Dashboard, Accords, and Partenaires.
- The module is responsive.
- The module is keyboard accessible.
- TypeScript, lint, and build pass.
- No unrelated modules are changed.
- A final implementation report is returned.

---

# 35. Restrictions

Do not:

- Rewrite the entire application.
- Replace React Query.
- Replace React Hook Form.
- Replace Zod.
- Replace Tailwind.
- Introduce another UI library.
- Add mock production data.
- Invent mission type.
- Invent priority.
- Invent budget.
- Invent programme.
- Invent objectives.
- Invent multiple mission documents.
- Invent participant roles.
- Invent mission reference if none exists.
- Preserve N+1 contact fetching.
- Calculate global KPIs from the current page.
- Mix report management into the normal mission edit form.
- Hide logistics inside generic edit only.
- Reduce recommendations to a secondary note field.
- Duplicate normalized Accords/Partenaires components through copy-paste.
- Modify unrelated pages.
- Commit or push changes.

Start with Phase 1 only.

Inspect the updated repository and return the audit report before writing implementation code.
