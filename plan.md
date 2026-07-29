You are acting as a Senior Frontend Engineer, UX/UI Architect, and Product Usability Specialist.

Your task is to redesign and implement the complete “Accords” module of SICOT.

Repository:
https://github.com/fredpatch/sicot-monorepo.git

Primary frontend location:
packages/client

The attached image is the visual reference for the target direction. Use it to understand the expected information hierarchy, density, layout, guided creation flow, and operational detail workspace.

Do not reproduce the mockup blindly.

First inspect the existing implementation and adapt the design to:

- The current API contracts
- Existing business fields
- Existing routes
- Existing permissions
- Existing shadcn components
- Existing Tailwind tokens
- Existing SICOT layout
- Existing responsive conventions
- Existing React Query architecture

The target covers three related experiences:

1. Accords registry and list
2. Guided creation of a new accord
3. Accord detail and operational management

Do not modify unrelated modules.

Do not commit or push changes unless explicitly requested.

---

# 1. Working mode

Work collaboratively and incrementally.

Use this status format:

✅ Done
⏳ Current
🔜 Next

Follow this sequence:

1. Audit the current implementation
2. Report the existing architecture and constraints
3. Propose the implementation plan
4. Implement incrementally
5. Validate the result
6. Return a final report

Do not start implementation before returning the initial audit report.

Do not generate one large replacement file.

Do not introduce a second design system.

Do not invent backend data.

---

# 2. Product context

SICOT means:

Système Intégré de Coopération Internationale et de Traduction

The Accords module manages international agreements and conventions involving ANAC Gabon and one or more partner organisations.

An accord currently includes at least:

- Reference
- Title
- Status
- Signature date
- Optional expiration date
- One or more partners
- Optional linked document
- Optional notes
- Renewal relationships
- Reminder notifications
- Creation and update metadata

Known statuses:

- actif
- expire
- suspendu
- en_renouvellement

The module must help users answer:

- Which agreements are active?
- Which agreements need attention?
- Which agreements are expired?
- Which agreements are being renewed?
- What is the next action for a selected agreement?
- Which partner, document, or renewal belongs to an agreement?

---

# 3. Files to inspect first

Inspect at least:

packages/client/src/pages/AccordsPage.tsx
packages/client/src/pages/accords/components/AccordFormPage.tsx
packages/client/src/pages/accords/components/AccordDetail.tsx
packages/client/src/lib/accords.api.ts
packages/client/src/lib/organisations.api.ts
packages/client/src/lib/documents.api.ts
packages/client/src/lib/notifications.api.ts
packages/client/src/App.tsx
packages/client/src/components/layouts/Layout.tsx
packages/client/src/components/ui
packages/client/src/index.css
packages/client/tailwind.config.*
packages/client/package.json

Also inspect the relevant server module for:

- Accord payloads
- Create request
- Update request
- Renewal behavior
- List filters
- Pagination
- Parent-child version relationships
- Partner relationships
- Notification behavior

Confirm the exact server paths rather than assuming their location.

---

# 4. Existing implementation to preserve

The current module already supports:

- Search
- Status filtering
- Partner filtering
- Pagination
- Split list/detail layout
- Mobile selection behavior
- Accord creation
- Accord editing
- Partner multi-selection
- Document upload
- Linking an existing document
- Renewal creation
- Parent agreement relationship
- Related agreement versions
- Expiration warnings
- Partner contacts
- Reminder notifications
- Notification history

Preserve these capabilities unless the audit proves one is broken or obsolete.

Do not remove working business behavior for visual simplicity.

---

# 5. Main UX problems to solve

The redesign should address these current weaknesses:

- The list panel is too narrow for long titles, partners, status, and expiry information.
- The selected agreement is visually separated from the broader registry context.
- Filters are functional but weakly prioritised.
- The page lacks top-level operational summaries.
- Expiration and renewal risk are not easy to scan across the registry.
- Creation uses one long form with little progression or grouping.
- Partner selection creates substantial vertical scrolling.
- Document attachment competes visually with essential fields.
- Renewal is mixed into the standard edit form.
- The detail view is a stack of cards rather than a coherent workspace.
- Important actions are scattered.
- Renewal history, reminders, partners, and documents compete for attention.
- Some files contain disabled ESLint rules and unused imports.
- Loading or missing-data cases sometimes return null rather than a useful state.

---

