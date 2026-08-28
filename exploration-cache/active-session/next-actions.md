# ⚡ Next Actions

Last updated: 2026-07-06 (no changes to the list itself - the UI hardening sprint continued 2026-07-05's work and didn't touch any of these items; see sessions/2026-07-06.md)

## 🔥 Immediate (start here next session)

1. **Fix `tsc --noEmit` being broken client-wide (found 2026-07-05)**
   - `packages/client/tsconfig.json` sets `"ignoreDeprecations": "6.0"`,
     but the installed `typescript` is `5.9.3` (declared `^5.4.5` in
     `package.json`), which rejects that value with `TS5103`
   - Either bump `typescript` to a version that accepts `"6.0"`, or
     adjust/remove the flag - confirmed via `git stash` this is
     pre-existing drift, not caused by any recent session
   - `eslint` was used as a substitute verification this session; once
     fixed, re-run `tsc --noEmit` on both packages to catch anything
     eslint can't

2. **Fix the exceljs dependency regression**
   - `packages/server/package.json` currently pins `exceljs` to `^3.4.0`,
     down from `^4.4.0` - confirmed installed as 3.4.0. Restore to
     `^4.4.0` in both `packages/server/package.json` and remove the
     duplicate `exceljs`/`node-cron`/`nodemailer`/`uuid` entries that
     appeared in the **root** `package.json` (they don't belong there)
   - Re-run `npm install`, then manually re-test all 3 Excel export
     features: audit journal export, analytics dashboard export, rapports
     generation - all were built/verified against exceljs 4.x
   - Also smoke-test `node-cron` jobs (all scheduled jobs use it) and
     `nodemailer` email sending given the multi-major version jumps
     (`^3.0.3`→`^4.5.0` and `^6.9.13`→`^9.0.3` respectively)

3. **Verify Sprint 11's Gemini rapports-IA add-on**
   - Run `tsc --noEmit` in both packages
   - Manually generate an on-demand report, then generate its AI analysis,
     open the review dialog, validate it, confirm the frozen
     `contenuIAValide` text persists correctly
   - Manually trigger a rejection + regeneration to confirm that path
   - Manually check `AdminParametresPage.tsx`'s Gemini usage monitor
     renders live data and updates after a generation
   - Confirm `GEMINI_API_KEY` is set only in a test environment, never in
     any production-bound `.env`

4. **Clean up remaining Sprint 11 loose ends**
   - Delete `packages/server/src/modules/report/routes/rapports.route.ts`
     (still an empty, unused stub - the real routes live in
     `analytics.route.ts`)
   - Generate **one** Drizzle migration covering everything hand-edited
     into `schema.ts` across Sprint 9/10/11: `portailTokens`,
     `documents.visibilitePortail`/`portailTokenDureeJours`,
     `courriersCriticiteSnapshots`, `rapports` (+ all its IA columns),
     `rapportTypeEnum`/`rapportFormatEnum`/`statutRelectureIAEnum`,
     `geminiUsageQuotidien`, `rapportsIAQuotidien`,
     `documentCategorieEnum`'s `'rapport'` value - this gap has now
     persisted three sessions running

5. **Clear the Sprint 9 backlog**
   - Fix `href="/portail"` → `/portal` in `DocumentsPage.tsx` (404 today)
   - Manual end-to-end test: expose a document → `/portal` → consult →
     request download → redeem token link

6. **Manually verify Sprint 10's parameter-driven behaviors**
   - Trigger account lockout, confirm parameters apply; confirm OTP
     expiry; export the audit journal as PDF and Excel (after the exceljs
     fix above); toggle `deepl_fallback_actif`

7. **Re-enable auth rate limiter** (commented out in `index.ts`)

## 📅 Later

8. **Decide on export PDF/DOCX of the validated AI narrative** - PDF is
   trivial (reuse `utils/pdf.ts`), DOCX needs a new `docx` library (same
   gap noted since Sprint 4)

9. **Taille max upload et formats acceptés configurables** (Sprint 10,
   deliberately deferred)

10. **Sprint 6 - Tests & Recette** (postponed until after 9/10/11)

11. **Sprint 7 - Déploiement SERV-APPI** (postponed until after 9/10/11)

## 📋 Definition of "Sprint 11 Done" (including the Gemini add-on)

- [x] Analytics endpoints, 9-tab `AnalyticsPage.tsx`, criticité history ✅
- [x] `rapports.service.ts` - PDF/Excel generation, monthly cron,
      on-demand, history, CSV/Excel export ✅
- [x] Demo data seeder (`seed-demo.ts`) ✅
- [x] `docs/TASKS.md` Sprint 11 marked ✅ COMPLÉTÉ ✅
- [x] Gemini AI narrative generation + admin review workflow ✅
- [x] Gemini quota monitoring UI ✅
- [ ] exceljs version regression fixed and re-tested
- [ ] Delete/fix the dead `rapports.route.ts` stub
- [ ] Manual verification + `tsc --noEmit`
- [ ] Single Drizzle migration for all of Sprint 9/10/11's schema changes

## 📋 Definition of "Sprint 10 Done" (carried over, still open items)

- [x] Parameters migrated, seed service, audit UI + export, page
      reorganization, docs/TASKS.md marked ✅ COMPLÉTÉ - all shipped
- [ ] Manual verification that DB-backed values are actually honored at
      runtime

## 📋 Definition of "Sprint 9 Done" (carried over, still open items)

- [x] Server `modules/portal`, schema, client `PortalPage.tsx`,
      `DocumentsPage.tsx` toggle - all shipped (47ef8b8) ✅
- [ ] Fix `/portail` vs `/portal` route bug
- [ ] `tsc --noEmit` verification
- [ ] Manual end-to-end test of portal flow
- [ ] Drizzle migration generated + applied
