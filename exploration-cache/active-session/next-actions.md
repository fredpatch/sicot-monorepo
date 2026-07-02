# ⚡ Next Actions

Last updated: 2026-07-02

## 🔥 Immediate (start here next session)

1. **Sprint 9 — Portail Documentaire Externe (M8-bis)**
   - Not yet scoped in detail — read `docs/TASKS.md` Sprint 9 section first
   - External-facing document portal, admin-curated visibility for target consultation (per `docs/note.md`)

2. **Rapport mensuel automatique** (Sprint 5 leftover)
   - `jobs/rapport.ts` — cron 1er du mois 06h00, PDF + Excel export, archive in documents table
   - Extend documents service: `genererRapport(mois, annee)` — query accords/courriers/missions/traductions for the month
   - Add as 7th job in `REGISTRE_JOBS` with key `rapport_mensuel` (admin role) — allows manual trigger from AdminParametresPage
   - Email report link to admins + super_admin

3. **Seed parametres via migration Drizzle** (Sprint 8 leftover)
   - Currently manual SQL only — risk of missing seed on a fresh production DB

4. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`
   - Uncomment + configure threshold once dev phase stabilises

## 📅 Later

5. **Export PDF/DOCX** (optional)
   - Accords, Courriers, Rapports mission
   - Client: download button per detail view
   - Server: Puppeteer for PDF, ExcelJS for Excel

6. **Sprint 10 — Paramètres Système Élargis**

7. **Sprint 6 — Tests & Recette** (postponed until after 8/9/10 — 8 done, 9/10 remain)

8. **Sprint 7 — Déploiement SERV-APPI** (postponed until after 8/9/10)

## 📋 Definition of "Sprint 8 Done" — ✅ all complete

- [x] `parametres` + `notifications` tables, services, routes ✅
- [x] `ModalRelance.tsx` + `HistoriqueNotifications.tsx` reusable components ✅
- [x] Bouton "Relancer" on Accord/Courrier/Mission-recommandation ✅
- [x] "Notifier tous" bulk relance on AccordDetail ✅
- [x] Criticité courriers 3 paliers (normal/à surveiller/critique) ✅
- [x] Dashboard: KPI enrichis + "accords expirant" + "accords expirés" blocks + notifications récentes ✅
- [x] Filtre accords par partenaire + navigation croisée M2→M1 ✅
- [x] `confirmationLogistique` + `contactSurPlaceId` sur missions ✅
- [x] `AdminParametresPage.tsx` + REGISTRE_JOBS (6 jobs, roleMinimum) ✅
- [x] Committed and pushed to `origin/main` ✅ (7a1de70)
