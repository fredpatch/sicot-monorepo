# ⚡ Next Actions

Last updated: 2026-07-03

## 🔥 Immediate (start here next session)

1. **Verify Sprint 9 + Sprint 10 work**
   - Fix `href="/portail"` → should be `/portal` in `DocumentsPage.tsx`
     (Sprint 9 route mismatch, 404 today)
   - Run `tsc --noEmit` in both `packages/client` and `packages/server`
   - Manually test Sprint 9: expose a document → visit `/portal` →
     browse/search → consult inline → request download via email →
     redeem token link
   - Manually test Sprint 10: trigger account lockout and confirm
     `lockout_max_tentatives`/`lockout_duree_minutes` from `parametres`
     apply (not the old hardcoded 5/30); confirm OTP expiry honors
     `otp_expiration_minutes`; export the audit journal as PDF and Excel;
     toggle `deepl_fallback_actif` in AdminParametresPage and confirm the
     translate-service call actually reflects it
   - Generate a Drizzle migration for Sprint 9's schema changes
     (`portailTokens` table + `documents.visibilitePortail`/
     `portailTokenDureeJours` — currently hand-edited, no migration file)
   - Commit + push any fixes

2. **Sprint 11 — Module Analytics & Rapports (M11)**
   - Scoped in `docs/TASKS.md` Sprint 11 section but unbuilt: per-module
     analytics aggregates (M1/M3/M4/M5/M6/M7/M8) + global cross-module view
     + period filters + CSV/Excel export, plus `rapports` layer (PDF/Excel
     generation, monthly cron, on-demand, history)
   - Once built, register the monthly report job in `registre.ts`
     (Sprint 10 leftover, already commented in place)

3. **Re-enable auth rate limiter**
   - Currently commented out in `packages/server/src/index.ts`
   - Uncomment + configure threshold once dev phase stabilises

## 📅 Later

4. **Taille max upload et formats acceptés configurables** (Sprint 10,
   deliberately deferred — current 50 Mo hardcoded limit judged sufficient)
   - Would need a middleware factory reading the value per-request

5. **Export PDF/DOCX** for Accords/Courriers/Missions
   - `utils/pdf.ts` (built for Sprint 10's audit export) is already generic
     and reusable for this

6. **Sprint 6 — Tests & Recette** (postponed until after 9/10/11)

7. **Sprint 7 — Déploiement SERV-APPI** (postponed until after 9/10/11)

## 📋 Definition of "Sprint 10 Done"

- [x] `otp_expiration_minutes`, `lockout_max_tentatives`,
      `lockout_duree_minutes`, `backup_retention_locale_jours`,
      `backup_retention_nas_jours`, `deepl_fallback_actif` in `parametres`
      table, hardcoded constants removed ✅
- [x] Idempotent seed service, no manual SQL ✅
- [x] Journal d'audit consultation UI (`AuditPage.tsx`) ✅
- [x] Journal d'audit export PDF/Excel ✅
- [x] `AdminParametresPage.tsx` reorganized ✅
- [ ] Manual verification that DB-backed values are actually honored at
      runtime (not just defaults matching old hardcoded values)
- [ ] `tsc --noEmit` both packages
- [ ] Committed and pushed to `origin/main`

## 📋 Definition of "Sprint 9 Done" (carried over, still open items)

- [x] Server `modules/portal`, schema, client `PortalPage.tsx`,
      `DocumentsPage.tsx` toggle — all shipped (47ef8b8) ✅
- [ ] Fix `/portail` vs `/portal` route bug
- [ ] `tsc --noEmit` verification
- [ ] Manual end-to-end test of portal flow
- [ ] Drizzle migration generated + applied
