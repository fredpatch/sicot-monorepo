# ⚡ SICOT - Quick Reference

> One-page overview. For deeper detail see `technical/cheat-sheet.md`.

## 🚀 Start Dev

```bash
npm run dev        # both server :3001 + client :5173
npm run db:studio  # Drizzle Studio (DB browser)

# Microservices (LibreTranslate + translate-service + OCR) — always-on on the
# real server, but not started by `npm run dev` locally. Docker-based:
npm run services:up       # start all 3
npm run services:status   # check state
npm run services:logs     # tail logs
npm run services:down     # stop all 3

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
GET  /api/auth/me              Returns current user (session check) — now includes email/poste/service/direction/actif/createdAt/derniereConnexion (derived from audit log: CONNEXION or MOT_DE_PASSE_DEFINI)
POST /api/auth/logout
POST /api/auth/changer-mot-de-passe  Self-service password change (verifies current password) — distinct from /set-password (first login)
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
GET  /api/traductions/aggregates    Global KPI counts, independent of current filters — traducteur+ only
GET  /api/traductions          List (filter: statut, direction, vue=actives|supprimees, source=libre|document) — traducteur+ only
GET  /api/traductions/:id      Open to all authenticated roles, but an agent may only fetch the translation linked to their own demande (server-checked via estDemandeurDeTraduction, not just UI-hidden)
GET  /api/traductions/:id/export/pdf   Fiche PDF (ficheHTML template) — only once statut is approuvee/archivee, same access rule as GET /:id
GET  /api/traductions/:id/export/docx  Editable .docx of the final text — same gating as the PDF export
PATCH /api/traductions/:id/relancer  Retry engine on a manuelle_requise translation (never overwrites texteFinal)
GET  /api/traductions/:id/suggestions?texte=…&origine=source|traduction  Glossary suggestions — origine picks which panel's language to search
GET  /api/glossaire            List terms (filter: search, domaine, actif)
GET  /api/glossaire/aggregates Global counts (total/actifs/inactifs/domaines), independent of filters
GET  /api/glossaire/suggestions?q=…  Glossaire suggestions for editor (dead code path — client uses /traductions/:id/suggestions instead)
PATCH /api/glossaire/:id/reactiver  Reactivate a deactivated term
POST /api/glossaire/import     Bulk import (JSON {termeFr,termeEn,domaine?,contexte?}[]) — no client UI wired to it yet
POST /api/traductions          Launch translation (texteOriginal + direction)
GET  /api/traductions/moteur/status  LibreTranslate health check
PATCH /api/traductions/:id/correction  Save human correction
PATCH /api/traductions/:id/approuver  Approve translation
GET  /api/demandes             List demandes (filter: statut, priorite, direction, demandeurId, traducteurId, search) — an agent's demandeurId is now always server-forced to their own ID, client value ignored
GET  /api/demandes/aggregates  Global counts (now incl. urgentes/normales), or scoped via ?demandeurId= — same server-side override for agent role
GET  /api/glossaire, /aggregates, /suggestions   traducteur+ only (was open to all authenticated roles)
POST /api/demandes             Create demande (direction, priorite, documentId|texteLibre)
PATCH /api/demandes/:id/prendre-en-charge  Assign to current user (optimistic lock)
PATCH /api/demandes/:id/rappeler  Release assignment
PATCH /api/demandes/:id/priorite  Reviewer validates/overrides prioriteDemandee (no server status guard — flagged gap)
PATCH /api/demandes/:id/relecture  Submit for review (→ en_relecture)
PATCH /api/demandes/:id/valider   Validate demande (→ validee) — independent of the linked traduction's own status (flagged gap)
PATCH /api/demandes/:id/archiver  Archive (→ archivee)
GET  /api/missions/aggregates  Global counts, or scoped via ?participantId= (Mon espace) — now includes rapportsEnAttente (terminee + no rapportDocumentId)
POST /api/documents/upload     Open to any authenticated role (no gate) — client-side action gating (delete/OCR/catégorie/portail) lives in documents.permissions.ts, mirrors server's real requireRole gates
POST /api/documents/:id/nouvelle-version   Now traducteur+ (was ungated server-side — any authenticated role could version any document). New UI: "Verser version finale" row action, reuses this previously-unwired endpoint.
GET  /api/documents             ?finalesUniquement=1 excludes rows superseded by a newer version (referenced as another row's parentId); documents never versioned pass through unaffected. Download ("Télécharger" action) now actually wired client-side — was dead code before (getUrlTelechargement existed, no caller). ?categorie=traduction surfaces deposited translations, discoverable by any authenticated role.
POST /api/documents/:id/nouvelle-version   Now accepts an optional `categorie` field to override the inherited-from-parent default — used by the new "Déposer au dossier documentaire" action in the Traduction workshop to tag deposits `traduction`.
GET  /api/documents             Agent role only: implicitly scoped to visibiliteInterne=true OR uploadePar=self. traducteur+ unrestricted, as before.
GET  /api/documents/:id, /:id/telecharger   Same agent-only visibility check now enforced directly, not just on the list (verifierAccesDocument).
PATCH /api/documents/:id/visibilite-interne   traducteur+ only — toggles internal (not portal) visibility.
POST /api/documents/upload      Optional visibiliteInterne field, honored only for traducteur+ (agent value always ignored server-side).
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
🎯 Sprint 12 (2026-08-24 → 2026-08-26) — Deployment infra (Docker/CI-CD) + Missions (M3) + Courriers (M4) + Traductions (M6) + Glossaire (M7) + Demandes (M5) redesigns + individual PDF export + services:up scripts + Agent workspace (Mon espace/Mes demandes/Mes missions) + Profil page + self-service password
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
- **Shared SummaryCard component** — still copy-pasted 6× now (Accords,
  Partenaires, Missions, Courriers, Traductions, Glossaire), not extracted
  to avoid touching modules outside each task's scope — Notion Sprint 12,
  À faire
- **PDF export — remaining Tier 2 fields** — courrier contact-level
  sender/recipient and multi-document attachment are now DONE
  (2026-08-24, Courriers M4 redesign) and already reflected in the PDF
  fiche. Still open: courrier body/"Contenu" text (no field exists),
  accord type/durée/renouvelable, mission organisateur/objectif/résumé
  d'activités, per-mission participant role, multi-level correspondence
  threads — Notion Sprint 12, À faire
- **Glossaire — multiple import sources, each needing its own UI surface**
  — expanded recommendation (2026-08-24, explicit user request): the
  glossary should eventually accept several kinds of import (CSV/Excel
  structured, and possibly document-based extraction — see below), and
  each mechanism needs a dedicated UI (button/dialog), not just a silent
  backend endpoint. `POST /api/glossaire/import` (CSV/Excel) already
  exists server-side with no client UI yet, blocked on the CCIT seed file
  (see below). A document-based auto-extraction pipeline (raw ANAC PDFs →
  glossary) is a separate, bigger piece, not yet started — Notion Sprint
  12, À faire
- **No automated test suite** — CI is lint + build only
- **Demandes/Traductions workflows not synchronized** — `demande.valider`/
  `.archiver` never check the linked translation's status and vice versa;
  found during the M5 audit (2026-08-26), deliberately left unfixed (scope
  extension beyond what was asked) — Notion Sprint 12, À faire
- **Demande can be left orphaned/locked** — if `prendreEnCharge`'s
  auto-translation-launch fails after the lock is set, the demande stays
  `en_cours`/locked with no `traductionId` and no in-module recovery
  action. Found during the M5 audit (2026-08-26), not fixed — Notion
  Sprint 12, À faire
- **Document version chain not visually grouped** — the new "Verser version
  finale" action (re-uses the previously-unwired `POST /:id/nouvelle-
  version`) links a new upload to its parent via `parentId`, but the
  Documents registry still lists every version as its own independent row.
  Partially mitigated (2026-08-26) by the new `finalesUniquement` filter —
  toggling "Versions finales uniquement" hides superseded rows — but there's
  still no visual grouping/history view showing that two rows are the same
  document's lineage. Notion Sprint 12, À faire
- **No browser/interactive testing this whole sprint** — every module
  redesigned since 2026-08-24 (Missions through Demandes/Mon espace) was
  validated at the type/lint/build/live-DB layer only; this environment
  has no way to complete a real login session without mutating a real
  account's credentials (attempted once via Playwright, correctly blocked
  by the permission system). Worth an actual click-through pass before
  considering any of this sprint's UI production-ready
