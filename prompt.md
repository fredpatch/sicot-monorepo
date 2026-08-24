# SICOT — Traductions Production Workspace Redesign Task

You are acting as a Senior Frontend Engineer, UX/UI Architect, and Product Usability Specialist.

Your task is to redesign and implement the SICOT **Traductions production module**.

Repository:

```text
https://github.com/fredpatch/sicot-monorepo.git
```

Primary frontend location:

```text
packages/client
```

The attached image is the visual reference for the target direction.

This task is **not** about the separate “Demandes de traduction” workflow.

This module is the internal workspace where operators:

- Receive extracted text from documents/OCR
- Launch machine translation
- Create translations from free text
- Review machine translation
- Correct translated content manually
- Work manually when the translation engine fails
- Use glossary suggestions
- Save corrections
- Approve translations
- Archive translations

Use the attached visual reference to understand:

- Queue layout
- Workload hierarchy
- Engine-health visibility
- New-translation dialog
- Source/document context
- Side-by-side translation editor
- Glossary assistance
- Review and approval actions
- Responsive behavior

Do not reproduce the image blindly.

First inspect the current implementation and adapt it to the actual architecture, API contracts, and business logic.

Do not modify the separate Demandes module.

Do not commit or push changes unless explicitly requested.

---

# 1. Collaboration mode

Work incrementally.

Use:

```text
✅ Done
⏳ Current
🔜 Next
```

Follow:

1. Audit current implementation
2. Report actual workflow
3. Propose implementation plan
4. Implement incrementally
5. Validate
6. Return final report

Do not implement before returning Phase 1.

Do not replace working translation logic merely for visual consistency.

The bilingual editor is the core product experience and must remain central.

---

# 2. Current real translation workflow

The current flow is approximately:

```text
Text source
      ↓
Translation job created
      ↓
Translation engine attempted
      ↓
┌─────────────────────┬──────────────────────────┐
│ Engine succeeds     │ Engine unavailable/fails│
│                     │                          │
│ texteIA generated   │ statut = manuelle_requise
│ statut = a_reviser  │ editable target starts  │
└───────────┬─────────┴──────────────┬───────────┘
            ↓                        ↓
       Human correction / manual translation
                    ↓
             Save correction
                    ↓
               Human review
                    ↓
                Approval
                    ↓
                Archive
```

Preserve this behavior.

---

# 3. Files to inspect first

Inspect at least:

```text
packages/client/src/pages/TraductionsPage.tsx

packages/client/src/pages/traductions/
packages/client/src/pages/traductions/components/
packages/client/src/pages/traductions/hooks/
packages/client/src/pages/traductions/traductions.columns.tsx
packages/client/src/pages/traductions/traductions.types.ts
packages/client/src/pages/traductions/traductions.utils.ts

packages/client/src/pages/traductions/components/NewTraductionDialog.tsx
packages/client/src/pages/traductions/hooks/useLaunchTraduction.ts
packages/client/src/pages/traductions/hooks/useTraductionPrefill.ts

packages/client/src/lib/traductions.api.ts
packages/client/src/lib/documents.api.ts

packages/client/src/App.tsx
packages/client/src/components/table
packages/client/src/components/ui
packages/client/src/index.css
```

Also inspect the actual translation editor page/component.

The current editor supports:

- `texteOriginal`
- `texteIA`
- `texteFinal`
- direction
- status
- engine used
- glossary suggestions
- save correction
- approve
- archive
- delete
- manual translation fallback

Find the exact current file before changing anything.

Also inspect the server-side translation module for:

- OCR/document integration
- translation creation
- machine translation execution
- engine fallback
- status transitions
- glossary suggestions
- correction persistence
- archive/restore behavior

---

# 4. Existing real domain model

Known statuses:

```text
a_reviser
en_relecture
approuvee
archivee
manuelle_requise
```

Visible labels:

```text
À réviser
En relecture
Approuvée
Archivée
Manuelle requise
```

Known translation directions:

```text
fr_en
en_fr
```

Current API supports at least:

```text
GET    /traductions
GET    /traductions/:id
GET    /traductions/moteur/status

POST   /traductions

PATCH  /traductions/:id/correction
PATCH  /traductions/:id/approuver
PATCH  /traductions/:id/archiver
PATCH  /traductions/:id/restaurer

GET    /traductions/:id/suggestions

DELETE /traductions/:id
```

Creation accepts:

```text
texteOriginal
direction
documentId?
```

