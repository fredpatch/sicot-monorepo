# SICOT — Courriers Module Redesign Implementation Task

You are acting as a Senior Frontend Engineer, UX/UI Architect, and Product Usability Specialist.

Your task is to redesign and implement the complete “Courriers” module of SICOT.

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
- Operational summary cards
- Search and filtering hierarchy
- Guided courrier creation
- Courrier lifecycle visualization
- Follow-up and response tracking
- Document visibility
- Reminder workflow
- Detail workspace structure
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
- Existing Dashboard, Accords, Partenaires, and Missions patterns already normalized in the repository

The task covers:

1. Courriers registry
2. Guided courrier creation
3. Courrier editing
4. Courrier detail workspace
5. Incoming and outgoing correspondence
6. Response tracking
7. Related courrier threads
8. Documents
9. Reminder / relance workflow
10. Courrier operational status

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
3. Propose an implementation plan
4. Implement incrementally
5. Validate the result
6. Return a final implementation report

Do not start implementation before returning the Phase 1 audit report.

Do not produce one large replacement file.

Do not introduce another design system.

Do not invent backend data.

---

# 2. Product context

SICOT means:

```text
Système Intégré de Coopération Internationale et de Traduction
```

The Courriers module manages official incoming and outgoing correspondence handled by the cooperation and translation workflow.

A courrier may involve:

- Reference
- Subject
- Incoming or outgoing type
- Sender
- Recipient
- Date
- Status
- Priority
- Response expectation
- Response deadline
- Related correspondence
- Attachments
- Reminder notifications
- Internal notes
- Creation/update metadata

The module must help users answer:

- Which courriers require action?
- Which are waiting for a response?
- Which are overdue?
- Which outgoing messages have been sent?
- Which incoming messages still require handling?
- What response is expected?
- Which courriers belong to the same conversation/thread?
- Which documents are attached?
- What is the next action?

---

# 3. Important mockup constraint

The visual reference contains some fields that may not exist in the current domain.

Examples may include:

- Explicit priority
- Response type
- Automatic reminders
- Workflow stage
- Receipt confirmation
- Internal criticality
- Detailed lifecycle events

Do NOT implement these unless the repository audit confirms they exist.

The mockup is primarily a reference for:

- Layout
- density
- hierarchy
- workflow
- navigation
- interaction design

If a useful field is absent from the current domain model, report it as a future enhancement.

---

# 4. Files to inspect first

Inspect at least:

```text
packages/client/src/pages/CourriersPage.tsx
packages/client/src/pages/courriers/components/CourrierFormPage.tsx
packages/client/src/pages/courriers/components/*
packages/client/src/lib/courriers.api.ts
packages/client/src/lib/documents.api.ts
packages/client/src/lib/notifications.api.ts
packages/client/src/App.tsx
packages/client/src/components/layouts/Layout.tsx
packages/client/src/components/table
packages/client/src/components/ui
packages/client/src/index.css
packages/client/tailwind.config.*
packages/client/package.json
```

Also inspect the normalized implementations of:

```text
packages/client/src/pages/accords
packages/client/src/pages/partenaires
packages/client/src/pages/missions
```

Reuse their shared patterns where appropriate.

Inspect the server-side correspondence module for:

- List payload
- Detail payload
- Create payload
- Update payload
- Filters
- Pagination
- Status model
- Incoming/outgoing type
- Sender and recipient representation
- Related correspondence
- Attachments
- Reply/response relationships
- Notifications
- Reminder rules
- Deadline rules

Confirm real backend behavior rather than inferring it.

---

# 5. Existing functionality to preserve

Preserve all currently working capabilities, including where available:

- Search
- Incoming/outgoing filtering
- Status filtering
- Pagination
- Courrier creation
- Courrier editing
- Sender/recipient data
- Document attachment
- Existing document linking
- Related courrier/reply relationship
- Response tracking
- Reminder actions
- Notification history
- Waiting-response alerts
- Dashboard integration
- Detail navigation

Do not remove working business behavior for visual simplicity.

---

# 6. Current UX problems to solve

Audit and address these likely weaknesses:

