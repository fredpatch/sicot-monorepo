# 🎯 Current Task

**Session date**: 2026-07-04
**Status**: ✅ Sprint 11 (Analytics & Rapports) — BOTH halves built and committed (f3547d4, f27d58f). Not yet manually verified.

## ✅ Done: Sprint 11 — Module Analytics & Rapports (M11), rapports half

Second part of today's session. Full detail in `sessions/2026-07-04.md`
(second section). Summary:

- New `modules/report/` — `rapports.service.ts` generates a combined
  multi-module PDF or multi-sheet Excel, archives it as a `documents` row
  (new `rapport` category) + a `rapports` history row
- Monthly cron (`jobs/rapport-mensuel.ts`, 1st of month 06:00) + manual
  trigger via `registre.ts` (`rapport_mensuel`) — closes the Sprint 10
  backlog item of the same name
- New single-module live CSV/Excel export
  (`GET /api/analytics/export`, `analytics.export.service.ts`), separate
  from the archived multi-module rapport
- Client: `AnalyticsPage.tsx` gained a 9th "Rapports" tab (generation form
  + history) and Excel/CSV export buttons on every other tab
- `packages/server/src/db/seed-demo.ts` (446 lines) filled in from last
  session's empty stub — NODE_ENV-guarded demo data generator across 12
  months, plus a 14-day backfill of `courriersCriticiteSnapshots`
- `db:seed-demo` npm script moved from the root `package.json` (wrong
  place, added by mistake last session) to `packages/server/package.json`
- `docs/TASKS.md`: Sprint 10 flipped to ✅ COMPLÉTÉ; Sprint 11's own
  header **still not updated** (still `⬜ À FAIRE`) despite both halves
  now being done

**⚠️ Known dead code**: `modules/report/routes/rapports.route.ts` was
created empty (0 bytes) and never wired up anywhere — the actual routes
are registered directly in `analytics.route.ts`. Should be deleted.

**Not yet done**: `tsc --noEmit`, manual generation of an on-demand
report, running `npm run db:seed-demo` against a dev DB, manually
triggering the `rapport_mensuel` job, a Drizzle migration covering
everything hand-edited into `schema.ts` across Sprint 9/10/11 (this gap
has now persisted three sessions running), updating `docs/TASKS.md`
Sprint 11's header.

## ✅ Done (earlier same day): Sprint 11 — analytics dashboard half

Committed `f3547d4`. New `modules/analytics` server (7 modules + global,
60s in-memory cache), `AnalyticsPage.tsx` (8 tabs), daily
courriers-criticité snapshot job/table. See `sessions/2026-07-04.md`
first section.

---

## ✅ Previously done (see `sessions/2026-07-03.md` and earlier)

- Sprint 9 (Portail Documentaire Externe) — shipped `47ef8b8`. Known open
  bug: `DocumentsPage.tsx`'s "Exposé" link uses `href="/portail"` but the
  real route is `/portal` — 404, not yet fixed.
- Sprint 10 (Paramètres Système Élargis) — shipped `6aaa354`. Not yet
  manually verified that DB-backed values are honored at runtime.
- Sprint 8 (Centre de Notifications & Rappels CCIT) — COMPLETE, `7a1de70`
- Server-wide services refactor — COMPLETE, `dd2809d`

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] Delete or wire up the dead `modules/report/routes/rapports.route.ts`
      empty stub
- [ ] Update `docs/TASKS.md` Sprint 11 header to ✅
- [ ] Generate one Drizzle migration covering everything hand-edited into
      `schema.ts` across Sprint 9/10/11 (portailTokens, documents columns,
      courriersCriticiteSnapshots, rapports table + enums, documents'
      `rapport` category)
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
Sprint 11 Analytics & Rapports (M11)          █████████░  90% ✅ (verification + migration pending)
Server services refactor                      ██████████ 100% ✅
──────────────────────────────────────────────────────────────
Sprint 6  Tests, Recette & Corrections        ░░░░░░░░░░   0% (postponed)
Sprint 7  Déploiement Production & Formation  ░░░░░░░░░░   0% (postponed)
```