Preserve these contracts unless a backend change is genuinely necessary.

---

# 5. OCR / Documents integration

The current Documents module can send extracted OCR text to Traductions using:

```text
sessionStorage['traduction_prefill']
```

`useTraductionPrefill` reads that value and opens the new translation interface with text already populated.

Preserve this capability.

The new UI must distinguish:

```text
Source : Texte libre
```

from:

```text
Source : Document #23
Texte extrait par OCR
```

If source metadata beyond `documentId` is needed for a better display, inspect whether it can be fetched from the document API.

Do not duplicate OCR logic inside Traductions.

OCR remains the responsibility of Documents.

---

# 6. Translation engine behavior

Current engine health is checked through:

```text
traductionsApi.moteurStatus()
```

The engine may be unavailable.

Current expected behavior:

If engine is available:

```text
Launch translation
→ machine result generated
→ open editor
→ user reviews/corrects
```

If unavailable:

```text
Create translation record
→ status = manuelle_requise
→ source text remains available
→ target editor becomes manual input workspace
```

Do not block creation merely because the engine is offline.

This manual fallback is an important SICOT feature.

---

# 7. Screen A — Translation work queue

Route:

```text
/traductions
```

This is not a generic translation request registry.

It is the operator’s working queue.

Header:

```text
Traductions
```

Subtitle:

```text
Traitez les traductions automatiques et manuelles.
```

Primary action:

```text
Nouvelle traduction
```

---

# 8. Engine status

Show engine health near the header.

Example:

```text
LibreTranslate
● Opérationnel
```

or:

```text
LibreTranslate
● Hors ligne
```

When offline, show a compact operational message:

```text
LibreTranslate est indisponible.
Les nouvelles traductions pourront être réalisées manuellement.
```

Do not turn the entire page red.

Engine failure is a system condition, not necessarily a failed user workflow.

---

# 9. Queue summary cards

Suggested operational metrics:

- Total
- À réviser
- En relecture
- Manuelle requise
- Approuvées

Optional:

- Archivées

Only calculate accurate global totals.

Do not calculate them from the current page.

Suggested UI:

```text
Total
128
Toutes traductions

À réviser
34
À corriger

En relecture
12
En contrôle

Manuelle requise
8
Traduction automatique indisponible

Approuvées
74
Validées
```

Do not invent deadlines, priorities, requesters, or assignments.

---

# 10. Queue search and filters

Current filtering already supports:

- Status
- Direction

Improve this with search if backend support exists.

Suggested filters:

```text
Recherche
Statut
Direction
Source
```

Source filter:

```text
Toutes
Texte libre
Document
```

Implement only if `documentId` makes this reliable.

Potential search fields:

- Original text
- Document name
- ID

Do not add requester/service/deadline filters.

---

# 11. Queue table

Suggested desktop columns:

- Source / aperçu
- Direction
- Statut
- Source
- Moteur
- Date
- Actions

Example:

```text
PROFORMA INVOICE - NON-ACCOUNTING DOCUMENT
Document #23

FR → EN

À réviser

Document #23

LibreTranslate

10/08/2026 09:24
```

For free text:

```text
Bonjour, ceci est un test...
Texte libre
```

Moteur should remain visible but secondary.

Actions:

- Réviser
- Consulter
- Restaurer, where appropriate
- Supprimer, where allowed
- Archive-related action where appropriate

Prefer action menu over multiple inline links.

Do not expose destructive actions prominently.

---

# 12. Queue row behavior

Row click should open:

```text
/traductions/:id
```

Primary action label depends on status:

```text
À réviser            → Réviser
En relecture         → Relire
Manuelle requise     → Traduire manuellement
Approuvée            → Consulter
Archivée             → Consulter
```

Use real existing transitions.

Do not create fake workflow statuses.

---

# 13. Mobile queue behavior

Desktop:

- Full table

Tablet:

- Hide engine/date if needed

Mobile:

Use cards showing:

- Source preview
- Direction
- Status
- Source type
- Engine state
- Date
- Primary action

No horizontal overflow.

---

# 14. New translation interface

Keep this interaction lightweight.

Do NOT use a multi-step wizard.

A dialog or side sheet is appropriate because the operation only requires:

- Direction
- Source text
- Launch action

Current supported languages:

```text
Français → Anglais
Anglais → Français
```

Do not add arbitrary languages unless backend actually supports them.

---

# 15. New translation dialog

Title:

```text
Nouvelle traduction
```

Fields:

```text
Direction
Texte à traduire
```

