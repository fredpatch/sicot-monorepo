# 🎯 Current Task

**Session date**: 2026-07-02
**Status**: ✅ Server refactor pass COMPLETE (committed dd2809d) — Sprint 5 feature work already complete (ccbd3f2)

## ✅ Done: Server-wide refactor (committed dd2809d)

Mechanical split of every `modules/*/services/*.service.ts` into `.types.ts` +
`.helpers.ts` + a slim `.service.ts`, smallest file → largest:
parametres, audit, notifications, users, auth, glossaire, demandes,
organisations, traduction, accords, courriers, dashboard, missions.

Controller error handling for 8 controllers (glossaire, parametres,
organisations, courriers, traduction, demandes, accords, missions) migrated
from inline `errorMap` closures to the shared `createErrorHandler` factory in
`utils/error.ts`. The factory gained an optional `prefixHandlers` param to
support dynamic error codes (`PARTICIPANT_INTROUVABLE:${id}`,
`ORGANISATION_INTROUVABLE:${id}`).

Duplication removed along the way:
- `audit.service.ts` — row→view mapping duplicated twice → single `toAuditLogView`
- `courriers.service.ts` — seuils reloaded 5x → single `chargerSeuils()`
- `dashboard.service.ts` — one 350-line function → 13 named per-section query
  functions in `dashboard.helpers.ts`, plus 3x inline day-diff calc → `getDaysDiff`
- `missions.service.ts` — RecommandationView shaping duplicated 3x → single
  `toRecommandationView`

`auth.service.ts`'s `logAudit` was deliberately **not** relocated — it's
imported repo-wide (missions, accords, courriers, documents, etc.) and moving
it would require a full import sweep.

Verified after every file: `tsc --noEmit` against a clean-main baseline
(`ignoreDeprecations` patched locally for the check only) showed zero new
type errors — same pre-existing 3 `@sicot/shared` resolution errors both
before and after.

---

## 🔄 Remaining: Sprint 5 (unaffected by the refactor)

- [ ] **Rapport mensuel automatique** — `jobs/rapport.ts`, cron 1er du mois 06h00, PDF+Excel, archive in documents table; wire as 7th job in REGISTRE_JOBS
- [ ] Re-enable auth rate limiter (commented out in index.ts)
- [ ] Export PDF/DOCX (optional Sprint 5)

## Progress Tracker

```
Dashboard (M9)             ██████████ 100% ✅
Jobs admin triggers        ██████████ 100% ✅
Admin Parametres           ██████████ 100% ✅
Notifications              ██████████ 100% ✅
Server services refactor   ██████████ 100% ✅
─────────────────────────────────────────────
Rapport mensuel cron       ░░░░░░░░░░   0% ← NEXT
PDF/DOCX export            ░░░░░░░░░░   0% (optional)
```
