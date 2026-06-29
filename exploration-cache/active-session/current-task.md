# 🎯 Current Task

**Session date**: 2026-06-29
**Status**: 🔄 Sprint 3 — IN PROGRESS

## ✅ Done: Sprint 3 Server — M1 Accords + M4 Courriers + M3 Missions

### M1 Accords (server)
- ✅ `modules/accords/services/accords.service.ts` — lister, getAccord, creerAccord, mettreAJour, renouveler, getAccordsExpirantDans
- ✅ `modules/accords/controllers/accords.controller.ts` — lister, expirantBientot, getById, creer, mettreAJour, renouveler
- ✅ `modules/accords/routes/accords.route.ts` — /expirant, CRUD, /:id/renouveler
- ✅ `jobs/alertes.ts` — cron 08h00 quotidien, alertes 30/60/90j accords expirants, email admins
- ✅ Route mounted: `app.use('/api/accords', accordsRoutes)`

### M4 Courriers (server)
- ✅ `modules/courriers/services/courriers.service.ts` — lister, getCourrier, creerCourrier, mettreAJour, getSansReponse, getFilCorrespondance + documentId
- ✅ `modules/courriers/controllers/courriers.controller.ts` — lister, sansReponse, getById, getFilCorrespondance, creer, mettreAJour
- ✅ `modules/courriers/routes/courriers.route.ts` — /sans-reponse, CRUD, /:id/fil
- ✅ Schema: `documentId` column added to courriers table
- ✅ Route mounted: `app.use('/api/courriers', courriersRoutes)`

### M3 Missions (server)
- ✅ `modules/missions/services/missions.service.ts` — lister, getMission, creerMission, mettreAJour, ajouterRecommandation, mettreAJourRecommandation, getRecommandationsEnAttente
- ✅ `modules/missions/controllers/missions.controller.ts` — lister, recommandationsEnAttente, getById, creer, mettreAJour, listerRecommandations, ajouterRecommandation, mettreAJourRecommandation
- ✅ `modules/missions/routes/missions.route.ts` — /recommandations/en-attente, CRUD, /:id/recommandations, /recommandations/:recId
- ✅ Route mounted: `app.use('/api/missions', missionsRoutes)`

### Server infra
- ✅ `morgan` HTTP logging middleware added (dev: 'dev', prod: 'combined')
- ✅ `demarrerJobsAlertes()` called at startup
- ✅ Auth rate limiter temporarily commented out for dev

## ✅ Done: Sprint 3 Client — M1 Accords + M4 Courriers

- ✅ `lib/accords.api.ts` — lister, getById, expirantBientot, creer, mettreAJour, renouveler
- ✅ `lib/courriers.api.ts` — lister, getById, getFilCorrespondance, sansReponse, creer, mettreAJour
- ✅ `lib/missions.api.ts` — lister, getById, recommandationsEnAttente, creer, mettreAJour, listerRecommandations, ajouterRecommandation, mettreAJourRecommandation
- ✅ `pages/AccordsPage.tsx` — layout inbox deux colonnes, liste filtrée, badges statut/expiration
- ✅ `pages/accords/components/AccordDetail.tsx` — vue détail, partenaires, accord parent, renouvellements
- ✅ `pages/accords/components/AccordFormPage.tsx` — création/édition, upload doc, sélecteur partenaires
- ✅ `pages/CourriersPage.tsx` — layout inbox deux colonnes, filtres direction/statut, badges urgence
- ✅ `pages/courriers/components/CourrierDetail.tsx` — détail, fil correspondance, accord lié
- ✅ `pages/courriers/components/CourrierFormPage.tsx` — création/édition/réponse, document joint
- ✅ `App.tsx` — /accords, /accords/:id, /accords/new, /accords/:id/edit, /courriers, /courriers/:id, /courriers/new, /courriers/:id/edit

## 🔄 Remaining: Sprint 3 Client — M3 Missions

- [ ] `pages/MissionsPage.tsx` — liste missions, vue détail inline, liste recommandations
- [ ] `pages/MissionFormPage.tsx` — création/édition, participants ANAC, rapport lié à M8

## Progress Tracker

```
Accords server (M1)   ██████████ 100% ✅
Courriers server (M4) ██████████ 100% ✅
Missions server (M3)  ██████████ 100% ✅
Alertes cron          ██████████ 100% ✅
─────────────────────────────────────────
Accords client        ██████████ 100% ✅
Courriers client      ██████████ 100% ✅
Missions client       ░░░░░░░░░░   0% ← START HERE
─────────────────────────────────────────
PDF/DOCX export       ░░░░░░░░░░   0% (Sprint 3 optional)
```
