# ⚡ SICOT - Quick Reference

> One-page overview. For deeper detail see `technical/cheat-sheet.md`.

## 🚀 Start Dev

```bash
npm run dev        # both server :3001 + client :5173
npm run db:studio  # Drizzle Studio (DB browser)
# Microservices (run separately):
cd packages/ocr-service && python main.py        # OCR :5001
cd packages/translate-service && python main.py  # Traduction :5002

# OR: everything containerized (see project/architecture.md § Deployment Infrastructure)
cp .env.example .env && docker compose up --build -d
```

## 📁 Where Is…

| Thing | Path |
|-------|------|
| ANAC color tokens | `packages/client/src/index.css` → `@theme {}` |
| Axios instance | `packages/client/src/lib/axios.ts` |
| Auth context hook | `import { useAuth } from '@/App'` |
| DB schema | `packages/server/src/db/schema.ts` |
| Server entry | `packages/server/src/index.ts` |
| Env vars | `packages/server/.env` (copy from `.env.example`) |

## 🎨 Key CSS Classes

```
bg-anac-navy    (primary brand #1B2A5E)
bg-anac-gray    (page background)
text-anac-muted (secondary text)
border-anac-border
bg-anac-danger  (errors #DC2626)
bg-anac-success (success #16A34A)
.card           (white panel, border, shadow, p-6)
.btn-primary    (navy button)
.badge-actif    (green badge)
.table-row      (striped table row)
```

## 🔒 Auth Roles

```
agent < traducteur < relecteur < admin < super_admin
```
Protected routes use `requireAdmin()` or `requireRole(['traducteur', 'admin'])` middleware.

## 📡 Key API Endpoints

```
POST /api/auth/login          OTP or password login
POST /api/auth/refresh         Auto-called by Axios interceptor on 401
GET  /api/auth/me              Returns current user (session check)
POST /api/auth/logout
GET  /api/users                Admin only
POST /api/users/:id/reinitialiser-otp   Reset OTP + email user
GET  /api/audit                Admin only, filter by module/action/date
GET  /api/health               200 ok
GET  /api/documents            List documents (filter: categorie, statut_ocr, langue)
POST /api/documents            Upload (multipart/form-data, field: 'file')
GET  /api/documents/doublon?hash=…      Pre-upload duplicate check
GET  /api/organisations        List organisations (filter: pays, type)
POST /api/organisations        Create organisation
PATCH /api/organisations/:id   Update organisation
POST /api/bootstrap            Create initial super_admin account
GET  /api/accords              List accords (filter: statut, partenaire, expirant)
POST /api/accords/:id/renouveler  Renew accord
GET  /api/courriers            List courriers (filter: direction, statut, sansReponse, enDepassement, dateDebut/dateFin)
GET  /api/courriers/aggregates Global KPI counts, independent of current filters
GET  /api/courriers/:id/fil    Thread (fil de correspondance)
POST /api/courriers/:id/documents            Attach a document (courrier_documents join table)
DELETE /api/courriers/:id/documents/:documentId  Detach a document
GET  /api/contacts             List contacts (filter: search, actif, organisationId)
GET  /api/missions             List missions + recommandations
GET  /api/missions/recommandations/en-attente  Pending recommandations
GET  /api/accords/:id/export/pdf    Individual PDF fiche (add ?apercu=1 for inline preview)
GET  /api/courriers/:id/export/pdf  Individual PDF fiche (add ?apercu=1 for inline preview)
GET  /api/missions/:id/export/pdf   Mission report PDF fiche (add ?apercu=1 for inline preview)
GET  /api/glossaire            List terms (filter: search, domaine, actif)
GET  /api/glossaire/suggestions?q=…  Glossaire suggestions for editor
POST /api/traductions          Launch translation (texteOriginal + direction)
GET  /api/traductions/moteur/status  LibreTranslate health check
PATCH /api/traductions/:id/correction  Save human correction
PATCH /api/traductions/:id/approuver  Approve translation
GET  /api/demandes             List demandes (filter: statut, priorite, demandeurId)
POST /api/demandes             Create demande (direction, priorite, documentId|texteLibre)
PATCH /api/demandes/:id/prendre-en-charge  Assign to current user (optimistic lock)
PATCH /api/demandes/:id/rappeler  Release assignment
PATCH /api/demandes/:id/soumettre  Submit for review (→ en_relecture)
PATCH /api/demandes/:id/valider   Validate demande (→ validee)
```