# 6. Target information architecture

Implement three coherent screens.

## Screen A — Accords registry

Route:

/accords

Primary goal:

Give users a searchable, filterable operational registry of agreements.

## Screen B — Guided creation

Route:

/accords/new

Primary goal:

Guide users through agreement creation without presenting all fields at once.

## Screen C — Accord detail

Route:

/accords/:id

Primary goal:

Provide a complete operational view of an agreement and its related actions.

The edit route may reuse the guided structure where appropriate:

/accords/:id/edit

However, creation and editing must not be forced into exactly the same UX when their business purpose differs.

---

# 7. Screen A — Accords registry

## 7.1 Page header

Display:

Accords

Subtitle:

Gérez les accords et conventions de coopération internationale.

Right-side actions:

- Exporter, only if already supported or easy to implement from existing data
- Nouvel accord

Do not invent a fake export action.

If export is not currently supported, omit it and report it as a future enhancement.

---

## 7.2 Operational summary cards

Add a compact summary row.

Suggested cards:

- Total accords
- Actifs
- À renouveler
- Expirés
- Suspendus

Use the existing list or an existing aggregation endpoint.

Do not perform inaccurate aggregation from only the current paginated page.

Choose one of these approaches:

1. Use an existing backend aggregate endpoint.
2. Extend the list response minimally with status counts.
3. Fetch counts with explicit filtered requests only if the API reliably returns total counts.
4. Omit summary cards that cannot be computed correctly.

Report the chosen approach.

Suggested wording:

Total accords
56
Tous statuts confondus

Actifs
19
En cours de validité

À renouveler
8
Dans les 90 prochains jours

Expirés
12
Nécessitent une action

Suspendus
5
Temporairement inactifs

“À renouveler” is not a stored status.

Derive it only from:

- statut === actif
- dateExpiration exists
- expiration is within the agreed warning threshold
- expiration is still in the future

Use one shared utility for this rule.

---

## 7.3 Search and filters

Provide a horizontal toolbar on desktop.

Search placeholder:

Rechercher un accord, un partenaire ou une référence…

Filters:

- Statut
- Partenaire
- Date d’échéance or risk
- Additional filters only when supported by actual data

Suggested expiry filter values:

- Tous
- Expirés
- Moins de 30 jours
- Moins de 90 jours
- Sans date d’expiration

Do not add “Type d’accord” or “Catégorie” unless the backend actually supports those fields.

Provide:

- Active filter chips
- Clear individual filter
- Réinitialiser les filtres
- Result count

Synchronise meaningful filters with URL search parameters so the filtered view can be shared and restored.

Debounce text search if the current API is queried on every keystroke.

Reset pagination when filters change.

---

## 7.4 Registry presentation

Use a full-width table on desktop rather than a permanently narrow list panel.

Suggested columns:

- Référence
- Intitulé
- Partenaire principal or partner summary
- Pays
- Statut
- Date de signature
- Échéance
- Actions

Use only fields available from the current API.

When several partners exist:

- Show the first partner
- Add “+2” or an equivalent summary
- Provide the full list through tooltip, accessible text, or the detail page

Expiry display must include useful context:

- Expiré depuis 29 j
- J-76
- Dans 8 mois
- Sans échéance

Do not rely on date color alone.

Row click:

- Opens `/accords/:id`

Actions menu:

- Voir
- Modifier
- Renouveler, where appropriate
- Préparer une relance, where supported

Do not place destructive actions in the row unless an actual delete capability and policy exist.

---

## 7.5 Mobile and tablet behavior

Desktop:

- Full-width data table

Tablet:

- Reduced columns
- Hide lower-priority metadata
- Keep reference, title, status, and expiry visible

Mobile:

- Convert rows into compact agreement cards
- Do not force horizontal table scrolling
- Keep search and primary filters accessible
- Show the create action prominently

The current split list/detail behavior may be removed on desktop if the separate detail route provides a better workspace.

Preserve browser navigation behavior.

---

## 7.6 Loading, error, and empty states

Implement:

- Table skeleton or structured loading state
- API error state with retry
- No agreements state
- No filtered results state

Differentiate:

Aucun accord enregistré

from:

Aucun accord ne correspond aux filtres sélectionnés

---

# 8. Screen B — Guided accord creation

Route:

/accords/new

Use a guided stepper.

The stepper must reflect current real data and business rules.

