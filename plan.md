You are acting as a Senior Frontend Engineer, UX/UI Architect, and Product Usability Specialist.

Your task is to redesign and implement the complete “Partenaires” module of SICOT.

Repository:
https://github.com/fredpatch/sicot-monorepo.git

Primary frontend location:
packages/client

The attached image is the visual reference for the target direction.

Use it to understand:

- The normalized SICOT visual language
- Registry density
- Operational summary cards
- Guided creation flow
- Three-column partner overview
- Contacts management
- Related agreements visibility
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
- The new Dashboard and Accords patterns already implemented in the repository

The task covers:

1. Partners registry
2. Guided partner creation
3. Partner editing
4. Partner detail workspace
5. Contact management
6. Related agreements visibility

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
2. Report existing architecture and constraints
3. Propose an implementation plan
4. Implement incrementally
5. Validate the result
6. Return a final report

Do not start implementation before returning the Phase 1 audit report.

Do not produce one monolithic replacement file.

Do not introduce a second design system.

Do not invent backend data or relationships.

---

# 2. Product context

SICOT means:

Système Intégré de Coopération Internationale et de Traduction

The Partenaires module manages external organisations involved in ANAC Gabon cooperation activities.

A partner organisation currently includes at least:

- Name
- Country
- Region
- Organisation type
- Active status
- Notes
- Contacts
- Main contact
- Related agreements
- Creation metadata

Known organisation types:

- anac_etrangere
- organisation_internationale
- autre

Known contact fields:

- First name
- Last name
- Email
- Phone
- Position
- Principal contact flag
- Active status

The module must help users answer:

- Which partners are active?
- Which partners have no contact?
- Who is the main contact?
- Which countries and regions are represented?
- Which agreements are linked to a partner?
- Which partners require contact data cleanup?
- What is the relationship history with that organisation?

---

# 3. Files to inspect first

Inspect at least:

packages/client/src/pages/PartenairesPage.tsx
packages/client/src/pages/partenaires/partenaires.columns.tsx
packages/client/src/pages/partenaires/partenaires.types.ts
packages/client/src/pages/partenaires/partenaires.schemas.ts
packages/client/src/pages/partenaires/components/PartenairesFiltres.tsx
packages/client/src/pages/partenaires/components/OrganisationDialog.tsx
packages/client/src/pages/partenaires/components/ContactsDialog.tsx
packages/client/src/pages/partenaires/components/FormulaireOrganisation.tsx
packages/client/src/pages/partenaires/components/FormulaireContact.tsx
packages/client/src/pages/partenaires/components/BadgeType.tsx
packages/client/src/pages/partenaires/hooks/usePartenairesQueries.ts
packages/client/src/pages/partenaires/hooks/usePartenairesMutations.ts
packages/client/src/lib/organisations.api.ts
packages/client/src/lib/accords.api.ts
packages/client/src/App.tsx
packages/client/src/components/layouts/Layout.tsx
packages/client/src/components/table
packages/client/src/components/ui
packages/client/src/index.css
packages/client/tailwind.config.*
packages/client/package.json

Also inspect the relevant server modules for:

- Organisation payloads
- Contact payloads
- Create and update operations
- Contact creation
- Main contact assignment
- Organisation filters
- Sorting
- Pagination
- Country and region lookups
- Related agreements
- Active/inactive behavior

Confirm actual paths rather than assuming them.

---

# 4. Existing implementation to preserve

The current module already supports:

- Search
- Country filtering
- Region filtering
- Organisation-type filtering
- Sorting
- Pagination
- Organisation creation
- Organisation editing
- Contact listing
- Contact creation
- Main contact assignment
- Active/inactive organisation state
- Active/inactive contact state
- Filtering agreements by partner
- Shared DataTable components
- Dedicated query and mutation hooks

Preserve these capabilities unless the audit shows one is broken or obsolete.

Do not remove working business behavior for visual simplicity.

---

# 5. Main UX problems to solve

The redesign should address these weaknesses:

- The registry is a plain table with no operational overview.
- Organisation status and contact quality are difficult to scan.
- Contact availability is not visible in the registry.
- The main contact is not visible in the registry.
- Related agreement count is not visible.
- Creation and editing are limited to a modal.
- The organisation form is not structured for future extension.
- Contacts are managed in a separate modal detached from partner context.
- There is no dedicated partner detail page.
- Actions are distributed across inline text links.
- Users cannot see identity, contacts, agreements, and activity together.
- Empty contact data is not treated as an operational issue.
- The current page does not fully follow the normalized Dashboard and Accords style.

