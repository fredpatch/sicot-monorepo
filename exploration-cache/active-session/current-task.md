# 🎯 Current Task

**Session date**: 2026-06-29
**Status**: ✅ Sprint 4 — COMPLETE (uncommitted)

## ✅ Done: Sprint 4 COMPLETE

### M6 Traduction (client)
- ✅ `pages/TraductionsPage.tsx` — list with filters (statut, direction), lancer traduction dialog, inline correction, moteur status badge
- ✅ `pages/traductions/components/TraductionEditeur.tsx` — côte-à-côte éditeur: texteOriginal / texteIA / texteFinal, approve/archive workflow, suggestions glossaire panel
- ✅ `App.tsx` — /traductions + /traductions/:id routes wired, ComingSoon replaced

### M5 Demandes (server + client)
- ✅ `modules/demandes/services/demandes.service.ts` — inbox CRUD, prendreEnCharge (optimistic lock), rappeler, validerPriorite, soumettre, archiver, lister
- ✅ `modules/demandes/controllers/demandes.controller.ts`
- ✅ `modules/demandes/routes/demandes.route.ts`
- ✅ `index.ts` — app.use('/api/demandes', demandesRoutes) mounted
- ✅ `lib/demandes.api.ts` — lister, getById, creer, prendreEnCharge, rappeler, validerPriorite, soumettre, archiver
- ✅ `pages/DemandesPage.tsx` — kanban-style inbox, statuts: Soumise→En cours→En relecture→Validée→Archivée, priorité badge, assignation auto

### Fixes / polish (this session)
- ✅ Documents module — controller/service/types/route/errors refinements
- ✅ Traduction module — controller/service/route refinements
- ✅ `utils/traduction.ts` — refinements
- ✅ `docs/TASKS.md` — Sprint 4 items checked

---

## ✅ Prior: Sprint 3 + Sprint 4 server (committed f292f88)

- Sprint 3: M1 Accords + M4 Courriers + M3 Missions — server + client all done
- Sprint 4 server: translate-service, M7 Glossaire, M6 Traduction server modules
- Sprint 4 client: GlossairePage, glossaire.api.ts, traductions.api.ts

---

## 🔄 Remaining: Sprint 5

- [ ] Dashboard (M9) — 5 blocs KPI: Traductions / Courriers sans réponse / Accords expirant / Missions recommandations / Documents archivés
- [ ] Rapport mensuel cron — 1er du mois, PDF + Excel, archivé M8
- [ ] Re-enable auth rate limiter (commented out in index.ts)
- [ ] Export PDF/DOCX (Accords, Courriers, Rapports mission)

## Progress Tracker

```
translate-service         ██████████ 100% ✅
Traduction server (M6)    ██████████ 100% ✅
Glossaire server (M7)     ██████████ 100% ✅
Demandes server (M5)      ██████████ 100% ✅
─────────────────────────────────────────────
Accords client (M1)       ██████████ 100% ✅
Courriers client (M4)     ██████████ 100% ✅
Missions client (M3)      ██████████ 100% ✅
Glossaire client (M7)     ██████████ 100% ✅
Traductions client (M6)   ██████████ 100% ✅
Demandes client (M5)      ██████████ 100% ✅
─────────────────────────────────────────────
Dashboard (M9)            ░░░░░░░░░░   0% ← SPRINT 5
Rapport mensuel cron      ░░░░░░░░░░   0%
PDF/DOCX export           ░░░░░░░░░░   0% (Sprint 5 optional)
```
