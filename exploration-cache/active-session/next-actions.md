# ⚡ Next Actions

Last updated: 2026-06-29

## 🔥 Immediate (start here next session)

1. **`pages/TraductionsPage.tsx`** — éditeur côte-à-côte
   - Left: list of traductions with filters (statut, direction, date)
   - Right: editor panel — original text + translated text side by side, inline correction
   - Moteur status badge (LibreTranslate UP/DOWN indicator from /traductions/moteur/status)
   - Action buttons: Corriger → Approuver → Archiver (workflow statuts)
   - Suggestions glossaire panel: fetched from /traductions/:id/suggestions

2. **`pages/traductions/components/TraductionEditor.tsx`** (if too large for one file)
   - Inline correction textarea, auto-save delta, suggestions list from glossaire

3. **Wire traductions route in `App.tsx`**
   ```tsx
   <Route path="/traductions" element={<TraductionsPage />} />
   <Route path="/traductions/:id" element={<TraductionsPage />} />
   ```

## 📅 This Sprint — Remaining (Sprint 4)

4. **M5 Demandes server module**
   - `modules/demandes/services/demandes.service.ts` — inbox, verrou BDD optimiste, priorités
   - `modules/demandes/controllers/demandes.controller.ts`
   - `modules/demandes/routes/demandes.route.ts`
   - Mount: `app.use('/api/demandes', demandesRoutes)`

5. **`pages/DemandesPage.tsx`** — kanban-style inbox
   - Statuts: Soumise → En cours → En relecture → Validée → Archivée
   - Assignation auto, verrou BDD (seul assigné peut éditer)
   - Priorité: proposée par demandeur, validable/modifiable par admin

6. **Re-enable auth rate limiter** once dev is stable (commented out in `index.ts`)

## 📆 Sprint 5 — Next

7. **Dashboard (M9)** — 5 blocs: Traductions / Courriers sans réponse / Accords expirant / Missions recommandations / Documents archivés
8. **Rapport mensuel automatique** — Cron 1er du mois, PDF + Excel, archivé M8

## 🗓️ Backlog

9. Export PDF/DOCX (Accords, Courriers, Rapports mission)
10. Tests & Recette — Sprint 6
11. Déploiement SERV-APPI — Sprint 7

## 📋 Definition of "Sprint 4 Done"

- [x] `translate-service` microservice live port 5002 ✅
- [x] `GET/POST/PATCH /api/traductions` working ✅
- [x] `GET/POST/PATCH /api/glossaire` working ✅
- [x] `GlossairePage.tsx` renders with CRUD ✅
- [ ] `TraductionsPage.tsx` renders éditeur côte-à-côte with workflow
- [ ] `GET/POST/PATCH /api/demandes` working
- [ ] `DemandesPage.tsx` renders kanban inbox
- [ ] Committed and pushed to `origin/main`