Show:

- Character count
- Source context
- Engine status

When launched from free text:

```text
Source : Texte libre
```

When launched from OCR:

```text
Texte prérempli depuis OCR
Document #23
```

If document metadata is available:

```text
PROFORMA-INVOICE.pdf
Page(s) OCR : 1
```

Do not invent page metadata if unavailable.

---

# 16. New translation engine-online state

If engine is online:

```text
LibreTranslate opérationnel
```

Primary action:

```text
Lancer la traduction
```

During processing:

```text
Traduction en cours...
```

The current timeout is intentionally long for large documents.

Preserve the long-running behavior.

Do not assume a slow request means failure.

---

# 17. New translation engine-offline state

If engine is unavailable:

Display:

```text
LibreTranslate est actuellement hors ligne.

La traduction sera créée avec le statut
“Manuelle requise”.

Vous pourrez saisir entièrement la traduction
dans l’éditeur.
```

Primary action may still be:

```text
Créer la traduction
```

or:

```text
Continuer en traduction manuelle
```

Choose the wording that best matches backend behavior.

Do not falsely say machine translation will run.

---

# 18. Timeout behavior

Current launch hook handles timeouts by telling the user that translation may already be running.

Preserve this defensive behavior.

Improve UX if useful:

```text
La traduction prend plus de temps que prévu.

Elle peut continuer côté serveur.
Actualisez la liste avant de relancer l’opération.
```

Avoid accidental duplicate jobs.

---

# 19. Screen B — Translation workshop

Route:

```text
/traductions/:id
```

This is the core screen.

Do NOT redesign it into a generic entity detail page.

The translation editor must dominate the viewport.

Use the normalized SICOT shell around it, but optimize this screen for focused production work.

---

# 20. Workshop header

Breadcrumb:

```text
Traductions / #38
```

Header should show:

- Status
- Translation ID
- Direction
- Source
- Engine
- Date
- Optional document reference

Example:

```text
#38
FR → EN
À réviser
Document #23
LibreTranslate
```

Primary actions depend on status.

---

# 21. Main editor layout

Desktop layout:

```text
┌──────────────────────────┬──────────────────────────┬──────────────┐
│ Texte original           │ Traduction               │ Assistance   │
│                          │                          │              │
│ read-only                │ editable                 │ État         │
│                          │                          │ Glossaire    │
│                          │                          │ Source       │
│                          │                          │ Moteur       │
└──────────────────────────┴──────────────────────────┴──────────────┘
```

Suggested grid:

- Original: 5 columns
- Translation: 5 columns
- Assistance: 2 columns

Do not overcompress the editor.

---

# 22. Original text panel

Display:

```text
Texte original
Français
```

or:

```text
Original text
English
```

Current source panel should remain read-only.

Show:

- Character count
- Optional line count
- Source type
- Document information where relevant

Allow text selection for glossary lookup.

Do not allow accidental source modification.

---

# 23. Translation panel

Display:

```text
Traduction
Anglais
```

or:

```text
Traduction
Français
```

This panel is editable when status permits.

Initialization logic must remain:

```text
texteFinal ?? texteIA ?? ''
```

Meaning:

- Existing human correction wins
- Otherwise machine output is used
- Otherwise editor starts blank

This is especially important for `manuelle_requise`.

---

# 24. Manual translation mode

When:

```text
statut === manuelle_requise
```

show a clear banner:

```text
Traduction manuelle requise

Le moteur de traduction n’a pas pu produire de résultat.
Le texte source est conservé.

Saisissez la traduction dans le panneau de droite,
puis sauvegardez et approuvez-la.
```

The editor must remain fully functional.

Do not disable approval merely because the engine failed.

Approval should depend on valid translated content and real backend rules.

---

# 25. Save behavior

Preserve:

```text
PATCH /traductions/:id/correction
```

Show dirty state clearly.

Possible states:

```text
Modifications non sauvegardées
Sauvegarde...
Sauvegardé
```

Avoid excessive toast notifications for routine save actions.

A subtle inline status is better.

---

# 26. Approval behavior

Preserve current approval behavior.

When user clicks:

```text
Approuver
```

If local corrections are unsaved:

1. Save correction
2. Wait for successful save
3. Approve

Do not approve stale text.

Current behavior already attempts this.

Keep or improve it safely.

---

# 27. Review status

Audit actual behavior for:

```text
en_relecture
```

Determine how an item becomes `en_relecture`.

If there is currently no explicit transition endpoint:

Do not invent a button that cannot persist.

Report the limitation.

If workflow exists:

Use action:

```text
Soumettre en relecture
```

or equivalent.

---

# 28. Archive behavior

Only approved translations should expose archive according to existing logic.

Preserve:

```text
PATCH /traductions/:id/archiver
```

Archived translations are read-only.

Provide restore where existing API supports:

```text
PATCH /traductions/:id/restaurer
```

Do not allow normal editing while archived.

---

# 29. Delete behavior

Current deletion is available only before approval/archive.

Preserve business restrictions.

Use an overflow action:

```text
Supprimer
```

with confirmation.

Do not make Delete a primary button.

---

# 30. Glossary assistance

The current editor already supports querying:

```text
GET /traductions/:id/suggestions?texte=...
```

Preserve this.

Workflow:

1. User selects source/target expression
2. Query glossary suggestions
3. Show FR/EN match
4. Allow applying suggestion

Example:

```text
Glossaire

facture pro-forma
→ proforma invoice

document non comptable
→ non-accounting document
```

Do not make glossary lookup block editing.

Failures remain non-blocking.

---

# 31. Applying glossary suggestions

Current implementation replaces the selected expression in `texteFinal`.

Audit this behavior.

Ensure:

- Exact selected text is handled safely
- Special regex characters are escaped
- Replacement does not accidentally change every unrelated occurrence unless intentional
- User can undo changes naturally

If the current replacement-all behavior is risky, improve it.

Report any behavior change.

---

# 32. Source information panel

For text source:

```text
Source
Texte libre
```

For document source:

```text
Source
Document #23
```

If document API can provide metadata:

```text
Nom
Type
Pages
OCR effectué le
```

Do not display fake OCR metadata.

Add:

```text
Ouvrir le document
```

only if a valid route/download exists.

---

# 33. Engine information

Right sidebar:

```text
Moteur de traduction

LibreTranslate
● Opérationnel

Dernière vérification...
```

When translation was generated by another engine:

```text
Moteur utilisé
DeepL
```

Separate:

- engine used for this translation
- current engine health

Do not imply that a previously translated record changes when engine health changes later.

---

# 34. Status/actions panel

Suggested:

```text
État et actions

Statut actuel
À réviser

[ Sauvegarder ]

[ Approuver ]

[ Soumettre en relecture ]
if supported

[ Archiver ]
only when approved
```

Actions must be state-dependent.

Avoid displaying impossible actions.

---

# 35. Editor metadata

Show compact metadata:

- Direction
- Source
- Engine used
- Created date
- Updated date

Do not invent:

- Requester
- Service
- Priority
- Deadline
- Assignment
- Progress percentage

unless they genuinely exist in the updated repository.

---

# 36. Document source workflow

A translation launched from Documents should keep its `documentId`.

Use that relationship to provide context in the editor.

Do not copy the source document itself into another module.

The translation record should reference the document.

---

# 37. Free-text workflow

User can click:

```text
Nouvelle traduction
```

Then:

1. Enter source text
2. Choose FR→EN or EN→FR
3. Launch
4. Open generated translation
5. Review
6. Approve

This must remain fast.

Do not require unnecessary metadata.

---

# 38. Error states

Handle:

- Translation queue fetch failure
- Translation detail failure
- Invalid translation ID
- Engine status failure
- Launch failure
- Launch timeout
- Save failure
- Approval failure
- Archive failure
- Restore failure
- Delete failure
- Glossary suggestion failure
- Document metadata failure

Do not return null for expected errors.

Glossary failure should remain non-blocking.

---

# 39. Loading states

Queue:

- Skeleton table/cards

Editor:

- Structured loading state

Launch:

```text
Traduction en cours...
```

Large documents may take minutes.

Do not use an aggressive spinner-only experience.

Where useful show:

```text
Cette opération peut prendre plusieurs minutes pour les documents volumineux.
```

---

# 40. Unsaved changes

Protect edited `texteFinal`.

If user attempts to:

- Return to list
- Navigate away
- Archive
- Delete
- Close browser route

while unsaved corrections exist:

Provide appropriate warning.

Do not lose translation work silently.

Use the normalized unsaved-changes pattern already introduced elsewhere if available.

---

# 41. Keyboard productivity

This is a production editor.

Support efficient keyboard usage.

At minimum:

- Tab order logical
- Source remains selectable
- Target editor accessible
- Buttons keyboard reachable
- Glossary results keyboard usable

