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

---

## 🔄 Next: Sprint 9 — Portail Documentaire Externe (M8-bis)

Not yet started, not scoped in detail beyond the `docs/TASKS.md` Sprint 9
outline. External-facing document portal with admin-curated visibility for
target consultation (per `docs/note.md` — original CCIT brief).

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] **Rapport mensuel automatique** — `jobs/rapport.ts`, cron 1er du mois 06h00, PDF+Excel, archive in documents table; wire as 7th job in REGISTRE_JOBS (Sprint 5 item)
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
