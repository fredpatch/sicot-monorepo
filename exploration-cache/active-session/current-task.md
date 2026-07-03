# 🎯 Current Task

**Session date**: 2026-07-03
**Status**: ✅ Sprint 9 (Portail Documentaire Externe) shipped & pushed (47ef8b8). ✅ Sprint 10 (Paramètres Système Élargis) built, pending commit at cache-write time.

## ✅ Done: Sprint 10 — Paramètres Système Élargis (M10)

See `sessions/2026-07-03.md` Sprint 10 section for full file-by-file detail.

- 5 hardcoded settings migrated to the `parametres` table:
  `otp_expiration_minutes`, `lockout_max_tentatives`,
  `lockout_duree_minutes`, `backup_retention_locale_jours`,
  `backup_retention_nas_jours`, `deepl_fallback_actif`
- New idempotent seed service `start/services/parameters-seed.service.ts`
  (`onConflictDoNothing`, called from `index.ts` before `app.listen` body)
  — replaces the previously-planned "seed via Drizzle migration" approach
- `deepl_fallback_actif` resolved **per-request** now, not fixed at
  translate-service startup — server sends `deepl_actif` in the request
  body, translate-service's `resoudre_deepl_actif()` falls back to its own
  env var if omitted
- Journal d'audit UI shipped (`AuditPage.tsx`, open since Sprint 1) +
  PDF/Excel export (`utils/pdf.ts` — first use of puppeteer/exceljs in the
  project), capped at 10,000 rows with truncation flag
- `AdminParametresPage.tsx` reorganized into a per-module grid with
  human-readable labels (not originally planned, added mid-sprint)
- Deliberately deferred: upload size/format limits (still hardcoded,
  judged sufficient for now)

## ✅ Done (earlier same day): Sprint 9 — Portail Documentaire Externe (M8-bis)

Committed `47ef8b8`, pushed. Public document portal — admin curates
visibility, external visitors browse/consult freely, downloads gated
behind an emailed token link. Full detail in `sessions/2026-07-03.md`.

**⚠️ Known unresolved bug**: `DocumentsPage.tsx`'s "Exposé" link uses
`href="/portail"` but the actual route (App.tsx + server mount) is
`/portal` — will 404. Not yet fixed.

**Also not yet done**: `tsc --noEmit` verification, manual end-to-end test
of both the portal flow and the new Sprint 10 parameter-driven behaviors,
Drizzle migration file for Sprint 9's schema changes (hand-edited, no
migration generated).

---

## ✅ Previously done (see `sessions/2026-07-02.md` and earlier)

- Sprint 8 (Centre de Notifications & Rappels CCIT) — COMPLETE, committed
  `7a1de70`
- Server-wide services refactor — COMPLETE, committed `dd2809d`
- Sprint 11 (M11 Analytics & Rapports) — planning only, committed
  `47ffd94`, no code yet

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] Fix `/portail` → `/portal` href bug in `DocumentsPage.tsx` (Sprint 9)
- [ ] Generate/apply Drizzle migration for Sprint 9 schema (`portailTokens`
      table + `documents` columns)
- [ ] `tsc --noEmit` + manual verification of Sprint 9 + Sprint 10 work
- [ ] **Job manuel rapport mensuel** — register in `registre.ts` once M9
      rapport mensuel is implemented (Sprint 11)
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
Sprint 11 Analytics & Rapports (planning)     ██░░░░░░░░  20% (scoped, no code)
Sprint 6  Tests, Recette & Corrections        ░░░░░░░░░░   0% (postponed)
Sprint 7  Déploiement Production & Formation  ░░░░░░░░░░   0% (postponed)
```