---

# 6. Target information architecture

Implement three coherent experiences.

## Screen A — Partners registry

Route:

/partenaires

Primary goal:

Provide a searchable and operational registry of partner organisations.

## Screen B — Guided creation

Suggested route:

/partenaires/new

Primary goal:

Guide users through the creation of an organisation and its initial contact.

## Screen C — Partner detail

Suggested route:

/partenaires/:id

Primary goal:

Provide a complete operational workspace for the selected partner.

The edit route may be:

/partenaires/:id/edit

Reuse current routing conventions where practical.

If routes do not yet exist, update App.tsx minimally.

Do not break existing `/partenaires/*` behavior.

---

# 7. Screen A — Partners registry

## 7.1 Header

Display:

Partenaires

Subtitle:

Gérez les organisations et partenaires de coopération internationale.

Right-side actions:

- Exporter, only if genuinely supported
- Nouveau partenaire

Do not create a non-functional export button.

If export is unavailable, omit it and report it as a future enhancement.

---

## 7.2 Operational summary cards

Add a compact summary row.

Suggested cards:

- Total partenaires
- Organisations actives
- Avec contact
- Sans contact
- Pays représentés

Optional:

- Organisations inactives

Only display metrics that can be computed accurately.

Do not calculate totals from only the current page.

Choose one of these strategies:

1. Existing aggregate endpoint
2. Minimal backend aggregate endpoint
3. Filtered list requests using server-provided total counts
4. Omit unavailable metrics

Suggested wording:

Total partenaires
78
Tous pays confondus

Organisations actives
62
Partenaires actifs

Avec contact
45
Au moins un contact actif

Sans contact
17
Action requise

Pays représentés
32
Couverture internationale

“Sans contact” should mean no active contact or no contact according to an explicit shared rule.

Do not use ambiguous logic.

---

## 7.3 Search and filters

Provide a horizontal toolbar on desktop.

Search placeholder:

Rechercher un partenaire, un pays ou une organisation…

Filters:

- Pays
- Région
- Type d’organisation
- Statut
- Qualité des contacts

Suggested contact-quality filter:

- Tous
- Avec contact principal
- Avec contact mais aucun principal
- Sans contact actif

Only implement this if supported by list data or the backend.

Provide:

- Active filter chips
- Individual filter removal
- Reset filters
- Result count
- URL search-parameter persistence

Debounce search if it triggers remote requests on every keystroke.

Reset pagination when filters change.

---

## 7.4 Registry table

Use a full-width desktop table.

Suggested columns:

- Organisation
- Type
- Pays
- Région
- Contact principal
- Statut
- Contacts
- Accords liés
- Actions

Use only available fields.

Organisation cell:

- Organisation name
- Optional short note
- Optional acronym only if such a field exists

Do not invent acronyms from organisation names.

Contact principal:

- Full name
- Email
- “Aucun contact principal” when missing

Contacts:

- Active contact count
- Explicit warning when zero

Accords liés:

- Number of agreements
- Link to `/accords?partenaireId={id}`

If agreement counts are not returned, identify the minimum backend change.

Do not execute one agreements request per row.

Row action menu:

- Voir
- Modifier
- Gérer les contacts
- Voir les accords

Avoid multiple inline text links.

The whole row may navigate to the partner detail page, but do not create invalid nested interactions.

---

## 7.5 Status and health indicators

Use explicit indicators:

- Actif
- Inactif
- Contact principal disponible
- Contact incomplet
- Aucun contact

Do not communicate state through color only.

Suggested risk logic:

Warning:

- Organisation active but no active contact
- Contacts exist but none is principal
- Main contact has neither email nor phone

Critical status is not necessary unless a real business rule exists.

Do not overuse red.

---

## 7.6 Responsive behavior

Desktop:

- Full-width table

Tablet:

- Hide region and lower-priority counts where necessary
- Preserve organisation, country, contact, status

Mobile:

- Partner cards
- Organisation name
- Type
- Country
- Main contact
- Status
- Contact health
- Related agreement count
- Actions menu

Do not require horizontal page scrolling.

---

## 7.7 States

Implement:

- Structured loading state
- API error state with retry
- No partners state
- No filtered results state

Differentiate:

Aucun partenaire enregistré.

from:

Aucun partenaire ne correspond aux filtres sélectionnés.

---

# 8. Screen B — Guided partner creation

Route:

/partenaires/new

Replace organisation creation in a modal with a guided full-page flow.

The guided process should use real current fields only.

Recommended steps:

1. Informations générales
2. Contact principal
3. Informations complémentaires
4. Vérification

Do not add address, documents, website, acronym, or other fields unless they exist in the actual schema or are explicitly added as a backend extension.

The visual mockup contains future-facing ideas. Implement only supported fields.

---

## 8.1 Step 1 — Informations générales

Fields:

- Nom de l’organisation
- Type d’organisation
- Pays
- Région
- Statut actif/inactif

Requirements:

- Name required
- Type required
- Country required if current schema requires it
- Region optional unless current validation says otherwise
- Active state should default consistently with current backend behavior

Provide helper text for organisation types.

Suggested labels:

ANAC étrangère

Organisation internationale

Autre organisation

Keep raw enum values out of visible UI.

---

## 8.2 Step 2 — Contact principal

Allow the user to create the first contact during organisation setup.

Fields:

- Prénom
- Nom
- Poste
- Email
- Téléphone

Contact is optional only if current business rules allow creating organisations without contacts.

Provide explicit choice:

- Ajouter un contact principal maintenant
- Continuer sans contact

If continuing without contact, show a warning:

Cette organisation sera enregistrée sans contact principal.

Do not force fake contact values.

When a contact is created in this flow:

- Mark it as principal
- Mark it active
- Create the organisation first only when necessary
- Handle partial failure safely

Avoid leaving an organisation silently created when contact creation fails without informing the user.

Design the mutation flow explicitly.

---

## 8.3 Step 3 — Informations complémentaires

Current supported field:

- Notes

Display a review of:

- Organisation identity
- Country and region
- Organisation type
- Active status
- Contact principal status

Do not add unsupported descriptive fields.

If the backend is extended later, this step can host:

- Website
- Address
- Acronym
- Description

Do not implement them now unless confirmed.

---

## 8.4 Step 4 — Vérification

Display a final summary:

- Organisation name
- Type
- Country
- Region
- Active status
- Main contact or “Aucun contact”
- Notes presence

Allow users to return to previous steps.

Primary action:

Créer le partenaire

Secondary action:

Annuler

Do not add draft behavior unless it exists.

Warn about unsaved changes when appropriate.

---

## 8.5 Stepper behavior

Desktop:

- Vertical stepper on the left
- Form workspace on the right

Tablet/mobile:

- Compact horizontal progress
- One section at a time

Requirements:

- Current step identified
- Completed steps marked
- Validation per step
- Values preserved
- Previous steps accessible
- Future steps not arbitrarily accessible
- Focus moves to step heading
- Accessible step labels
- Stable actions at bottom

Suggested actions:

Précédent
Suivant
Créer le partenaire

---

# 9. Editing behavior

Route:

/partenaires/:id/edit

Do not force users through all creation steps for a minor edit.

Use a grouped edit workspace with sections:

- Informations générales
- Statut
- Notes

Contacts should be managed from the detail page, not mixed into the standard organisation edit form.

Preserve current organisation update behavior.

Show unsaved-change protection.

---

# 10. Screen C — Partner detail workspace

Route:

/partenaires/:id

Use the confirmed three-column overview layout.

The detail page should become the primary relationship workspace.

---

## 10.1 Breadcrumb and header

Breadcrumb:

Partenaires / {organisation name}

Header:

- Organisation name
- Type badge
- Active/inactive badge
- Country and region
- Optional “Partenaire depuis” using createdAt, clearly labelled as system registration date rather than real-world partnership start date

Do not label `createdAt` as “Partenaire depuis” unless that meaning is valid.

Safer wording:

Enregistré dans SICOT le {date}

Primary actions:

- Modifier
- Ajouter un contact
- Voir les accords
- Plus d’actions

Do not add “Notifier” unless a real organisation-level notification flow exists.

---

## 10.2 Summary strip

Display:

- Type
- Pays
- Région
- Contacts actifs
- Accords liés
- Statut

Use accurate counts.

Do not perform one query per summary metric where a consolidated endpoint is possible.

---

## 10.3 Local navigation

Recommended sections:

- Aperçu
- Contacts
- Informations
- Accords liés
- Historique

Add Documents only if partner-specific documents exist in the current model.

