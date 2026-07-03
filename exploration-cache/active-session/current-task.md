# 🎯 Current Task

**Session date**: 2026-07-04
**Status**: ✅ Sprint 11 (Analytics & Rapports) — analytics half BUILT and committed (f3547d4). Rapports half not started.

## ✅ Done (analytics half only): Sprint 11 — Module Analytics & Rapports (M11)

Full detail in `sessions/2026-07-04.md`. Summary:

- New server `modules/analytics/` — 7 per-module analytics endpoints
  (Accords/Courriers/Missions/Traduction/Demandes/Documents/Glossaire) +
  1 cross-module `global`, all gated `authenticate` + `requireTraducteur`,
  all cached 60s via new `utils/cache.ts` (in-memory `Map`, single-process
  only)
- New `courriersCriticiteSnapshots` table + daily 23:55 cron
  (`jobs/criticite-snapshot.ts`) — criticité was never persisted before,
  so there was no way to chart its evolution; also registered as a
  manually-triggerable job in `registre.ts` for dev backfilling
- Client `AnalyticsPage.tsx` (1700 lines) — 8 tabs, `ChartCanvas.tsx`
  loading Chart.js from a CDN at runtime, routed at `/analytics`

**NOT built this session** (part of Sprint 11's original scope):

- The `rapports` layer entirely — PDF/Excel generation, ANAC-branded
  template, monthly cron, on-demand reports, history. `utils/pdf.ts`
  (built in Sprint 10) is already generic enough to reuse.
- CSV/Excel export on the analytics dashboard itself
- `docs/TASKS.md` Sprint 11 section — still shows `⬜ À FAIRE`, not
  updated to reflect this session's progress

**Not yet done**: `tsc --noEmit` verification, manual click-through of all
8 analytics tabs, manual trigger of the criticité snapshot job, Drizzle
migration for `courriersCriticiteSnapshots` (hand-edited in schema.ts,
same recurring gap as Sprint 9/10).

---

## ✅ Previously done (see `sessions/2026-07-03.md` and earlier)

- Sprint 9 (Portail Documentaire Externe) — shipped `47ef8b8`. Known open
  bug: `DocumentsPage.tsx`'s "Exposé" link uses `href="/portail"` but the
  real route is `/portal` — 404, not yet fixed. No Drizzle migration for
  its schema changes either.
- Sprint 10 (Paramètres Système Élargis) — shipped `6aaa354`. Not yet
  manually verified that DB-backed OTP/lockout/backup-retention/deepl
  values are actually honored at runtime (vs. just matching old defaults).
- Sprint 8 (Centre de Notifications & Rappels CCIT) — COMPLETE, `7a1de70`
- Server-wide services refactor — COMPLETE, `dd2809d`

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] Build Sprint 11's `rapports` layer (PDF/Excel, monthly cron,
      on-demand) — folds in the old Sprint 5 "rapport mensuel" leftover
- [ ] Update `docs/TASKS.md` Sprint 11 status
- [ ] Generate Drizzle migrations for Sprint 9 (`portailTokens` +
      `documents` columns) and Sprint 11 (`courriersCriticiteSnapshots`)
      schema changes — recurring gap, schema.ts hand-edited each time
- [ ] Fix `/portail` → `/portal` href bug in `DocumentsPage.tsx` (Sprint 9)
- [ ] `tsc --noEmit` + manual verification of Sprint 9 + 10 + 11 work
- [ ] **Taille max upload configurable** — deferred, Sprint 10
- [ ] `pg_dump` on SERV-APPI (Linux production) — validate PATH availability
- [ ] Re-enable auth rate limiter (commented out in `index.ts`)

## Progress Tracker

```
Sprint 1  Administration & Auth              ██████████ 100% ✅
Sprint 2  Documentaire & Partenaires          ██████████ 100% ✅
Sprint 3  Accords/Correspondances/Missions    ██████████ 100% ✅
Sprint 4  Traduction IA/Glossaire/Demandes    ██████████ 100% ✅
Sprint 5  Dashboard & Statistiques (V1)       ██████████ 100% ✅
Sprint 8  Notifications & Rappels CCIT        ██████████ 100% ✅
Sprint 9  Portail Documentaire Externe        █████████░  90% ✅ (route bug + migration open)
Sprint 10 Paramètres Système Élargis          █████████░  90% ✅ (verification pending)
Server services refactor                      ██████████ 100% ✅
──────────────────────────────────────────────────────────────
Sprint 11 Analytics & Rapports (M11)          █████░░░░░  50% 🔄 (analytics done, rapports not started)
Sprint 6  Tests, Recette & Corrections        ░░░░░░░░░░   0% (postponed)
Sprint 7  Déploiement Production & Formation  ░░░░░░░░░░   0% (postponed)
```
