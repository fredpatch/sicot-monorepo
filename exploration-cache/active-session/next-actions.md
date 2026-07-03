# ⚡ Next Actions

Last updated: 2026-07-04

## 🔥 Immediate (start here next session)

1. **Verify + commit Sprint 11's analytics half**
   - Run `tsc --noEmit` in both `packages/client` and `packages/server`
   - Manually load `/analytics`, click through all 8 tabs (global +
     M1/M4/M3/M6/M5/M8/M7) with a real date range and confirm charts render
   - Manually trigger `courriers_criticite_snapshot` from
     AdminParametresPage and confirm a row lands in
     `courriers_criticite_snapshots`
   - Generate a Drizzle migration for `courriersCriticiteSnapshots`
     (schema.ts hand-edited, no migration file yet — same recurring gap
     as Sprint 9's `portailTokens`/`documents` columns and Sprint 10)
   - Commit + push

2. **Build Sprint 11's `rapports` layer** (the other half of the original
   scope, not touched this session)
   - `rapports.service.ts` — PDF/Excel generation, ANAC-branded template
     (reuse `utils/pdf.ts` from Sprint 10's audit export)
   - Monthly cron + on-demand generation + history — this also folds in
     the old Sprint 5 "rapport mensuel" leftover, register as a job in
     `registre.ts` once built
   - Consider CSV/Excel export directly on `AnalyticsPage.tsx` tabs too
     (was in the original plan, not present)
   - Update `docs/TASKS.md` Sprint 11 status once both halves land

3. **Clear the Sprint 9 backlog**
   - Fix `href="/portail"` → `/portal` in `DocumentsPage.tsx` (404 today)
   - Manual end-to-end test: expose a document → `/portal` → consult →
     request download → redeem token link
   - Generate the `portailTokens`/`documents` migration

4. **Manually verify Sprint 10's parameter-driven behaviors**
   - Trigger account lockout, confirm `lockout_max_tentatives`/
     `lockout_duree_minutes` from `parametres` apply
   - Confirm OTP expiry honors `otp_expiration_minutes`
   - Export the audit journal as PDF and Excel
   - Toggle `deepl_fallback_actif` and confirm the translate-service call
     reflects it

5. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`

## 📅 Later

6. **Taille max upload et formats acceptés configurables** (Sprint 10,
   deliberately deferred)

7. **Export PDF/DOCX** for Accords/Courriers/Missions — `utils/pdf.ts` is
   already generic and reusable

8. **Sprint 6 — Tests & Recette** (postponed until after 9/10/11)

9. **Sprint 7 — Déploiement SERV-APPI** (postponed until after 9/10/11)

## 📋 Definition of "Sprint 11 Done"

- [x] Analytics endpoints for all 7 modules + global, cached ✅
- [x] `AnalyticsPage.tsx` with 8 tabs, Chart.js visualizations ✅
- [x] Courriers-criticité history mechanism (snapshot table + daily job) ✅
- [ ] `rapports.service.ts` — PDF/Excel generation
- [ ] Monthly cron + on-demand + history
- [ ] Job registered in `registre.ts`
- [ ] `docs/TASKS.md` Sprint 11 marked complete
- [ ] Manual verification + `tsc --noEmit`
- [ ] Drizzle migration for `courriersCriticiteSnapshots`
- [ ] Committed and pushed to `origin/main`

## 📋 Definition of "Sprint 10 Done" (carried over, still open items)

- [x] Parameters migrated, seed service, audit UI + export, page
      reorganization — all shipped (6aaa354) ✅
- [ ] Manual verification that DB-backed values are actually honored at
      runtime

## 📋 Definition of "Sprint 9 Done" (carried over, still open items)

- [x] Server `modules/portal`, schema, client `PortalPage.tsx`,
      `DocumentsPage.tsx` toggle — all shipped (47ef8b8) ✅
- [ ] Fix `/portail` vs `/portal` route bug
- [ ] `tsc --noEmit` verification
- [ ] Manual end-to-end test of portal flow
- [ ] Drizzle migration generated + applied