Consider shortcuts only if they can be implemented cleanly:

```text
Ctrl/Cmd + S → Save
```

Do not introduce many custom shortcuts.

---

# 42. Accessibility

Requirements:

- Clear language labels
- Status not color-only
- Editor panels have accessible names
- Character counts not disruptive
- Engine health has textual state
- Glossary results keyboard accessible
- Error messages announced appropriately
- Focus preserved after save
- Modal focus trapped/restored
- Archived state clearly communicated

---

# 43. Responsive behavior

Desktop:

- Side-by-side editor
- Assistance sidebar

Medium screens:

- Source and translation remain side-by-side where viable
- Assistance moves below or into sheet

Small tablet/mobile:

Use tabs:

```text
Original
Traduction
Assistance
```

Do not squeeze two large text editors into unusably narrow columns.

Preserve source context when switching tabs.

---

# 44. Registry responsive behavior

Desktop:

- Table

Mobile:

Translation cards showing:

```text
Source preview
FR → EN
À réviser
Document #23
10/08/2026

[ Réviser ]
```

---

# 45. Architecture

Suggested structure:

```text
packages/client/src/pages/traductions/
├── components/
│   ├── TraductionStatusBadge.tsx
│   ├── TraductionDirectionBadge.tsx
│   ├── TranslationEngineStatus.tsx
│   ├── TraductionsSummaryCards.tsx
│   ├── TraductionsFilters.tsx
│   ├── TraductionsRegistryTable.tsx
│   ├── TraductionRegistryCard.tsx
│   ├── NewTraductionDialog.tsx
│   └── editor/
│       ├── TranslationEditorHeader.tsx
│       ├── TranslationMetadataStrip.tsx
│       ├── SourceTextPanel.tsx
│       ├── TargetTextPanel.tsx
│       ├── TranslationActionsPanel.tsx
│       ├── GlossaryAssistancePanel.tsx
│       ├── TranslationSourcePanel.tsx
│       └── TranslationEnginePanel.tsx
├── hooks/
│   ├── useTraductionsQueries.ts
│   ├── useTranslationDetailQuery.ts
│   ├── useTranslationMutations.ts
│   ├── useLaunchTranslation.ts
│   ├── useTranslationPrefill.ts
│   └── useGlossarySuggestions.ts
├── traduction.types.ts
├── traduction.utils.ts
├── traduction.constants.ts
├── TraductionsPage.tsx
└── TraductionEditorPage.tsx
```

Adapt to the actual existing structure.

Do not rename everything just to match this proposal.

---

# 46. Shared normalization

Reuse visual primitives from updated SICOT modules:

- Page headers
- Summary cards
- Filter toolbar
- Table shell
- Pagination
- Status badges
- Error states
- Empty states
- Breadcrumbs
- Mobile cards

But do NOT force the translation editor into generic detail-page abstractions that hurt usability.

Translation editing is specialized.

---

# 47. Business utilities

Centralize:

```text
getTranslationStatusLabel
getTranslationDirectionLabel
isTranslationEditable
canApproveTranslation
canArchiveTranslation
canDeleteTranslation
getTranslationSourceType
```

Avoid repeating status condition chains in multiple components.

---

# 48. Queue aggregates

Audit whether global status counts exist.

If not, propose the minimum backend addition.

Example:

```text
{
  data,
  total,
  aggregates: {
    total,
    toReview,
    inReview,
    manualRequired,
    approved,
    archived
  }
}
```

Do not derive full counts from the current page.

---

# 49. Search backend

If queue search is not supported, do not fake it by searching only the current page.

Either:

- Add server-side search
- Or omit search and report it

A lightweight search can cover:

- texteOriginal
- documentId
- possibly document filename via safe join if supported

---

# 50. Testing and validation

At minimum validate:

- TypeScript
- ESLint
- Production build
- `/traductions`
- `/traductions/:id`

Queue:

- Pagination
- Status filter
- Direction filter
- Source filter if implemented
- Search if implemented
- Engine online state
- Engine offline state

Creation:

- Free text FR→EN
- Free text EN→FR
- OCR-prefilled translation
- Empty-text validation
- Launch success
- Engine offline fallback
- Timeout handling
- Network failure
- Duplicate-launch risk

Editor:

- `texteIA` initialization
- `texteFinal` initialization
- Manual-required blank target
- Edit target
- Save correction
- Dirty state
- Navigation with unsaved changes
- Approve saved text
- Approve after unsaved edits
- Archive
- Restore
- Delete restrictions
- Archived read-only state