Do not add address or activity types that are not supported.

Use tabs or vertical local navigation depending on the implemented Accords pattern.

Normalize the style with Accord detail.

---

# 11. Three-column overview

Large desktop layout:

## Column 1 — Informations clés

Display:

- Full organisation name
- Type
- Country
- Region
- Status
- Notes
- Registration date

Do not display unsupported acronym, website, address, or description.

Use a compact key/value layout.

## Column 2 — Contacts principaux

Display:

- Principal contact first
- Other active contacts after
- Name
- Position
- Email
- Phone
- Main contact badge
- Inactive badge where relevant

Actions:

- View all contacts
- Add contact
- Set as principal
- Edit contact if supported

Clearly display:

Aucun contact principal défini

or:

Aucun contact enregistré

Do not silently hide contact gaps.

## Column 3 — Relationship summary

Display:

- Recent or linked agreements
- Agreement status
- Expiration state where available
- Link to all filtered agreements
- Recent partner-related activity only if such activity exists

Do not invent generic activity events.

If no activity API exists, use:

- Accords liés
- Contact health
- Organisation metadata

Do not create a fake recent activity panel.

---

# 12. Contacts section

Replace the current modal-only contact management with a full detail section.

Display contacts in a table or responsive card list.

Suggested columns:

- Contact
- Poste
- Email
- Téléphone
- Statut
- Principal
- Actions

Actions:

- Modifier, only if supported
- Définir comme principal
- Activer/désactiver, only if supported
- Send email using mailto link
- Copy email or phone where useful

Preserve existing create-contact and set-main-contact behavior.

If contact editing or status changes are not supported, do not create fake actions.

Use a side sheet or dialog for:

- Adding a contact
- Editing a contact

A modal remains appropriate for this small sub-resource.

The organisation itself should no longer be managed primarily in a modal.

---

# 13. Main contact rules

Create explicit utilities or business rules.

Rules to confirm:

- Can there be only one principal contact?
- Must the principal contact be active?
- Can an inactive contact remain principal?
- Does assigning a new principal automatically unset the previous one?
- Can an organisation exist without a principal contact?

Do not infer these silently.

Read the backend behavior.

Show a warning if data violates expected rules.

Suggested health statuses:

- Complet
- Sans contact principal
- Sans contact actif
- Contact principal sans email

Do not store health status unless necessary.

Derive it from current contact data.

---

# 14. Agreements section

Display agreements related to the organisation.

Use the existing partner filter:

/accords?partenaireId={organisationId}

The detail page may show a compact preview:

- Reference
- Title
- Status
- Expiration
- Open action

Maximum five items.

Add:

Voir tous les accords

Do not fetch the entire agreements registry.

Use a filtered endpoint with a small page size.

If the agreements API does not return a reliable total, report the limitation.

Do not create one query per agreement.

---

# 15. History section

Only implement history using real data.

Possible sources:

- Organisation createdAt
- Contact creation dates, only if returned
- Organisation updates, only if audit logs are accessible
- Main contact changes, only if tracked
- Related agreements, only if dates and relationships are available

Do not invent an activity timeline.

If no partner history endpoint exists, provide a limited “Informations système” section instead:

- Created date
- Last updated date, if available
- Record ID
- Active status

Report a future recommendation for audit integration.

---

# 16. Component architecture

Suggested structure:

packages/client/src/pages/partenaires/
├── components/
│ ├── OrganisationTypeBadge.tsx
│ ├── OrganisationStatusBadge.tsx
│ ├── ContactHealthBadge.tsx
│ ├── PartenairesSummaryCards.tsx
│ ├── PartenairesFilters.tsx
│ ├── PartenairesRegistryTable.tsx
│ ├── PartenaireRegistryCard.tsx
│ ├── PartenaireDetailHeader.tsx
│ ├── PartenaireSummaryStrip.tsx
│ ├── PartenaireOverview.tsx
│ ├── PartenaireContactsSection.tsx
│ ├── PartenaireAgreementsSection.tsx
│ ├── ContactFormDialog.tsx
│ └── form/
│ ├── PartenaireFormStepper.tsx
│ ├── GeneralInformationStep.tsx
│ ├── PrimaryContactStep.tsx
│ ├── AdditionalInformationStep.tsx
│ └── ReviewStep.tsx
├── hooks/
│ ├── usePartenairesQueries.ts
│ ├── usePartenairesMutations.ts
│ └── usePartenaireDetailQueries.ts
├── partenaire.types.ts
├── partenaire.schemas.ts
├── partenaire.utils.ts
├── partenaire.constants.ts
├── PartenairesPage.tsx
├── PartenaireDetailPage.tsx
└── PartenaireFormPage.tsx

