# 📝 SICOT - Changelog

## [Unreleased] — 2026-08-26 — fix(client): hide admin-only Documents columns from agent

Quick follow-up to the visibility gate above: an agent could still see the
OCR status, "Visibilité interne", and "Portail Externe" columns even though
none of them are actionable or informative for that role (no toggle, no
management, and the visibility columns are largely redundant once the list
is already scoped to what an agent can see). `useDocumentsColumns` now
filters those three columns out entirely for `role === 'agent'` — hidden,
not just disabled, to declutter rather than show inert UI. Client-only,
no server change.

## [Unreleased] — 2026-08-26 — feat(server/client): internal document visibility gate (documents.visibiliteInterne)

Direct follow-up to the discoverability work above: the user noticed an
agent could see a document an admin had just uploaded that hadn't been
translated yet. Revises the "Documents is open-read to every role" decision
made earlier this session — on reflection, that was right for *finished*
material but wrong as a blanket default for freshly-uploaded, not-yet-
reviewed files.

### Added
- Migration `0015_fast_songbird.sql` — `documents.visibiliteInterne boolean
  not null default false`. Distinct from `visibilitePortail` (external/
  public) — this is the internal-only gate.
- New uploads default `visibiliteInterne: false`. Two ways to flip it to
  true: (1) automatically, when a translation is deposited via "Déposer au
  dossier documentaire" (`categorie: 'traduction'` — the "translated ⇒
  shared" rule from the discoverability round); (2) manually, via a new
  "Rendre visible en interne" toggle (`traducteur+`, new "Visibilité
  interne" column in Documents, same pattern as the existing Portail
  column but a separate, independent flag).
- **Only the `agent` role is restricted by this** — `GET /documents` now
  forces `visibleOuUploadePar: userId` for that role only;
  `traducteur+` continues to see everything, unchanged, since curating
  what's visible/published is their job.
- **An agent always sees their own uploads**, regardless of
  `visibiliteInterne` — the rule is "visible-in-general OR uploaded-by-me",
  not a flat allowlist. Otherwise an agent uploading their own source file
  or mission report would lose track of it in Documents before anything
  reviews it.
- `GET /documents/:id` and `GET /documents/:id/telecharger` now enforce the
  same rule via a new `verifierAccesDocument()` check (agent-only,
  traducteur+ always passes) — closes the same "list hides it but direct-ID
  access doesn't" class of gap fixed for demandes/traductions/glossaire
  earlier in the session.
- `nouvellVersionDocument` — the translation-deposit path forces
  `visibiliteInterne: true` regardless of the parent's current value
  (business rule: once deposited as a translation, it's shared, full
  stop); the generic "Verser version finale" path (any other re-versioning)
  inherits the parent's current visibility instead, same as it already
  does for categorie.
- `POST /documents/upload` accepts an optional `visibiliteInterne` field,
  but **only honors it for `traducteur+`** — an agent role sending it
  (even by tampering with the request) is silently ignored server-side, so
  an agent can never self-publish. Used by the free-text-translation
  fallback in `DeposerDocumentAction` (no source document to version).
- Live-validated against the dev DB with disposable synthetic data: a
  non-owner agent is excluded from both the list and direct access to an
  unpublished document; the uploader still sees their own; a `traducteur`
  role always passes; toggling visibility takes effect immediately; a
  translation deposit is auto-visible even when its source document isn't.
- No grandfathering needed — existing rows were test/seed data per the
  user, so the new column's `false` default applies uniformly with no
  backfill migration.

## [Unreleased] — 2026-08-26 — feat: discoverable shared translation deposits (categorie: 'traduction')

Follow-up product discussion, worked through with concrete named scenarios
(Fred requests/downloads his own translation, Yan — a different agent —
needs to find Fred's finished translation, Patrick — external, unauthenticated
— needs the public portal). Landed on a 3-tier visibility model: private
in-progress demande/traduction (unchanged, ownership-scoped from the
previous round), internal-shared finished documents (Documents — already
open-read to all roles, just not discoverable), public curated (`/portal`,
unchanged). The only real gap was discoverability of tier 2.

### Added
- `nouvellVersionDocument()` now accepts an optional `categorieOverride` —
  previously always inherited the parent document's categorie, which meant
  a re-versioned translation output silently kept whatever categorie its
  *source* document happened to have, even though `'traduction'` already
  existed as a categorie value. `POST /documents/:id/nouvelle-version`
  accepts an optional `categorie` field to set this.
- `DeposerDocumentAction` — new button in the Traduction workshop
  (`WorkshopHeader`, next to the PDF/DOCX export buttons, same
  approved/archivée gate) that deposits the official file straight into
  Documents tagged `categorie: 'traduction'` — a new version of the source
  document if the translation was launched from one (`traduction.documentId`),
  otherwise a standalone upload (translation launched from free text has no
  document to version). Removes the round-trip of going back into Documents
  to find the right row to attach a version to.
