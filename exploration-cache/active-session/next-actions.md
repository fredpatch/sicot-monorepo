# ⚡ Next Actions

Last updated: 2026-06-29

## 🔥 Immediate (start here next session)

1. **Sprint 5: Dashboard (M9)**
   - 5 blocs KPI: Traductions en cours / Courriers sans réponse / Accords expirant bientôt / Missions recommandations en attente / Documents archivés
   - `pages/DashboardPage.tsx` — card grid, useQuery per bloc, sparkline charts
   - Wire `/dashboard` route in `App.tsx` (replace ComingSoon)
   - Server: `modules/dashboard/` — aggregation queries, no mutations

2. **Rapport mensuel automatique**
   - `jobs/rapport.ts` — cron 1er du mois, PDF + Excel export, archive in documents table
   - Extend documents service: `genererRapport(mois, annee)`

3. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`
   - Uncomment once dev phase stabilises

## 📅 Sprint 5 — Remaining

4. **Export PDF/DOCX** (optional Sprint 5)
   - Accords, Courriers, Rapports mission
   - Client: download button per detail view

5. **Tests & Recette** — Sprint 6

6. **Déploiement SERV-APPI** — Sprint 7

## 📋 Definition of "Sprint 4 Done" — ALL ✅

- [x] `translate-service` microservice live port 5002 ✅
- [x] `GET/POST/PATCH /api/traductions` working ✅
- [x] `GET/POST/PATCH /api/glossaire` working ✅
- [x] `GET/POST/PATCH /api/demandes` working ✅
- [x] `GlossairePage.tsx` renders with CRUD ✅
- [x] `TraductionsPage.tsx` renders with lancer + correction workflow ✅
- [x] `TraductionEditeur.tsx` côte-à-côte éditeur ✅
- [x] `DemandesPage.tsx` kanban inbox ✅
- [ ] Committed and pushed to `origin/main` ← IN PROGRESS

## 📋 Definition of "Sprint 5 Done"

- [ ] `DashboardPage.tsx` renders 5 KPI blocs
- [ ] `GET /api/dashboard` aggregation endpoint
- [ ] Rapport mensuel cron running
- [ ] Committed and pushed to `origin/main`