- Registry still follows an older dense or split pattern.
- Incoming and outgoing flows may not be immediately distinguishable.
- Status and response health are not prominent enough.
- Waiting-response risk is hard to scan.
- Creation may expose too many fields at once.
- Sender/recipient logic can be confusing.
- Response expectations are not presented as a clear workflow.
- Related correspondence may feel disconnected.
- Documents and reminders compete visually.
- Detail may show data without clearly communicating the next action.
- Operational overdue state should be explicit.
- The module should follow the normalized SICOT patterns already established.

---

# 7. Target information architecture

Implement three coherent experiences.

## Screen A — Courriers registry

Route:

```text
/courriers
```

Primary goal:

Provide an operational register of incoming and outgoing correspondence.

## Screen B — Guided courrier creation

Route:

```text
/courriers/new
```

Primary goal:

Guide users through creation depending on whether the courrier is incoming or outgoing.

## Screen C — Courrier detail workspace

Route:

```text
/courriers/:id
```

Primary goal:

Provide a complete operational view of the courrier, related correspondence, response state, documents, and reminders.

Editing may use:

```text
/courriers/:id/edit
```

---

# 8. Screen A — Courriers registry

## 8.1 Header

Display:

```text
Courriers
```

Subtitle:

```text
Gérez les courriers entrants et sortants ainsi que leur suivi.
```

Right-side action:

```text
Nouveau courrier
```

Optional:

```text
Exporter
```

only if genuinely supported.

Do not create a fake export action.

---

# 8.2 Operational summary cards

Suggested metrics:

- Total courriers
- À traiter
- En attente de réponse
- Envoyés
- Critiques / en dépassement

Only display metrics that can be computed accurately.

Suggested wording:

```text
Total courriers
142
Tous types confondus
```

```text
À traiter
23
Nécessitent une action
```

```text
En attente de réponse
37
12 en dépassement
```

```text
Envoyés
186
Courriers sortants transmis
```

```text
Critiques
7
À traiter en priorité
```

Do not calculate global metrics from only the current page.

If needed, propose a lightweight aggregate endpoint.

---

# 8.3 Search and filters

Search placeholder:

```text
Rechercher par référence, objet, expéditeur ou destinataire…
```

Filters:

- Type
- Statut
- Priorité, only if real
- Période
- Réponse attendue
- En dépassement
- Expéditeur/destinataire where practical

Suggested type filter:

```text
Tous
Entrants
Sortants
```

Suggested response filter:

```text
Tous
Réponse attendue
En attente
En dépassement
Répondu
```

Suggested period filters:

```text
Ce mois
30 derniers jours
Cette année
Personnalisée
```

Synchronize meaningful filters with URL search parameters.

Debounce remote search.

Reset pagination on filter change.

---

# 8.4 Registry table

Use full-width desktop table.

Suggested columns:

- Référence
- Objet
- Type
- Expéditeur / Destinataire
- Date
- Statut
- Priorité, if real
- Échéance / Délai
- Actions

Type should be explicit:

```text
Entrant
Sortant
```

Use text + badge, not color alone.

Sender/recipient cell:

For incoming:

```text
Expéditeur
B2Fly Gabon
```

For outgoing:

```text
Destinataire
OACI
```

Do not confuse direction.

Deadline cell:

Examples:

```text
23/05/2026
J+3
```

```text
Dans 5 jours
```

```text
Aucune échéance
```

Overdue state must be explicit.

Row click opens:

```text
/courriers/:id
```

Actions menu:

- Voir
- Modifier
- Préparer une relance
- Voir la réponse
- Voir les pièces jointes

Only show actions valid for the specific courrier.

---

# 8.5 Courrier health rules

Centralize operational health.

Possible states:

### Critical

- Response deadline exceeded
- Incoming courrier requires action and is overdue

### Warning

- Response expected soon
- Courrier remains unprocessed

### Normal

- Sent
- Treated
- Replied

Do not introduce a stored “health” field unless necessary.

Derive it.

Suggested utilities:

```text
isCourrierOverdue
daysUntilResponseDeadline
daysSinceResponseDeadline
getCourrierHealth
formatResponseDeadline
```

Use one configured threshold.

---

# 8.6 Responsive behavior

Desktop:

- Full-width table

