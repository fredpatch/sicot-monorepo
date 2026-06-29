# SICOT – Task List / Plan de Développement

## Phase 0 – Initialisation (2 semaines)

- [ ] **Kick-off : validation CDC, affectation ressources** - CR de kick-off signé par toute l'équipe
- [ ] **Audit de l'existant** - Collecter et analyser les fichiers Excel CCIT actuels, documenter les process manuels
- [x] ~~**Valider la stack technique**~~ - React + Express + Drizzle + PostgreSQL confirmé, ESLint/Prettier/tsconfig configurés, monorepo initialisé (juin 2026)
- [x] ~~**Installer l'environnement dev**~~ - PostgreSQL installé et opérationnel sur poste dev Windows (juin 2026)
- [x] ~~**Test OCR sur corpus réel ANAC**~~ - Tesseract 5 validé sur documents convertis PDF→image, FR+EN opérationnels (juin 2026)
- [x] ~~**Test LibreTranslate FR↔EN**~~ - Validé FR↔EN, qualité acceptable V1, ajustements apostrophes+découpage paragraphes identifiés (juin 2026)
- [ ] **Import glossaire initial** - Si fichier fourni par CCIT, script import CSV/Excel → seed BDD
- [x] ~~**Modélisation BDD complète**~~ - Schéma Drizzle de toutes les entités (10 modules) créé et migré (juin 2026)

## Sprint 1 – Administration & Auth (M10) | ✅ COMPLÉTÉ

