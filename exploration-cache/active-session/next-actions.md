# ⚡ Next Actions

Last updated: 2026-07-04

## 🔥 Immediate (start here next session)

1. **Clean up + verify Sprint 11 (both halves now done)**
   - Delete `packages/server/src/modules/report/routes/rapports.route.ts`
     (empty 0-byte stub, never imported — the real routes live in
     `analytics.route.ts`) or actually wire it up properly
   - Run `tsc --noEmit` in both `packages/client` and `packages/server`
   - Manually load `/analytics`, click through all 9 tabs (global +
     7 modules + Rapports)
   - Manually generate an on-demand report (PDF and Excel) from the new
     Rapports tab, confirm the archived document opens from its link
   - Manually trigger `rapport_mensuel` and `courriers_criticite_snapshot`
     from AdminParametresPage
   - Run `npm run db:seed-demo` against a dev database and confirm the
     Analytics dashboards render non-empty, plausible charts
   - Generate **one** Drizzle migration covering everything hand-edited
     into `schema.ts` across Sprint 9/10/11: `portailTokens` table,
     `documents.visibilitePortail`/`portailTokenDureeJours`,
     `courriersCriticiteSnapshots` table, `rapports` table,
     `rapportTypeEnum`/`rapportFormatEnum`, `documentCategorieEnum`'s new
     `'rapport'` value — this gap has now persisted three sessions running
   - Update `docs/TASKS.md` Sprint 11 header to ✅ (Sprint 10 was already
     flipped to ✅ this session)
   - Commit + push

2. **Clear the Sprint 9 backlog**
   - Fix `href="/portail"` → `/portal` in `DocumentsPage.tsx` (404 today)
   - Manual end-to-end test: expose a document → `/portal` → consult →
     request download → redeem token link

3. **Manually verify Sprint 10's parameter-driven behaviors**
   - Trigger account lockout, confirm `lockout_max_tentatives`/
     `lockout_duree_minutes` from `parametres` apply
   - Confirm OTP expiry honors `otp_expiration_minutes`
   - Export the audit journal as PDF and Excel
   - Toggle `deepl_fallback_actif` and confirm the translate-service call
     reflects it

4. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`

## 📅 Later

5. **Taille max upload et formats acceptés configurables** (Sprint 10,
   deliberately deferred)

6. **Export PDF/DOCX** for Accords/Courriers/Missions — `utils/pdf.ts` is
   already generic and reusable (proven twice now: audit export + rapports)

7. **Sprint 6 — Tests & Recette** (postponed until after 9/10/11)

8. **Sprint 7 — Déploiement SERV-APPI** (postponed until after 9/10/11)

## 📋 Definition of "Sprint 11 Done"

- [x] Analytics endpoints for all 7 modules + global, cached ✅
- [x] `AnalyticsPage.tsx` with 9 tabs (8 analytics + Rapports), Chart.js
      visualizations ✅
- [x] Courriers-criticité history mechanism (snapshot table + daily job) ✅
- [x] `rapports.service.ts` — PDF/Excel generation ✅
- [x] Monthly cron + on-demand + history ✅
- [x] Job registered in `registre.ts` ✅
- [x] CSV/Excel export on the analytics dashboard ✅
- [x] Demo data seeder (`seed-demo.ts`) ✅
- [ ] `docs/TASKS.md` Sprint 11 header marked complete
- [ ] Delete/fix the dead `rapports.route.ts` stub
- [ ] Manual verification + `tsc --noEmit`
- [ ] Single Drizzle migration for all of Sprint 9/10/11's schema changes
- [ ] Committed and pushed to `origin/main`

## 📋 Definition of "Sprint 10 Done" (carried over, still open items)

- [x] Parameters migrated, seed service, audit UI + export, page
      reorganization, docs/TASKS.md marked ✅ COMPLÉTÉ — all shipped
- [ ] Manual verification that DB-backed values are actually honored at
      runtime

## 📋 Definition of "Sprint 9 Done" (carried over, still open items)

- [x] Server `modules/portal`, schema, client `PortalPage.tsx`,
      `DocumentsPage.tsx` toggle — all shipped (47ef8b8) ✅
- [ ] Fix `/portail` vs `/portal` route bug
- [ ] `tsc --noEmit` verification
- [ ] Manual end-to-end test of portal flow
- [ ] Drizzle migration generated + applied
