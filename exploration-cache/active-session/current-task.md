# 🎯 Current Task

**Session date**: 2026-06-29
**Status**: 🔄 Sprint 4 — IN PROGRESS

## ✅ Done: Sprint 3 COMPLETE

### M3 Missions (client)
- ✅ `pages/MissionsPage.tsx` — inbox two-column layout, mission list, filters, detail panel
- ✅ `pages/missions/components/MissionDetails.tsx` — detail view, participants, recommandations
- ✅ `pages/missions/components/MissionFormPage.tsx` — création/édition, participants, rapport lié
- ✅ `App.tsx` — /missions, /missions/:id, /missions/new, /missions/:id/edit wired
- ✅ `lib/api.ts` — missionsApi already exported (was in previous commit)

> Sprint 3 fully closed: M1 Accords + M4 Courriers + M3 Missions — server + client all done.

---

## ✅ Done: Sprint 4 Server — M6 Traduction + M7 Glossaire + translate-service

### translate-service microservice (new package)
- ✅ `packages/translate-service/requirements.txt` — flask, waitress, langdetect, requests
- ✅ `packages/translate-service/main.py` — /translate, /translate/batch, /detect, /health, fallback DeepL, nettoyage texte

### M7 Glossaire (server)
- ✅ `modules/glossaire/services/glossaire.service.ts`
- ✅ `modules/glossaire/controllers/glossaire.controller.ts`
- ✅ `modules/glossaire/routes/glossaire.route.ts`
- ✅ Route mounted: `app.use('/api/glossaire', glossaireRoutes)`

### M6 Traduction (server)
- ✅ `utils/traduction.ts` — traduireSegment, traduireTexte batch, detecterLangue, verifierLibreTranslate (calls port 5002)
- ✅ `modules/traduction/services/traduction.service.ts` — lancerTraduction, sauvegarderCorrection, approuver, archiver, lister, getSuggestionsGlossaire, enrichirGlossaire
- ✅ `modules/traduction/controllers/traduction.controller.ts`
- ✅ `modules/traduction/routes/traduction.route.ts`
- ✅ Route mounted: `app.use('/api/traductions', traductionsRoutes)`

### Sprint 4 Client (partial)
- ✅ `lib/glossaire.api.ts` — lister, getById, suggestions, creer, mettreAJour
- ✅ `lib/traductions.api.ts` — lister, getById, moteurStatus, lancer, correction, approuver, archiver, suggestions
- ✅ `lib/api.ts` — glossaireApi + traductionsApi exported
- ✅ `pages/GlossairePage.tsx` — CRUD termes glossaire, suggestions, historique, pagination
- ✅ `App.tsx` — /glossaire route wired

### Minor fixes
- ✅ `AccordDetail.tsx` — em dash → hyphen in date empty-state and expiry alert text (encoding safety)

---

## 🔄 Remaining: Sprint 4 Client

- [ ] `pages/TraductionsPage.tsx` — éditeur côte-à-côte (texte original / traduction), workflow statuts, moteur status badge
- [ ] `pages/traductions/components/TraductionEditor.tsx` — inline correction, suggestions glossaire panel

## 🔄 Remaining: Sprint 4 Server — M5 Demandes

- [ ] `modules/demandes/services/demandes.service.ts` — inbox, verrou BDD, priorités, statuts
- [ ] `modules/demandes/controllers/demandes.controller.ts`
- [ ] `modules/demandes/routes/demandes.route.ts`
- [ ] `pages/DemandesPage.tsx` — kanban statuts (Soumise→En cours→En relecture→Validée→Archivée)

## Progress Tracker

```
translate-service         ██████████ 100% ✅
Traduction server (M6)    ██████████ 100% ✅
Glossaire server (M7)     ██████████ 100% ✅
─────────────────────────────────────────────
Accords client (M1)       ██████████ 100% ✅
Courriers client (M4)     ██████████ 100% ✅
Missions client (M3)      ██████████ 100% ✅
Glossaire client (M7)     ██████████ 100% ✅
Traductions client (M6)   ░░░░░░░░░░   0% ← START HERE
Demandes server (M5)      ░░░░░░░░░░   0%
Demandes client (M5)      ░░░░░░░░░░   0%
─────────────────────────────────────────────
PDF/DOCX export           ░░░░░░░░░░   0% (Sprint 4 optional)
```
