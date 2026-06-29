# ⚡ SICOT – Quick Reference

> One-page overview. For deeper detail see `technical/cheat-sheet.md`.

## 🚀 Start Dev

```bash
npm run dev        # both server :3001 + client :5173
npm run db:studio  # Drizzle Studio (DB browser)
# Microservices (run separately):
cd packages/ocr-service && python main.py        # OCR :5001
cd packages/translate-service && python main.py  # Traduction :5002
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
GET  /api/courriers            List courriers (filter: direction, statut, sansReponse)
GET  /api/courriers/:id/fil    Thread (fil de correspondance)
GET  /api/missions             List missions + recommandations
GET  /api/missions/recommandations/en-attente  Pending recommandations
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
✅ Sprint 1 — Auth & Admin (M10)
✅ Sprint 2 — Documents + Partenaires (M8 + M2) + UI/UX hardening
✅ Sprint 3 — Accords + Courriers + Missions (M1+M4+M3)
✅ Sprint 4 — Traduction + Glossaire + Demandes (M5+M6+M7)
⏳ Sprint 5 — Dashboard (M9)  ← CURRENT
⏳ Sprint 6 — Tests & Recette
⏳ Sprint 7 — Déploiement + Formation
```

## 🔴 Active Blockers

- **API Personnel ANAC** — not received (blocks bootstrap admin flow)
- **SERV-APPI access** — IT dept pending
- **CCIT Glossaire Excel** — awaiting file from CCIT
- **DeepL approval** — DG + RGPD decision pending
