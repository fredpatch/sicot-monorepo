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
