# ⚡ Next Actions

Last updated: 2026-06-28

## 🔥 Immediate (start here next session)

1. **Scaffold `modules/accords/`** — standard CRUD
   ```
   packages/server/src/modules/accords/
   ├── controllers/accords.controller.ts
   ├── services/accords.service.ts
   └── routes/accords.route.ts
   ```
   - `lister()`, `getById()`, `creer()`, `mettreAJour()`, `archiver()`
   - Mount: `app.use('/api/accords', accordsRoutes)` in `index.ts`

2. **Scaffold `modules/courriers/`** — same pattern as above

3. **Scaffold `modules/missions/`** — same pattern, add `participants` sub-resource

## 📅 Today / This Sprint (Sprint 3)

4. **Wire all 3 routes** in `server/index.ts`
5. **`AccordsPage.tsx`** — list + create/edit modal (shadcn Dialog + RHF + zod)
6. **`CourriersPage.tsx`** — list + filters + create modal
7. **`MissionsPage.tsx`** — list + participants panel

## 📆 Next Sprint (Sprint 4)

8. **Module Traduction (M5)** — connect LibreTranslate client, build translation request flow
9. **Module Glossaire (M7)** — import CCIT Excel (when received), CRUD terms
10. **Module Demandes (M6)** — translation request workflow

## 🗓️ Backlog (See `tasks/backlog.md`)

11. Dashboard (M9) — Sprint 5
12. Tests & Recette — Sprint 6
13. Déploiement SERV-APPI — Sprint 7

## 📋 Definition of "Sprint 3 Done"

- [ ] `GET/POST/PATCH /api/accords` working
- [ ] `GET/POST/PATCH /api/courriers` working
- [ ] `GET/POST/PATCH /api/missions` working
- [ ] `AccordsPage.tsx` renders accord list with create/edit modal
- [ ] `CourriersPage.tsx` renders courrier list with filters
- [ ] `MissionsPage.tsx` renders mission list with participant detail
- [ ] All client pages use shadcn Dialog + RHF + zod (consistent with Sprint 2 pattern)
- [ ] Committed and pushed to `origin/main`
