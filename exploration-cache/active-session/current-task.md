# 🎯 Current Task

**Session date**: 2026-07-02
**Status**: ✅ Sprint 8 COMPLETE (committed 7a1de70) — server refactor pass also complete (dd2809d)

## ✅ Done: Sprint 8 — Centre de Notifications & Rappels CCIT (committed 7a1de70)

Full sprint now closed. Final pieces landed this session:
- `HistoriqueNotifications.tsx` — reusable passive notification-history
  component, wired onto `AccordDetail`, `CourrierDetail`, and per-recommandation
  on `MissionDetail`
- `AccordDetail` "Notifier tous" — bulk relance across every partner org with
  an email contact, envoyés/ignorés summary
- Dashboard "Accords expirés — action requise" block — separate from the
  existing "expiring soon" block, surfaces already-`expire` accords with
  `joursDepuisExpiration`; new `getAccordsExpirant()` in
  `dashboard.helpers.ts`, `accordsActifs.expiresNonTraites` KPI

Everything else in Sprint 8 (parametres table, notifications table +
service, ModalRelance, criticité courriers 3 paliers, jobs registry, KPI
enrichis, filtre accords par partenaire, confirmationLogistique /
contactSurPlaceId sur missions) was already done in prior sessions — see
`docs/TASKS.md` Sprint 8 section for the full file-by-file list.

## ✅ Done: Server-wide refactor (committed dd2809d, same day, earlier)

All 13 `modules/*/services/*.service.ts` split into `.types.ts` +
`.helpers.ts` + slim `.service.ts`; 8 controllers migrated from inline
`errorMap` to the shared `createErrorHandler` factory (which gained
`prefixHandlers` support). Pure refactor, zero behavior change, verified
with `tsc --noEmit` after every file. See `sessions/2026-07-02.md` for detail.

## ✅ Done (same day): Sprint 11 planning — Module Analytics & Rapports (committed 47ffd94)

Backlog-only, no code. `docs/TASKS.md` gained a full Sprint 11 section
scoping M11 as a strategic-reporting layer distinct from the M9 operational
dashboard: per-module analytics aggregates (M1 Accords, M4 Courriers, M3
Missions, M6 Traduction, M5 Demandes, M8 Documents, M7 Glossaire) + a global
cross-module view + period filters + CSV/Excel export, and a `rapports`
layer built on top (PDF/Excel generation, ANAC-branded template, monthly
cron, on-demand reports, history). Note: this folds in and supersedes the
standalone Sprint 5 "rapport mensuel" leftover — build that inside Sprint 11
rather than as an isolated job.

---

## 🔄 Next: Sprint 9 — Portail Documentaire Externe (M8-bis)

Not yet started, not scoped in detail beyond the `docs/TASKS.md` Sprint 9
outline. External-facing document portal with admin-curated visibility for
target consultation (per `docs/note.md` — original CCIT brief).

Sprint 11 (M11 Analytics & Rapports) is now scoped (see above) but also
unbuilt — pick whichever the CCIT prioritizes next.

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] **Rapport mensuel automatique** — now scoped as part of Sprint 11's `rapports.service.ts` (cron 1er du mois, PDF+Excel, archive in documents table, 7th REGISTRE_JOBS entry) rather than standalone
- [ ] **Seed parametres via migration Drizzle** — currently manual SQL only, risk of missing seed in production (Sprint 8 item)
- [ ] `pg_dump` on SERV-APPI (Linux production) — validate PATH availability
- [ ] Re-enable auth rate limiter (commented out in index.ts)
- [ ] Export PDF/DOCX (optional)

## Progress Tracker

```
Sprint 1  Administration & Auth              ██████████ 100% ✅
Sprint 2  Documentaire & Partenaires          ██████████ 100% ✅
Sprint 3  Accords/Correspondances/Missions    ██████████ 100% ✅
Sprint 4  Traduction IA/Glossaire/Demandes    ██████████ 100% ✅
Sprint 5  Dashboard & Statistiques (V1)       ██████████ 100% ✅
Sprint 8  Notifications & Rappels CCIT        ██████████ 100% ✅
Server services refactor                      ██████████ 100% ✅
──────────────────────────────────────────────────────────────
Sprint 9  Portail Documentaire Externe        ░░░░░░░░░░   0% ← NEXT
Sprint 10 Paramètres Système Élargis          ░░░░░░░░░░   0%
Sprint 6  Tests, Recette & Corrections        ░░░░░░░░░░   0% (postponed)
Sprint 7  Déploiement Production & Formation  ░░░░░░░░░░   0% (postponed)
```
