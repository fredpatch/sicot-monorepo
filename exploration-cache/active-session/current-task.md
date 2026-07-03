# 🎯 Current Task

**Session date**: 2026-07-03
**Status**: 🔄 Sprint 9 — Portail Documentaire Externe (M8-bis) BUILT, uncommitted

## 🔄 In progress: Sprint 9 — Portail Documentaire Externe (M8-bis)

External-facing document portal with admin-curated visibility, per
`docs/note.md` original CCIT brief. This session's work (see
`sessions/2026-07-03.md` for full detail):

- New server module `modules/portal/` — public browse/consult/download-token
  routes (no auth) + admin visibility-toggle route (auth + admin role)
- Schema: `documents.visibilitePortail`, `documents.portailTokenDureeJours`,
  new `portailTokens` table (token, email, expiry, usage tracking)
- Client: `PortalPage.tsx` (public portal UI) + `portal.api.ts`, routed at
  `/portal`, nav item added to `Layout.tsx`
- `DocumentsPage.tsx` — "Portail Externe" column + expose/retire dialog

**⚠️ Known bug not yet fixed**: `DocumentsPage.tsx`'s "Exposé" link uses
`href="/portail"` but the actual route (App.tsx + server mount) is
`/portal` — will 404, needs a one-line fix before commit.

**Not yet done this session**: `tsc --noEmit` verification, manual
end-to-end test of the portal flow, Drizzle migration file for the schema
changes (schema.ts was hand-edited), commit.

---

## ✅ Previously done (see `sessions/2026-07-02.md` and earlier)

- Sprint 8 (Centre de Notifications & Rappels CCIT) — COMPLETE, committed
  `7a1de70`
- Server-wide services refactor (types/helpers/service split,
  `createErrorHandler`) — COMPLETE, committed `dd2809d`
- Sprint 11 (M11 Analytics & Rapports) — planning only, committed `47ffd94`,
  no code yet

## Leftover items (not blocking, tracked in docs/TASKS.md)

- [ ] Fix `/portail` → `/portal` href bug in `DocumentsPage.tsx` (Sprint 9,
      found this session)
- [ ] Generate/apply Drizzle migration for `portailTokens` table +
      `documents` columns (Sprint 9)
- [ ] **Rapport mensuel automatique** — scoped as part of Sprint 11's
      `rapports.service.ts`
- [ ] **Seed parametres via migration Drizzle** — currently manual SQL only
      (Sprint 8 item)
- [ ] `pg_dump` on SERV-APPI (Linux production) — validate PATH availability
- [ ] Re-enable auth rate limiter (commented out in `index.ts`)
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
Sprint 9  Portail Documentaire Externe        █████████░  90% ← IN PROGRESS (uncommitted)
Sprint 11 Analytics & Rapports (planning)     ██░░░░░░░░  20% (scoped, no code)
Sprint 10 Paramètres Système Élargis          ░░░░░░░░░░   0%
Sprint 6  Tests, Recette & Corrections        ░░░░░░░░░░   0% (postponed)
Sprint 7  Déploiement Production & Formation  ░░░░░░░░░░   0% (postponed)
```