Adapt to current naming conventions.

Do not rename all existing files without a clear benefit.

Reuse current hooks where possible.

Avoid trivial components.

---

# 17. Shared normalization with Accords

Inspect the updated Accords implementation first.

Reuse its patterns for:

- Page header
- Breadcrumbs
- Summary cards
- Filter toolbar
- Full-width registry
- Mobile cards
- Stepper
- Detail local navigation
- Summary strip
- Error states
- Empty states
- Action menus
- Date formatting
- Responsive breakpoints
- Accessible table behavior

Do not copy and paste entire Accord components.

Extract shared primitives only where they genuinely apply to multiple domains.

Possible shared components:

- EntityPageHeader
- SummaryMetricCard
- FilterToolbar
- DetailSummaryStrip
- GuidedFormLayout
- DetailSectionNavigation
- ResponsiveRegistryContainer
- EmptyState
- ErrorState

Do not overgeneralize domain-specific UI.

---

# 18. Data and backend dependencies

Audit whether the registry API returns:

- Contacts
- Main contact
- Active contact count
- Agreement count
- Last update
- Country and region aggregates

If not, identify the minimum backend change.

Suggested list response shape:

{
data: Organisation[],
total: number,
aggregates?: {
total: number,
active: number,
inactive: number,
withActiveContact: number,
withoutActiveContact: number,
representedCountries: number
}
}

Suggested organisation list row extension:

{
contactPrincipal?: Contact,
activeContactsCount?: number,
accordsCount?: number
}

Do not make multiple frontend requests per table row.

If needed, add a lightweight server projection or aggregate query.

Do not redesign the entire backend.

---

# 19. Mutation strategy for guided creation

The current backend likely creates organisations and contacts separately.

Design the flow safely.

Preferred options:

1. Add a transactional backend endpoint that creates organisation plus optional principal contact.
2. Create organisation, then create contact, with explicit partial-success handling.

If using option 2:

- Show when the organisation was created but the contact failed.
- Provide a retry path.
- Do not create duplicate organisations when retrying.
- Return the user to the created organisation detail page.

Do not pretend the operation is atomic when it is not.

Report the chosen strategy.

---

# 20. URL and routing requirements

Suggested routes:

/partenaires
/partenaires/new
/partenaires/:id
/partenaires/:id/edit

Preserve:

/accords?partenaireId={id}

Synchronize registry filters with URL parameters.

Handle invalid IDs and missing organisations.

Browser back/forward navigation must work correctly.

---

# 21. Accessibility

Requirements:

- Full keyboard access
- Semantic table or card links
- No invalid nested buttons
- Accessible action menus
- Stepper exposes current and completed state
- Fields have visible labels
- Validation errors associated with fields
- Required fields communicated textually
- Contact health not conveyed by color alone
- Icon-only controls have accessible names
- Dialog focus trapped and restored
- Focus moves to step heading
- Error summary announced
- Email and phone links have meaningful accessible text
- Mobile cards preserve logical reading order

---

# 22. Responsive behavior

Desktop:

- Full-width partner table
- Vertical creation stepper
- Three-column detail overview

Tablet:

- Reduced table columns
- Two-column detail layout
- Compact stepper

Mobile:

- Partner cards
- Filters in sheet or stacked panel
- One form step at a time
- Detail sections stacked
- Actions collapsed into menu
- Contacts displayed as cards
- No horizontal page overflow

Test actual narrow widths.

---

# 23. Error and empty states

Implement meaningful states for:

- Organisation list failure
- Organisation detail failure
- Invalid ID
- Missing organisation
- Country list failure
- Region list failure
- Contact list failure
- Organisation creation failure
- Organisation update failure
- Contact creation failure
- Main-contact assignment failure
- Partial create success
- Related agreements failure
- Empty contacts
- Empty agreements
- Empty filtered registry

Do not return null for expected errors.

Use existing toast and alert patterns consistently.

---

# 24. Performance

- Debounce search
- Reuse country and region query cache
- Avoid repeated organisation requests
- Lazy-load agreements or history sections where useful
- Avoid one contact or agreement request per registry row
- Invalidate only relevant query keys
- Preserve server-side pagination and sorting
- Do not overengineer for a small internal user base