Do not implement fields from the visual reference that do not exist in the current data model.

Recommended steps:

1. Informations générales
2. Partenaires
3. Validité
4. Document
5. Notes et vérification

The mockup contains more conceptual steps, but the implementation must remain aligned with the existing model.

---

## 8.1 Step 1 — Informations générales

Fields:

- Titre de l’accord

Reference behavior:

- Confirm whether the backend generates the reference.
- If generated automatically, show an informational read-only preview or note.
- Do not ask users to manually type a reference when the backend owns it.

Suggested helper:

La référence sera générée automatiquement lors de l’enregistrement.

Do not add type, category, summary, or initial status unless these fields really exist.

For a new accord, preserve the backend’s default status behavior.

Do not expose an unnecessary status selector during creation.

---

## 8.2 Step 2 — Partenaires

Requirement:

At least one partner is mandatory.

Improve the existing checkbox list.

Provide:

- Search input
- Organisation name
- Country
- Organisation type when available
- Selected count
- Selected partner summary
- Clear validation message

Suggested layout:

Left:

- Searchable organisation list

Right:

- Partenaires sélectionnés
- Remove action per selected partner

On smaller screens, stack these sections.

Do not fetch all organisations repeatedly between steps.

Reuse React Query cache.

Provide a contextual action:

Ajouter un partenaire

Only link to the existing partner creation route if it exists and the user has access.

Do not build partner creation inside this task.

---

## 8.3 Step 3 — Validité

Fields:

- Date de signature
- Date d’expiration, optional

Validation:

- Signature date required
- Expiration must be after signature when provided
- Show clear inline error messages
- Do not silently accept an invalid date range

Provide an explicit choice:

- Accord avec date d’expiration
- Accord sans date d’expiration

This may be represented as a checkbox or radio choice.

When “sans date d’expiration” is selected:

- Disable or hide the expiration input
- Clear stale expiration values safely

Display an informational preview:

Validité estimée
13 octobre 2023 — 13 octobre 2026
Durée : 3 ans

Use a date utility.

Do not store the calculated duration.

---

## 8.4 Step 4 — Document

Preserve both existing capabilities:

- Uploader un nouveau fichier
- Lier un document existant

The interface should make these two paths explicit.

Suggested tabs or segmented choice:

- Nouveau fichier
- Document existant

For upload:

- Show accepted file types
- Show upload progress
- Show success state
- Show duplicate warning
- Show failure with retry
- Do not submit the agreement until upload state is resolved

For existing document:

- Search or filter the existing accord documents
- Display filename and creation date
- Allow one document to be selected

Current schema supports one `documentId`.

Do not redesign this as multi-document attachment unless the backend is changed explicitly.

Provide a “Passer cette étape” option because the document is optional.

---

## 8.5 Step 5 — Notes et vérification

Fields:

- Notes, optional

Provide a final review summary:

- Title
- Partners
- Signature date
- Expiration date or “Sans expiration”
- Linked document
- Notes presence

Allow users to return to any previous step.

Primary action:

Créer l’accord

Secondary action:

Enregistrer is not appropriate unless a draft capability exists.

Do not invent drafts.

Cancel action:

- Return to `/accords`
- Warn about unsaved changes when appropriate

---

## 8.6 Stepper behavior

Requirements:

- Current step clearly identified
- Completed steps marked
- Future steps visually distinct
- Previous steps remain accessible
- Invalid future steps cannot be skipped arbitrarily
- Validation runs per step
- Form values remain intact when navigating between steps
- Browser refresh behavior should not unexpectedly create partial records
- Keyboard navigation supported
- Stepper has accessible labels

Desktop:

- Vertical stepper on the left
- Form workspace on the right

Tablet/mobile:

- Horizontal compact progress indicator
- One form section at a time

Suggested actions:

Précédent
Suivant
Créer l’accord

Place navigation actions consistently at the bottom of the form workspace.

---

# 9. Editing behavior

Route:

/accords/:id/edit

Use the same visual system but adapt the flow.

Recommended approach:

- Use grouped edit sections
- Do not force the user through all creation steps for a small modification
- A compact stepper or section navigation may still be used
- Display the accord reference
- Allow status editing only according to existing business rules
- Preserve partner, date, document, and notes editing

Renewal must not be treated as a normal edit.

Keep renewal as a distinct business action.

---

# 10. Renewal flow