- No new route, no new auth model, no schema migration — Documents' `GET
  /documents?categorie=traduction` filter and the "Traductions" option in
  the existing category Select already existed; the only actual gap was
  that nothing ever tagged a deposited translation with that categorie.
- Live-validated against the dev DB: categorie override applied correctly,
  `parentId`/`version` linked correctly, and the deposited document is
  discoverable via the `categorie=traduction` filter — all confirmed with
  disposable synthetic data.
- A separate `/archives` route and an explicit `estVersionFinale`-style
  boolean flag were both discussed and deliberately not built — see
  `project/architecture.md` for the reasoning walkthrough against each
  named scenario.

## [Unreleased] — 2026-08-26 — fix: user-reported feedback round (priority re-validation, admin export button, dialog overflow, PDF/DOCX layout) + feat: Documents download + "versions finales" filter

Direct user feedback after testing the previous round live, plus a follow-up
product discussion about download access from the Documents screen.

### Fixed — from live testing
- **Priority re-validation** — `canValidatePriority` no longer disappears
  after the first validation; a relecteur+ can reopen "Valider la priorité"
  (now labeled "Changer la priorité" once already set) and pick a different
  value at any point before the demande is archived. Was silently
  impossible before (a pre-existing limitation, not introduced this
  session, but only actually noticed once the admin registry got exercised).
- **Missing download button on the admin translation screen** — the PDF/DOCX
  export buttons had only been wired into the agent's read-only
  `TraductionPreview`, never into the actual admin editor
  (`TraductionEditeur`/`WorkshopHeader`) that "prendre en charge" navigates
  to. Added both there, shown once `approuvee`/`archivee`.
- **Dialog overflow on long text** — `RequestWorkspace`'s "Traduction liée"
  and "Source" tabs now cap long text in their own `max-h-[45vh]
  overflow-y-auto` box instead of stretching the dialog past the screen;
  the dialog itself also got a `max-h-[85vh]` safety cap.
- **PDF layout** — `genererPDFTraduction` no longer places source/traduit
  side by side (`deuxColonnes`); each now gets the full page width, with a
  page break before "Texte traduit".
- **DOCX now matches the PDF's institutional formatting** — was plain
  paragraphs only; now includes the same ANAC masthead (with the seal
  image, embedded via `docx`'s `ImageRun`), the same Informations table,
  and the same full-width-per-section + page-break layout as the PDF.

### Added — Documents download + "versions finales" filter
- Found while discussing this: **there was no working download button
  anywhere in the Documents module, for any role.**
  `documentsApi.getUrlTelechargement()` existed and the server route was
  already open to all authenticated roles, but no component ever called
  it — the entire actions cell collapsed to `—` for non-`traducteur+`
  roles, and even `traducteur+` never had a download action, only
  management ones. Added a "Télécharger" action, visible to everyone
  (downloading isn't a management action — reading already is open to all).
- New `finalesUniquement` filter on `GET /documents` — excludes documents
  that have been superseded by a newer version (i.e. that another row
  references via `parentId`), while correctly including both the latest
  version of a chain AND documents that were never versioned at all
  (they trivially have no children, so they pass). Resolved as a candidate-
  ID exclusion list, consistent with the rest of the codebase's search
  pattern, not a `NOT EXISTS` subquery. Live-validated against the dev DB
  with disposable synthetic version chains — correctly excludes the
  superseded original, includes the new version, includes a standalone
  never-versioned document.
- Considered and rejected: a separate `/archives` route, and inferring
  "final" from an explicit new boolean/categorie flag. Both were discussed
  with the user — the flag approach was initially agreed, then dropped
  once the version-chain-leaf inference was shown to already handle every
  case correctly (including "never versioned = trivially final") without
  a schema change. See `project/architecture.md` for the full reasoning.

## [Unreleased] — 2026-08-26 — fix(server): agent role-access hardening + feat: translation export (PDF/DOCX) + read-only preview + document re-versioning

Triggered by the user manually testing agent-role navigation and finding
three real problems: agents could still see Demandes/Documents/Glossaire in
nav, `/traductions/:id` had no route guard at all (a Documents link bounced
an agent straight into the full admin editing workshop), and — found while
auditing the fix — every read endpoint behind those pages (`GET /demandes`,
`GET /glossaire`, `GET /traductions/:id`) had **no server-side role check**,
only client-side hiding. A determined agent hitting the API directly could
still read anyone's demandes or any translation's content.

### Fixed — client route/nav guards
- New generic `RoleRoute` component (`App.tsx`), applied to every registry
  that was previously nav-hidden but NOT route-guarded: `/traductions`,
  `/demandes`, `/glossaire` (now `traducteur+`), `/accords`, `/partenaires`,
  `/missions`, `/courriers`, `/analytics` (now `admin+`, closing the same
  class of gap already fixed for `/dashboard`).
- Found and fixed a second, unrelated bug while auditing this: `/traductions`
  nav was `admin/super_admin` only — `traducteur`/`relecteur` users had **no
  menu link at all** to their own core work page. Nav roles corrected.
- `canOpenTranslation` (`requests.permissions.ts`) now requires `traducteur+`
  — an agent's own linked translation no longer opens the full admin editor
  (correction/approval/deletion controls with no ownership check). Replaced
  with a genuine read-only preview (see below).

### Fixed — server-side authorization (the real gap, not just UI)
- `GET /demandes`, `/demandes/aggregates`, `/demandes/:id` — an agent's
  `demandeurId` is now always forced server-side to their own ID; the
  client-supplied value is ignored for that role rather than trusted.
- `GET /traductions` (list), `/aggregates`, `/:id/suggestions` — now
  `requireRole('traducteur')`.
- `GET /traductions/:id` — stays open to all authenticated roles, but a new
  `estDemandeurDeTraduction()` helper (`demandes.service.ts`) checks that an
  agent requesting a translation by ID actually owns the demande it's linked
  to; anything else now 403s (`TRADUCTION_NON_AUTORISEE`) instead of
  returning the content.
- `GET /glossaire`, `/glossaire/:id`, `/aggregates`, `/suggestions` — now
  `requireRole('traducteur')`.
- `POST /documents/:id/nouvelle-version` — found completely ungated while
  wiring up its first UI caller (see below); now `requireRole('traducteur')`,
  matching every other document mutation.
- All validated live against the dev DB with disposable synthetic rows
  (created, checked, deleted — never touching real accounts/data).

### Added — translation export + read-only agent preview
- `GET /traductions/:id/export/pdf` and `/export/docx` — only once
  `statut` is `approuvee`/`archivee` (the text can still change before
  that). PDF reuses the existing `ficheHTML.ts`/`genererPDFFiche()`
  institutional template (3rd reuse this sprint, after accords/courriers/
  missions); DOCX is deliberately plain (no ANAC letterhead) since its
  purpose is a locally-editable file, not an official fiche. New
  `docx` npm dependency (server only) — first use in the repo.
- `TraductionPreview` component — the agent-facing replacement for the
  removed "open the editor" link inside `RequestWorkspace`'s "Traduction
  liée" tab: shows the current text read-only, and only shows PDF/DOCX
  download buttons once the translation is actually approved. Before that,
  a plain "le texte peut encore changer" note, no dead buttons.

### Added — document re-versioning UI
- "Verser version finale" row action in Documents (`VerserVersionAction` +
  `nouvelleVersionMutation`) — the first UI caller of the pre-existing
  `nouvelle-version` endpoint (server logic existed, was never wired to
  any button). Answers the "admin reformats a translated report and needs
  to put the final file back" scenario without inventing a separate
  "archive" concept — it's just a new version of the same document.


Same audit → plan → implement → validate process, this time closing a gap
left by the previous Demandes (M5) redesign below: Mon espace's compact
`MyRequestsPanel` linked out to the admin registry
(`/demandes?assignation=mes_demandes`) rather than to a real agent-owned
screen — unlike missions, which already got a dedicated `/mes-missions`.
Audited with `/frontend-design:frontend-design` against a provided mockup
before implementing.

### Added — `/mes-demandes` (new agent-only route)
- New nav item + `AgentRoute`-guarded route, placed between Mon espace and
  Mes missions. `MyRequestsPanel`'s "Voir toutes" links now point here
  instead of the generic admin page.
- Reuses `RequestsSummaryCards`/`RequestsRegistryTable`/
  `RequestsRegistryMobileCards`/`RequestWorkspace`/`NouvelleDemandeDialog`
  unchanged, scoped via `demandeurId` — no new registry component, this is
  a composition, not a rebuild.
- Right-hand rail (all real data, nothing fabricated): a doughnut
  "Répartition par statut" built on `ChartCanvas`/chart.js (already used on
  the Dashboard, no new dependency) deriving straight from the existing
  aggregates; a "Priorité des demandes" bar reading a **new**
  `urgentes`/`normales` breakdown added to `DemandesAggregates`/
  `getDemandesAggregates`; an "Actions rapides" card with 3 real navigable
  shortcuts (new demande / documents / mes missions); a "Besoin d'aide ?"
  card labeled honestly "Bientôt disponible", same as Mon espace's.
- New `direction` filter (`fr_en`/`en_fr`) on `listerDemandes` — the
  mockup's filter row needed it and the admin Demandes page never had it
  either. Added as its own `MyRequestsFilters` component rather than
  extending the admin `DemandesFiltres`, since the agent screen's filter
  row is laid out flat (no "assignation" concept — scope is implicit) while
  the admin one keeps its existing collapse-to-advanced behavior.
- Live-validated `getDemandesAggregates`'s new `urgentes`/`normales` counts
  and the `direction` filter against the real dev DB with disposable
  synthetic rows (created and deleted, no real data touched) — see the
  DB-validation methodology note below.

## [Unreleased] — 2026-08-26 — feat(client/server): Demandes (M5) redesign + Agent workspace + Profil + self-service password

Same audit → plan → implement → validate process as Missions/Courriers/
Traductions/Glossaire. Demandes was the last un-migrated registry module
(still using the generic `DataTable`, text-link actions, no aggregates, no
search). Once redesigned, a follow-up discussion surfaced that agents (the
lowest role tier) had no tailored space in the app at all — no dashboard
access (correctly hidden from nav, but reachable by direct URL with zero
route guard), no profile page, and a two-screen document-upload-then-select
round trip for translation requests. All three were built out this round.

### Added — Demandes registry (`/demandes`)
- `GET /api/demandes/aggregates` — total/à assigner/en cours/en relecture/
  validées/archivées, independent of filters (same pattern as every other
  redesigned module).
- Server-side search — resolves `demandeurNom`/`traducteurNom` (via a users
  lookup) and `documentNom` (via a documents lookup) to candidate IDs, ORed
  with a direct `texteLibre` match. Chosen over a join to keep the change
  minimal and consistent with the module's existing style.
- `RequestsRegistryTable`/`RequestsRegistryMobileCards` replace the generic
  `DataTable` + text-link actions with the icon-button convention already
  established elsewhere. `requests.permissions.ts` centralizes the action
  matrix — it had been implemented three slightly different ways across
  route/service/UI layers (found during the audit).
- `RequestWorkspace` — Dialog-based tabbed detail (Aperçu/Source/Workflow/
  Traduction liée), same pattern as Glossaire's `TermWorkspace` (still no
  Sheet primitive in the repo).
- Audit findings deliberately left unfixed (documented, not silently
  patched): `demande.valider`/`traduction.approuver` are fully independent
  status machines with no cross-checks; a demande whose auto-translation-
  launch fails stays locked with no recovery path; `validerPriorite` has no
  server-side status guard.

### Added — Role-based landing + Agent workspace
- `lib/landing.ts` (`getLandingRoute`) — single source of truth for
  post-login/root-redirect routing by role. `agent` → `/mon-espace`,
  everyone else → `/dashboard` (unchanged).
- `AgentRoute`/`NonAgentRoute` (`App.tsx`) — real route guards, closing a
  gap found mid-session: `/dashboard` was hidden from the agent nav but had
  no route guard, so it was still reachable by direct URL.
- `/mon-espace` — 4 summary cards (mes demandes/en cours/mes missions/
  rapports en attente), a "Mes demandes" panel reusing the M5 registry
  components scoped to `demandeurId`, a "Nouvelle demande" CTA, a "Mes
  missions" panel scoped to `participantId` with report upload, a Documents
  link, and a "Besoin d'aide ?" card honestly labeled "Bientôt disponible"
  (no help system exists anywhere in the app — confirmed by grep before
  deciding what to show).
- `/mes-missions` — agent-restricted mission view (their own missions only,
  report upload), distinct from the full `/missions` registry which stays
  admin/super_admin-gated.
- `getDemandesAggregates(demandeurId?)`/`getMissionsAggregates(participantId?)`
  — both now accept an optional per-user scope; unscoped (global) behavior
  is unchanged when the param is omitted. `MissionsAggregates` gains
  `rapportsEnAttente` (`statut = 'terminee' AND rapportDocumentId IS NULL`
  — no invented deadline window, reuses the exact predicate already in
  `isMissionReportMissing()` client-side).
- `QuickUploadDialog` (`components/documents/`) — generic reusable upload
  dialog (uploads, hands the created document back via a callback, doesn't
  assume what happens next). Used by both `NewRequestDialog`'s document
  picker and the Mon espace/Mes missions report-upload cards, avoiding two
  separate upload implementations.
- `documents.permissions.ts` — client-side mirror of the Documents module's
  existing server-side role gates (`traducteur+` for delete/OCR-correct/
  retraiter-OCR/catégorie, `admin+` for portal publish). The server was
  already correctly gated; the gap was purely that every role saw the same
  action buttons regardless, which then 403'd on click for `agent`.

### Added — Profil (`/profil`)
- Informations personnelles tab — identity, matricule, poste/direction/
  service (only shown when present), email, membre depuis, dernière
  connexion (derived from the audit log — see fix below), statut du
  compte. All read-only, admin-managed elsewhere.
- Sécurité tab — real password-change form against the new
  `POST /api/auth/changer-mot-de-passe`, reusing the exact
  `<PasswordStrength>` checklist component already built for Bootstrap
  (login/components/) rather than rebuilding it.
- `changer-mot-de-passe` is deliberately distinct from `set-password`
  (first-login flow): verifies the current password, doesn't touch
  `premiereConnexion`/OTP fields, doesn't send the "account activated"
  email (this isn't one).
- **Password complexity now enforced server-side everywhere it's shown** —
  `validerForceMotDePasse()` (length + uppercase + digit + special char)
  is now checked in `changer-mot-de-passe`, `set-password`, AND
  `bootstrap` (first super admin). Previously the complexity rule existed
  only in the Bootstrap page's client-side zod schema — the server never
  checked it anywhere, including bootstrap's own service, which had zero
  password validation at all before this.
- **Bug fix, found live**: `/auth/me`'s "dernière connexion" initially
  matched only the `CONNEXION` audit action, which a first-time login
  never logs (it logs `OTP_VALIDE` then `MOT_DE_PASSE_DEFINI` — the latter
  is what actually issues the session tokens). Reproduced against a real
  account mid-session (showed "Jamais connecté" for an account that was
  actively logged in) and fixed by matching either `CONNEXION` or
  `MOT_DE_PASSE_DEFINI`.
- `users.poste`/`.service`/`.direction` — 3 new nullable columns (migration
  `0014_lyrical_stardust.sql`). The Personnel ANAC integration already
  exposed these fields raw but flattened them into one display string and
  never persisted them; now split and threaded end-to-end (picker →
  prefill → create → DB) for accounts created via that picker. `null` for
  manually-created accounts.

### Validation
- `tsc --noEmit` and `eslint` clean on both packages throughout.
- Both production builds succeed after every round.
- Every backend addition live-validated against the real dev DB —
  aggregates (global + scoped), search, org-field persistence, and the
  full password-change flow (wrong current password / mismatched
  confirmation / too short / missing complexity rules / valid change) —
  each via a disposable script using synthetic test data created and
  cleaned up in the same run, never mutating a real account.
- **Not done**: interactive browser verification. Attempted once (via a
  freshly-installed Playwright + Chromium), but completing a real login
  session would have required overwriting a real user's password hash,
  which the permission system correctly blocked as a sensitive DB
  mutation — not worked around. Every round this session is therefore
  verified at the type/lint/build/data layer only, not visually confirmed
  in a browser, until the user tested it directly and confirmed the
  Profil page rendered and functioned correctly (screenshot-confirmed
  2026-08-26, which is also how the dernière-connexion bug above was
  actually caught).

## [Unreleased] — 2026-08-24 — feat(client/server): Glossaire module (M7) redesign

Redesign of the Glossaire module to a concept-first, multilingual-ready
registry, following the same audit → plan → implement → validate process
as Missions/Courriers/Traductions. No backend multilingual migration —
`termeFr`/`termeEn` storage is unchanged; a frontend adapter layer
(`glossary.adapters.ts`) presents the same data as a generic `variants`
list so a future language only needs an adapter entry, not a registry
rewrite.

### Added — Registry (`/glossaire`)
- `GET /api/glossaire/aggregates` — total/actifs/inactifs/domaines counts,
  independent of filters/pagination (same pattern as Missions/Courriers/
  Traductions aggregates).
- `GlossaryRegistryTable`/`GlossaryRegistryMobileCards` — hand-built table
  + mobile cards replacing the shared `DataTable` (same reasoning as the
  Traductions redesign: that component's header-hover styling breaks on
  a dark header). Columns are concept-first (Terme principal / Traductions
  disponibles / Domaine / Statut / Dernière mise à jour / Actions) instead
  of permanently fixed FR/EN columns.
- `GlossaireFiltres` rebuilt to the Missions/Courriers/Traductions filter
  shape — debounced search (now also server-side, unchanged endpoint
  behavior), Statut select, "Plus de filtres" expandable Domaine select,
  filter chips, reset.
- `TermWorkspace` — Dialog-based (no Sheet primitive exists in the
  codebase yet) tabbed detail view: Traductions / Contexte d'utilisation /
  Informations / Historique, opened on row click or "Voir".
- `LanguageVariantBadge` — language always shown as ISO code + label text,
  never a flag alone.

### Added — Backend (additive, no contract changes)
- **`PATCH /:id/reactiver`** — flips `actif` back to `true` with a
  dedicated `TERME_REACTIVE` audit action. Previously absent at every
  layer (service/controller/route/client) — deactivating a term had no
  UI path to undo.
- **Duplicate check on `creerTerme`** — reuses the exact case-insensitive
  FR+EN match already used by `importerTermes` (CSV import), which was
  until now the only place with duplicate detection; manual create had
  none. Surfaces "Ce terme existe déjà dans le glossaire." (409).

### Notes
- No changes to `traductionsApi.suggestions`/`getSuggestionsGlossaire`/
  `GlossarySuggestions.tsx` — confirmed by diff review, not touched.
- "Langues couvertes" KPI intentionally omitted (would always read FR+EN
  on the current backend — brief explicitly warns against a misleading
  static-looking dynamic metric).
- Validated live against the dev DB via a disposable scratch script
  (deleted after use): aggregates, duplicate rejection, reactivate +
  re-reactivate rejection, domaine search — all confirmed working.
  Browser/visual verification not performed this session (Playwright
  Chromium version mismatch, same constraint as prior sessions).

## [Unreleased] — 2026-08-24 — feat(client/server): Traductions module (M6) redesign + app-wide router/confirm-dialog

Full redesign of the Traductions production workspace (queue + workshop),
following the same audit → plan → implement → validate process as
Missions/Courriers, plus two real bugs found and fixed, a new retry
capability, and two decisions that reach beyond this module: migrating
the app to a data router (to enable `useBlocker`) and replacing every
`window.confirm()` client-wide with a shadcn-style dialog.

### Added — Queue (`/traductions`)
- `GET /api/traductions/aggregates` — global KPI counts, independent of
  filters/pagination (mirrors Missions/Courriers aggregates pattern).
- `?vue=actives|supprimees` on `GET /api/traductions` — surfaces
  soft-deleted translations in a "Supprimées" tab, making the existing
  `restaurer` endpoint reachable from the UI for the first time.
- `?source=libre|document` and `?search=` (server-side `ilike` on
  `texteOriginal`) filters.
- `TraductionsRegistryTable`/`TraductionsRegistryMobileCards` — hand-built
  table + mobile cards replacing the shared `DataTable` component (whose
  `TableHeader` is dark `bg-anac-navy` and whose `TableRow` — reused for
  header rows too — applies `hover:bg-anac-gray` universally, producing a
  visibly broken light-patch-under-white-text hover on the header). Same
  shape as `CourriersRegistryTable`/`MissionsRegistryTable`.
- `TraductionsFiltres` rebuilt to the same shape as `MissionsFilters`/
  `CourriersFilters` — debounced search input, Statut select, "Plus de
  filtres" expandable (Direction/Source), filter chips, reset — instead
  of the older bare Select-row layout. The Supprimées/Traductions toggle
  is a small segmented control at the top of the same filter card (no
  equivalent existed in Missions/Courriers to match, since neither has a
  soft-delete browsing view).
- `TraductionsSummaryCards`, compact `TranslationEngineStatus` badge.
- Page size aligned to 8 (`TRADUCTION_PAGE_SIZE`).

### Fixed
- **OCR-prefill `documentId` loss** — `DocumentsPage`'s "Traduire" action
  always included `documentId` in its `sessionStorage` payload, but
  `useTraductionPrefill` only read `texte` out of it, and
  `useLancerTraduction`/`traductionsApi.lancer` had no `documentId`
  parameter — every translation launched from a document silently lost
  its link, even though the column/API/backend all supported it. Fixed
  end-to-end across all four hops.
- **Glossary suggestions never matched when selecting the target-language
  panel** — `getSuggestionsGlossaire` always searched the glossary column
  for the translation's *source* language, regardless of which panel
  (original vs translation) the user actually selected text in. For the
  common `fr_en` case, selecting English text in the translation panel —
  the natural thing to do while reviewing — searched French terms and
  always returned zero matches. Client now sends `?origine=source|
  traduction` on `GET /:id/suggestions`; server derives the language to
  search from `origine` + the record's `direction`.

### Added — Workshop (`/traductions/:id`)
- Split `TraductionEditeur.tsx` (628 lines) into `components/editor/`
  (`WorkshopHeader`, `SourceTextPanel`, `TranslationPanel`,
  `AssistancePanel` wrapping `EngineStatusBlock`/`GlossarySuggestions`/
  `SourceInfoBlock`). Responsive: 12-col grid desktop, stacked 2-col
  medium, tabs mobile.
- **`PATCH /:id/relancer`** — retries the engine on a `manuelle_requise`
  translation's stored `texteOriginal`. Never touches `texteFinal` (a
  manual draft in progress is never overwritten); the client additionally
  disables the button while there are unsaved local edits, since a query
  invalidation after retry re-syncs the editor from the server.
- `useBlocker`-based unsaved-changes guard (see router migration below),
  routed through the new `useConfirm()` dialog, plus a `beforeunload`
  listener for actual browser close/refresh.

### Added — App-wide
- **Data router migration**: `<BrowserRouter>`/`<Routes>` →
  `createBrowserRouter`/`<RouterProvider>` (route tree moved to new
  `router.tsx`). Required for `useBlocker`. `App` is now the router's root
  element (owns the auth-session check + bootstrap redirect, renders
  `<Outlet />`); `Layout` reads the user from `useAuth()` instead of
  props. Side effect: the bootstrap-needed redirect now applies uniformly
  to every route instead of only unmatched ones (a tightening, not a
  regression).
- **`useConfirm()`** (`components/ui/confirm-dialog.tsx`) — Promise-based
  hook on the existing `Dialog` primitive (no new dependency), replacing
  all 6 `window.confirm()` call sites app-wide (Accords/Courriers/
  Missions forms and headers, not just Traductions).
- `npm run services:up/down/restart/logs/status` — wrap `docker compose`
  for `libretranslate`/`translate-service`/`ocr-service`, meant to run
  continuously on the real server, independent of `npm run dev`.

## [Unreleased] — 2026-08-24 — feat(client/server): Courriers module (M4) redesign

Full redesign of the Courriers module, following the exact process and
normalized pattern from this week's Missions redesign: Phase 1 audit →
Phase 2 plan → registry → guided creation → detail workspace → live
validation, then two feedback-driven follow-up rounds (real schema work
for contact-level linking + multi-document attachment, then quick-create
+ edit-form field unlocking). Replaces the old split-pane (email-client
style) list + flat single-step form.

### Added — Registry (`/courriers`)
- `courrier.types.ts` / `.constants.ts` / `.utils.ts` / `.schemas.ts` —
  centralizes what was inline in the old `CourriersPage.tsx` (direction/
  status badge logic, criticité-derived health signal).
- `CourriersSummaryCards` (5 KPI cards) backed by a new
  `GET /api/courriers/aggregates` endpoint (mirrors Missions/Accords
  aggregates pattern).
- `CourriersFilters` — type/statut/réponse (derived) + a real Période
  filter (Ce mois/30 derniers jours/Cette année/Personnalisée), synced to
  URL. Server gained `dateDebut`/`dateFin` range filtering on
  `dateReception` and an `enDepassement` filter (shares its threshold
  logic with the aggregates endpoint via `calculerLimiteCritique()`).
- `CourriersRegistryTable` + mobile cards, full-width, replacing the
  split-pane list.
- `CourrierHealthBadge` / `getCourrierHealth()` — centralizes the
  direction/statut/criticité → tone+label mapping that used to be inline
  in `BadgeSuivi`/`BadgeDirection`.

### Added — Guided creation & edit (`/courriers/new`, `/courriers/:id/edit`)
- `CourrierCreateStepper` — 4-step flow (informations générales,
  expéditeur/destinataire, documents, vérification). No "Contenu" step —
  no body-content field exists, only `objet`, already covered in step 1.
- `CourrierEditForm` — grouped sections. Direction stays immutable (a
  courrier doesn't flip entrant/sortant); expéditeur/destinataire, date,
  and réponse requise are editable per explicit follow-up request (see
  below) — the server previously silently ignored these on `PATCH`.
- Quick-create: `QuickCreateOrganisationDialog` + `QuickCreateContactDialog`
  (contact-only variant — org already chosen by the time it opens, unlike
  Missions' combined two-layer dialog), reusing the exact
  `FormulaireOrganisation`/`FormulaireContact` from Partenaires. Wired into
  both create and edit.

### Added — Detail workspace (`/courriers/:id`, new real route)
- `CourrierDetailHeader` (direction/health badges, Modifier/Répondre,
  Imprimer via the existing `PdfPreviewDialog`, Archiver), `CourrierSummaryStrip`,
  `CourrierOverview` (3-column: informations clés / suivi — real 2-transition
  lifecycle, no invented stages / documents-réponse), `CourrierDocumentSection`
  (fully interactive — add/remove per document), `CourrierResponseSection`
  (réponse tracking + fil de correspondance + relance, combined — reuses
  `ModalRelance`/`HistoriqueNotifications` unchanged).

### Added — Real schema work (migration `0013_nappy_tombstone.sql`)
- **Contact-level sender/recipient**: `courriers.expediteurContactId` /
  `destinataireContactId` (nullable FK → `contacts.id`) — a refinement of
  the existing organisation link, not a replacement. `GET /api/contacts`
  gained an `organisationId` filter to scope the picker. Server validates
  a contact always belongs to its organisation, including on edit — an
  org change without an explicit contact update/clear is now rejected
  (`CONTACT_EXPEDITEUR_INVALIDE`), not silently allowed to go stale.
- **Multi-document attachment**: new `courrier_documents` join table
  (replaces the single `documentId` column for new code — the column
  itself is kept, unused, for backward compatibility rather than a
  destructive drop). Migration backfills every existing single-document
  link into the join table. New `POST/DELETE /api/courriers/:id/documents`
  endpoints with dedicated `ajouterDocumentCourrier`/`retirerDocumentCourrier`
  service functions (audit-logged as `COURRIER_DOCUMENT_AJOUTE`/`_RETIRE`).
- `CourrierView`/`Courrier` (client) now carry `documents: DocumentResume[]`
  and `expediteurContact?`/`destinataireContact?` instead of a single
  `documentId`. `courriers.export.service.ts` (the PDF fiche) updated to
  render the full document list and prefer the explicit contact over the
  organisation's generic `contactPrincipal`.

### Changed
- `MISSION_PAGE_SIZE` (was 10) and `COURRIER_PAGE_SIZE` (was 20) both set
  to 8, matching the convention Accords/Partenaires already used.

### Deliberately not built (avoid inventing data)
Same discipline as the PDF export work: courrier body/"Contenu" text (no
field exists), the mockup's 5-stage courrier stepper (only 3 real
`suiviStatut` values exist — rendered as a 2-transition progress
indicator instead), multi-level correspondence threads (only one level of
`reponseAId` exists). Flagged as future backlog if ever wanted, not
silently fabricated.

## [Unreleased] — 2026-08-24 — feat(client/server): individual PDF export (accords, courriers, missions)

Closed the "Export PDF/DOCX individuel" backlog item (Sprint 3/11, HAUTE) —
PDF only, per explicit decision (no new dependency, reuses the existing
Puppeteer pipeline; DOCX dropped from scope). Went through two rounds:
a first pass with a plain single-table layout, then a full visual
redesign against a reference mockup the user provided, upgraded again once
the official ANAC seal file was supplied.

### Added — Server
- `src/utils/ficheHTML.ts` — reusable HTML building blocks for individual
  "fiche" PDFs: institutional masthead (ANAC seal, embedded as a cached
  base64 data URI from `packages/server/assets/anac-seal.png`, read once
  via a `process.cwd()`-relative path so it works identically in dev and
  in the Docker image), colored status badges, section boxes, two-column
  layout, and a `tableHistorique()` helper.
- `src/utils/pdf.ts` — new `genererPDFFiche()` variant of the existing
  `genererPDFDepuisHTML()`: masthead lives in the HTML body instead of a
  repeating Puppeteer header bar, since these are one-page fiches.
- Real "Historique" section per fiche — sourced from the existing
  `audit_logs` table, not invented. Added an `entiteId` filter to
  `AuditFilters`/`construireConditions()` and a new
  `listerHistoriqueEntite(module, entiteId)` in `audit.service.ts`.
- `accords.export.service.ts` / `courriers.export.service.ts` /
  `missions.export.service.ts` — one `genererPDF*()` per module, resolving
  the linked document and the record's creator (`createdPar` → user) for
  the "Document lié" and "Responsable" sections. Missions additionally
  render a real recommendations count-by-status table (including a
  genuinely derived "Dépassées" overdue count from `dateLimite`).
- `GET /:id/export/pdf` on all three modules — same read-level auth as
  `getById`. Accepts `?apercu=1` to switch `Content-Disposition` from
  `attachment` to `inline` for the preview flow below.
- `Dockerfile` (server, prod stage) — added `COPY --from=build
  .../assets ./assets`, otherwise the seal would have silently been
  missing in deployed images despite working locally.

### Added — Client
- `components/PdfPreviewDialog.tsx` — shared modal (iframe pointed at the
  `?apercu=1` URL) with "Télécharger"/"Fermer" actions. "Exporter PDF" now
  opens a preview first instead of downloading immediately, on all three
  detail pages (`AccordDetail`, `CourrierDetail`, `MissionDetailHeader`).
- `getUrlExportPDF(id)` added to `accords.api.ts` / `courriers.api.ts` /
  `missions.api.ts`.

### Deliberately not built (avoid inventing data)
Went through the mockup section by section and only rendered what a real
field backs. Left out: courrier body/"Contenu" text (only `objet` exists),
the mockup's 5-stage courrier stepper (only 3 real `suiviStatut` values
exist), multi-document association (schema is one `documentId` per
record), accord "type/durée/renouvelable", mission
"organisateur/objectif/résumé d'activités", and per-mission participant
"fonction" — none of these have a backing field. Flagged as a real Tier 2
backlog item (schema decisions, same category as the logistics-checklist
call) if full mockup parity is wanted later.

## [Unreleased] — 2026-08-24 — feat(client/server): Missions module (M3) redesign

Full redesign of the Missions module (`/missions`), replacing the old
split-pane (email-client-style) list + a cramped inline detail panel with
the same normalized registry/detail pattern already used by
Dashboard/Accords/Partenaires. Delivered incrementally (audit → plan →
registry → guided creation → detail workspace → feedback rounds), each
phase validated with a real `docker compose` staging deploy against live
data, not just `npm run build`.

### Added — Registry (`/missions`)
- `mission.types.ts` / `.constants.ts` / `.utils.ts` / `.schemas.ts` —
  centralizes what used to be duplicated per-file (status labels, the
  14-day logistics-risk threshold, page size, etc.).
- `MissionsSummaryCards` (7 KPI cards) backed by a new
  `GET /api/missions/aggregates` endpoint (global counts, independent of
  the current filters — mirrors `OrganisationsAggregates`).
- `MissionsFilters` (search, statut, progressive "Plus de filtres" for
  pays/logistique/rapport) and `MissionsRegistryTable` +
  `MissionsRegistryMobileCards`, reusing `CountryMark` from Partenaires
  instead of a third copy.
- `MissionHealthBadge` / `getMissionHealth()` — one derived signal folding
  lifecycle + logistics risk + missing report + overdue recommendations
  into a single "what needs attention" answer, shown consistently across
  the registry row and the detail summary strip.
- Server: `GET /api/missions` gained `confirmationLogistique` and
  `rapportStatut` filters alongside the existing search/statut/pays.

### Added — Guided creation & edit (`/missions/new`, `/missions/:id/edit`)
- `MissionCreateStepper` — 5-step guided flow (informations générales,
  dates/destination, participants, contact/logistique, vérification),
  hand-rolled numbered-circle stepper matching `AccordFormPage`'s pattern.
  Deliberately excludes every field the mockup implied but the schema
  doesn't have (référence, priorité, type, programme, budget — see
  Phase 1 audit).
- `MissionEditForm` — grouped sections, not a stepper (a minor update
  shouldn't force 5 create-style steps). Report and recommendations are
  deliberately not here — separate workflows in the detail workspace.
- `ParticipantsPicker` — two-panel searchable participant picker, **with
  quick-create**: an admin/super_admin can create a new ANAC agent account
  inline via the exact same `CreerUtilisateurDialog` the admin Users page
  uses (same validation/OTP-dispatch/audit-log, zero duplicated logic),
  hidden entirely for non-admins rather than shown disabled.
- `ContactSurPlacePicker` — replaces the old N+1 fetch (all organisations
  → all their contacts) with a live search against a new
  `GET /api/contacts` endpoint. **Also quick-create**: `QuickCreateContactDialog`
  handles the two-layer reality that a contact always belongs to an
  organisation — search-or-create the organisation, then add the contact
  under it, reusing `FormulaireOrganisation`/`FormulaireContact` from the
  Partenaires module rather than a parallel creation path.
- Backend role-gate changes (both narrowly scoped, not blanket): `GET
  /api/users` is now agent-accessible for listing (create/update/etc. stay
  admin-only), and `POST /api/notifications/envoyer` accepts `agent` only
  for `recommandation_rappel` (other notification types stay admin-gated).

### Added — Detail workspace (`/missions/:id`, now a real route)
- `MissionDetailHeader` (breadcrumb, status, Modifier, "Plus d'actions"
  overflow with Imprimer/Annuler), `MissionSummaryStrip`, and a two-column
  shell (section nav synced to `?section=` + main), matching
  Accords/Partenaires exactly.
- `MissionOverview` — the three real columns (Informations clés /
  Participants preview / Suivi opérationnel) in place of the mockup's
  invented Programme column.
- `MissionLogisticsSection` + `LogisticsDialog` — dedicated workflow, not
  edit-form-only. Upgraded mid-session into a real checklist: `missions`
  gained `logistiqueBilletReserve` / `logistiqueHebergementConfirme` /
  `logistiqueFinancementValide` (migration `0012_opposite_tyrannus.sql`).
  `confirmationLogistique` is no longer manually picked — it's derived
  server-side from the checklist (none → à planifier, all → confirmée,
  else → en cours). The checklist itself is always visible read-only in
  the section (not just inside the edit dialog), per user feedback.
- `MissionReportSection` — upload or link-existing, **plus remove/replace**
  (an X button clears `rapportDocumentId`, added after user feedback that
  a mistakenly-uploaded report couldn't be corrected).
- `MissionRecommendationsSection` + `RecommendationDialog` — replaces the
  old inline-expand add form (which visually broke the rest of the screen)
  with a proper dialog; adds urgency sorting and filter chips (Toutes/À
  traiter/Dépassées/Réalisées).
- `MissionPeriod` component — replaces the `→` unicode character used
  throughout with a real `ArrowRight` icon everywhere it's visually
  rendered; `formatMissionPeriod()` now serves as the plain-text
  `aria-label` instead of sitting unused.
- Deleted the old `MissionDetails.tsx` (superseded, confirmed unused).

### Fixed (found via live testing against real seeded data, not just typechecked)
- `participantsIds: []`, `rapportDocumentId: null`, `contactSurPlaceId: null`
  were all silently ignored by `mettreAJourMission` — "remove everything"
  looked like it saved but did nothing. All three now actually clear.
  Confirmed via live before/after API calls against real mission rows.

### Backlog (flagged, not built — see Notion Sprint 12)
- Période filter (à venir/en cours/30j/cette année/terminées) on the
  registry — needs more date-range logic than this pass covered.
- Shared `SummaryCard` extraction (still 3 copies across
  Accords/Partenaires/Missions) — not touched to avoid modifying modules
  outside this task's scope.
- No automated test suite — CI is lint + build only.

## [Unreleased] — 2026-08-24 — feat(infra): Docker/Compose/CI-CD deployment infrastructure

### Added
- `docker-compose.yml` / `.staging.yml` / `.prod.yml` — local, staging (full
  prod shape on local ports), and production Compose stacks covering all 5
  deployable units: `client`, `api`, `ocr-service`, `translate-service`, and
  a self-hosted `libretranslate` container (replacing the bare
  `LIBRETRANSLATE_URL=http://localhost:5000` assumption with an actual
  managed service).