## 🚫 Rules

| ❌ Never | ✅ Instead |
|---------|----------|
| Run `npx shadcn-ui add` | Write component manually with CVA |
| Create `tailwind.config.js` | Edit `@theme {}` in `index.css` |
| Put `transition` inside `Variants` | Pass `transition={slideTx}` prop |
| Use `origin: '*'` with credentials | Use explicit `CORS_ORIGIN` env var |
| Import colors as raw hex | Use `bg-anac-navy` etc. |
| Remove `ignoreDeprecations` from client tsconfig | Leave it |
| `<SelectItem value="">` (Radix) | Use `value="__all__"` sentinel |
| Emoji as icons in UI | Lucide React icons only |

## 📊 Sprint Status

```
✅ Sprint 0 — Init
✅ Sprint 1 — Auth & Admin (M10) + Personnel-ANAC API
✅ Sprint 2 — Documents + Partenaires (M8 + M2)
✅ Sprint 3 — Accords + Courriers + Missions (M1+M4+M3)
✅ Sprint 4 — Traduction + Glossaire + Demandes (M5+M6+M7)
✅ Sprint 5 — Dashboard (M9)
✅ Sprint 8 — Notifications & Rappels CCIT
✅ Sprint 9 — Portail Documentaire Externe
✅ Sprint 10 — Paramètres Système Élargis
✅ Sprint 11 — Analytics & Rapports (M11)
🎨 UI Hardening Sprint (Jul 5-6) — shadcn Table/Tabs/feature-folder refactor
🎯 Sprint 12 (2026-08-24) — Deployment infra (Docker/CI-CD) + Missions (M3) + Courriers (M4) redesigns + individual PDF export
⏳ Sprint 6 — Tests & Recette (deferred)
🟡 Sprint 7 — Déploiement + Formation (VPS/Docker path ready, SERV-APPI install/formations still pending)
```

## 🔴 Active Blockers & Pending Fixes

- **Personnel ANAC API** — code integration COMPLETE (6e20415); production
  use still needs the server joined to ANAC's Tailscale network
- ~~**SERV-APPI access**~~ — SCRATCHED as a deployment target (security
  issue on that server, per project owner 2026-08-24). Docker/VPS is the
  only deployment path now; app already runs on a separate Ubuntu test
  server (see `project/architecture.md` § Deployment Infrastructure)
- **CCIT Glossaire Excel** — awaiting file from CCIT (M7 seed)
- **DeepL approval** — DG + RGPD decision pending (fallback toggle ready)
- **⚠️ tsc --noEmit** — broken client-wide (pre-existing: ignoreDeprecations vs TS 5.9.3)
- **⚠️ exceljs version** — downgraded 4.x→3.x (2026-07-04), needs restore + re-test
- **Pending Drizzle migration** — aggregates all schema changes from Sprints 9/10/11
- **Portal route bug** — `/portail` href → `/portal` in DocumentsPage.tsx
- **Missions Période filter** — deferred during the M3 redesign (à venir/en
  cours/30j/cette année/terminées needs more date-range logic than this
  pass covered). Courriers got its own Période filter during the M4
  redesign (2026-08-24) — the same could be ported to Missions — Notion
  Sprint 12, À faire
- **Shared SummaryCard component** — still copy-pasted 4× now (Accords,
  Partenaires, Missions, Courriers), not extracted to avoid touching
  modules outside each task's scope — Notion Sprint 12, À faire
- **PDF export — remaining Tier 2 fields** — courrier contact-level
  sender/recipient and multi-document attachment are now DONE
  (2026-08-24, Courriers M4 redesign) and already reflected in the PDF
  fiche. Still open: courrier body/"Contenu" text (no field exists),
  accord type/durée/renouvelable, mission organisateur/objectif/résumé
  d'activités, per-mission participant role, multi-level correspondence
  threads — Notion Sprint 12, À faire
- **No automated test suite** — CI is lint + build only
