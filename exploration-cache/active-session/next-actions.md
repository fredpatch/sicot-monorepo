# ⚡ Next Actions

Last updated: 2026-06-30

## 🔥 Immediate (start here next session)

1. **Rapport mensuel automatique**
   - `jobs/rapport.ts` — cron 1er du mois 06h00, PDF + Excel export, archive in documents table via `genererRapport(mois, annee)`
   - Extend documents service: generate and store report document
   - Email report to admins + super_admin

2. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`
   - Uncomment + configure threshold once dev phase stabilises

## 📅 Sprint 5 — Remaining

3. **Export PDF/DOCX** (optional Sprint 5)
   - Accords, Courriers, Rapports mission
   - Client: download button per detail view
   - Server: Puppeteer for PDF, ExcelJS for Excel

4. **Tests & Recette** — Sprint 6

5. **Déploiement SERV-APPI** — Sprint 7

## 📋 Definition of "Sprint 5 Done"

- [x] `DashboardPage.tsx` renders 8 KPI blocs ✅
- [x] `GET /api/dashboard` aggregation endpoint ✅
- [x] `AdminParametresPage.tsx` — settings CRUD ✅
- [x] `GET/PATCH /api/parametres` working ✅
- [x] `POST /api/notifications/envoyer` working ✅
- [ ] Rapport mensuel cron running
- [ ] Committed and pushed to `origin/main` ← IN PROGRESS
