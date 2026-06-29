# ⚡ Next Actions

Last updated: 2026-06-29

## 🔥 Immediate (start here next session)

1. **`pages/MissionsPage.tsx`** — inbox-style two-column layout (consistent with Accords + Courriers)
   - Left: mission list with filters (destination/pays/statut/dates)
   - Right: detail panel — participants, dates, rapport doc link, recommandations list
   - Badge: overdue recommandations flagged red

2. **`pages/MissionFormPage.tsx`** — creation/edit form
   - Fields: titre, description, destination, pays, dateDebut, dateFin
   - Participants: add/remove ANAC users (multi-select)
   - Rapport: link to existing document OR upload new (same Option C pattern as AccordFormPage)
   - Recommandations: inline CRUD (ajout + mise à jour statut)

3. **Wire missions routes in `App.tsx`**
   ```tsx
   <Route path="/missions" element={<MissionsPage />} />
   <Route path="/missions/:id" element={<MissionsPage />} />
   <Route path="/missions/new" element={<MissionFormPage />} />
   <Route path="/missions/:id/edit" element={<MissionFormPage />} />
   ```

## 📅 This Sprint — Remaining (Sprint 3)

4. **PDF/DOCX export** (optional for Sprint 3, could defer to Sprint 4)
   - Puppeteer PDF for accords and courriers
   - Mission report PDF template (ANAC colors + logo)

5. **Re-enable auth rate limiter** once dev is stable (currently commented out in `index.ts`)

## 📆 Sprint 4 — Next Sprint

6. **Module Traduction (M5)** — connect LibreTranslate client, translation request flow
7. **Module Glossaire (M7)** — import CCIT Excel (when received), CRUD terms
8. **Module Demandes (M6)** — translation request workflow, kanban statuses

## 🗓️ Backlog (See `tasks/backlog.md`)

9. Dashboard (M9) — Sprint 5
10. Tests & Recette — Sprint 6
11. Déploiement SERV-APPI — Sprint 7

## 📋 Definition of "Sprint 3 Done"

- [x] `GET/POST/PATCH /api/accords` working ✅
- [x] `GET/POST/PATCH /api/courriers` working ✅
- [x] `GET/POST/PATCH /api/missions` working ✅
- [x] `AccordsPage.tsx` renders accord list with create/edit + detail view ✅
- [x] `CourriersPage.tsx` renders courrier inbox with fil correspondance ✅
- [ ] `MissionsPage.tsx` renders mission list with participant detail
- [ ] `MissionFormPage.tsx` create/edit with participants + rapport
- [x] All client pages use shadcn Dialog + RHF + zod (consistent pattern) ✅
- [ ] Committed and pushed to `origin/main`