Tablet:

- Hide secondary columns
- Preserve reference, subject, type, status, deadline

Mobile:

- Courrier cards
- Reference
- Type
- Subject
- Sender/recipient
- Date
- Status
- Response health
- Actions menu

No horizontal page overflow.

---

# 8.7 States

Implement:

- Loading skeleton
- API error with retry
- Empty registry
- Empty filtered results

Differentiate:

```text
Aucun courrier enregistré.
```

from:

```text
Aucun courrier ne correspond aux filtres sélectionnés.
```

---

# 9. Screen B — Guided courrier creation

Use a stepper.

Recommended steps based on real domain fields:

1. Informations générales
2. Expéditeur / Destinataire
3. Contenu
4. Documents
5. Vérification

Do not add unsupported fields.

---

# 9.1 Step 1 — Informations générales

Fields may include:

- Type de courrier
- Objet
- Date du courrier
- Priority, only if real
- Status only when necessary

Type is critical:

```text
Entrant
Sortant
```

The rest of the flow may change based on type.

Reference behavior:

Confirm whether reference is backend-generated.

If yes, show:

```text
La référence sera générée automatiquement lors de l’enregistrement.
```

Do not ask users to manually enter generated identifiers.

---

# 9.2 Step 2 — Expéditeur / Destinataire

For incoming:

Focus on:

- Expéditeur
- Organisation
- Contact
- Reference sender, if supported
- Reception mode, if supported

For outgoing:

Focus on:

- Destinataire
- Organisation
- Contact
- Transmission mode, if supported

Use current Partenaires/Contacts data where practical.

Do not duplicate partner data models.

If the domain stores free-text sender/recipient instead, preserve it.

Do not force partner selection if external free-text recipients are valid.

---

# 9.3 Step 3 — Contenu

Fields may include:

- Summary
- Content
- Notes

Use the actual schema.

If only an object/subject exists and full body content is not stored, do not invent a content field.

If body content exists:

Provide a large textarea.

Suggested helper:

```text
Résumez le contenu ou les éléments nécessitant un suivi.
```

---

# 9.4 Step 4 — Documents

Preserve current attachment behavior.

Support:

- Upload new document
- Link existing document

If current model supports multiple documents:

Show list.

If current model supports only one document:

Do not redesign as multi-attachment.

Show:

- Filename
- Type
- Upload state
- Remove action

Handle duplicates using existing document rules.

---

# 9.5 Step 5 — Vérification

Display summary:

- Type
- Subject
- Date
- Sender/recipient
- Status
- Response expectation
- Deadline
- Attachments

Primary action:

```text
Créer le courrier
```

or if current business vocabulary uses registration:

```text
Enregistrer le courrier
```

Prefer the wording already established in SICOT.

Allow users to return to previous steps.

Do not invent drafts unless supported.

---

# 9.6 Stepper behavior

Desktop:

- Vertical stepper on left
- Form workspace on right

Tablet/mobile:

- Compact horizontal progress

Requirements:

- Current step clearly identified
- Completed steps marked
- Per-step validation
- Values preserved
- Future invalid steps blocked
- Previous steps accessible
- Focus moves to heading
- Accessible labels
- Stable navigation controls

Actions:

```text
Précédent
Suivant
Enregistrer le courrier
```

---

# 10. Editing behavior

Route:

```text
/courriers/:id/edit
```

Do not force users through full creation steps for minor changes.

Use grouped sections.

Possible edit sections:

- Informations
- Expéditeur/destinataire
- Dates
- Response tracking
- Documents
- Status

Do not mix reminders into the normal edit form.

---

# 11. Screen C — Courrier detail workspace

Use a normalized operational workspace.

---

# 11.1 Header

Breadcrumb:

```text
Courriers / {reference}
```

Header:

- Subject
- Reference
- Type badge
- Status
- Deadline health

Primary actions:

- Modifier
- Imprimer
- Préparer une relance
- Plus d’actions

Only show valid actions.

Possible overflow:

- Mark as treated
- Register response
- Link related courrier
- Open/download document
- View notification history

Do not invent unsupported transitions.

---

# 11.2 Summary strip

Display:

- Type
- Statut
- Date
- Sender/recipient
- Response deadline
- Priority if real

Example:

```text
Type
Entrant
```

```text
Statut
En attente de réponse
```

```text
Date
20/05/2026
```

```text
Échéance
23/05/2026
J+3
```

---

# 11.3 Local navigation

Recommended sections:

- Aperçu
- Suivi
- Documents
- Réponse / Courriers liés
- Notifications
- Historique

Only implement sections supported by the real domain.

Normalize style with Accords, Partenaires, and Missions.

---

# 12. Three-column overview

Large desktop layout:

## Column 1 — Informations clés

Display:

- Reference
- Subject
- Direction
- Sender
- Recipient
- Date
- Status
- Notes/content

## Column 2 — Suivi / Lifecycle

Display a lightweight timeline based on real events.

Possible events:

- Créé
- Reçu
- Envoyé
- En attente de réponse
- Répondu
- Traité

Do not invent events.

Show current stage prominently.

If response deadline exists:

Show:

```text
Délai : 23/05/2026
J+3
```

## Column 3 — Documents / Response

Display:

- Linked documents
- Expected response
- Related courrier
- Reminder status

If there is no response tracking field, use available related correspondence instead.

Do not invent “response expected” if not stored.

---

# 13. Courrier lifecycle

Audit the real status model.

Centralize labels and order.

Do not scatter status mapping across components.

Suggested utility:

```text
getCourrierLifecycleState
getCourrierStatusLabel
getCourrierStatusTone
```

If incoming and outgoing use different lifecycle states, model that explicitly.

Do not force one workflow if domain behavior differs.

---

# 14. Response tracking

This is one of the most important operational areas.

Audit whether current model supports:

- Response expected
- Response deadline
- Response received
- Related response courrier
- Response status

If available, expose clearly.

Suggested states:

```text
Aucune réponse attendue
Réponse attendue
En attente
Réponse reçue
En dépassement
```

Do not invent stored statuses if derived values are enough.

Show overdue state explicitly.

---

# 15. Related courrier / Thread

If the domain supports correspondence threads or reply links:

Display:

- Parent courrier
- Response courrier
- Related courriers

Use a small timeline or linked list.

Example:

```text
COU-2026-020
Demande d’information
↓
COU-2026-030
Réponse reçue
```

Do not infer relationships from subject text.

Use explicit IDs/relations only.

---

# 16. Documents section

Display attachments with:

- Filename
- MIME type
- Upload date when available
- Open
- Download

If multiple attachments are supported:

Use compact list/table.

If no document exists:

```text
Aucun document joint.
```

Action:

```text
Ajouter un document
```

only if current update flow supports it.

---

# 17. Reminder / relance workflow

Preserve existing reminder behavior.

Action:

```text
Préparer une relance
```

Do not send immediately.

Use a review dialog.

Display:

- Recipient
- Subject
- Related courrier
- Response deadline
- Message preview

Then:

```text
Envoyer la relance
```

Show success/failure state.

Keep notification history visible.

---

# 18. Internal notes

If internal notes exist:

Provide a dedicated compact section.

Do not mix internal notes with the official courrier content.

If no notes model exists, do not add one.

---

# 19. Print / report generation integration

The Courrier detail should expose:

```text
Imprimer
```

This action should generate or open the official courrier report view.

Use the previously designed ANAC report visual system:

- ANAC header
- Official title
- Generated timestamp
- Courrier reference
- Summary
- Sender/recipient
- Status
- Documents
- Lifecycle
- Response state
- Footer with SICOT

Do not implement the full report system inside this task unless the reporting infrastructure already exists.

If reporting is not yet implemented:

- Wire the action to a clearly isolated future report route or placeholder interface only if appropriate
- Report the dependency

Do not create a fake downloadable PDF.

---

# 20. Component architecture

Suggested structure:

```text
packages/client/src/pages/courriers/
├── components/
│   ├── CourrierTypeBadge.tsx
│   ├── CourrierStatusBadge.tsx
│   ├── CourrierHealthBadge.tsx
│   ├── CourriersSummaryCards.tsx
│   ├── CourriersFilters.tsx
│   ├── CourriersRegistryTable.tsx
│   ├── CourrierRegistryCard.tsx
│   ├── CourrierDetailHeader.tsx
│   ├── CourrierSummaryStrip.tsx
│   ├── CourrierOverview.tsx
│   ├── CourrierLifecycle.tsx
│   ├── CourrierDocumentsSection.tsx
│   ├── CourrierResponseSection.tsx
│   ├── CourrierRelatedSection.tsx
│   ├── CourrierNotificationsSection.tsx
│   ├── RelanceDialog.tsx
│   └── form/
│       ├── CourrierFormStepper.tsx
│       ├── GeneralInformationStep.tsx
│       ├── SenderRecipientStep.tsx
│       ├── ContentStep.tsx
│       ├── DocumentsStep.tsx
│       └── ReviewStep.tsx
├── hooks/
│   ├── useCourriersQueries.ts
│   ├── useCourrierDetailQueries.ts
│   └── useCourriersMutations.ts
├── courrier.types.ts
├── courrier.schemas.ts
├── courrier.utils.ts
├── courrier.constants.ts
├── CourriersPage.tsx
├── CourrierDetailPage.tsx
└── CourrierFormPage.tsx
```

Adapt to current conventions.

Do not rename everything unless useful.

---

# 21. Shared normalization

Inspect the updated implementations of:

- Accords
- Partenaires
- Missions

Reuse shared patterns for:

- Page headers
- Breadcrumbs
- Summary cards
- Filter toolbars
- Full-width tables
- Mobile cards
- Stepper layouts
- Detail summary strips
- Section navigation
- Error states
- Empty states
- Action menus
- Responsive spacing

Extract shared primitives only where genuinely reusable.

Do not copy-paste large components.

---

# 22. Business utilities

Create centralized utilities where appropriate:

```text
isCourrierOverdue
daysUntilCourrierDeadline
daysSinceCourrierDeadline
getCourrierHealth
getCourrierDirectionLabel
formatCourrierDeadline
getCourrierLifecycleState
```

Centralize thresholds.

Do not repeat date arithmetic in JSX.

Handle date-only values carefully.

---

# 23. Registry aggregates

Audit whether list API returns:

- Total
- Incoming count
- Outgoing count
- Waiting-response count
- Overdue count
- To-process count

If not, propose the smallest aggregate response.

Example:

```text
{
  data,
  total,
  aggregates: {
    total,
    incoming,
    outgoing,
    waitingResponse,
    overdue,
    toProcess
  }
}
```

Do not calculate global KPIs from the current page.

---

# 24. Accessibility

Requirements:

- Full keyboard access
- Semantic rows/cards
- No invalid nested interactive controls
- Accessible action menus
- Stepper exposes current/completed state
- Visible form labels
- Validation errors linked to fields
- Direction/status not conveyed by color alone
- Icon-only controls have accessible labels
- Dialog focus trapped/restored
- Focus moves to step heading
- Deadline state readable without color
- Attachment actions accessible
- Mobile cards preserve reading order

---

# 25. Responsive behavior

Desktop:

- Full-width registry
- Vertical creation stepper
- Three-column detail overview

Tablet:

- Reduced registry columns
- Compact stepper
- Two-column detail layout

Mobile:

- Courrier cards
- Filters stacked or in sheet
- One creation step at a time
- Detail sections stacked
- Actions collapsed
- Documents rendered as cards
- No horizontal overflow

---

# 26. Error handling

Implement meaningful states for:

- Courrier list failure
- Courrier detail failure
- Invalid ID
- Missing courrier
- Create failure
- Update failure
- Document upload failure
- Existing-document linking failure
- Response linking failure
- Reminder failure
- Notification history failure

Do not return null for expected errors.

Use existing toast and alert patterns.

---

# 27. Performance

- Debounce search
- Preserve server-side pagination
- Avoid per-row related-courrier queries
- Avoid per-row document queries
- Lazy-load notification history where useful
- Reuse document/partner caches
- Invalidate only relevant queries

Do not overengineer for a small internal user base.

---

# 28. Testing and validation

At minimum validate:

- TypeScript
- ESLint
- Production build
- `/courriers`
- `/courriers/new`
- `/courriers/:id`
- `/courriers/:id/edit`
- Search
- Type filter
- Status filter
- Period filter
- Response filter
- Pagination
- URL restoration
- Incoming courrier creation
- Outgoing courrier creation
- Step validation
- Sender/recipient logic
- Date validation
- Document upload
- Existing document linking
- Courrier edit
- Waiting-response state
- Overdue state
- Response-linked courrier
- Reminder flow
- Notification history
- Print action integration
- Loading states
- Error states
- Empty states
- Keyboard navigation
- Desktop
- Tablet
- Mobile
- No horizontal overflow
- No console errors

Do not claim a check passed unless executed.

---

# 29. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current file structure
2. Current routes
3. Current API payloads
4. Courrier type rules
5. Status rules
6. Sender/recipient rules
7. Response tracking rules
8. Related courrier behavior
9. Document behavior
10. Reminder behavior
11. Existing reusable UI
12. Normalized module patterns to reuse
13. Data limitations
14. Backend dependencies
15. Proposed file changes
16. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Registry component map
2. Summary metrics strategy
3. Guided creation steps
4. Incoming/outgoing conditional flow
5. Detail workspace design
6. Lifecycle strategy
7. Response tracking strategy
8. Related correspondence strategy
9. Reminder workflow
10. Print/report integration
11. Responsive strategy
12. Accessibility strategy
13. Backend changes if unavoidable
14. Implementation order

## Phase 3 — Registry implementation

Implement:

1. Shared types/utilities
2. Header
3. Summary cards
4. Search/filters
5. Desktop table
6. Mobile cards
7. Pagination
8. Operational health
9. Loading/error/empty states

Validate.

## Phase 4 — Guided creation

Implement:

1. Stepper
2. General information
3. Sender/recipient
4. Content
5. Documents
6. Review
7. Submission
8. Unsaved-change protection
9. Responsive behavior

Validate.

## Phase 5 — Detail workspace

Implement:

1. Header
2. Summary strip
3. Overview
4. Lifecycle
5. Documents
6. Response tracking
7. Related correspondence
8. Reminders
9. Notifications
10. Print integration
11. States
12. Responsive behavior

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
7. Lifecycle behavior
8. Response tracking
9. Related courrier handling
10. Documents changes
11. Reminder workflow
12. Print/report integration
13. Shared components
14. Backend/API changes
15. Accessibility decisions
16. Responsive behavior
17. Validation commands
18. Validation results
19. Remaining recommendations

---

# 30. Acceptance criteria

The task is complete when:

- Courriers follows the normalized SICOT style.
- Registry is full-width and operationally useful.
- Incoming and outgoing courriers are clearly distinguishable.
- Operational KPIs are accurate.
- Waiting-response and overdue courriers are explicit.
- Search, filters, and pagination work.
- URL filter persistence works.
- Mobile uses courrier cards.
- Creation uses a guided stepper.
- Incoming/outgoing creation flows are context-aware.
- Only real domain fields are used.
- Documents remain supported.
- Courrier detail uses a structured operational workspace.
- Lifecycle is visible.
- Response tracking is clear.
- Related courriers are visible when supported.
- Reminder workflow remains available.
- Notification history remains available.
- Print action is prepared for report generation.
- Loading/error/empty/missing states exist.
- Courrier business rules are centralized.
- Design aligns with Dashboard, Accords, Partenaires, and Missions.
- Module is responsive.
- Module is keyboard accessible.
- TypeScript, lint, and build pass.
- No unrelated modules are changed.
- Final report is returned.

---

# 31. Restrictions

Do not:

- Rewrite the entire application.
- Replace React Query.
- Replace React Hook Form or Zod.
- Replace Tailwind.
- Introduce another UI library.
- Add production mock data.
- Invent priority if absent.
- Invent response deadlines if absent.
- Invent automatic reminder states.
- Invent courrier relationships from matching subject text.
- Calculate global KPIs from one page.
- Create per-row API requests.
- Mix reminders into generic edit forms.
- Create fake print/PDF output.
- Duplicate normalized module components through copy-paste.
- Modify unrelated pages.
- Commit or push changes.

Start with Phase 1 only.

Inspect the updated repository and return the audit report before writing implementation code.