The current implementation creates a new related version and changes the current agreement to `en_renouvellement`.

Preserve this rule.

Move renewal into a dedicated action initiated from the detail page:

Renouveler l’accord

Use a dialog, side sheet, or dedicated compact page.

Required fields currently supported:

- New signature date
- Optional new expiration date
- Optional notes

Before confirmation, explain:

- A new accord version will be created
- The existing accord will remain in history
- The current accord will move to “En renouvellement”

Display a confirmation summary.

Do not mix renewal fields into the normal edit page.

---

# 11. Screen C — Accord detail workspace

Route:

/accords/:id

Replace the current vertically stacked detail with a structured workspace.

---

## 11.1 Breadcrumb and header

Breadcrumb:

Accords / {reference}

Header content:

- Agreement title
- Reference
- Status badge
- Renewal/version badge where relevant
- Short expiry state

Primary actions:

- Modifier
- Renouveler l’accord, when allowed
- Télécharger le document, when available
- Plus d’actions

Only show actions that are valid and supported.

Suggested overflow actions:

- Préparer une relance
- Notifier les partenaires
- Voir l’historique des notifications
- Ouvrir le document
- Voir l’accord précédent

Do not hide the main expected action inside the overflow menu.

---

## 11.2 Summary strip

Create a compact summary strip containing:

- Référence
- Statut
- Date de signature
- Date d’expiration
- Countdown or overdue duration

Examples:

13 octobre 2026
J-76

or:

13 juin 2025
Expiré depuis 411 j

If no expiration exists:

Sans date d’expiration

---

## 11.3 Detail navigation

Use local tabs or a vertical section navigation.

Base sections on real functionality.

Recommended sections:

- Aperçu
- Informations
- Partenaires
- Document
- Validité et versions
- Notifications
- Historique

Do not add missions, correspondence, audit, signatories, or multiple document sections unless those relationships truly exist in the API.

The visual mockup includes future-facing sections. Implement only what is supported now.

Structure components so new related modules can be added later.

---

## 11.4 Aperçu section

Use a three-column layout on large desktop.

Main column:

Informations clés

Display:

- Title
- Status
- Signature date
- Expiration date
- Notes
- Parent agreement, where relevant
- Current version context

Middle column:

Cycle de validité

Use a lightweight timeline based on real events:

- Signature
- Entry into validity, only if a separate field exists
- Reminder threshold
- Expiration
- Renewal created

Do not invent “entry into validity” when only `dateSignature` exists.

A valid timeline using current data may contain:

- Accord signé
- Début de surveillance à 90 jours
- Échéance
- Renouvellement créé

Right column:

- Linked document
- Partners summary
- Notification status or recent reminders
- Related versions

---

## 11.5 Partners section

For each partner display:

- Organisation name
- Country
- Type
- Main contact
- Email
- Phone when available

Actions:

- Open partner
- Prepare reminder
- Send notification, when email exists

Clearly identify partners without a valid contact email.

Do not silently exclude them.

For group notification:

- Show how many partners will be contacted
- Show how many will be skipped
- Explain why
- Show result after sending

Preserve the existing notification behavior.

---

## 11.6 Document section

Display the linked document when available:

- Filename
- MIME type
- Upload or creation date where available
- Open
- Download

Empty state:

Aucun document de référence n’est lié à cet accord.

Action:

Modifier l’accord pour lier un document

Do not imply multiple documents when the current model supports one.

---

## 11.7 Validity and versions section

Display:

- Current validity dates
- Expiration state
- Renewal warning
- Parent agreement
- Child renewal versions
- Version sequence

Avoid fetching all agreements and filtering on the client if the server can expose a targeted versions endpoint.

During audit, evaluate the current implementation:

accordsApi.lister({ pageSize: 50 })
then filter parentId === accordId

Report whether this is reliable.

If not reliable, propose the minimum backend endpoint:

GET /accords/:id/versions

Do not make a broad backend redesign.

---

## 11.8 Notifications section

Preserve:

- Prepare individual reminder
- Notify all eligible partner contacts
- Suggested recipients
- Notification history
- Sending result
- Skipped-recipient reasons

Use a clear operation panel.

Do not send immediately from an ambiguous button.

Require review before final sending when practical.

Show:

- Recipient
- Subject
- Message preview
- Related agreement
- Send status

---

## 11.9 Expiration warnings