- `packages/{server,client,ocr-service,translate-service}/Dockerfile` —
  multi-stage Node builds for server/client; `ocr-service` on
  `python:3.11-slim` with Tesseract + LibreOffice + Poppler installed
  (chosen over Alpine — LibreOffice's Alpine package is unreliable).
- `nginx/staging.conf`, `nginx/prod.conf` — single public reverse proxy
  routing `/api`, `/uploads`, and `/` (SPA); TLS via host Certbot in prod.
- `.github/workflows/{ci,docker-publish,deploy-prod}.yml` — CI on every
  push/PR, image publish to GHCR on push to `main`, and a **manual-only**
  `workflow_dispatch` prod deploy — pushing to `main` never auto-deploys.
- `scripts/deploy-{staging,prod}.sh`, `.env.example`, `.env.prod.example`,
  `docs/deployment/production-guide.md` (project-specific runbook) and
  `docs/deployment-documentation.md` (the reusable generic playbook this
  was built from).
- Root of the effort: [`project/architecture.md`](project/architecture.md)
  now has a "Deployment Infrastructure" section — see there for the
  service topology and env vars.

### Fixed (found via an actual end-to-end staging deploy, not just written and assumed working)
- `ocr-service`/`translate-service` bound Waitress to `127.0.0.1` — made
  them unreachable from any other container on the Docker network. Now
  `0.0.0.0`.
- `packages/server/drizzle/` (migration SQL) was gitignored and had **zero
  commits** in git history — a fresh checkout (and therefore every CI
  build and prod deploy) would have shipped with no migrations at all
  against a fresh database. Now tracked.
- Committed `*.tsbuildinfo` files made `packages/shared`'s composite
  TypeScript build think it was already built inside a clean
  container/checkout (where `dist/` doesn't exist yet), so it silently
  skipped emitting `.d.ts` files and broke every downstream `tsc` step.
  Removed from git, added to `.gitignore`/`.dockerignore`.
- `vite.config.ts` hardcoded the dev-server API proxy to
  `http://localhost:3001`, which breaks once the client runs in its own
  Docker container (`localhost` there means the client container itself).
  Now reads `VITE_API_PROXY_TARGET`.
- 7 pre-existing `@typescript-eslint/no-unused-vars` errors (unused
  re-exported type imports in `demandes.service.ts`, `missions.service.ts`,
  `organisations.service.ts`) that would have made CI red on the very first
  run, unrelated to this infra work.
- `src/db/seed-demo.ts` had pre-existing type errors that broke
  `npm run build`; excluded from the `tsc` build in
  `packages/server/tsconfig.json` since it's a dev-only script invoked via
  `tsx`, never imported from compiled `dist/`.

## [Unreleased] — 2026-07-29 — feat(client/server): Dashboard, Accords, and Partenaires UX hardening

### Added
- `packages/client/src/pages/dashboard/` — dashboard split into focused
  components/helpers so the operational home page is easier to maintain.
- `packages/client/src/pages/accords/` — Accords feature split with shared
  constants, types, utilities, filters, summary cards, status/expiry badges,
  registry table, and mobile cards.
- Accords table country indicators now use deterministic CSS-rendered mini
  flags instead of emoji flags, avoiding Windows/browser fallbacks such as
  `CM` or `FR`.
- `packages/client/src/pages/partenaires/components/PartenaireFormPage.tsx`
  — guided create/edit flow for organisations, with optional principal
  contact creation handled after the organisation is saved.
- `packages/client/src/pages/partenaires/components/PartenaireDetailPage.tsx`
  — detail workspace with overview, contacts, organisation information,
  linked accords, and system metadata.
- `packages/client/src/pages/partenaires/components/PartenairesRegistryTable.tsx`
  — desktop registry table plus mobile cards, tooltipped actions, contact
  health, linked accord counts, and deterministic CSS country marks.
- Server-side Partenaires list metadata and aggregates: principal contact,
  active/total contact counts, linked accord counts, contact-quality filters,
  status filtering, and summary metrics.

### Changed
- `ChartCanvas.tsx` now imports `chart.js` from npm and registers Chart.js
  locally instead of loading it from a CDN at runtime. This restores chart
  animation/reliability when navigating to Analytics and removes the network
  dependency.
- `AccordsPage.tsx` moved from the old inbox layout to a dense registry view:
  URL-backed search/filters, summary KPI cards, responsive table/cards,
  renewal shortcut, and 8 rows per page.
- `AccordDetail.tsx` now uses section navigation, shadcn Dialog structure for
  renewal, clearer validity timeline alignment, document/partner dossier
  rows with icons, renewal query-state handling, and grouped notification
  actions.
- `AccordFormPage.tsx` now follows a stepped creation/editing flow with
  structured general information, partner selection, scope, validity,
  document attachment, and review.
- `PartenairesPage.tsx` now uses a dense operational registry pattern with
  URL-backed filters/search/sort, summary cards, 8 rows per page, and direct
  navigation to create/detail/edit pages instead of modal-first workflows.
- `organisations.service.ts` now batches row metadata for the current page
  instead of requiring client-side contact fetches per organisation.

### Fixed
- Accords table action buttons now expose hover/focus tooltips and use a
  clearer detail icon (`Eye`) instead of the previous ambiguous action.
- The renewal modal no longer renders as an edge-to-edge raw form; it uses
  header/body/footer spacing, status context, validation feedback, and a
  stable action footer.
- Validity timeline connector rendering no longer drifts or leaves a dangling
  line when an agreement has no following timeline items.
- Partenaires country indicators no longer rely on emoji flags, so Windows
  fallback labels such as `CM`/`FR` are avoided in the registry and detail
  views.
- Partenaires rows now show clear contact availability and linked-accord
  counts without hiding critical state behind the actions menu.

### Verification
- `npm run lint` passes with one unrelated existing warning in
  `AdminParametresPage.tsx` (`no-explicit-any`).
- `npx tsc --noEmit` passes for `packages/client`.
- `npm run build` passes for `packages/client`; Vite/esbuild requires running
  outside the sandbox on this Windows environment because sandboxed builds hit
  `spawn EPERM`.
- `packages/server` TypeScript/build validation is still blocked by existing
  `src/db/seed-demo.ts` typing errors; filtering the compiler output for the
  modified Partenaires server files produced no Partenaires-specific errors.

## [f06ed6d] — 2026-07-06 — feat(client): UI hardening sprint — shadcn Table/Tabs migration + full feature-folder split

### Added
- `components/ui/tabs.tsx` — shadcn Tabs wrapper on newly-installed
  `@radix-ui/react-tabs`, replaces `AnalyticsPage.tsx`'s hand-rolled
  `role="tab"` implementation
- Feature-folder split for `GlossairePage.tsx`, `DemandesPage.tsx`,
  `TraductionsPage.tsx` (columns/types/constants/schemas/utils/hooks/
  components), mirroring the pattern already applied to
  partenaires/documents/audit
- `pages/analytics/` — full split of the 2150-line, 9-tab
  `AnalyticsPage.tsx`: one file per tab under `components/tabs/`
  (`AgreementsTab`, `CourriersTab`, `DocumentsTab`, `GlobalTab`,
  `GlossaryTab`, `MissionsTab`, `ReportsTab`, `RequestsTab`,
  `TraductionsTab`), plus `AnalyticsAIDialog.tsx`, `PeriodSelector.tsx`
- `docs/TASKS.md` — new "Sprint de durcissement UI (shadcn/ui)" section
  documenting the whole 2026-07-05/06 effort and its scope decisions

### Changed
- All 7 pages that used raw HTML `<table>` (Partenaires, Audit, Documents,
  Glossaire, Demandes, Traductions, Analytics) now use `Table`/`DataTable`

### Fixed (found for free, not hunted for)
- `AuditPage.tsx`/`DocumentsPage.tsx` had a hand-written `colSpan` on
  empty/loading rows that had drifted out of sync with the real column
  count — `DataTable` computes it from `columns.length` automatically,
  eliminating the failure mode entirely

### Scope decisions (documented in `docs/TASKS.md`)
- No generic `DataTable` column-filter prop surface — each page keeps its
  own bespoke filter bar
- AnalyticsPage's 6 small static tables use plain `Table` primitives, not
  `DataTable` (no pagination/sorting/per-row actions to justify it)

Full detail: `sessions/2026-07-06.md`.

## [6ea082a] — 2026-07-05 — feat(client): replace browser alert/confirm with sonner toasts

### Added
- `src/components/ui/sonner.tsx` — shadcn-style `Toaster` wrapper (styled
  with `anac-*` tokens), mounted once in `App.tsx`
- `src/lib/confirm-toast.ts` — `confirmToast(message, onConfirm)`, replaces
  `window.confirm()` with a non-blocking sonner action-toast
  (Confirm/Cancel), chosen over a separate shadcn `AlertDialog` so every
  notification/confirmation lives on one system
- Feature-folder split for `DocumentsPage.tsx` and `AuditPage.tsx`
  (columns/types/utils/components/hooks), mirroring `pages/partenaires/`
- `components/table/data-table-pagination.tsx` — pagination UI promoted
  out of `pages/partenaires/components/PartenairesPagination.tsx` into a
  shared component reused by Documents/Audit/Partenaires

### Changed
- Replaced `alert(...)` → `toast.error(...)`: `AdminParametresPage.tsx`,
  `DemandesPage.tsx`, `TraductionsPage.tsx`
- Replaced `confirm(...)` → `confirmToast(...)`: `DocumentsPage.tsx`,
  `TraductionsPage.tsx`, `DemandesPage.tsx`, `AnalyticsPage.tsx`,
  `TraductionEditeur.tsx`

### ⚠️ Found, not caused by this commit
- `tsc --noEmit` fails client-wide: `tsconfig.json`'s
  `"ignoreDeprecations": "6.0"` isn't accepted by the installed TypeScript
  `5.9.3` (`TS5103`). Confirmed via `git stash` that this reproduces
  without this session's changes — pre-existing drift between the
  declared `^5.4.5` and the installed 5.9.3. `eslint` used instead to
  verify (clean).

Full detail: `sessions/2026-07-05.md`.

## [169f725] — 2026-07-05 — feat(client): refactoring PartenairePage and UI shadcn hardening

### Added — server-side sorting for the Partenaires table
- `organisations.types.ts` — `OrganisationSortBy`/`OrganisationSortOrder`
  added to `OrganisationFilters`
- `organisations.service.ts` — `SORTABLE_COLUMNS` whitelist + `buildOrderBy()`
- `organisations.controller.ts` — validates `sortBy` against a
  `SORTABLE_FIELDS` whitelist before it reaches the service
- `organisations.api.ts` (client) + `PartenairesPage.tsx` — `SortingState`
  wired to `DataTable`'s existing `sorting`/`onSortingChange` props (table
  is server-paginated at 20 rows/page, so sorting had to be server-side,
  not `getSortedRowModel`)

### Changed — `PartenairesPage.tsx` split from 833 lines to a ~190-line
orchestrator, scoped strictly to this page per explicit user request:
`pages/partenaires/{partenaires.types.ts, partenaires.constants.ts,
partenaires.schemas.ts, partenaires.columns.tsx, hooks/usePartenairesQueries.ts,
hooks/usePartenairesMutations.ts, components/{BadgeType,
FormulaireOrganisation, FormulaireContact, PartenairesFiltres,
OrganisationDialog, ContactsDialog}.tsx}`. Also added shadcn `components.json`,
`data-table.tsx`/`table.tsx` primitives (Radix-backed).

Full detail: `sessions/2026-07-05.md`.

## [d312a86] — 2026-07-04 — feat(sprint11): Rapports IA — narratif Gemini avec relecture obligatoire

### Added
- `modules/analytics/services/gemini.service.ts` (205 lines) —
  `genererNarratifIA()`: mandatory anonymization of agent names before any
  Gemini call, deterministic deltas vs. last *validated* report period
  (computed in code, never by the model), hard activity floor
  (`SEUIL_ACTIVITE_MINIMALE = 5`) below which no API call happens at all,
  3-model rotation (`gemini-2.5-flash`, `gemini-2.5-flash-lite`,
  `gemini-3.1-flash-lite`) with reactive 429 fallback, thinking budget
  pinned near-zero on every call
- `modules/analytics/services/gemini-quota.service.ts` (135 lines) — two
  independent daily caps: per-model call count
  (`gemini_quota_journalier_par_modele`, default 15, real free quota is
  20) and a global cap on on-demand generations only
  (`gemini_rapports_manuels_max_jour`, default 10 — cron runs don't
  count); `getStatutUsageGemini()` for the admin monitor
- New tables `geminiUsageQuotidien`, `rapportsIAQuotidien`; new
  `statutRelectureIAEnum`; `rapports` gains `contenuIA` (raw),
  `contenuIAValide` (frozen post-review), `statutRelectureIA`, `moteurIA`
  (pinned, never "latest"), `relecteurIAId`, `relusLeIA`
- `rapports.service.ts` — `genererAnalyseIA()`, `validerOuRejeterAnalyseIA()`
  (admin-only, refuses if not `en_attente`, audits
  `RAPPORT_IA_VALIDE`/`RAPPORT_IA_REJETE`), `getRapportById()`
- `analytics.route.ts` — `GET/POST /rapports/:id`,
  `POST/PATCH /rapports/:id/analyse-ia` (PATCH requires admin),
  `GET /gemini-usage` (admin)
- `jobs/rapport-mensuel.ts` — attempts AI analysis on the monthly PDF,
  never blocks the cron on failure
- `packages/server/src/scripts/gemini-smoke-test.ts` — standalone
  connectivity check (`npm run test:gemini`)
- Client: `AnalyticsPage.tsx` Rapports tab gains a review dialog
  (`react-markdown`, not `dangerouslySetInnerHTML`) with validate/reject
  (confirmation required) + regenerate-after-reject; status badges;
  `AdminParametresPage.tsx` gains a Gemini usage monitor (per-model bars,
  thinking tokens, auto-refresh 60s)
- `.env.example` — `GEMINI_API_KEY`/`GEMINI_MODEL`, test-environment-only
  by explicit comment (production requires DG/RGPD sign-off)

### Fixed (real bugs found during this work)
- `listerRapports()` omitted the IA fields entirely — every history row
  showed the wrong status regardless of actual state
- Rapports were sorted oldest-first, not newest-first
- `cn()` (`lib/utils.ts`) lacked `tailwind-merge` — a custom `className`
  didn't reliably override a component's own default; fixed at the root
- `DocumentsPage.tsx` had its own unsynced document category list —
  `rapport`-category documents showed a blank category

### Changed
- `docs/TASKS.md` — Sprint 11 header flipped to ✅ COMPLÉTÉ with extensive
  documentation of this whole add-on

### ⚠️ Not fixed — flagged for follow-up
- `package-lock.json` churned ~2800 lines this session. `exceljs` in
  `packages/server/package.json` was downgraded `^4.4.0` → `^3.4.0`
  (confirmed installed) — the exact library used by 3 separate Excel
  export features built this and last session, against the 4.x API.
  `node-cron`, `nodemailer`, `uuid` also jumped multiple majors. Root
  `package.json` picked up duplicate direct deps on the same packages.
  Pattern suggests an `npm install` run from the repo root instead of
  inside `packages/server`. See `sessions/2026-07-04.md` for full detail.

See `sessions/2026-07-04.md` (third section) for full detail.

---

## [f27d58f] — 2026-07-04 — feat(sprint11): Module Rapports (M11) — closes analytics scope

### Added
- `packages/server/src/modules/report/` — new module: `rapports.service.ts`
  (237 lines: `genererRapport()` combined multi-module PDF via
  `genererPDFDepuisHTML`/multi-sheet Excel, archives to `documents`
  (`rapport` category) + `rapports` history table; `listerRapports()`),
  `rapports.controller.ts` (44 lines). `routes/rapports.route.ts` created
  **empty (0 bytes) and never wired up** — dead code, actual routes live
  in `analytics.route.ts` instead
- `rapports` table (`type` mensuel/a_la_demande, `periodeDebut`/`Fin`,
  `modulesInclus` jsonb, `format` pdf/excel, `documentId` FK,
  `genereParUserId` nullable FK = cron); `rapportTypeEnum`,
  `rapportFormatEnum`; `documentCategorieEnum` gains `'rapport'`
- `packages/server/src/jobs/rapport-mensuel.ts` — `genererRapportMensuel()`
  (previous calendar month, PDF+Excel, all 8 modules),
  `demarrerJobRapportMensuel()` (cron `0 6 1 * *`), started in `index.ts`,
  registered in `registre.ts` as `rapport_mensuel` — closes the Sprint 10
  "job manuel rapport mensuel" backlog item
- `packages/server/src/modules/analytics/services/analytics.export.service.ts`
  (79 lines) — `humaniser()`, `normaliserEnLignes()`, `genererExcelAnalytics()`,
  `genererCSVAnalytics()` (UTF-8 BOM for Excel accent compatibility)
- `analytics.controller.ts` — `exporterAnalytics`, `GET /api/analytics/export?module=&format=excel|csv`,
  audited as `ANALYTICS_EXPORT_EXCEL`/`ANALYTICS_EXPORT_CSV`
- `analytics.service.ts` — `SERVICE_PAR_MODULE` export (module-key → fn
  map), shared by the export endpoint and the rapports collector
- `packages/client/src/pages/AnalyticsPage.tsx` — 9th "Rapports" tab
  (generation form + history), Excel/CSV export buttons on every tab
- `packages/client/src/lib/analytics.api.ts` — `getUrlExport()`,
  `genererRapport()`, `listerRapports()`
- `packages/server/src/db/seed-demo.ts` (446 lines) — filled in from the
  empty stub committed last session. NODE_ENV-guarded demo-data generator
  (organisations/accords/courriers/missions/documents/traductions/
  demandes/glossaire across trailing 12 months) so Analytics dashboards
  have data to render; also backfills 14 days of
  `courriersCriticiteSnapshots`

### Changed
- `db:seed-demo` npm script moved from root `package.json` (wrong
  workspace, added by mistake last session) to
  `packages/server/package.json`
- `docs/TASKS.md` — Sprint 10 header flipped `🔶 EN COURS` → `✅ COMPLÉTÉ`;
  its "Job manuel rapport mensuel" item marked done. Sprint 11's own
  header **not updated** — still shows `⬜ À FAIRE` despite both halves
  now being functionally complete

See `sessions/2026-07-04.md` (second section) for full detail.

---

## [f3547d4] — 2026-07-04 — feat(sprint11): Module Analytics (M11) — dashboard half

### Added
- `packages/server/src/modules/analytics/` — new module: `analytics.types.ts`
  (one interface per module + `GlobalAnalytics`), `analytics.service.ts`
  (651 lines, one `get*Analytics(filtre)` per module, each `avecCache()`-
  wrapped, default trailing-12-months window), `analytics.controller.ts`,
  `analytics.route.ts` (`GET /accords|courriers|missions|traductions|
  demandes|documents|glossaire|global`, gated `authenticate` +
  `requireTraducteur`)
- `packages/server/src/utils/cache.ts` — `avecCache()`, in-memory `Map`
  with TTL, single-process only (documented limitation, not a bug)
- `courriersCriticiteSnapshots` table + `packages/server/src/jobs/
  criticite-snapshot.ts` — daily 23:55 cron capturing courrier criticité
  counts (never persisted before), SQL-side aggregation, idempotent upsert
  on `date`; also registered as a manually-triggerable job in
  `registre.ts` (`courriers_criticite_snapshot`, module M11, admin) for
  dev backfilling
- `packages/client/src/pages/AnalyticsPage.tsx` (1700 lines) — 8 tabs
  (global + 7 modules), routed at `/analytics`
- `packages/client/src/components/analytics/ChartCanvas.tsx` — generic
  Chart.js wrapper, loads Chart.js from a CDN at runtime (not an npm dep)
- `packages/client/src/lib/analytics.api.ts` — client API wrapper
- `packages/server/src/utils/error.ts` — `handleAnalyticsError` (empty
  error map, falls through to generic 500)
- `packages/server/src/db/seed-demo.ts` — empty stub, no content

### Changed
- `index.ts` — mounted `/api/analytics`, started
  `demarrerJobSnapshotCriticite()` at boot
- `Layout.tsx` — new nav item `/analytics` (`BarChart3` icon)
- `i18n/index.ts` — `nav.analytics` key (fr+en); also backfilled
  `nav.portail` in the English block, missing since Sprint 9

### Not done (Sprint 11's original scope is only half-delivered)
- The `rapports` layer: PDF/Excel generation, ANAC-branded template,
  monthly cron, on-demand reports, history — none built. `utils/pdf.ts`
  (Sprint 10) is already generic enough to reuse
- CSV/Excel export on the analytics dashboard itself
- `docs/TASKS.md` Sprint 11 section not updated — still `⬜ À FAIRE`

See `sessions/2026-07-04.md` for full detail.

---

## [6aaa354] — 2026-07-03 — feat(sprint10): Paramètres Système Élargis (M10)

### Added
- `parametres` table gains 6 rows (seeded idempotently, see below):
  `otp_expiration_minutes`, `lockout_max_tentatives`,
  `lockout_duree_minutes`, `backup_retention_locale_jours`,
  `backup_retention_nas_jours`, `deepl_fallback_actif`
- `packages/server/src/start/services/parameters-seed.service.ts` —
  `seedParametresDefaut()`, `onConflictDoNothing` on `parametres.cle`,
  called once from `index.ts` at server startup
- `packages/client/src/pages/AuditPage.tsx` (386 lines) — Journal d'audit
  consultation UI (filters Module/Action/Date, paginated table, JSON
  detail modal), replaces the `/audit` `ComingSoon` placeholder
- `packages/server/src/utils/pdf.ts` — generic Puppeteer HTML→PDF
  generator (first use of `puppeteer` in the project; reusable for future
  Accords/Courriers/Missions exports)
- `packages/server/src/modules/audit/services/audit.export.service.ts` —
  `genererPDFAudit()` / `genererExcelAudit()` / `resumerFiltres()` (first
  use of `exceljs`)
- `audit.controller.ts` — `exporterPDF`/`exporterExcel` handlers, audited
  as `AUDIT_EXPORT_PDF`/`AUDIT_EXPORT_EXCEL`; `audit.route.ts` —
  `GET /export/pdf`, `GET /export/excel`
- `audit.service.ts` — `listerAuditLogsExport()` (unpaginated, capped at
  10,000 rows, `tronque` flag on overflow), shared `construireConditions()`
- `packages/client/src/lib/audit.api.ts` — `getUrlExportPDF()` /
  `getUrlExportExcel()` (return URL strings for direct-navigation download)
- `packages/translate-service/.env.example`, `pyrightconfig.json` — env
  var reference + Pylance venv resolution for the microservice

### Changed
- `otp.ts` — `otpExpiresAt()` now takes `minutes` as a parameter instead of
  reading `OTP_EXPIRY_MINUTES` env var
- `auth.constants.ts` — `MAX_LOGIN_ATTEMPTS`/`BLOCAGE_MINUTES` removed;
  `auth.helpers.ts`'s `handleEchecConnexion` resolves both from
  `parametres` via `getValeurEntier`
- `backup.ts` — `LOCAL_RETENTION_DAYS`/`NAS_RETENTION_MONTHS` constants
  removed, both cron jobs now resolve retention from `parametres` (NAS
  retention now expressed in days, not months)
- `utils/traduction.ts` — `traduireSegment`/`traduireTexte` resolve
  `deepl_fallback_actif` per-request via `getValeurBooleen` and pass
  `deepl_actif` to translate-service; `verifierLibreTranslate()` now also
  returns `deeplConfigure`; batch-translate timeout raised 2min → 4min40
- `packages/translate-service/main.py` — `load_dotenv()` added,
  `resoudre_deepl_actif()` resolves the per-request toggle (falls back to
  `DEEPL_ENABLED` env var if omitted); `requirements.txt` gains
  `python-dotenv`; venv was missing flask/waitress/langdetect/requests
  entirely — installed
- `AdminParametresPage.tsx` — reorganized into a per-module grid,
  human-readable labels via `PARAMETRE_LABELS`, correct unit per key
- `packages/server/.env.example` — removed `MAX_LOGIN_ATTEMPTS` /
  `OTP_EXPIRY_MINUTES` (now DB-backed)
- `index.css` — hex colors lowercased, quote style normalized (no visual
  change)

### Deferred
- Taille max upload / formats acceptés configurables — current 50 Mo
  hardcoded limit judged sufficient; would need a middleware factory

See `sessions/2026-07-03.md` Sprint 10 section for full detail.

---

## [47ef8b8] — 2026-07-03 — feat(sprint9): Portail Documentaire Externe (M8-bis)

### Added
- `packages/server/src/modules/portal/` — new module: `portal.service.ts`
  (list/get exposed documents, generate+email download token, redeem token,
  admin visibility toggle, download stats), `portal.controller.ts`,
  `portal.route.ts`. Public routes (browse, consult, request token,
  download) require no auth by design; `PATCH .../visibilite` requires
  admin role.
- `documents.visibilitePortail` (bool, default false),
  `documents.portailTokenDureeJours` (int, nullable) columns
- New `portailTokens` table (token UUID, email, expiresAt, utiliseLe,
  ipUtilisateur)
- `packages/client/src/pages/PortalPage.tsx` (489 lines) — public portal UI,
  routed at `/portal`
- `packages/client/src/lib/portal.api.ts` — client API wrapper

### Changed
- `DocumentsPage.tsx` — "Portail Externe" column + expose/retire dialog
  (token duration selector)
- `documents.types.ts` / `documents.helpers.ts` — `DocumentView` carries
  the two new portal fields
- `Layout.tsx` — new nav item (`/portal`, all roles)
- `App.tsx` — new `/portal` route
- `index.ts` — mounted `/api/portal`; dropped stray `.js` import extensions
- `i18n/index.ts` — `nav.portail` key + drive-by formatting pass
- `docs/TASKS.md` — Sprint 9 detailed

### ⚠️ Known issue
`DocumentsPage.tsx`'s "Exposé" link uses `href="/portail"` (French) but the
actual route is `/portal` (English, matches server mount) — will 404,
unfixed as of this commit. See `sessions/2026-07-03.md`.

---

## [47ffd94] — 2026-07-02 — docs(tasks): plan Sprint 11 — Module Analytics & Rapports (M11)

### Added — planning only, no code
- `docs/TASKS.md` — new Sprint 11 section: `analytics.service.ts`/`.controller.ts`/`.route.ts` scoped (GET /api/analytics/{module}, /global), per-module analytics breakdown for M1/M4/M3/M6/M5/M8/M7, client `AnalyticsPage.tsx` + `analytics.api.ts` + period selector + CSV/Excel export, and a `rapports.service.ts` layer on top (PDF/Excel generation, monthly cron, on-demand, ANAC-branded template, history)
- Positions M11 as strategic/trend reporting, explicitly distinct from the M9 dashboard's day-to-day action focus
- Supersedes the Sprint 5 standalone "rapport mensuel" backlog item — that work now belongs inside Sprint 11's `rapports.service.ts`

---

## [7a1de70] — 2026-07-02 — feat(sprint8): Accords expirés dashboard block + HistoriqueNotifications component

### Added
- `packages/client/src/pages/HistoriqueNotifications.tsx` — reusable passive notification-history component, wired onto `AccordDetail`, `CourrierDetail`, and per-recommandation on `MissionDetail`
- Dashboard "Accords expirés — action requise" block — lists accords with `statut=expire`, sorted by days-since-expiration, links to `/accords/:id`
- `packages/server/src/modules/dasboard/services/dashboard.helpers.ts` — `getAccordsExpirant(maintenant)` (nonTraites count + top-5 list)
- `packages/server/src/modules/dasboard/services/dashboard.types.ts` — `DashboardData.accordsExpires`, `kpi.accordsActifs.expiresNonTraites`

### Changed
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — "Notifier tous" bulk-notify button (sequential send to every partner with an email, reports envoyés/ignorés), `HistoriqueNotifications` block
- `packages/client/src/pages/DashboardPage.tsx` — `accordsActifs` KPI card escalates its `sousLigne` message when `expiresNonTraites > 0`
- `packages/server/src/modules/dasboard/services/dashboard.service.ts` — wires `getAccordsExpirant` into `getDashboardData`
- `docs/TASKS.md` — Sprint 8 (Centre de Notifications & Rappels CCIT) marked ✅ COMPLÉTÉ with full file-by-file changelog; new Sprint 10 backlog item (seed parametres via Drizzle migration)

This is Sprint 8's closing commit — see `sessions/2026-07-02.md` for the full picture (this commit completed the sprint that `ccbd3f2`/`f9b14f8` had been building toward).

---

## [dd2809d] — 2026-07-02 — refactor(server): split module services into types/helpers, centralize error handlers

### Changed — all 13 server modules (mechanical split, no behavior change)
- `packages/server/src/modules/{parametres,audit,notifications,users,auth,glossaire,demandes,partenaires,traduction,accords,courriers,dasboard,missions}/services/*.service.ts` — split into `.types.ts` + `.helpers.ts` + slim `.service.ts`
- `packages/server/src/utils/error.ts` — `createErrorHandler` factory gained optional `prefixHandlers` for dynamic error codes; now hosts handlers for glossaire, parametres, organisations, courriers, traduction, demandes, accords, missions (in addition to pre-existing auth/users/audit)
- 8 controllers (`glossaire`, `parametres`, `organisations`, `courriers`, `traduction`, `demandes`, `accords`, `missions`) — inline `errorMap` closures removed, now import shared handlers from `utils/error.ts`

### De-duplicated
- `audit.service.ts` — row→view mapping (2x) → `toAuditLogView`
- `courriers.service.ts` — seuils reloaded 5x → `chargerSeuils()`
- `dashboard.service.ts` — monolithic ~350-line `getDashboardData` → 13 named per-section query functions in `dashboard.helpers.ts`; day-diff calc (3x) → `getDaysDiff`
- `missions.service.ts` — RecommandationView shaping (3x) → `toRecommandationView`

### Notes
- `auth.service.ts`'s `logAudit` intentionally left at its original export path — imported repo-wide
- `packages/server/src/utils/{email.ts,error.ts,traduction.ts}` also had a prior-session split (email templates → `email.templates.ts`, traduction types → `traduction.types.ts`) folded into this commit
- Verified with `tsc --noEmit` after every file — zero new type errors vs. clean-main baseline

---

## [ccbd3f2] — 2026-06-30 — feat(sprint5): Jobs module (REGISTRE_JOBS) + major page + service refinements

### Added — Jobs module (M10 admin)
- `packages/server/src/jobs/registre.ts` — REGISTRE_JOBS registry: accords_expiration, accords_alertes, courriers_criticite, recommandations_retard, backup_bdd (super_admin), backup_nas (super_admin)
- `packages/server/src/modules/jobs/services/jobs.service.ts`
- `packages/server/src/modules/jobs/controllers/jobs.controller.ts`
- `packages/server/src/modules/jobs/routes/jobs.route.ts`
- `packages/client/src/lib/jobs.api.ts` — lister, executer (60s timeout)

### Changed — server
- `packages/server/src/index.ts` — /api/jobs mounted
- `packages/server/src/jobs/alertes.ts` — mettreAJourAccordsExpires + envoyerAlertesAccords exported for manual trigger
- `packages/server/src/jobs/backup.ts` — declencherSauvegardeManuelle + effectuerSauvegarde + BACKUP_NAS_DIR exported
- `packages/server/src/db/schema.ts` — additions
- `packages/server/src/modules/accords/services/accords.service.ts` — refinements
- `packages/server/src/modules/courriers/services/courriers.service.ts` — major additions
- `packages/server/src/modules/missions/services/missions.service.ts` — major additions
- `packages/server/src/modules/missions/controllers/missions.controller.ts` — additions
- `packages/server/src/modules/dasboard/services/dashboard.service.ts` — major enhancements

### Changed — client
- `packages/client/src/lib/api.ts` — jobsApi barrel export
- `packages/client/src/lib/missions.api.ts` — minor update
- `packages/client/src/pages/AdminParametresPage.tsx` — Jobs panel added (trigger + live result)
- `packages/client/src/pages/DashboardPage.tsx` — major enhancements
- `packages/client/src/pages/AccordsPage.tsx` — enhancements
- `packages/client/src/pages/CourriersPage.tsx` — enhancements
- `packages/client/src/pages/PartenairesPage.tsx` — enhancements
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — enhanced recommendations
- `packages/client/src/pages/missions/components/MissionFormPage.tsx` — enhancements
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — refinements
- `docs/TASKS.md` — Sprint 5 progress updated

---

## [f9b14f8] — 2026-06-30 — feat(sprint5): Dashboard M9 + AdminParametresPage + Notifications + ModalRelance + refinements

### Added — Sprint 5 Client
- `packages/client/src/pages/DashboardPage.tsx` — 8 KPI blocs, 3 Chart.js charts (bar/doughnut/h-bar), alertes critiques panel, recommandations panel, activité récente feed
- `packages/client/src/lib/dashboard.api.ts` — GET /dashboard client
- `packages/client/src/pages/AdminParametresPage.tsx` — settings CRUD grouped by module, change history panel
- `packages/client/src/lib/parametres.api.ts` — lister, getByModule, mettreAJour, getHistorique
- `packages/client/src/lib/notifications.api.ts` — envoyer, historiqueEntite, recentes
- `packages/client/src/components/ModalRelance.tsx` — reusable relance email modal

### Added — Sprint 5 Server
- `packages/server/src/modules/dasboard/` — service + controller + route (note: typo in folder "dasboard")
- `packages/server/src/modules/parametres/` — service + controller + route
- `packages/server/src/modules/notifications/` — service + controller + route

### Changed
- `packages/client/src/App.tsx` — /dashboard → DashboardPage, /admin/* → AdminParametresPage
- `packages/client/src/lib/api.ts` — dashboardApi, parametresApi, notificationsApi barrel exports
- `packages/client/package.json` — chart.js ^4.5.1 added
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — enhanced detail view
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — relance workflow with ModalRelance
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — enhanced recommendations section
- `packages/server/src/index.ts` — /api/dashboard, /api/parametres, /api/notifications mounted
- `packages/server/src/db/schema.ts` — parametres + notifications tables added
- `packages/server/src/utils/email.ts` — sendRelanceEmail + sendNotificationEmail added
- `packages/server/src/jobs/alertes.ts` — notifications integration
- `packages/server/src/modules/accords/services/accords.service.ts` — dashboard aggregation queries
- `packages/server/src/modules/courriers/services/courriers.service.ts` — getSansReponse refinements
- `packages/server/src/modules/missions/services/missions.service.ts` — getRecommandationsEnAttente additions
- `docs/TASKS.md` — Sprint 5 progress updated

---

## [9e67bee] — 2026-06-29 — feat(sprint4): M5 Demandes server+client + TraductionsPage + TraductionEditeur + DemandesPage

### Added — Sprint 4 Client (Traductions + Demandes)
- `packages/client/src/pages/TraductionsPage.tsx` — list with statut/direction filters, lancer traduction dialog, moteur status badge
- `packages/client/src/pages/traductions/components/TraductionEditeur.tsx` — côte-à-côte éditeur (texteOriginal/texteIA/texteFinal), approve/archive workflow, suggestions glossaire panel
- `packages/client/src/pages/DemandesPage.tsx` — kanban inbox: Soumise→En cours→En relecture→Validée→Archivée, prendreEnCharge, priorité badge
- `packages/client/src/lib/demandes.api.ts` — lister, getById, creer, prendreEnCharge, rappeler, validerPriorite, soumettre, archiver

### Added — Sprint 4 Server (M5 Demandes)
- `packages/server/src/modules/demandes/services/demandes.service.ts` — CRUD + optimistic lock (prendreEnCharge/rappeler), priorité, statuts pipeline
- `packages/server/src/modules/demandes/controllers/demandes.controller.ts`
- `packages/server/src/modules/demandes/routes/demandes.route.ts`

### Changed
- `packages/client/src/App.tsx` — /traductions + /traductions/:id + /demandes routes wired (ComingSoon replaced)
- `packages/client/src/lib/api.ts` — demandesApi added to barrel exports
- `packages/client/src/lib/traductions.api.ts` — refinements
- `packages/server/src/index.ts` — /api/demandes mounted; cleaned up commented-out route stubs
- `packages/server/src/modules/document/` — controller/service/types/route/errors refinements
- `packages/server/src/modules/traduction/` — controller/service/route refinements
- `packages/server/src/utils/traduction.ts` — refinements
- `packages/server/src/db/schema.ts` — minor additions
- `docs/TASKS.md` — Sprint 4 complete, Sprint 5 items

---

## [f292f88] — 2026-06-29 — feat(sprint3+sprint4): Missions client done + M6 Traduction + M7 Glossaire + translate-service

### Added — Sprint 3 Client (Missions complete)
- `packages/client/src/pages/MissionsPage.tsx` — two-column inbox layout, filters, mission list + detail panel
- `packages/client/src/pages/missions/components/MissionDetails.tsx` — full detail: participants, dates, rapport link, recommandations
- `packages/client/src/pages/missions/components/MissionFormPage.tsx` — création/édition with participants + rapport link

### Added — Sprint 4 translate-service
- `packages/translate-service/requirements.txt`
- `packages/translate-service/main.py` — /translate, /translate/batch, /detect, /health, DeepL fallback, text cleanup

### Added — Sprint 4 Server (M7 Glossaire + M6 Traduction)
- `packages/server/src/modules/glossaire/` — service + controller + route
- `packages/server/src/modules/traduction/` — service + controller + route
- `packages/server/src/utils/traduction.ts` — traduireSegment, traduireTexte batch, detecterLangue, verifierLibreTranslate

### Added — Sprint 4 Client (Glossaire)
- `packages/client/src/lib/glossaire.api.ts` — lister, getById, suggestions, creer, mettreAJour
- `packages/client/src/lib/traductions.api.ts` — lister, getById, moteurStatus, lancer, correction, approuver, archiver, suggestions
- `packages/client/src/pages/GlossairePage.tsx` — CRUD termes, suggestions, pagination

### Changed
- `packages/server/src/index.ts` — mounted /api/glossaire + /api/traductions
- `packages/client/src/App.tsx` — missions routes wired (4 routes) + /glossaire route
- `packages/client/src/lib/api.ts` — glossaireApi + traductionsApi added to barrel exports
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — em dash → hyphen in empty date + expiry alert
- `docs/TASKS.md` — Sprint 3 complete, Sprint 4 server items checked

---

## [1ec9cca] — 2026-06-29 — feat(sprint3): M1 Accords + M4 Courriers + M3 Missions server + client (partial)

### Added — Server
- `packages/server/src/modules/accords/` — CRUD service + controller + route (lister, creer, mettreAJour, renouveler, getAccordsExpirantDans)
- `packages/server/src/modules/courriers/` — CRUD service + controller + route (lister, creer, mettreAJour, getSansReponse, getFilCorrespondance)
- `packages/server/src/modules/missions/` — CRUD service + controller + route (lister, creer, mettreAJour, recommandations CRUD, getRecommandationsEnAttente)
- `packages/server/src/jobs/alertes.ts` — cron 08h00 daily, 30/60/90-day expiry alerts for accords, email admins

### Added — Client
- `packages/client/src/lib/accords.api.ts` — accords API client
- `packages/client/src/lib/courriers.api.ts` — courriers API client
- `packages/client/src/lib/missions.api.ts` — missions API client
- `packages/client/src/pages/AccordsPage.tsx` — two-column inbox layout, filters, expiry badges
- `packages/client/src/pages/accords/components/AccordDetail.tsx` — read-only detail view
- `packages/client/src/pages/accords/components/AccordFormPage.tsx` — create/edit with doc upload (Option C)
- `packages/client/src/pages/CourriersPage.tsx` — inbox layout, direction/status filters, urgency flags
- `packages/client/src/pages/courriers/components/CourrierDetail.tsx` — full detail + reply thread
- `packages/client/src/pages/courriers/components/CourrierFormPage.tsx` — create/edit/reply, doc + accord links

### Changed
- `packages/server/src/index.ts` — mounted /api/accords, /api/courriers, /api/missions; added morgan logging; demarrerJobsAlertes() at startup
- `packages/server/src/db/schema.ts` — added `document_id` column to `courriers` table
- `packages/client/src/App.tsx` — wired accords and courriers routes (4 each)
- `packages/client/src/lib/api.ts` — accords/courriers/missions added to barrel exports
- `docs/TASKS.md` — Sprint 3 server complete, client Accords+Courriers complete

---

## [9249c49] — 2026-06-28 — feat(client): UI/UX hardening — shadcn Dialog/Select, RHF modals, Lucide icons

### Added
- `packages/client/src/components/ui/dialog.tsx` — shadcn Dialog on `@radix-ui/react-dialog`; animated overlay + content; Header/Body/Footer/Title/Description sub-parts
- `packages/client/src/components/ui/select.tsx` — shadcn Select on `@radix-ui/react-select`; matches Input height/border; Check indicator
- `packages/client/src/pages/BootstrapPage.tsx` — full redesign matching LoginPage (RHF + zod, framer-motion, `useTranslation`, required badge, success screen)
- `packages/client/src/pages/DocumentsPage.tsx` — shadcn Select filters + Dialog+RHF OCR modal; Lucide icons throughout
- `packages/client/src/pages/PartenairesPage.tsx` — shadcn Dialog modals for org/contact forms; RHF + zod; shadcn Select/Input/Label
- `packages/client/src/lib/documents.api.ts` — client API module for documents
- `packages/client/src/lib/organisations.api.ts` — client API module for organisations
- `packages/server/src/modules/partenaires/` — organisations CRUD (service + controller + route)
- `packages/server/src/start/` — bootstrap routes (service + controller + route)

### Changed
- `packages/client/src/components/layouts/Layout.tsx` — Lucide nav icons, `motion.aside` sidebar collapse, shadcn Button logout/language, avatar initials `rounded-lg`
- `packages/client/src/pages/login/components/FormField.tsx` — `required?: boolean` prop shows red badge via `t('common.required')`
- `packages/client/src/i18n/index.ts` — added `bootstrap.*` namespace + `common.required` (FR + EN)
- `packages/client/src/App.tsx` — DocumentsPage + PartenairesPage routes wired
- `packages/client/package.json` — added `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-scroll-area`
- `packages/server/src/index.ts` — partenaires + bootstrap routes mounted

---

## [41d3cde] — 2026-06-28 — chore(cache): update manifest lastCommit to 14dd4da

### Changed
- `exploration-cache/manifest.json` — lastCommit pointer updated

---

## [14dd4da] — 2026-06-28 — feat(server): documents module + @/ path alias

### Added
- `packages/ocr-service/main.py` — Python/Flask OCR microservice, port 5001
- `packages/ocr-service/requirements.txt`
- `packages/server/src/utils/ocr.ts` — TypeScript HTTP client (`extraireTexte`, `verifierServiceOCR`)
- `packages/server/src/utils/hash.ts` — `calculerMD5(buffer)`
- `packages/server/src/middleware/upload.ts` — multer memoryStorage, 50MB, MIME filter, `handleMulterError`
- `packages/server/src/modules/document/services/documents.types.ts` — interfaces + `DocumentCategorie`
- `packages/server/src/modules/document/services/documents.constants.ts` — storage config + keyword classifier data
- `packages/server/src/modules/document/services/documents.helpers.ts` — pure utility functions
- `packages/server/src/modules/document/services/documents.service.ts` — service layer
- `packages/server/src/modules/document/controllers/documents.errors.ts` — `handleDocumentsError`
- `packages/server/src/modules/document/controllers/documents.controller.ts` — all route handlers
- `packages/server/src/modules/document/routes/documents.route.ts` — Express router, wired

### Changed
- `packages/server/src/index.ts` — OCR health check at startup, documents route mounted
- `packages/server/package.json` — added `axios`, `form-data`, `tsc-alias`; build: `tsc && tsc-alias`
- `packages/server/tsconfig.json` — added `baseUrl: "./src"`, `@/*` path alias
- 15 server source files — all `../../`/`../../../` imports migrated to `@/` alias
- `docs/TASKS.md` — marked OCR test ✅, LibreTranslate test ✅

---

## [d51eee7] — 2026-06-27 — feat(client): login page redesign with shadcn components & framer-motion

### Added
- `packages/client/src/lib/axios.ts` — Axios instance + 401 interceptor with refresh queue
- `packages/client/src/lib/auth.api.ts` — auth domain API functions
- `packages/client/src/lib/users.api.ts` — users domain API functions
- `packages/client/src/lib/audit.api.ts` — audit domain API functions
- `packages/client/src/lib/utils.ts` — `cn()` helper (clsx wrapper)
- `packages/client/src/components/ui/button.tsx` — CVA Button (5 variants, 4 sizes)
- `packages/client/src/components/ui/input.tsx` — forwardRef Input
- `packages/client/src/components/ui/label.tsx` — forwardRef Label
- `packages/client/src/pages/login/schemas.ts` — Zod discriminatedUnion login schema
- `packages/client/src/pages/login/animations.ts` — framer-motion Variants + Transition constants
- `packages/client/src/pages/login/components/FormField.tsx`
- `packages/client/src/pages/login/components/PasswordStrength.tsx`
- `packages/client/src/pages/login/components/EyeToggle.tsx`
- `packages/client/src/pages/login/components/ServerError.tsx`
- `packages/client/src/pages/login/components/StepTab.tsx`
- `packages/client/src/pages/login/components/ModeTab.tsx`
- `packages/client/src/pages/login/components/GridPattern.tsx`
- `packages/client/src/pages/login/components/index.ts`

### Changed
- `packages/client/src/lib/api.ts` — converted to barrel re-export
- `packages/client/src/pages/LoginPage.tsx` — full redesign with 2-step animated flow
- `packages/client/vite.config.ts` — added `@/` path alias
- `packages/client/tsconfig.json` — added `baseUrl`, `paths`, `ignoreDeprecations`

---

## [48e85d1] — 2026-06-26 — feat(audit): audit and backup implementation

### Added
- `packages/server/src/modules/audit/` — service, controller, routes (read-only audit log)
- `packages/server/src/jobs/backup.ts` — daily + weekly backup cron with retention

---

## [8eb2eed] — 2026-06-26 — fix(drizzle-orm): fix version conflict

### Fixed
- Resolved drizzle-orm version conflict between root and server package

---

## [c8d14f8] — 2026-06-26 — feat(users): users implementation

### Added
- `packages/server/src/modules/users/` — service, controller, routes (full CRUD + activation + OTP reset)

---

## [0049250] — 2026-06-26 — feat(tasks): update task list

### Changed
- `docs/TASKS.md` — updated task statuses and Sprint 1 progress

---

## [f5a382a] — 2026-06-25 — feat(auth): auth & admin implementation

### Added
- `packages/server/src/utils/jwt.ts` — token signing/verification
- `packages/server/src/utils/otp.ts` — OTP generation, hashing, verification
- `packages/server/src/utils/email.ts` — Nodemailer email utilities
- `packages/server/src/utils/error.ts` — AppError class
- `packages/server/src/middleware/auth.ts` — authenticate middleware, cookie options
- `packages/server/src/middleware/requiredRole.ts` — role hierarchy middleware
- `packages/server/src/modules/auth/` — service, controller, routes
- `packages/server/src/db/schema.ts` — complete DB schema (all 10 modules)
- `packages/client/src/App.tsx` — AuthContext, ProtectedRoute, AdminRoute
- `packages/client/src/components/layouts/Layout.tsx` — sidebar + header
- `packages/client/src/i18n/` — i18next FR/EN configuration
- `packages/client/src/index.css` — Tailwind v4 @theme ANAC tokens

---

## Sprint History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-06-30 | ccbd3f2 | Sprint 5 Wave 2 — Jobs module (REGISTRE_JOBS) + major page + service refinements |
| 2026-06-30 | f9b14f8 | Sprint 5 Wave 1 — Dashboard M9 + AdminParametresPage + Notifications + ModalRelance |
| 2026-06-29 | 9e67bee | Sprint 4 — M5 Demandes server+client + TraductionsPage + TraductionEditeur + DemandesPage |
| 2026-06-29 | f292f88 | Sprint 3 Missions client + Sprint 4 M6+M7 server + translate-service + GlossairePage |
| 2026-06-29 | 1ec9cca | Sprint 3 — M1 Accords + M4 Courriers + M3 Missions server; client Accords+Courriers |
| 2026-06-28 | 9249c49 | UI/UX hardening — Dialog/Select, RHF modals, partenaires + bootstrap modules |
| 2026-06-28 | 41d3cde | Cache manifest update |
| 2026-06-28 | 14dd4da | Documents server module + @/ path alias |
| 2026-06-28 | 5d193f5 | OCR microservice |
| 2026-06-28 | 43a858d | exploration-cache initialized |
| 2026-06-27 | d51eee7 | Login page redesign + client lib split |
| 2026-06-26 | 48e85d1 | Audit + backup |
| 2026-06-26 | 8eb2eed | Drizzle version fix |
| 2026-06-26 | c8d14f8 | Users module |
| 2026-06-26 | 0049250 | Task list update |
| 2026-06-25 | f5a382a | Auth + full stack foundation |