---

# 25. Testing and validation

Run the relevant repository commands using the existing package manager.

At minimum validate:

- TypeScript
- ESLint
- Production build
- `/partenaires`
- `/partenaires/new`
- `/partenaires/:id`
- `/partenaires/:id/edit`
- Search
- Country filter
- Region filter
- Type filter
- Status filter
- Contact-quality filter if implemented
- Sorting
- Pagination
- URL filter restoration
- Organisation creation
- Step validation
- Contact creation during onboarding
- Creation without contact
- Partial create failure
- Organisation edit
- Contact creation from detail
- Main contact assignment
- Related agreements preview
- Link to filtered agreements
- Active organisation
- Inactive organisation
- Organisation without contacts
- Organisation without principal contact
- Loading states
- Error states
- Empty states
- Keyboard navigation
- Desktop layout
- Tablet layout
- Mobile layout
- No horizontal overflow
- No console errors

Do not claim a check passed unless executed.

---

# 26. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current file structure
2. Current routes
3. Current API payloads
4. Current organisation rules
5. Current contact rules
6. Existing reusable UI
7. Updated Accords patterns to reuse
8. Data limitations
9. Backend dependencies
10. Proposed file changes
11. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Registry component map
2. Summary metrics strategy
3. Guided creation steps
4. Detail workspace design
5. Contacts management design
6. Related agreements strategy
7. Shared normalization strategy
8. Data-fetching plan
9. Responsive strategy
10. Accessibility strategy
11. Backend changes if unavoidable
12. Implementation order

## Phase 3 — Registry implementation

Implement:

1. Shared types and utilities
2. Page header
3. Summary cards
4. Search and filters
5. Desktop table
6. Mobile cards
7. Pagination
8. Loading/error/empty states

Validate before continuing.

## Phase 4 — Guided creation

Implement:

1. Stepper shell
2. General information
3. Primary contact
4. Additional information
5. Review
6. Submission strategy
7. Partial-failure handling
8. Unsaved-change handling
9. Responsive behavior

Validate before continuing.

## Phase 5 — Detail workspace

Implement:

1. Breadcrumb and header
2. Summary strip
3. Three-column overview
4. Contacts section
5. Agreement preview
6. Information section
7. History or system information
8. Edit flow
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
6. Detail workspace changes
7. Contacts changes
8. Agreement integration
9. Shared components introduced
10. Backend/API changes
11. Accessibility decisions
12. Responsive behavior
13. Validation commands
14. Validation results
15. Remaining recommendations

---

# 27. Acceptance criteria

The task is complete when:

- The Partenaires module follows the normalized SICOT style.
- The registry is full-width and operationally useful.
- Summary metrics are accurate.
- Main contact and contact health are visible.
- Related agreement counts are available without per-row requests.
- Search, filters, sorting, and pagination continue to work.
- Filters are restorable from the URL.
- Mobile uses partner cards.
- Organisation creation uses a guided stepper.
- The stepper uses only real fields.
- Initial principal-contact creation is supported safely.
- Creation without a contact remains possible when allowed.
- Partial creation failure is handled transparently.
- Partner detail uses the confirmed three-column overview.
- Contacts are managed from the partner detail workspace.
- Related agreements are visible.
- Organisation editing is separated from contact management.
- Missing contacts are treated as an explicit operational state.
- Loading, error, empty, and missing-record states are implemented.
- Existing query and mutation behavior remains correct.
- Shared styles align with Dashboard and Accords.
- The module is responsive.
- The module is keyboard accessible.
- TypeScript, lint, and build checks pass.
- No unrelated modules are changed.
- A final implementation report is returned.

---

# 28. Restrictions

Do not:

- Rewrite the entire application.
- Replace React Query.
- Replace TanStack Table.
- Replace React Hook Form or Zod if already used.
- Replace Tailwind.
- Introduce another UI library.
- Add production mock data.
- Invent organisation fields.
- Invent partner documents.
- Invent partner activity events.
- Create one request per registry row.
- Store derived contact-health statuses unnecessarily.
- Mix organisation editing and contact management into one oversized form.
- Keep organisation creation solely in a modal.
- Duplicate the normalized Accords layout through copy-paste.
- Modify unrelated pages.
- Commit or push changes.

Start with Phase 1 only.

Inspect the updated codebase and return the audit report before writing implementation code.
