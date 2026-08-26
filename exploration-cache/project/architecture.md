# 🏗️ SICOT - Architecture

## Monorepo Layout

```
sicot-monorepo/                     npm workspaces root
├── packages/
│   ├── client/     @sicot/client   React SPA (Vite)
│   ├── server/     @sicot/server   Express REST API
│   ├── shared/     @sicot/shared   Shared TS types (minimal, grows over sprints)
│   └── ocr-service/                Python microservice (Flask + Waitress) — NOT an npm package
│       ├── main.py                 Flask app, /extract and /health routes
│       └── requirements.txt        Python deps (pdfplumber, pytesseract, pdf2image, python-docx, ...)
├── docs/                           Project docs (PDF, DOCX, TASKS.md)
├── scripts/setup-db.sql            Initial DB setup
├── exploration-cache/              ← This knowledge base
└── tsconfig.base.json              Shared TS base (ES2022, NodeNext, strict)
```

## Client Stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | React | 18.3 |
| Build | Vite | 5.x |
| Language | TypeScript | 5.4, moduleResolution: Bundler |
| CSS | Tailwind CSS **v4** | @theme block, no tailwind.config.js |
| Routing | react-router-dom | v6 |
| Server state | TanStack Query | v5 |
| Forms | react-hook-form + zod | v7 + v3 |
| HTTP | Axios | v1.7, baseURL: /api, withCredentials: true |
| Animations | framer-motion | v12 |
| i18n | react-i18next | FR default, EN toggle |
| Icons | lucide-react | v1.21 |
| UI primitives | CVA (class-variance-authority) | Manually crafted — no shadcn CLI |
| Path alias | `@/` → `./src/` | vite.config.ts + tsconfig paths |

**Dev port**: 5173

### Client `tsconfig.json` — critical settings
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "ignoreDeprecations": "6.0",   ← intentional, do not remove
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Server Stack

| Concern | Library | Notes |
|---------|---------|-------|
| Framework | Express | v4 (v5 in root devDeps, irrelevant to server) |
| Language | TypeScript + tsx | tsx watch in dev |
| ORM | Drizzle ORM | v0.45 + drizzle-kit v0.31 |
| Database | PostgreSQL | pg v8 |
| Auth tokens | jsonwebtoken | httpOnly cookies, no localStorage |
| Passwords | bcryptjs | 10 rounds |
| Email | Nodemailer | OTP delivery, alerts |
| Cron | node-cron | Backup jobs |
| PDF gen | Puppeteer | Sprint 5 (not yet used) |
| Excel gen | ExcelJS | Sprint 5 (not yet used) |

**Dev port**: 3001

### Server environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | — | Access token signing |
| `JWT_REFRESH_SECRET` | — | Refresh token signing |
| `PORT` | 3001 | HTTP port |
| `NODE_ENV` | development | production enables secure cookies |
| `CORS_ORIGIN` | http://localhost:5173 | Must be exact (no wildcard with credentials) |
| `SMTP_HOST/PORT/USER/PASS` | — | Nodemailer for OTP emails |
| `UPLOAD_DIR` | /sicot/documents | Document storage path |
| `MAX_LOGIN_ATTEMPTS` | 5 | Lockout threshold |

## Data Flow

```
Browser (React SPA)
  │
  ├── Static assets ← Vite dev server :5173
  └── /api/* requests ─────────────────────► Express :3001
                                              │
                                              ├── middleware: helmet, cors, rate-limit
                                              ├── middleware: cookieParser → authenticate()
                                              ├── modules: auth / users / audit / (future)
                                              └── Drizzle ORM → PostgreSQL
```

## Auth Flow

```
1. Admin creates user → OTP generated → sent by email (Nodemailer)
2. User: matricule + OTP → POST /api/auth/login
3. Server: validates OTP → returns temp access token (role: 'premier_login', 5min)
4. Client: redirects to set-password step (etape: 'set-password')
5. User sets password → POST /api/auth/set-password
6. Server: hashes pw, flips premiere_connexion=false, issues full tokens in httpOnly cookies
   - sicot_access (15min)
   - sicot_refresh (7d)
7. Subsequent logins: matricule + password → POST /api/auth/login → tokens in cookies
8. Client Axios interceptor: on 401 → POST /api/auth/refresh → retry original request
9. On refresh failure: clear cookies → redirect /login
```

## Module Structure Pattern (Server)

Every future module follows:
```
packages/server/src/modules/<name>/
  controllers/<name>.controller.ts   — HTTP layer, input validation, calls service
  services/<name>.service.ts         — Business logic, DB queries via Drizzle
  routes/<name>.route.ts             — Express Router, auth/role middleware applied here
```
Then mounted in `src/index.ts` as `app.use('/api/<name>', ...routes)`.

## OCR Microservice (`packages/ocr-service/`)

A standalone Python/Flask service that handles all text extraction. Express calls it over HTTP — no Node OCR libraries needed.