Glossary:

- Select expression
- Suggestion lookup
- Apply suggestion
- No suggestions
- Suggestion API failure

Responsive:

- Desktop queue
- Mobile queue
- Desktop editor
- Tablet editor
- Mobile editor
- No horizontal page overflow

Accessibility:

- Keyboard navigation
- Modal focus
- Editor labels
- Action labels

Do not claim checks passed unless actually executed.

---

# 51. Expected implementation sequence

## Phase 1 — Audit

Return:

1. Current translation file structure
2. Current queue behavior
3. Current editor behavior
4. Current statuses
5. Current status transitions
6. Machine translation flow
7. Engine-offline behavior
8. OCR/document prefill flow
9. Glossary behavior
10. Save/approval/archive behavior
11. Existing shared SICOT components
12. Data limitations
13. Backend dependencies
14. Proposed file changes
15. Risks

Do not implement yet.

## Phase 2 — Plan

Return:

1. Queue design
2. Queue metrics strategy
3. New translation dialog redesign
4. OCR prefill integration strategy
5. Translation workshop architecture
6. Manual fallback UX
7. Glossary UX
8. State/action matrix
9. Unsaved-change strategy
10. Responsive strategy
11. Accessibility strategy
12. Backend changes if unavoidable
13. Implementation order

## Phase 3 — Queue

Implement:

1. Shared types/utilities
2. Header
3. Engine health
4. Summary cards
5. Filters
6. Registry table
7. Mobile cards
8. Pagination
9. States

Validate.

## Phase 4 — New translation

Implement:

1. Dialog redesign
2. Direction selector
3. Text editor
4. OCR-source context
5. Engine status
6. Launch
7. Timeout UX
8. Offline/manual fallback UX

Validate.

## Phase 5 — Translation workshop

Implement:

1. Header
2. Metadata strip
3. Original panel
4. Editable translated panel
5. Save behavior
6. Manual-required mode
7. Glossary assistance
8. Source context
9. Engine context
10. Approval
11. Review action if supported
12. Archive/restore
13. Unsaved-change protection
14. Responsive behavior

Validate.

## Phase 6 — Final validation

Run all relevant checks.

Fix regressions.

## Phase 7 — Final report

Return:

1. Summary
2. Files created
3. Files modified
4. Queue changes
5. New translation changes
6. OCR integration
7. Editor changes
8. Manual translation fallback
9. Glossary behavior
10. Workflow transitions
11. Engine health behavior
12. Shared components
13. Backend/API changes
14. Accessibility
15. Responsive behavior
16. Validation commands
17. Validation results
18. Remaining recommendations

---

# 52. Acceptance criteria

The task is complete when:

- Traductions remains clearly separate from Demandes.
- The page acts as a translation production queue.
- Engine health is visible but not dominant.
- Queue KPIs reflect translation workload.
- Queue filters work correctly.
- New translation remains lightweight.
- Free text translation still works.
- FR→EN and EN→FR still work.
- OCR/document prefill still works.
- Document relationship is preserved.
- Engine success opens generated translation for review.
- Engine failure still allows manual translation.
- `manuelle_requise` is a fully usable workflow.
- Source text remains read-only.
- Target text is editable when appropriate.
- Existing corrections remain highest-priority editor content.
- Glossary suggestions remain available.
- Corrections can be saved.
- Approval saves pending correction first.
- Archived translations are read-only.
- Restore remains supported.
- Delete restrictions remain correct.
- Unsaved work is protected.
- Editor remains usable on tablet/mobile.
- Design aligns visually with normalized SICOT modules.
- No unrelated module is changed.
- TypeScript, lint, and build pass.
- Final implementation report is returned.

---

# 53. Restrictions

Do not:

- Turn Traductions into Demandes de traduction.
- Add requester management.
- Add service ownership.
- Add priority.
- Add deadlines.
- Add assignments.
- Add fake progress percentages.
- Add arbitrary languages unsupported by backend.
- Replace the current translation engine logic unnecessarily.
- Remove manual fallback.
- Remove OCR prefill.
- Remove glossary support.
- Make source text editable.
- Approve stale unsaved text.
- Block translation creation only because the engine is offline.
- Add a multi-step wizard for new free-text translation.
- Rewrite Documents/OCR logic.
- Derive global KPIs from the current page.
- Modify unrelated modules.
- Commit or push changes.

Start with **Phase 1 only**.

Inspect the updated repository and return the audit report before writing implementation code.