Use explicit operational banners.

Examples:

Critical:

Cet accord a expiré le 13 juin 2025.
Une décision est requise : renouveler, suspendre ou clôturer le suivi.

Warning:

Cet accord expire dans 29 jours.
Préparez le renouvellement ou contactez les partenaires.

Normal:

No large banner.

Do not show both an expiration banner and duplicate warning cards containing the same message.

---

# 12. Component architecture

Refactor into focused components.

Suggested structure:

packages/client/src/pages/accords/
├── components/
│ ├── AccordStatusBadge.tsx
│ ├── AccordExpiryBadge.tsx
│ ├── AccordRegistryTable.tsx
│ ├── AccordRegistryCard.tsx
│ ├── AccordFilters.tsx
│ ├── AccordSummaryCards.tsx
│ ├── AccordDetailHeader.tsx
│ ├── AccordSummaryStrip.tsx
│ ├── AccordOverview.tsx
│ ├── AccordPartnersSection.tsx
│ ├── AccordDocumentSection.tsx
│ ├── AccordVersionsSection.tsx
│ ├── AccordNotificationsSection.tsx
│ ├── AccordRenewalDialog.tsx
│ └── form/
│ ├── AccordFormStepper.tsx
│ ├── GeneralInformationStep.tsx
│ ├── PartnersStep.tsx
│ ├── ValidityStep.tsx
│ ├── DocumentStep.tsx
│ └── ReviewStep.tsx
├── accord.types.ts
├── accord.utils.ts
├── accord.constants.ts
├── AccordsPage.tsx
├── AccordDetailPage.tsx
└── AccordFormPage.tsx

Adapt this structure to current conventions.

Do not create components that are only one wrapper element with no reusable value.

Centralise:

- Status labels
- Status appearance
- Expiry calculations
- Countdown formatting
- Date formatting
- Step definitions
- Route mapping
- Partner summary formatting

Avoid duplicating status logic between list, detail, and dashboard.

Consider moving shared accord utilities to an appropriate shared domain folder if the dashboard already needs the same rules.

---

# 13. Data rules

Create explicit utilities for:

- `isExpired`
- `isExpiringSoon`
- `daysUntilExpiration`
- `daysSinceExpiration`
- `formatExpiryLabel`
- `formatPartnersSummary`

Use calendar-safe date handling.

Avoid repeated expressions such as:

new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

Define the warning threshold in one place.

Suggested constant:

ACCORD_EXPIRY_WARNING_DAYS = 90

Avoid timezone errors where a date-only value changes calendar day after parsing.

Inspect the actual API date format.

---

# 14. Accessibility

Requirements:

- Table rows must remain keyboard accessible.
- Do not use nested interactive controls incorrectly.
- Row action menus must have accessible names.
- Stepper must expose current and completed state.
- Every form field must have a visible label.
- Required fields must be communicated textually.
- Validation errors must be associated with fields.
- Status must not rely on colour alone.
- Icon-only controls need `aria-label`.
- Modal focus must be trapped and restored.
- Upload progress must be announced appropriately.
- Keyboard users must be able to complete all creation steps.
- Focus should move to the step heading after step navigation.
- Error summary should focus or announce when final submission fails.

---

# 15. Responsive behavior

Desktop:

- Registry uses full-width table
- Creation uses vertical stepper plus form workspace
- Detail uses section navigation and multi-column content

Tablet:

- Registry hides secondary columns
- Creation stepper becomes more compact
- Detail cards stack into two columns or one column

Mobile:

- Registry becomes agreement cards
- Filters open in a sheet or stacked panel
- Creation uses one step at a time
- Detail uses tabs or collapsible sections
- Header actions collapse into a menu
- No horizontal page overflow

Test narrow widths.

---

# 16. Error handling

Implement meaningful states for:

- Accord list fetch failure
- Accord detail missing
- Invalid accord ID
- Organisation fetch failure
- Document list failure
- Upload failure
- Duplicate document
- Create failure
- Update failure
- Renewal failure
- Notification failure
- Partial group-notification success

Do not return null for an expected error or missing record.

Use existing toast or alert patterns consistently.

---

# 17. Performance

- Debounce registry search.
- Avoid refetching organisations unnecessarily.
- Avoid loading the existing document list until requested.
- Avoid loading notification history until the section is opened, if appropriate.
- Do not fetch every agreement to derive versions when a targeted endpoint is available.
- Preserve React Query cache usage.
- Invalidate only relevant query keys after mutations.
- Consider prefetching detail on row hover only if the repository already follows this pattern.

