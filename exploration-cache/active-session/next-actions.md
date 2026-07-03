# ⚡ Next Actions

Last updated: 2026-07-03

## 🔥 Immediate (start here next session)

1. **Finish Sprint 9 — Portail Documentaire Externe**
   - Fix `href="/portail"` → `/portail` should be `/portal` in
     `DocumentsPage.tsx` (route mismatch, will 404 today)
   - Run `tsc --noEmit` in both `packages/client` and `packages/server`
   - Manually test the full flow: admin exposes a document → visit
     `/portal` → search/browse → consult inline → request download via
     email → receive email → redeem token link → confirm file downloads
   - Generate a Drizzle migration for the `portailTokens` table and the two
     new `documents` columns (schema.ts was hand-edited, no migration yet)
   - Commit + push

2. **Sprint 11 — Module Analytics & Rapports (M11)**
   - Scoped in `docs/TASKS.md` Sprint 11 section but unbuilt: per-module
     analytics aggregates (M1/M3/M4/M5/M6/M7/M8) + global cross-module view
     + period filters + CSV/Excel export, plus `rapports` layer (PDF/Excel
     generation, monthly cron, on-demand, history)
   - Folds in the Sprint 5 "rapport mensuel" leftover — build it here

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

7. **Sprint 6 — Tests & Recette** (postponed until after 9/10)

8. **Sprint 7 — Déploiement SERV-APPI** (postponed until after 9/10)

## 📋 Definition of "Sprint 9 Done"

- [x] Server `modules/portal` — service/controller/route (public browse,
      consult, token, download; admin visibility toggle) ✅
- [x] Schema: `documents.visibilitePortail` + `portailTokenDureeJours`,
      `portailTokens` table ✅
- [x] Client `PortalPage.tsx` + `portal.api.ts`, routed at `/portal` ✅
- [x] `DocumentsPage.tsx` visibility toggle UI ✅
- [ ] Fix `/portail` vs `/portal` route bug
- [ ] `tsc --noEmit` verification both packages
- [ ] Manual end-to-end test of portal flow
- [ ] Drizzle migration generated + applied
- [ ] Committed and pushed to `origin/main`