| Concern | Detail |
|---------|--------|
| Language | Python 3 |
| Server | Flask + Waitress (production WSGI) |
| Port | 5001 (env: `OCR_PORT`) |
| Start | `python main.py` (inside `packages/ocr-service/`, venv activated) |

### Routes
- `POST /extract` — multipart file → `{ texte, langue, format, caracteres, succes }`
- `GET /health` — liveness check, returns Tesseract version

### Supported Formats & Extractors
| Extension | Library | Notes |
|-----------|---------|-------|
| `.pdf` | pdfplumber + pdf2image + Tesseract | Auto-detects native vs scanned per page |
| `.docx` | python-docx | Includes table cells |
| `.doc` | LibreOffice headless → docx → python-docx | Requires LibreOffice installed |
| `.txt` | Built-in decode | Tries utf-8, latin-1, cp1252 |
| `.xlsx` | openpyxl | All sheets |
| `.xls` | xlrd | All sheets |
| `.jpg/.jpeg/.png/.tiff` | Tesseract direct | `lang=fra+eng`, `--psm 3` |

### System dependencies (must be installed on SERV-APPI)
- Tesseract OCR 5.x — `fra+eng` language packs
- LibreOffice (headless) — for `.doc` conversion
- Poppler — for `pdf2image`

### Text cleanup (post-extraction)
- Removes spurious spaces around apostrophes: `"l ' annexe"` → `"l'annexe"` (identified in LibreTranslate tests)
- Collapses multiple spaces and blank lines

### TypeScript client
`packages/server/src/utils/ocr.ts` — wraps the HTTP calls:
- `extraireTexte({ buffer, nomFichier, mimeType })` → `OCRResult`
- `verifierServiceOCR()` → `boolean` (called at server startup)
- Error codes: `OCR_SERVICE_INDISPONIBLE`, `OCR_TIMEOUT`, `OCR_ERREUR`
- Timeout: 60 seconds (large PDFs)

### Environment variables
- `OCR_SERVICE_URL` — default: `http://localhost:5001`
- `OCR_PORT` — (Python side) default: `5001`
- `TESSERACT_CMD` — full path to tesseract.exe (Windows)
- `LIBREOFFICE_CMD` — full path to soffice.exe (Windows)

## Backup Jobs

File: `packages/server/src/jobs/backup.ts`
- **Daily** `'0 2 * * *'` → local disk, retain 30 days
- **Weekly** `'0 3 * * 0'` → NAS target, retain 12 months
- Started at server boot in `index.ts`

## Pending Server Modules (all schema exists, no routes yet)

`/api/documents` `/api/organisations` `/api/accords` `/api/courriers`
`/api/missions` `/api/traductions` `/api/demandes` `/api/glossaire` `/api/dashboard`

## Deployment Infrastructure (added 2026-08-24)

Docker Compose + GitHub Actions/GHCR, following the pattern documented in
`docs/deployment-documentation.md` (generic playbook) and
`docs/deployment/production-guide.md` (this project's runbook — real values,
exact commands). Full details there; summary:

```
docker-compose.yml            local dev (hot reload, all ports exposed)
docker-compose.staging.yml    full prod shape, local ports (:4001)
docker-compose.prod.yml       pulls prebuilt GHCR images, TLS, restart:unless-stopped
```

**7 containers in staging/prod**: `nginx` (only public one, 80/443) →
`client` + `api` internally; `api` → `postgres`, `ocr`, `translate`;
`translate` → `libretranslate` (self-hosted MT engine, `LT_LOAD_ONLY=fr,en`).
`ocr` and `translate` are the Dockerized `ocr-service`/`translate-service`
from above — same code, `main.py` now binds `0.0.0.0` (was `127.0.0.1`,
broken in Docker) and env-driven `TESSERACT_CMD`/`LIBREOFFICE_CMD` point at
Linux paths inside the container instead of the Windows dev defaults.

**CI/CD** is three separate GitHub Actions workflows (`.github/workflows/`):
`ci.yml` (every push/PR — lint + build), `docker-publish.yml` (push to
`main` — builds & pushes 4 images to GHCR: `sicot-{api,client,ocr,translate}`),
`deploy-prod.yml` (**manual `workflow_dispatch` only** — pushing to `main`
never auto-deploys to the VPS).

**Relationship to SERV-APPI**: the original plan (`quick-ref.md` blockers)
was LAN deployment on the Windows server `SERV-APPI`. As of 2026-08-24 the
project owner has scratched that plan entirely (security issue on that
server) — SERV-APPI will not host the application. This Docker/VPS infra
is now the only deployment path; the app already runs on a separate
Ubuntu test server.

**Known infra gap**: no automated test suite exists yet; `ci.yml`'s
`verify` job type-checks and builds (`npm run build`) but doesn't run
tests — don't treat a green CI run as a correctness guarantee beyond
"it compiles."