Do not overengineer performance for the expected small internal user base.

---

# 18. Testing and validation

Run the relevant repository commands using the existing package manager.

At minimum validate:

- TypeScript
- ESLint
- Production build
- `/accords`
- `/accords/new`
- `/accords/:id`
- `/accords/:id/edit`
- Search
- Status filter
- Partner filter
- URL filter restoration
- Pagination
- Accord creation
- Step validation
- Back and next navigation
- Partner selection
- Expiration date validation
- Document upload
- Existing document linking
- Accord update
- Renewal flow
- Expired agreement display
- Expiring agreement display
- No-expiration agreement display
- Group reminders
- Partial reminder failures
- Loading states
- Error states
- Empty states
- Keyboard navigation
- Desktop layout
- Tablet layout
- Mobile layout
- No horizontal overflow
- No console errors

Do not claim a check passed unless it was executed.

---

# 19. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current file structure
2. Current routes
3. Current API payloads
4. Current business rules
5. Existing reusable UI
6. Current UX problems
7. Data limitations
8. Backend dependencies
9. Proposed file changes
10. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Registry component map
2. Creation stepper design
3. Detail workspace design
4. Renewal flow
5. Shared utility plan
6. Data-fetching plan
7. Responsive strategy
8. Accessibility strategy
9. Backend changes, if unavoidable
10. Implementation order

## Phase 3 — Registry implementation

Implement:

1. Shared types and utilities
2. Page header
3. Search and filters
4. Summary cards
5. Desktop table
6. Mobile cards
7. Pagination
8. States

Validate before continuing.

## Phase 4 — Guided creation

Implement:

1. Stepper shell
2. General information
3. Partners
4. Validity
5. Document
6. Review
7. Submission
8. Unsaved-change handling
9. Responsive behavior

Validate before continuing.

## Phase 5 — Detail workspace

Implement:

1. Header and actions
2. Summary strip
3. Overview
4. Partners
5. Document
6. Validity and versions
7. Notifications
8. Renewal flow
9. States
10. Responsive behavior

Validate before continuing.

## Phase 6 — Final validation

Run checks and fix regressions.

## Phase 7 — Final report

Return:

1. Summary
2. Files created
3. Files modified
4. Registry changes
5. Guided form changes
6. Detail changes
7. Renewal behavior
8. Shared utilities
9. Accessibility decisions
10. Responsive behavior
11. API or backend changes
12. Validation commands
13. Validation results
14. Remaining recommendations

---

# 20. Acceptance criteria

The task is complete when:

- The Accords registry follows the attached visual direction.
- The registry is full-width and easier to scan.
- Filters and search work with pagination.
- Expiry risks are explicit.
- Summary metrics are accurate.
- Mobile uses agreement cards rather than a compressed table.
- New accord creation uses a guided stepper.
- The stepper uses only real current fields.
- Form values persist between steps.
- Each step validates appropriately.
- Partner selection is searchable and manageable.
- Date range validation is implemented.
- Document upload and linking remain supported.
- The final step provides a review before creation.
- Accord detail is a structured operational workspace.
- Main actions are easy to find.
- Renewal is a distinct workflow.
- Parent and child agreement versions remain visible.
- Notification behavior remains supported.
- Loading, error, empty, and missing-record states exist.
- Status and expiry utilities are not duplicated.
- The design uses the current SICOT design system.
- The pages are responsive.
- The pages are keyboard accessible.
- TypeScript, lint, and build checks pass.
- No unrelated modules are changed.
- A final implementation report is returned.

---

# 21. Restrictions

Do not:

- Rewrite the entire application.
- Replace React Query.
- Replace React Hook Form.
- Replace Zod.
- Replace Tailwind.
- Introduce another UI library.
- Add mock production data.
- Add fields absent from the real domain model.
- Turn one linked document into a multi-document model without approval.
- Mix renewal with standard editing.
- Fetch all records only to derive summary data when a better endpoint is available.
- Duplicate accord status and expiry rules.
- Leave disabled ESLint rules without investigating them.
- Commit or push changes.
- Modify unrelated pages.

Start with Phase 1 only.

Inspect the codebase and return the audit report before writing implementation code.