- [x] ~~**Structure projet**~~ - Monorepo 3 packages (shared/server/client), routing, middleware, modèles BDD de base (juin 2026)
- [ ] **Intégration API Personnel ANAC** - Fetch liste agents en temps réel
- [x] ~~**Flux bootstrap admin**~~ - Page BootstrapPage.tsx + service/controller/route, création Super Admin sans API Personnel ANAC (juin 2026)
- [x] ~~**Page connexion**~~ - LoginPage.tsx avec OTP + mot de passe, indicateur de force, 2 étapes (juin 2026)
- [x] ~~**Gestion des rôles**~~ - Middleware requireRole avec hiérarchie agent/traducteur/relecteur/admin/super_admin (juin 2026)
- [x] ~~**Interface admin utilisateurs**~~ - service/controller/route CRUD complet, activation, réinitialisation OTP (juin 2026)
- [x] ~~**Journal d'audit**~~ - service/controller/route lecture seule, filtres, métadonnées modules/actions (juin 2026)
- [x] ~~**Sauvegarde automatique BDD**~~ - Cron quotidien 02h00 local + hebdomadaire 03h00 NAS, rétention automatique (juin 2026)
- [x] ~~**Interface bilingue FR/EN**~~ - i18n configuré avec react-i18next, traductions FR/EN complètes pour tous les modules (juin 2026)
- [x] ~~**Charte graphique ANAC**~~ - Police Candara, couleurs institutionnelles (#1B2A5E), Tailwind configuré (juin 2026)

### Fichiers complétés Sprint 1

**Serveur**

- [x] ~~`src/utils/jwt.ts`~~ - signAccessToken, signRefreshToken, verify, cookies httpOnly (juin 2026)
- [x] ~~`src/utils/otp.ts`~~ - generateOTP, hashOTP, verifyOTP, expiration (juin 2026)
- [x] ~~`src/utils/email.ts`~~ - sendOTPEmail, sendAccordEcheanceEmail, sendRecommandationEmail (juin 2026)
- [x] ~~`src/middleware/auth.ts`~~ - authenticate via cookies httpOnly, clearAuthCookies, options cookies (juin 2026)
- [x] ~~`src/middleware/requireRole.ts`~~ - hiérarchie des rôles, requireAdmin, requireSuperAdmin (juin 2026)
- [x] ~~`src/services/auth.service.ts`~~ - login, setPassword, refreshToken, genererEtEnvoyerOTP, logAudit (juin 2026)
- [x] ~~`src/controllers/auth.controller.ts`~~ - login, setPassword, refresh, logout, me (juin 2026)
- [x] ~~`src/routes/auth.ts`~~ - /login, /set-password, /refresh, /logout, /me (juin 2026)
- [x] ~~`src/services/users.service.ts`~~ - lister, getById, creer, mettreAJour, toggleActivation, reinitialiserOTP (juin 2026)
- [x] ~~`src/controllers/users.controller.ts`~~ - CRUD complet, validation entrées, gestion erreurs (juin 2026)
- [x] ~~`src/routes/users.ts`~~ - GET /, POST /, GET /:id, PATCH /:id, PATCH /:id/activation, POST /:id/reinitialiser-otp (juin 2026)
- [x] ~~`src/services/audit.service.ts`~~ - listerAuditLogs, getAuditLog, getModulesDisponibles, getActionsDisponibles (juin 2026)
- [x] ~~`src/controllers/audit.controller.ts`~~ - lister, getById, getModules, getActions (juin 2026)
- [x] ~~`src/routes/audit.ts`~~ - GET /, GET /:id, GET /meta/modules, GET /meta/actions (juin 2026)
- [x] ~~`src/jobs/backup.ts`~~ - cron quotidien 02h00 + hebdomadaire dimanche 03h00, rétention 30j/12 mois (juin 2026)
- [x] ~~`src/index.ts`~~ - cookieParser, toutes routes branchées, jobs démarrés (juin 2026)

**Client**

- [x] ~~`src/lib/api.ts`~~ - instance Axios, intercepteur refresh automatique, endpoints auth/users/audit (juin 2026)
- [x] ~~`src/pages/LoginPage.tsx`~~ - connexion OTP + mot de passe, indicateur force, 2 étapes (juin 2026)
- [x] ~~`src/components/Layout.tsx`~~ - sidebar rétractable, header, toggle FR/EN, filtrage nav par rôle (juin 2026)
- [x] ~~`src/App.tsx`~~ - AuthContext, ProtectedRoute, AdminRoute, vérification session au démarrage (juin 2026)

## Sprint 2 – Documentaire & Partenaires (M8 + M2) | 2 semaines

- [x] ~~**Module upload fichiers**~~ - PDF, Word, Doc, Txt, Excel, images — Multer memoryStorage, stockage structuré /sicot/documents/ par catégorie (juin 2026)
- [ ] **Dossier surveillé /temp/** - Détection auto nouveaux fichiers, import sans action utilisateur
- [x] ~~**Microservice OCR Python**~~ - Flask+Waitress opérationnel port 5001, extraction validée PDF/DOCX/PNG/TXT/XLS, détection langue FR/EN (juin 2026)
- [x] ~~**Détection automatique PDF natif vs scanné**~~ - pdfplumber→Tesseract fallback implémenté et testé (juin 2026)
- [x] ~~**Détection langue source automatique**~~ - langdetect intégré dans microservice OCR, validé sur documents FR (juin 2026)
- [x] ~~**Classification auto par mots-clés**~~ - Analyse nom fichier + texte extrait, catégorie proposée corrigeable (juin 2026)
- [x] ~~**Gestion des versions documentaires**~~ - nouvellVersionDocument, parentId, version incrémentée (juin 2026)
- [x] ~~**Détection doublons MD5**~~ - calculerMD5, verifierDoublon, alerte 207 Multi-Status à l'upload (juin 2026)
- [x] ~~**Interface correction OCR manuelle**~~ - PATCH /:id/ocr, texte corrigé enregistré, statut→traite (juin 2026)
- [x] ~~**Fiche Organisation (M2)**~~ - CRUD complet, statut actif/inactif, types, filtres pays/région/type (juin 2026)
- [x] ~~**Fiche Contact rattachée**~~ - Plusieurs contacts par organisation, marquage principal, definirContactPrincipal (juin 2026)
- [x] ~~**Tableau partenaires**~~ - Filtres pays/région/type, métadonnées pays+régions disponibles (juin 2026)
- [ ] **Recherche full-text dans documents archivés** - PostgreSQL FTS

### Décisions techniques Sprint 2

- Microservice Python séparé exposé en HTTP local (port 5001) — appelé par Express via axios+form-data
- Formats supportés : .pdf, .docx, .doc, .txt, .xlsx, .xls, .jpg, .png, .tiff
- PDF natif → pdfplumber ; PDF scanné → pdf2image + Tesseract ; DOCX → python-docx ; DOC → LibreOffice headless
- Nettoyage post-OCR : suppression espaces parasites autour apostrophes (identifié lors test LibreTranslate)
- Conversion toujours côté serveur — l'utilisateur uploade le fichier original, pas d'action manuelle requise
- Multer memoryStorage — fichier en Buffer, sauvegarde disque après OCR dans le bon dossier catégorie

### Fichiers complétés Sprint 2

**Microservice OCR**

- [x] ~~`packages/ocr-service/requirements.txt`~~ - Flask, pdfplumber, pdf2image, pytesseract, python-docx, openpyxl, langdetect (juin 2026)
- [x] ~~`packages/ocr-service/main.py`~~ - Serveur Flask port 5001, extracteurs multi-format, nettoyage texte, détection langue (juin 2026)

**Serveur**

- [x] ~~`src/utils/ocr.ts`~~ - Client axios vers microservice OCR, gestion erreurs ECONNREFUSED/timeout (juin 2026)
- [x] ~~`src/utils/hash.ts`~~ - calculerMD5, hashesIdentiques (juin 2026)
- [x] ~~`src/services/documents.service.ts`~~ - upload, lister, getById, corrigerOCR, mettreAJourCategorie, nouvellVersion, verifierDoublon (juin 2026)
- [x] ~~`src/controllers/documents.controller.ts`~~ - upload, lister, getById, corrigerOCR, mettreAJourCategorie, nouvelleVersion, verifierDoublon (juin 2026)
- [x] ~~`src/routes/documents.ts`~~ - Multer config, /upload, /:id, /:id/ocr, /:id/categorie, /:id/nouvelle-version, /doublon (juin 2026)
- [x] ~~`src/services/organisations.service.ts`~~ - CRUD organisations+contacts, definirPrincipal, getPays, getRegions (juin 2026)
- [x] ~~`src/controllers/organisations.controller.ts`~~ - CRUD complet, listerContacts, creerContact, definirPrincipal, meta pays/regions (juin 2026)
- [x] ~~`src/routes/organisations.ts`~~ - /meta/pays, /meta/regions, CRUD, /:id/contacts, /contacts/:contactId (juin 2026)

**Client React Sprint 2**

- [x] ~~`src/lib/api.ts`~~ - endpoints documents + organisations ajoutés, timeout 120s upload (juin 2026)
- [x] ~~`src/pages/DocumentsPage.tsx`~~ - liste filtrable, upload multi-format, badge OCR, modal correction, pagination (juin 2026)
- [x] ~~`src/pages/PartenairesPage.tsx`~~ - tableau organisations, filtres pays/région/type, modal contacts, formulaires (juin 2026)

**Bootstrap & Auth (ajout post-Sprint 1)**

- [x] ~~`src/services/bootstrap.service.ts`~~ - estInitialise, initialiserSuperAdmin (juin 2026)
- [x] ~~`src/controllers/bootstrap.controller.ts`~~ - status, init (juin 2026)
- [x] ~~`src/routes/bootstrap.ts`~~ - GET /status, POST /init, routes publiques (juin 2026)
- [x] ~~`src/pages/BootstrapPage.tsx`~~ - formulaire Super Admin, indicateur force mot de passe, redirection login (juin 2026)
- [x] ~~`src/App.tsx`~~ - vérification bootstrap au démarrage, BootstrapRoute, écran chargement initial (juin 2026)
- [x] ~~`src/pages/LoginPage.tsx`~~ - setUser après connexion réussie, redirection dashboard corrigée (juin 2026)

## Sprint 3 – Accords, Correspondances & Missions (M1 + M4 + M3) | 2 semaines

- [x] ~~**Fiche Accord (M1)**~~ - Champs complets, statuts, référence auto ACC-YYYY-XXXX, many-to-many partenaires (juin 2026)
- [x] ~~**Relation many-to-many accords-partenaires**~~ - accordsOrganisations, mise à jour complète (juin 2026)
- [x] ~~**Gestion versions accord**~~ - renouvelerAccord, parentId, accord parent → en_renouvellement (juin 2026)
- [x] ~~**Alertes échéances accord**~~ - Cron 08h00 quotidien, alertes 30/60/90j, email admins (juin 2026)
- [x] ~~**Fiche Courrier (M4)**~~ - Entrant/Sortant, référence auto CORR-YYYY-XXXX, fil correspondance (juin 2026)
- [x] ~~**Fil de correspondance**~~ - reponseAId, courrier parent → repondu automatiquement (juin 2026)
- [x] ~~**Suivi réponse courrier**~~ - Date limite, statut oui/non/pour_information, sansReponse filter (juin 2026)
- [x] ~~**Fiche Mission (M3)**~~ - Titre, destination, pays, dates, participants ANAC (juin 2026)
- [x] ~~**Double option rapport de mission**~~ - rapportDocumentId lié à M8, upload via route documents (juin 2026)
- [x] ~~**Liste recommandations**~~ - Texte + responsable + date limite + statut En attente/En cours/Réalisée (juin 2026)
- [x] ~~**Alertes recommandations**~~ - Email envoyé uniquement si responsableId ET dateLimite définis (juin 2026)
- [ ] **Export PDF/DOCX** - Accords, courriers, rapports de mission (templates aux couleurs ANAC)

### Fichiers complétés Sprint 3

**Serveur**

- [x] ~~`src/services/accords.service.ts`~~ - lister, getAccord, creerAccord, mettreAJour, renouveler, getAccordsExpirantDans (juin 2026)
- [x] ~~`src/controllers/accords.controller.ts`~~ - lister, expirantBientot, getById, creer, mettreAJour, renouveler (juin 2026)
- [x] ~~`src/routes/accords.ts`~~ - /expirant, CRUD, /:id/renouveler (juin 2026)
- [x] ~~`src/jobs/alertes.ts`~~ - cron 08h00 quotidien, alertes 30/60/90j accords expirants (juin 2026)
- [x] ~~`src/services/courriers.service.ts`~~ - lister, getCourrier, creerCourrier, mettreAJour, getSansReponse, getFilCorrespondance (juin 2026)
- [x] ~~`src/controllers/courriers.controller.ts`~~ - lister, sansReponse, getById, getFilCorrespondance, creer, mettreAJour (juin 2026)
- [x] ~~`src/routes/courriers.ts`~~ - /sans-reponse, CRUD, /:id/fil (juin 2026)
- [x] ~~`src/services/missions.service.ts`~~ - lister, getMission, creerMission, mettreAJour, ajouterRecommandation, mettreAJourRecommandation, getRecommandationsEnAttente (juin 2026)
- [x] ~~`src/controllers/missions.controller.ts`~~ - lister, recommandationsEnAttente, getById, creer, mettreAJour, listerRecommandations, ajouterRecommandation, mettreAJourRecommandation (juin 2026)
- [x] ~~`src/routes/missions.ts`~~ - /recommandations/en-attente, CRUD, /:id/recommandations, /recommandations/:recId (juin 2026)

**À faire — Client React Sprint 3**

- [ ] `src/lib/api.ts` — ajouter endpoints accords + courriers + missions
- [ ] `src/pages/AccordsPage.tsx` — liste, création, renouvellement, alertes
- [ ] `src/pages/CourriersPage.tsx` — liste, création, fil de correspondance
- [ ] `src/pages/MissionsPage.tsx` — liste, création, recommandations

## Sprint 4 – Traduction IA, Glossaire & Demandes (M6 + M7 + M5) | 3 semaines

- [ ] **Base glossaire (M7)** - Termes FR↔EN, domaines, historique modifications, gestion termes inactifs
- [ ] **Script import glossaire CSV/Excel**
- [x] ~~**Intégration LibreTranslate on-prem**~~ - Microservice translate-service port 5002, batch par paragraphes, nettoyage apostrophes (juin 2026)
- [x] ~~**Configuration DeepL fallback**~~ - Activable via DEEPL_ENABLED dans microservice, transparent pour Express (juin 2026)
- [x] ~~**Éditeur côte-à-côte (M6)**~~ - traduction.service.ts complet, workflow statuts implémenté (juin 2026)
- [x] ~~**Workflow traduction**~~ - a_reviser → approuvee → archivee, archivage bloqué sans approbation (juin 2026)
- [x] ~~**Suggestions glossaire dans éditeur**~~ - getSuggestionsGlossaire, recherche FR↔EN dans glossaire (juin 2026)
- [x] ~~**Sauvegarde delta corrections**~~ - enrichirGlossaireDepuisCorrection, delta IA vs corrigé → M7 auto (juin 2026)
- [x] ~~**Gestion échec moteur IA**~~ - statut manuelle_requise si LibreTranslate inaccessible (juin 2026)
- [ ] **Inbox commune demandes (M5)** - Fichier uploadé OU texte libre, auto-assignation avec verrou BDD
- [ ] **Statuts demande** - Soumise → En cours → En relecture → Validée → Archivée
- [ ] **Rappel de demande par demandeur** - Possible si statut 'Soumise' uniquement
- [ ] **Système de priorité** - Demandeur propose (Normale/Urgente), Admin/CCIT valide ou modifie
- [ ] **Export DOCX texte libre traduit**

### Fichiers complétés Sprint 4

**Microservice Traduction**

- [x] ~~`packages/translate-service/requirements.txt`~~ - flask, waitress, langdetect, requests (juin 2026)
- [x] ~~`packages/translate-service/main.py`~~ - /translate, /translate/batch, /detect, /health, fallback DeepL, nettoyage texte (juin 2026)

**Serveur — M6 Traduction IA**

- [x] ~~`src/utils/traduction.ts`~~ - traduireSegment, traduireTexte batch, detecterLangue, verifierLibreTranslate (juin 2026)
- [x] ~~`src/services/traduction.service.ts`~~ - lancerTraduction, sauvegarderCorrection, approuver, archiver, lister, getSuggestionsGlossaire, enrichirGlossaire (juin 2026)
- [x] ~~`src/controllers/traduction.controller.ts`~~ - lancer, correction, approuver, archiver, lister, getById, suggestions, moteurStatus (juin 2026)
- [x] ~~`src/routes/traductions.ts`~~ - /moteur/status, CRUD, /:id/correction, /:id/approuver, /:id/archiver, /:id/suggestions (juin 2026)

**À faire — Sprint 4 restant**

- [ ] `src/services/glossaire.service.ts` — M7 CRUD termes, import CSV, historique
- [ ] `src/controllers/glossaire.controller.ts`
- [ ] `src/routes/glossaire.ts`
- [ ] `src/services/demandes.service.ts` — M5 inbox, verrou BDD, priorités
- [ ] `src/controllers/demandes.controller.ts`
- [ ] `src/routes/demandes.ts`
- [ ] Pages React Sprint 3+4 : AccordsPage, CourriersPage, MissionsPage, TraductionsPage, GlossairePage, DemandesPage

## Sprint 5 – Dashboard & Statistiques (M9) | 2 semaines

- [ ] **Dashboard général (5 blocs)** - Traductions / Correspondances sans réponse / Accords expirant / Missions & recommandations / Documents archivés
- [ ] **Courriers sans réponse flagués en rouge**
- [ ] **Accords expirant sous 90j mis en évidence**
- [ ] **Rapport mensuel automatique** - Cron 1er du mois → PDF + Excel → archivé dans M8
- [ ] **Rapport manuel à la demande** - Sélection période + modules inclus
- [ ] **Template PDF rapport** - Couleurs ANAC, logo, mise en page professionnelle
- [ ] **Export Excel données brutes** - Un onglet par module
- [ ] **Historique des rapports générés** - Consultable dans l'interface
- [ ] **Gestion état vide au premier démarrage** - Aucun chiffre cassé, affichage propre

## Sprint 6 – Tests, Recette & Corrections | 2 semaines

- [ ] **Tests fonctionnels complets** - 10 modules, scénarios utilisateur réels (Mme NGO MYTOULOU + M. NDONG)
- [ ] **Tests de charge LAN ANAC** - Accès multi-utilisateurs simultanés
- [ ] **Tests OCR corpus complet** - Accords, correspondances, documents mixtes
- [ ] **Tests LibreTranslate documents réels** - Évaluation qualité sur corpus aéronautique ANAC
- [ ] **Recette utilisateurs CCIT** - R. SOUNGOU + D-L. NTSAME, scénarios métier réels
- [ ] **Corrections issues de recette** - Buffer 20% de la charge totale
- [ ] **Rédaction manuel utilisateur complet** - Tous profils (M. NDONG N'NANG)
- [ ] **Rapport de recette v1.0 signé** - Mme NGO MYTOULOU

## Sprint 7 – Déploiement Production & Formation | 2 semaines

- [ ] **Installation SICOT v1.0 sur SERV-APPI** - Environnement production
- [ ] **Configuration réseau LAN ANAC** - Accès postes clients toutes directions
- [ ] **Migration données existantes** - Accords et partenaires depuis fichiers Excel CCIT
- [ ] **Validation bootstrap admin en production** - Activation comptes pilotes
- [ ] **Formation Agent & Traducteur** - Demi-journée (M. NDONG N'NANG)
- [ ] **Formation Relecteur & Administrateur** - Demi-journée (M. NDONG N'NANG)
- [ ] **Formation Direction Générale** - Dashboard & rapports, 1h (M. NDONG N'NANG)
- [ ] **Remise manuels utilisateurs et guide administrateur**
- [ ] **Plan de maintenance évolutive et corrective** - Documenté par le Service Informatique

## Waiting On

- [ ] **Glossaire CCIT existant** - Attente fichier CSV/Excel de la Cellule CCIT pour seed initial M7
- [ ] **Intégration API Personnel ANAC** - En attente documentation complète de l'API (Sprint 1 partiel)
- [ ] **Accès SERV-APPI** - Confirmer droits d'installation pour l'équipe dev (PostgreSQL, LibreTranslate, Tesseract)
- [ ] **Décision DeepL** - La DG valide-t-elle l'option fallback cloud DeepL ? Contrat RGPD à prévoir

## Done

- [x] ~~**Monorepo SICOT initialisé**~~ - Structure 3 packages, tsconfig, ESLint, Prettier, .gitignore (juin 2026)
- [x] ~~**Schema BDD Drizzle complet**~~ - 10 modules, enums, tables, relations, index, migration appliquée (juin 2026)
- [x] ~~**Stack client configurée**~~ - React 18 + Vite + Tailwind, couleurs ANAC, i18n FR/EN, router (juin 2026)
- [x] ~~**Sprint 1 M10 complété**~~ - Auth, Users, Audit, Backup, Layout, LoginPage, App.tsx, api.ts (juin 2026)
- [x] ~~**Sprint 2 M8+M2 complété**~~ - OCR microservice Python, Documents, Organisations+Contacts, pages React (juin 2026)
- [x] ~~**Bootstrap admin opérationnel**~~ - Premier démarrage sans API Personnel ANAC, Super Admin créable via formulaire (juin 2026)
- [x] ~~**Flux connexion complet**~~ - Bootstrap → Login → Dashboard, AuthContext mis à jour, redirections fonctionnelles (juin 2026)