## Missions Module (M3) Redesign (2026-08-24)

Full-detail entry is in `changelog.md`. What matters for future sessions:

- `packages/client/src/pages/missions/` now follows the same feature-folder
  convention as Partenaires (`.types.ts`/`.constants.ts`/`.utils.ts`/
  `.schemas.ts` + `components/`), finishing a migration Missions never got
  in earlier sprints. `/missions/:id` is a real route now (was rendered
  inside a split-pane before).
- `confirmationLogistique` is **derived, not manually set** — it comes from
  three checklist booleans (`logistiqueBilletReserve`/
  `logistiqueHebergementConfirme`/`logistiqueFinancementValide`, migration
  `0012_opposite_tyrannus.sql`). Don't add a way to set it directly again
  without also updating the derivation logic in
  `missions.service.ts`'s `mettreAJourMission`.
- New `packages/server/src/modules/contacts/` module — `GET /api/contacts`
  (agent-accessible, search across all organisations' contacts in one
  query). This is the correct way to look up a contact going forward;
  don't reintroduce the old organisations→contacts N+1 pattern elsewhere.
- Two role-gate changes, both intentionally narrow: `GET /api/users` is
  agent-accessible for **listing only** (mutations stay admin-only), and
  `POST /api/notifications/envoyer` accepts `agent` only for the
  `recommandation_rappel` notification type (checked inside the
  controller, not the route middleware — other types stay admin-gated).
- Quick-create pattern established here (participant via
  `CreerUtilisateurDialog`, contact via `FormulaireOrganisation`+
  `FormulaireContact`) — reuse existing admin forms/dialogs rather than
  building parallel creation logic when a picker's target entity might not
  exist yet. Worth applying the same pattern elsewhere if the same
  complaint comes up (e.g. other pickers across the app).

## Individual PDF Export (2026-08-24)

Closes the "Export PDF/DOCX individuel" backlog item — accords, courriers,
and mission reports can each be exported as a standalone PDF "fiche" (not
the existing dashboard/audit aggregate reports, which are unaffected).
Full detail in `changelog.md`. What matters for future sessions:

- `src/utils/ficheHTML.ts` is the shared template layer for this class of
  PDF — masthead (with the ANAC seal, embedded as a cached base64 data URI
  read from `packages/server/assets/anac-seal.png` via a
  `process.cwd()`-relative path), badges, section boxes, tables. Reuse
  these building blocks for any future "one-record fiche" PDF rather than
  hand-rolling HTML again.
- **The seal file must ship with the server image** — the prod Dockerfile
  now has an explicit `COPY --from=build .../assets ./assets` line. If
  that Dockerfile is ever restructured, keep that line or the seal will
  silently disappear from deployed PDFs (build still succeeds — this is a
  runtime file-not-found that just falls back to text-only masthead, no
  error surfaced).
- The "Historique" section on each fiche is real: `audit.service.ts`
  gained `listerHistoriqueEntite(module, entiteId)` (and an `entiteId`
  filter on `AuditFilters`) rather than fabricating a timeline. Any future
  module doing the same kind of per-record history panel should use this,
  not invent one.
- **Hard rule applied here, worth repeating for any future PDF/report
  work**: every mockup section without a real backing field was omitted,
  not filled with placeholder/invented content (courrier body text, the
  mockup's 5-stage courrier stepper, multi-document association, accord
  type/durée, mission objectif/résumé d'activités, per-mission participant
  role). These are tracked as Tier 2 backlog (real schema decisions) —
  don't quietly add fake data to make a future mockup match instead of
  asking whether the field should actually exist. **Update (2026-08-24,
  Courriers M4 redesign)**: courrier multi-document association and
  contact-level sender/recipient are no longer Tier 2 — they're real
  fields now (see § Courriers Module Redesign below). The rule still
  applies to what's left: courrier body text, accord type/durée, mission
  objectif/activités, per-mission participant role.
- Preview-before-download: `GET /:id/export/pdf` accepts `?apercu=1` to
  switch `Content-Disposition` from `attachment` to `inline`. The client's
  `PdfPreviewDialog` (`packages/client/src/components/`) is the shared
  component for this — reuse it for any future "preview then download"
  flow instead of building a new modal.

## Courriers Module (M4) Redesign (2026-08-24)

Full-detail entry is in `changelog.md`. Same process as the Missions
redesign, same normalized shape. What matters for future sessions:

- `packages/client/src/pages/courriers/` now follows the same
  feature-folder convention as Missions/Partenaires. `/courriers/:id` is a
  real route now (was rendered inside a split-pane before).
- **Contact-level sender/recipient is real now** —
  `courriers.expediteurContactId`/`destinataireContactId` (migration
  `0013_nappy_tombstone.sql`, nullable FK → `contacts.id`). It's a
  *refinement* of the existing organisation link, not a replacement — a
  courrier always has an organisation, and may additionally name a
  specific contact there. **The server enforces the contact always
  belongs to its organisation**, including on edit: changing
  `expediteurOrganisationId` without also explicitly setting or
  null-clearing `expediteurContactId` throws `CONTACT_EXPEDITEUR_INVALIDE`
  rather than silently leaving a stale contact. Any future edit path that
  touches the organisation field must preserve this check.
- **Multi-document attachment is real now** — new `courrier_documents`
  join table (same migration) is the source of truth for a courrier's
  documents; the old single `courriers.documentId` column is **kept but
  unused** by new code (a deliberate non-destructive choice — the
  migration backfills existing links into the join table, so nothing was
  lost, but the column itself was left rather than dropped). `POST/DELETE
  /api/courriers/:id/documents` are dedicated endpoints
  (`ajouterDocumentCourrier`/`retirerDocumentCourrier`), not part of the
  general `PATCH` — don't route document changes through
  `mettreAJourCourrier` again.
- `GET /api/contacts` gained an `organisationId` filter (used to scope the
  contact picker to whichever organisation is currently selected) — reuse
  this rather than filtering contacts client-side.
- Quick-create here is **two separate dialogs**, not one combined
  two-layer dialog like Missions' contact-sur-place picker:
  `QuickCreateOrganisationDialog` (org not found) and
  `QuickCreateContactDialog` (contact not found, org already known — takes
  an `organisation` prop instead of picking one itself). Missions' version
  combines both layers because that form has no separate organisation
  field; Courriers' does, so splitting them avoids a redundant org-picking
  step. Both still reuse the exact `FormulaireOrganisation`/
  `FormulaireContact` from Partenaires.
- Réponse tracking uses a **derived** health signal (`criticite`, computed
  server-side from configurable thresholds — see `chargerSeuils()`/
  `calculerCriticite()` in `courriers.helpers.ts`), not a stored priority
  field. The registry's `enDepassement` filter and the aggregates
  endpoint's `enDepassement` count share one threshold-computation helper
  (`calculerLimiteCritique()`) — keep them sharing it if the threshold
  logic ever changes, don't let them drift apart.

## App-Wide Router Migration & Confirm Dialog (2026-08-24)

Two decisions that reach beyond any single module, made while redoing
Traductions:

- **Data router**: `main.tsx`/`App.tsx` moved from `<BrowserRouter>` +
  `<Routes>` to `createBrowserRouter`/`<RouterProvider>` (route tree now
  lives in `router.tsx`). This was **required** to use `useBlocker`
  (Traductions workshop's unsaved-changes guard) — it doesn't work with a
  plain `BrowserRouter`. `App` is now the router's root element: it owns
  the auth-session check and the bootstrap redirect, and wraps every route
  via `<Outlet />`. `Layout` no longer receives `userRole`/`userNom`/
  `userPrenom` as props (it couldn't — the route tree is built once at
  module load, outside `App`'s local state) — it reads them from
  `useAuth()` itself now. Side effect: the bootstrap-needed redirect is
  now uniformly enforced for *every* route (previously only unmatched
  ones were caught by a conditional catch-all, so e.g. `/login` was
  reachable directly even mid-bootstrap) — a behavior tightening, not a
  regression, but worth knowing if bootstrap flow ever looks different
  than before.
- **`useConfirm()`** (`components/ui/confirm-dialog.tsx`): replaces every
  `window.confirm()` in the client (there were 6, across Accords/
  Courriers/Missions forms and headers, not just Traductions) with a
  Promise-returning hook backed by the existing `Dialog` primitive — no
  new Radix dependency. `confirmToast` (sonner-based) is a **separate,
  pre-existing, already-non-native pattern** and was deliberately left
  alone; only literal `window.confirm()` calls were migrated. Any new
  "are you sure?" flow anywhere in the app should use `useConfirm()`, not
  `window.confirm()`.

## Traductions Module (M6) Redesign (2026-08-24)

Full detail in `changelog.md`. Notable, non-obvious things for future
sessions:

- **`documentId` OCR-prefill bug, fixed**: `DocumentsPage`'s "Traduire"
  action always included `documentId` in the `sessionStorage` prefill
  payload, but `useTraductionPrefill` only ever read `texte` out of it,
  and `useLancerTraduction`'s `lancer()` had no `documentId` parameter at
  all — so every translation launched from a document silently lost its
  document link, even though the column, the API param, and the backend
  all supported it correctly. Fixed end-to-end
  (`useTraductionPrefill` → `TraductionsPage` → `useLancerTraduction` →
  `traductionsApi.lancer`). If a future change touches this prefill path,
  keep `documentId` threaded through all four hops.
- **Glossary suggestion bug, fixed**: `getSuggestionsGlossaire` searched
  the *source*-language glossary column purely based on the translation's
  overall `direction`, regardless of which panel the user actually
  selected text in. For the common `fr_en` case, selecting text in the
  **translation** panel (English) searched French terms — always zero
  matches. Fixed by having the client tell the server which panel
  triggered the selection (`?origine=source|traduction` on
  `GET /:id/suggestions`); the server derives the correct language to
  search from `origine` + the traduction's `direction`. Applying a
  suggestion still always writes the **target**-language term into
  `texteFinal`, regardless of origin — that part was already correct.
- **Manual-translation retry**: `PATCH /:id/relancer`, only valid when
  `statut === 'manuelle_requise'`. Re-runs the engine on the stored
  `texteOriginal` and updates `texteIA` + `statut` (→ `a_reviser` on
  success). **Never touches `texteFinal`** — a manual draft already typed
  is never overwritten. The client additionally disables the button while
  there are unsaved local edits (`modifie === true`), since a query
  invalidation after retry re-syncs the local editor state from the
  server and would otherwise silently clobber an in-progress edit that
  was never protected by that safety net.
- **Supprimées view**: `restaurer` (undo soft-delete) existed server-side
  since the module's original build but was completely unreachable from
  the UI (deleted records were filtered out of every list query with no
  way back in). Added `?vue=actives|supprimees` to `GET /api/traductions`
  and a matching tab in the registry — same shape as the `vue` param
  pattern, reusable if another soft-deletable module needs the same fix.
- **`en_relecture` still has no producer** — defined in the status enum,
  shown correctly wherever statuses are rendered, but nothing transitions
  a record into it. Per the original task brief, no fake "submit for
  review" button was added; this remains a real backend gap, not a UI
  oversight.
- Workshop (`/traductions/:id`) split from one 628-line file into
  `components/editor/` (`WorkshopHeader`, `SourceTextPanel`,
  `TranslationPanel`, `AssistancePanel` wrapping `EngineStatusBlock` +
  `GlossarySuggestions` + `SourceInfoBlock`). Responsive: 12-col grid
  desktop, stacked 2-col medium, tabs mobile (`components/ui/tabs.tsx`).
- **Microservices are Docker-managed, not part of `npm run dev`** —
  `libretranslate`/`translate-service`/`ocr-service` are meant to run
  continuously on the real server. `npm run services:up/down/restart/
  logs/status` wrap `docker compose` for exactly those 3 services. If the
  engine ever shows "hors ligne" locally, check `npm run services:status`
  before assuming a code regression — most likely they're just not
  running (no `.env` needed for these 3 specifically, only for DB/JWT-
  dependent services in the same compose file).

## Glossaire Module (M7) Redesign (2026-08-24)

Full detail in `changelog.md`. Notable, non-obvious things for future
sessions:

- **Two independent, disconnected glossary-suggestion code paths exist —
  only one is used**: `glossaireApi.suggestions` → `GET
  /glossaire/suggestions` → `suggererTermes()` is dead code, never called
  anywhere in the client. The Traductions editor actually uses
  `traductionsApi.suggestions` → `GET /traductions/:id/suggestions` →
  `getSuggestionsGlossaire()`, which lives entirely inside the
  **traduction** module, not glossaire. They have different matching
  logic (whole-phrase substring on FR+EN vs. per-word substring on one
  language only, capped to 5 words >3 chars). This redesign deliberately
  did not touch either — confirmed by diff review — since the brief
  scoped Glossaire only. Don't assume `glossaireApi.suggestions` is live
  if you go looking for where suggestions come from.
- **`glossaire.service.ts` had two duplicate-checking inconsistencies,
  one now fixed**: `importerTermes` (CSV import) always had a
  case-insensitive exact FR+EN match check; `creerTerme` (manual create)
  had none until this redesign — now reuses the same check, throwing
  `TERME_DEJA_EXISTANT` (409). The domain filter dropdown's distinct-value
  query still only scans **active** terms (`listerTermes`'s `domaines`
  return value) — a domain used solely by inactive terms silently
  disappears from the filter list even with "Inactifs" selected. Not
  fixed this session (out of the brief's scope), just flagging it exists.
- **Reactivate was absent at every layer before this redesign** — no
  service function, no controller handler, no route, no client call. The
  generic `mettreAJourTerme` technically accepts `actif: true` in its
  params and always did, but nothing called it that way. Added a
  purpose-built `reactiverTerme()` / `PATCH /:id/reactiver` instead of
  routing reactivation through the generic update, so it gets its own
  audit action (`TERME_REACTIVE`) and its own guard (throws
  `TERME_DEJA_ACTIF` if already active) rather than silently no-op'ing.
- **`glossaireHistorique` only ever stores old `termeFr`/`termeEn`** — a
  history row is created only when one of those two fields changes;
  editing `domaine`/`contexte` alone, or deactivating/reactivating,
  creates no history entry. The UI labels this "Historique" without
  implying it's a full audit trail — don't add domaine/contexte/actif
  history rendering without a matching schema change first.
- **Multilingual-ready adapter layer**: `glossary.adapters.ts` exposes
  `GlossaryConceptViewModel`/`TermVariant`/`getPrimaryVariant()`/
  `toApiPayload()`. The registry table, mobile cards, and workspace all
  consume `variants: TermVariant[]`, never `termeFr`/`termeEn` directly.
  Backend storage is unchanged (`termeFr`/`termeEn` columns, no schema
  migration) — this is a frontend normalization layer only, matching the
  brief's explicit "multilingual-ready, not multilingual migration"
  constraint. A future language (ES/PT/...) needs a new variant entry in
  `toGlossaryConceptViewModel()` plus real backend columns/params; the
  registry/workspace/table components would not need to change shape.
- **No Sheet/Drawer primitive exists in `components/ui/`** — the term
  workspace (`TermWorkspace.tsx`) is a `Dialog` with `Tabs` inside
  (Traductions/Contexte/Informations/Historique) rather than a true side
  sheet, since the brief explicitly said not to introduce a new UI
  library and no Sheet component exists yet in the codebase. If a real
  Sheet primitive gets built for another module later, this could be
  revisited.
- **Aggregates added, same pattern as Missions/Courriers/Traductions**:
  `GET /glossaire/aggregates` → `{total, actifs, inactifs, domaines}`,
  all real `db.$count`/distinct queries, never derived from the current
  page.

## Demandes Module (M5) Redesign + Agent Workspace + Profil (2026-08-26)

Full detail in `changelog.md`. Notable, non-obvious things for future
sessions:

- **Demandes and Traductions are two fully independent status machines
  with no cross-checks, despite the FK link between them** — found during
  the audit, deliberately not fixed. `approuverTraduction()` never touches
  `demandesTraduction`; `validerDemande()`/`archiverDemande()` never check
  the linked translation's status. A demande can show `validee`/`archivee`
  while its translation is still `a_reviser`, and vice versa. Don't assume
  these two statuses stay in sync anywhere in the UI.
- **A demande can end up permanently locked with no recovery path**:
  `prendreEnCharge()` poses the atomic lock (`verrou: true`) *before*
  attempting `lancerTraduction()`. If that call throws, the demande stays
  `en_cours`/locked with no `traductionId`, and there is no in-module
  action to release it — the only code path that ever clears `verrou` is
  in the *Traductions* module (`supprimerTraduction()`), which requires a
  `traductionId` to exist in the first place. Not fixed this session.
- **`validerPriorite()` has no server-side status guard at all** — it can
  be called (and will succeed) on an `archivee` demande via a direct API
  call, even though the UI hides the button in that case. Client-only
  enforcement, not a real guard.
- **Search added to `listerDemandes()` without a join** — resolves
  `demandeurNom`/`traducteurNom` (via a `users` query) and `documentNom`
  (via a `documents` query) to candidate ID arrays first, then `inArray`s
  them alongside a direct `ilike` on `texteLibre`. Chosen over restructuring
  the query into a join, since `toDemandeView()` already does per-row
  lookups the same way — keeps the search consistent with how the rest of
  the service already resolves those fields.
- **Role-based landing routing is new infrastructure, not a one-off**:
  `lib/landing.ts`'s `getLandingRoute(role)` is the only place that decides
  where a role lands — used by `LoginPage`'s two post-auth `navigate()`
  calls and the root/wildcard route (`<LandingRedirect />` in `App.tsx`).
  If a future role needs its own landing page, add the branch there, not
  in three separate call sites again.
- **`/dashboard` had a real route-guard gap, now closed**: it was already
  hidden from the sidebar for `agent` (via `NAV_ITEMS`'s `roles` filter),
  but the *route itself* had no guard — reachable by typing the URL
  directly. `AgentRoute`/`NonAgentRoute` (`App.tsx`) fix this in both
  directions: `/mon-espace` and `/mes-missions` now real-guard to `agent`
  only, `/dashboard` real-guards everyone else away from `agent`. This
  pattern (nav-hidden ≠ actually protected) is worth checking before
  assuming any other nav-gated route is actually inaccessible.
- **`QuickUploadDialog` (`components/documents/`) is intentionally
  ignorant of what happens after upload** — it uploads and calls
  `onUploaded(document)`, full stop. The caller decides whether that means
  "select this on a form" (`NewRequestDialog`) or "link this as a mission
  report" (`MyMissionsPanel`/`MesMissionsPage`, via a separate
  `missionsApi.mettreAJour({ rapportDocumentId })` call in the caller, not
  the dialog). Do not add mission-specific or demande-specific logic
  inside the dialog itself — extend via the `onUploaded` callback instead.
  Currently wired into 2 of the 4 existing manual-upload call sites
  (Demandes, Missions-via-Mon-espace); `AccordFormPage`'s and
  `CourrierDocumentPicker`'s inline uploads were deliberately left as-is
  (scope decision — "new only, extend later if it proves out").
- **Documents role gating exists on both layers now, but was added
  client-side only this session** — the server already correctly gated
  delete/OCR-correct/retraiter-OCR/catégorie to `traducteur+` and portal
  publish/unpublish to `admin+` (confirmed by reading the route file, no
  change needed there). `documents.permissions.ts` is a pure UI mirror of
  those existing gates — if the server gates ever change, this file will
  silently drift out of sync since nothing enforces they match beyond
  manual review.
- **`users.poste`/`.service`/`.direction`** (migration
  `0014_lyrical_stardust.sql`) are populated **only** when an account is
  created via the Personnel ANAC picker flow (`OngletPersonnelAnac` →
  `PrefillUtilisateur` → `CreateUserDialog`'s hidden submit merge →
  `POST /users`). A manually-created account has `null` in all three,
  by design — the profile page and anywhere else displaying them must
  treat absence as normal, not as a loading/error state.
- **Password complexity is enforced by one shared function now**:
  `validerForceMotDePasse()` (`utils/password.ts`) is called from
  `auth.service.ts`'s `setPassword()` and `changerMotDePasse()`, and from
  `bootstrap.service.ts`'s `initialiserSuperAdmin()`. Before this session,
  bootstrap had **zero** password validation server-side (not even a
  length check) despite its own client-side form showing the full
  strength checklist. Any future password-setting path should call this
  function rather than re-implementing the regex checks.
- **"Dernière connexion" is derived, not stored** — `/auth/me` queries the
  most recent `audit_logs` row where `action` is `CONNEXION` *or*
  `MOT_DE_PASSE_DEFINI` for that user. Excluding `OTP_VALIDE` is
  deliberate: it only grants a 5-minute temporary token, not a real
  session (see `login()`'s `Cas 1`). This was actually wrong on first pass
  (matched `CONNEXION` only) and caught live by the user testing their own
  account, which had only ever completed first-login (`OTP_VALIDE` →
  `MOT_DE_PASSE_DEFINI`, no subsequent normal login) — a real example of
  why "looks done" and "actually correct" aren't the same thing without a
  human clicking through it.

## "Mes demandes" agent screen (2026-08-26)

- **Promotion, not a new module** — Mon espace's `MyRequestsPanel` already
  existed as a compact 5-row preview; this added the full page it always
  linked out to (`/mes-demandes`, `AgentRoute`-guarded), mirroring how
  `/mes-missions` already stood next to `/missions`. No new registry
  component: `RequestsSummaryCards`/`RequestsRegistryTable`/
  `RequestWorkspace`/`NouvelleDemandeDialog` are the exact same instances
  used by the admin `/demandes` page, just given a `demandeurId` scope.
- **`DemandesAggregates` gained `urgentes`/`normales`** — a straight
  `$count` per `prioriteDemandee` value inside `getDemandesAggregates`,
  reusing the same `scope`/`withX` closure pattern already used for the
  status counts. Feeds a bar breakdown in the new right rail; no separate
  endpoint.
- **New `direction` filter on `listerDemandes`** — the mockup's filter row
  needed FR→EN/EN→FR filtering, which never existed even on the admin
  Demandes page. Added as a plain `eq()` condition, same shape as the
  other filters.
- **Own filter component, not an extension of `DemandesFiltres`** — the
  agent screen's mockup lays out Statut/Priorité/Direction flat (no
  "Plus de filtres" collapse, no "Assignation" concept since scope is
  already implicit via `demandeurId`). Rather than overload the admin
  page's `DemandesFiltres` props with an agent-only shape, a new
  `MyRequestsFilters` component was written — same `FilterChip`/reset
  pattern, different field set.
- **Doughnut chart reuses the Dashboard's existing chart.js setup** — the
  shared `ChartCanvas` component (`components/analytics/ChartCanvas.tsx`)
  already renders bar charts on `/dashboard`; a `type: 'doughnut'` config
  was the only new code needed. No new dependency, no new chart wrapper.

## Agent role-access hardening + translation export + document re-versioning (2026-08-26)

- **UI hiding is not authorization — this whole pass exists because that
  distinction had drifted.** Nav visibility (`Layout.tsx` `roles` arrays)
  and client route guards (`AgentRoute`/`AdminRoute`/new `RoleRoute` in
  `App.tsx`) only ever control what the UI *shows*; they say nothing about
  what the API *allows*. Before this pass, `GET /demandes`, `GET
  /glossaire`, and `GET /traductions/:id` had zero server-side role check
  — any authenticated agent hitting the API directly (not through the UI)
  could read every user's demandes, the full glossary, or any translation's
  content by ID. The client-side fix (route guards) closes the UI path; the
  server-side fix (forced `demandeurId` scoping, `requireRole('traducteur')`
  on reads, `estDemandeurDeTraduction()` ownership check) closes the actual
  authorization gap. Both are necessary — neither alone is sufficient.
- **`estDemandeurDeTraduction(traductionId, userId)`** (`demandes.service.ts`)
  — reverse lookup from `traductions.id` to `demandes_traduction.demandeurId`
  (a translation has no direct owner field; ownership is only expressible
  through the demande that requested it). Used by `traduction.controller.ts`
  to gate `GET /:id`, `/:id/export/pdf`, `/:id/export/docx` for the `agent`
  role specifically — `traducteur+` roles bypass this check entirely (their
  job requires seeing any translation).
- **Auditing one fix surfaced two more, unrelated bugs** — `/traductions`
  nav was `admin/super_admin` only, meaning `traducteur`/`relecteur` users
  had no menu path to their own core work page (only ever reachable by
  typing the URL, which nobody had reason to notice since nothing was
  gating it either way); and `POST /documents/:id/nouvelle-version` had no
  `requireRole` at all, found only because this pass was the first to wire
  a UI button to it. Both fixed alongside the main request rather than
  filed as separate backlog items — same root cause (nav-hides vs.
  route/API-guards drift), same fix shape.
- **Translation export gated on `statut`, not just on access** — `GET
  /traductions/:id/export/{pdf,docx}` additionally require `statut` to be
  `approuvee` or `archivee` (`TRADUCTION_NON_APPROUVEE` otherwise). The text
  can still change up to that point, so exporting earlier would produce a
  document that silently goes stale. The read-only `TraductionPreview`
  component mirrors this: download buttons only render once approved,
  otherwise a plain "le texte peut encore changer" note.
- **DOCX export is deliberately not the PDF's institutional template** —
  the PDF fiche reuses `ficheHTML.ts`/`genererPDFFiche()` (ANAC letterhead,
  seal, badges — same as accords/courriers/missions). The DOCX
  (`docx` npm package, first use in the repo) is plain paragraphs only —
  its purpose is a file the user can reopen and edit locally, not an
  official document, so it deliberately doesn't try to look like one.
- **Document re-versioning had a complete implementation with zero UI** —
  `nouvellVersionDocument()`/`POST /:id/nouvelle-version` already existed,
  fully working (links `parentId`, increments `version`), just never
  called from anywhere in the client. `VerserVersionAction` is the first
  caller. No new "archive" concept was introduced — the existing versioning
  primitive already covered the "put the reformatted final file back"
  scenario, it just needed a button. Known gap, not addressed here: the
  Documents registry still lists every version as an independent row —
  `parentId` isn't reflected in the UI as a grouped chain.

## Live feedback fixes + Documents download/versions-finales filter (2026-08-26)

- **`estDemandeurDeTraduction`/ownership design held up under real use** —
  no changes needed there; the day's feedback was entirely about UI gaps
  (missing buttons, overflow, layout), not the access-control work.
- **PDF/DOCX now share a layout, deliberately not by sharing code** — the
  DOCX generator (`docx` library primitives: `Table`/`TableRow`/`TableCell`
  for the masthead and info grid, `ImageRun` for the seal, `PageBreak`
  between sections) was rewritten to visually match `ficheHTML.ts`'s HTML
  output, but the two renderers don't share a common template — HTML/CSS
  and OOXML are different enough that a shared abstraction would have cost
  more than it saved for one document type. If a second DOCX export is
  ever needed, revisit whether a shared layout description is worth it.
- **Documents "Archives" discussion — the resolution, for future reference**
  — the user's original framing conflated "archived" (which in this schema
  means soft-deleted via `deletedAt`, i.e. hidden/restorable) with "this is
  the finished official version" (no existing field for that). Three
  options were weighed: (1) infer "final" from the version chain — a
  document is final iff no other row references it via `parentId`; (2) an
  explicit boolean/categorie flag set only when `nouvelle-version` runs;
  (3) a separate `/archives` route entirely. (2) was initially chosen, then
  dropped: it would only ever flag documents that went through
  `VerserVersionAction`, silently excluding the majority of documents
  (accord/courrier/mission attachments) that are final on upload and never
  get versioned — the exact failure mode flagged as a concern for (1)
  initially, but (1) actually handles it correctly (a never-versioned
  document trivially has no children, so it passes as "final"). Shipped:
  (1), as a filter on the existing Documents page, no schema change, no new
  route. `listerDocuments`'s `finalesUniquement` resolves it as a
  candidate-ID exclusion (`NOT IN (SELECT DISTINCT parentId WHERE parentId
  IS NOT NULL)`), matching the module's established candidate-ID-list
  pattern rather than a correlated subquery.
- **The Documents download button gap was more severe than the surface
  question ("should Documents be usable by all users") implied** — it
  wasn't a role-gating issue at all, downloading was simply never wired to
  any button for *any* role, admin included. `getUrlTelechargement()` was
  dead code. Found only because the "should agents be able to download"
  discussion prompted actually checking what already worked.
