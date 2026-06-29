Voici le TASKS.md mis à jour — copie-colle intégralement :
markdown# SICOT – Task List / Plan de Développement

## Phase 0 – Initialisation (2 semaines)

- [ ] **Kick-off : validation CDC, affectation ressources** - CR de kick-off signé par toute l'équipe
- [ ] **Audit de l'existant** - Collecter et analyser les fichiers Excel CCIT actuels, documenter les process manuels
- [x] ~~**Valider la stack technique**~~ - React + Express + Drizzle + PostgreSQL confirmé, ESLint/Prettier/tsconfig configurés, monorepo initialisé (juin 2026)
- [x] ~~**Installer l'environnement dev**~~ - PostgreSQL installé et opérationnel sur poste dev Windows (juin 2026)
- [x] ~~**Test OCR sur corpus réel ANAC**~~ - Tesseract 5 validé sur documents convertis PDF→image, FR+EN opérationnels (juin 2026)
- [x] ~~**Test LibreTranslate FR↔EN**~~ - Validé FR↔EN via microservice translate-service port 5002, qualité acceptable V1 (juin 2026)
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

- [x] ~~`src/lib/api.ts`~~ - instance Axios, intercepteur refresh automatique, exports tous modules (juin 2026)
- [x] ~~`src/pages/LoginPage.tsx`~~ - connexion OTP + mot de passe, indicateur force, 2 étapes (juin 2026)
- [x] ~~`src/components/Layout.tsx`~~ - sidebar rétractable, header, toggle FR/EN, filtrage nav par rôle (juin 2026)
- [x] ~~`src/App.tsx`~~ - AuthContext, ProtectedRoute, AdminRoute, vérification session au démarrage (juin 2026)

## Sprint 2 – Documentaire & Partenaires (M8 + M2) | ✅ COMPLÉTÉ

- [x] ~~**Module upload fichiers**~~ - PDF, Word, Doc, Txt, Excel, images — Multer memoryStorage, stockage structuré /sicot/documents/ par catégorie (juin 2026)
- [ ] **Dossier surveillé /temp/** - Détection auto nouveaux fichiers, import sans action utilisateur
- [x] ~~**Microservice OCR Python**~~ - Flask+Waitress opérationnel port 5001, extraction validée PDF/DOCX/PNG/TXT/XLS, détection langue FR/EN (juin 2026)
- [x] ~~**Détection automatique PDF natif vs scanné**~~ - pdfplumber→Tesseract fallback implémenté et testé (juin 2026)
- [x] ~~**Détection langue source automatique**~~ - langdetect intégré dans microservice OCR, validé sur documents FR (juin 2026)
- [x] ~~**Classification auto par mots-clés**~~ - Analyse nom fichier + texte extrait, catégorie proposée corrigeable (juin 2026)
- [x] ~~**Gestion des versions documentaires**~~ - nouvellVersionDocument, parentId, version incrémentée (juin 2026)
- [x] ~~**Détection doublons MD5**~~ - calculerMD5, verifierDoublon, alerte 207 Multi-Status à l'upload (juin 2026)
- [x] ~~**Interface correction OCR manuelle**~~ - PATCH /:id/ocr, texte corrigé enregistré, statut→traite (juin 2026)
- [x] ~~**Relance OCR sur document existant**~~ - POST /:id/retraiter-ocr, relit fichier disque, relance Tesseract (juin 2026)
- [x] ~~**Soft delete documents**~~ - DELETE /:id, champ deleted_at, filtre isNull dans lister, restauration possible (juin 2026)
- [x] ~~**Fiche Organisation (M2)**~~ - CRUD complet, statut actif/inactif, types, filtres pays/région/type (juin 2026)
- [x] ~~**Fiche Contact rattachée**~~ - Plusieurs contacts par organisation, marquage principal, definirContactPrincipal (juin 2026)
- [x] ~~**Tableau partenaires**~~ - Filtres pays/région/type, métadonnées pays+régions disponibles (juin 2026)
- [ ] **Recherche full-text dans documents archivés** - PostgreSQL FTS

### Fichiers complétés Sprint 2

**Microservice OCR**

- [x] ~~`packages/ocr-service/requirements.txt`~~ - Flask, pdfplumber, pdf2image, pytesseract, python-docx, openpyxl, langdetect (juin 2026)
- [x] ~~`packages/ocr-service/main.py`~~ - Serveur Flask port 5001, extracteurs multi-format, nettoyage texte, détection langue (juin 2026)

**Serveur**

- [x] ~~`src/utils/ocr.ts`~~ - Client axios vers microservice OCR, gestion erreurs ECONNREFUSED/timeout (juin 2026)
- [x] ~~`src/utils/hash.ts`~~ - calculerMD5, hashesIdentiques (juin 2026)
- [x] ~~`src/services/documents.service.ts`~~ - upload, lister (filtre deletedAt), getById, corrigerOCR, mettreAJourCategorie, nouvellVersion, verifierDoublon, getCheminDocument, supprimerDocument, restaurerDocument, retraiterOCR (juin 2026)
- [x] ~~`src/controllers/documents.controller.ts`~~ - upload, lister, getById, corrigerOCR, mettreAJourCategorie, nouvelleVersion, verifierDoublon, telecharger, supprimer, restaurer, retraiterOCR (juin 2026)
- [x] ~~`src/routes/documents.ts`~~ - toutes routes + DELETE /:id, PATCH /:id/restaurer, POST /:id/retraiter-ocr (juin 2026)
- [x] ~~`src/services/organisations.service.ts`~~ - CRUD organisations+contacts, definirPrincipal, getPays, getRegions (juin 2026)
- [x] ~~`src/controllers/organisations.controller.ts`~~ - CRUD complet, listerContacts, creerContact, definirPrincipal, meta pays/regions (juin 2026)
- [x] ~~`src/routes/organisations.ts`~~ - /meta/pays, /meta/regions, CRUD, /:id/contacts, /contacts/:contactId (juin 2026)

**Client React Sprint 2**

- [x] ~~`src/lib/documents.api.ts`~~ - lister, getById, upload, nouvelleVersion, corrigerOCR, mettreAJourCategorie, verifierDoublon, getUrlTelechargement, supprimer, restaurer, retraiterOCR (juin 2026)
- [x] ~~`src/lib/organisations.api.ts`~~ - lister, getById, creer, mettreAJour, getPays, getRegions, listerContacts, creerContact, mettreAJourContact, definirContactPrincipal (juin 2026)
- [x] ~~`src/pages/DocumentsPage.tsx`~~ - liste filtrable, upload, badge OCR, modal correction, relance OCR, soft delete, pagination (juin 2026)
- [x] ~~`src/pages/PartenairesPage.tsx`~~ - tableau organisations, filtres pays/région/type, modal contacts, formulaires (juin 2026)

**Bootstrap & Auth (ajout post-Sprint 1)**

- [x] ~~`src/services/bootstrap.service.ts`~~ - estInitialise, initialiserSuperAdmin (juin 2026)
- [x] ~~`src/controllers/bootstrap.controller.ts`~~ - status, init (juin 2026)
- [x] ~~`src/routes/bootstrap.ts`~~ - GET /status, POST /init, routes publiques (juin 2026)
- [x] ~~`src/pages/BootstrapPage.tsx`~~ - formulaire Super Admin, indicateur force mot de passe, redirection login (juin 2026)

## Sprint 3 – Accords, Correspondances & Missions (M1 + M4 + M3) | ✅ COMPLÉTÉ

- [x] ~~**Fiche Accord (M1)**~~ - Champs complets, statuts, référence auto ACC-YYYY-XXXX, many-to-many partenaires (juin 2026)
- [x] ~~**Relation many-to-many accords-partenaires**~~ - accordsOrganisations, mise à jour complète (juin 2026)
- [x] ~~**Gestion versions accord**~~ - renouvelerAccord, parentId, accord parent → en_renouvellement (juin 2026)
- [x] ~~**Alertes échéances accord**~~ - Cron 08h00 quotidien, alertes 30/60/90j, email admins (juin 2026)
- [x] ~~**Fiche Courrier (M4)**~~ - Entrant/Sortant, référence auto CORR-YYYY-XXXX, fil correspondance, documentId (juin 2026)
- [x] ~~**Fil de correspondance**~~ - reponseAId, courrier parent → repondu automatiquement (juin 2026)
- [x] ~~**Suivi réponse courrier**~~ - Date limite, statut oui/non/pour_information, sansReponse filter (juin 2026)
- [x] ~~**Fiche Mission (M3)**~~ - Titre, destination, pays, dates, participants ANAC (juin 2026)
- [x] ~~**Double option rapport de mission**~~ - rapportDocumentId lié à M8, upload + lier existant depuis formulaire (juin 2026)
- [x] ~~**Liste recommandations**~~ - Texte + responsable + date limite + statut, changement statut rapide inline (juin 2026)
- [x] ~~**Alertes recommandations**~~ - Email envoyé uniquement si responsableId ET dateLimite définis (juin 2026)
- [ ] **Export PDF/DOCX** - Accords, courriers, rapports de mission (templates aux couleurs ANAC)

### Fichiers complétés Sprint 3

**Serveur**

- [x] ~~`src/services/accords.service.ts`~~ - lister, getAccord, creerAccord, mettreAJour, renouveler, getAccordsExpirantDans (juin 2026)
- [x] ~~`src/controllers/accords.controller.ts`~~ - lister, expirantBientot, getById, creer, mettreAJour, renouveler (juin 2026)
- [x] ~~`src/routes/accords.ts`~~ - /expirant, CRUD, /:id/renouveler (juin 2026)
- [x] ~~`src/jobs/alertes.ts`~~ - cron 08h00 quotidien, alertes 30/60/90j accords expirants (juin 2026)
- [x] ~~`src/services/courriers.service.ts`~~ - lister, getCourrier, creerCourrier, mettreAJour, getSansReponse, getFilCorrespondance, documentId (juin 2026)
- [x] ~~`src/controllers/courriers.controller.ts`~~ - lister, sansReponse, getById, getFilCorrespondance, creer, mettreAJour (juin 2026)
- [x] ~~`src/routes/courriers.ts`~~ - /sans-reponse, CRUD, /:id/fil (juin 2026)
- [x] ~~`src/services/missions.service.ts`~~ - lister, getMission, creerMission, mettreAJour, ajouterRecommandation, mettreAJourRecommandation, getRecommandationsEnAttente (juin 2026)
- [x] ~~`src/controllers/missions.controller.ts`~~ - lister, recommandationsEnAttente, getById, creer, mettreAJour, listerRecommandations, ajouterRecommandation, mettreAJourRecommandation (juin 2026)
- [x] ~~`src/routes/missions.ts`~~ - /recommandations/en-attente, CRUD, /:id/recommandations, /recommandations/:recId (juin 2026)

**Migration BDD**

- [x] ~~`ALTER TABLE courriers ADD COLUMN document_id`~~ - Champ documentId ajouté + référence documents (juin 2026)
- [x] ~~`ALTER TABLE documents ADD COLUMN deleted_at`~~ - Soft delete documents (juin 2026)
- [x] ~~`ALTER TABLE traductions ADD COLUMN deleted_at`~~ - Soft delete traductions (juin 2026)

**Client React Sprint 3**

- [x] ~~`src/lib/accords.api.ts`~~ - lister, getById, expirantBientot, creer, mettreAJour, renouveler (juin 2026)
- [x] ~~`src/lib/courriers.api.ts`~~ - lister, getById, getFilCorrespondance, sansReponse, creer, mettreAJour (juin 2026)
- [x] ~~`src/lib/missions.api.ts`~~ - lister, getById, recommandationsEnAttente, creer, mettreAJour, listerRecommandations, ajouterRecommandation, mettreAJourRecommandation (juin 2026)
- [x] ~~`src/lib/api.ts`~~ - tous modules exportés (juin 2026)
- [x] ~~`src/pages/AccordsPage.tsx`~~ - layout inbox deux colonnes, liste filtrée, badges statut/expiration, mobile-first (juin 2026)
- [x] ~~`src/pages/AccordDetail.tsx`~~ - vue détail lecture seule, partenaires, document lié + consultation, accord parent, renouvellements, alertes expiration (juin 2026)
- [x] ~~`src/pages/AccordFormPage.tsx`~~ - création/édition, upload document intégré + lier existant, sélecteur partenaires checkboxes, renouvellement inline (juin 2026)
- [x] ~~`src/pages/CourriersPage.tsx`~~ - layout inbox deux colonnes, filtres direction/statut, badges urgence, mobile masque liste (juin 2026)
- [x] ~~`src/pages/CourrierDetail.tsx`~~ - détail complet, fil correspondance, courrier parent, accord lié navigable, document joint + consultation, archivage rapide (juin 2026)
- [x] ~~`src/pages/CourrierFormPage.tsx`~~ - création/édition/réponse, pré-remplissage RE:, upload document + lier existant, rattachement accord, champs figés en édition (juin 2026)
- [x] ~~`src/pages/MissionsPage.tsx`~~ - layout inbox deux colonnes, filtres statut, indicateur rapport manquant, mobile-first (juin 2026)
- [x] ~~`src/pages/MissionDetail.tsx`~~ - vue détail, participants, rapport + consultation, recommandations inline, changement statut rapide, formulaire ajout recommandation (juin 2026)
- [x] ~~`src/pages/MissionFormPage.tsx`~~ - création/édition, sélecteur participants checkboxes, upload rapport + lier existant, statut en édition, validation dates (juin 2026)

**Routes App.tsx**

- [x] ~~`/accords`, `/accords/:id`, `/accords/new`, `/accords/:id/edit`~~ (juin 2026)
- [x] ~~`/courriers`, `/courriers/:id`, `/courriers/new`, `/courriers/:id/edit`~~ (juin 2026)
- [x] ~~`/missions`, `/missions/:id`, `/missions/new`, `/missions/:id/edit`~~ (juin 2026)

## Sprint 4 – Traduction IA, Glossaire & Demandes (M6 + M7 + M5) | ✅ COMPLÉTÉ

- [x] ~~**Base glossaire (M7)**~~ - Termes FR↔EN, domaines, historique modifications, gestion termes inactifs (juin 2026)
- [x] ~~**Script import glossaire CSV/Excel**~~ - Route POST /glossaire/import, détection doublons, log audit (juin 2026)
- [x] ~~**Microservice translate-service**~~ - Port 5002, appelle LibreTranslate port 5000, /translate, /translate/batch, /detect, /health (juin 2026)
- [x] ~~**Intégration LibreTranslate on-prem**~~ - Traduction FR↔EN par segments via microservice, timeout 3 minutes (juin 2026)
- [ ] **Configuration DeepL fallback** - Activable/désactivable par admin — en attente décision DG
- [x] ~~**Éditeur côte-à-côte (M6)**~~ - Original gauche / traduction droite modifiable, page dédiée /traductions/:id (juin 2026)
- [x] ~~**Workflow traduction**~~ - Statuts : À réviser → Approuver / Archiver (archivage bloqué sans approbation humaine) (juin 2026)
- [x] ~~**Suggestions glossaire dans éditeur**~~ - Surligné auto si terme connu détecté sur sélection, clic pour appliquer (juin 2026)
- [x] ~~**Sauvegarde delta corrections**~~ - Différence IA vs corrigé → enrichissement automatique M7 (juin 2026)
- [x] ~~**Gestion échec moteur IA**~~ - Statut 'manuelle_requise', alerte dans éditeur, saisie manuelle possible (juin 2026)
- [x] ~~**Soft delete traductions**~~ - DELETE /:id, bloquer si approuvée/archivée, remise à zéro demande M5 liée (juin 2026)
- [x] ~~**Inbox commune demandes (M5)**~~ - Tableau filtrable, document ou texte libre, verrou BDD anti-doublon (juin 2026)
- [x] ~~**Statuts demande**~~ - Soumise → En cours → En relecture → Validée → Archivée (juin 2026)
- [x] ~~**Rappel de demande par demandeur**~~ - Possible si statut 'Soumise' uniquement (juin 2026)
- [x] ~~**Système de priorité**~~ - Demandeur propose, Admin/Relecteur valide ou modifie via modal (juin 2026)
- [ ] **Export DOCX texte libre traduit**

### Fichiers complétés Sprint 4

**Serveur**

- [x] ~~`src/utils/traduction.ts`~~ - traduireSegment, traduireTexte, detecterLangue, verifierLibreTranslate via translate-service port 5002 (juin 2026)
- [x] ~~`src/services/glossaire.service.ts`~~ - listerTermes, getTerme, creerTerme, mettreAJourTerme, desactiverTerme, suggererTermes, importerTermes (juin 2026)
- [x] ~~`src/controllers/glossaire.controller.ts`~~ - lister, suggestions, getById, creer, mettreAJour, desactiver, importerCSV (juin 2026)
- [x] ~~`src/routes/glossaire.ts`~~ - /suggestions, /import, CRUD, /:id/desactiver (juin 2026)
- [x] ~~`src/services/traduction.service.ts`~~ - lancerTraduction, sauvegarderCorrection, approuverTraduction, archiverTraduction, listerTraductions, getTraduction, getSuggestionsGlossaire, verifierMoteur, supprimerTraduction, restaurerTraduction (juin 2026)
- [x] ~~`src/controllers/traduction.controller.ts`~~ - lister, moteurStatus, getById, lancer, sauvegarderCorrection, approuver, archiver, suggestions, supprimer, restaurer (juin 2026)
- [x] ~~`src/routes/traduction.ts`~~ - timeout 3min, /moteur/status, CRUD, /:id/correction, /:id/approuver, /:id/archiver, /:id/suggestions, DELETE /:id, /:id/restaurer (juin 2026)
- [x] ~~`src/services/demandes.service.ts`~~ - creerDemande, listerDemandes, getDemande, prendreEnCharge (verrou BDD), rappelerDemande, validerPriorite, passerEnRelecture, validerDemande, archiverDemande (juin 2026)
- [x] ~~`src/controllers/demandes.controller.ts`~~ - lister, getById, creer, prendreEnCharge, rappeler, validerPriorite, passerEnRelecture, valider, archiver (juin 2026)
- [x] ~~`src/routes/demandes.ts`~~ - CRUD, /:id/prendre-en-charge, /:id/rappeler, /:id/priorite, /:id/relecture, /:id/valider, /:id/archiver (juin 2026)

**Client React Sprint 4**

- [x] ~~`src/lib/glossaire.api.ts`~~ - lister, getById, suggestions, creer, mettreAJour, desactiver, importerCSV (juin 2026)
- [x] ~~`src/lib/traductions.api.ts`~~ - lister, getById, moteurStatus, lancer (timeout 3min), sauvegarderCorrection, approuver, archiver, suggestions, supprimer, restaurer (juin 2026)
- [x] ~~`src/lib/demandes.api.ts`~~ - lister, getById, creer, prendreEnCharge, rappeler, validerPriorite, passerEnRelecture, valider, archiver (juin 2026)
- [x] ~~`src/pages/GlossairePage.tsx`~~ - tableau filtrable, modal créer/modifier, historique modifications, désactivation (juin 2026)
- [x] ~~`src/pages/TraductionsPage.tsx`~~ - tableau filtrable, modal nouvelle traduction, statut moteur, soft delete, prefill sessionStorage depuis Documents (juin 2026)
- [x] ~~`src/pages/TraductionEditeur.tsx`~~ - éditeur côte-à-côte, suggestions glossaire sur sélection, workflow approbation/archivage, soft delete (juin 2026)
- [x] ~~`src/pages/DemandesPage.tsx`~~ - tableau filtrable, modal nouvelle demande (document/texte), workflow complet, modal priorité, actions contextuelles par rôle (juin 2026)

**Routes App.tsx**

- [x] ~~`/glossaire`~~ (juin 2026)
- [x] ~~`/traductions`, `/traductions/:id`~~ (juin 2026)
- [x] ~~`/demandes`~~ (juin 2026)

## Sprint 5 – Dashboard & Statistiques (M9) | ⬜ À FAIRE

- [ ] **Dashboard général (5 blocs)** - Traductions / Correspondances sans réponse / Accords expirant / Missions & recommandations / Documents archivés
- [ ] **Courriers sans réponse flagués en rouge**
- [ ] **Accords expirant sous 90j mis en évidence**
- [ ] **Rapport mensuel automatique** - Cron 1er du mois → PDF + Excel → archivé dans M8
- [ ] **Rapport manuel à la demande** - Sélection période + modules inclus
- [ ] **Template PDF rapport** - Couleurs ANAC, logo, mise en page professionnelle
- [ ] **Export Excel données brutes** - Un onglet par module
- [ ] **Historique des rapports générés** - Consultable dans l'interface
- [ ] **Gestion état vide au premier démarrage** - Aucun chiffre cassé, affichage propre

## Sprint 6 – Tests, Recette & Corrections | ⬜ À FAIRE

- [ ] **Tests fonctionnels complets** - 10 modules, scénarios utilisateur réels (Mme NGO MYTOULOU + M. NDONG)
- [ ] **Tests de charge LAN ANAC** - Accès multi-utilisateurs simultanés
- [ ] **Tests OCR corpus complet** - Accords, correspondances, documents mixtes
- [ ] **Tests LibreTranslate documents réels** - Évaluation qualité sur corpus aéronautique ANAC
- [ ] **Recette utilisateurs CCIT** - R. SOUNGOU + D-L. NTSAME, scénarios métier réels
- [ ] **Corrections issues de recette** - Buffer 20% de la charge totale
- [ ] **Rédaction manuel utilisateur complet** - Tous profils (M. NDONG N'NANG)
- [ ] **Rapport de recette v1.0 signé** - Mme NGO MYTOULOU

## Sprint 7 – Déploiement Production & Formation | ⬜ À FAIRE

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
- [x] ~~**Schema BDD Drizzle complet**~~ - 10 modules, enums, tables, relations, index, migrations appliquées (juin 2026)
- [x] ~~**Stack client configurée**~~ - React 18 + Vite + Tailwind, couleurs ANAC, i18n FR/EN, router (juin 2026)
- [x] ~~**Sprint 1 M10 complété**~~ - Auth, Users, Audit, Backup, Layout, LoginPage, App.tsx (juin 2026)
- [x] ~~**Sprint 2 M8+M2 complété**~~ - OCR microservice Python, Documents + soft delete + relance OCR, Organisations+Contacts (juin 2026)
- [x] ~~**Bootstrap admin opérationnel**~~ - Premier démarrage sans API Personnel ANAC (juin 2026)
- [x] ~~**Flux connexion complet**~~ - Bootstrap → Login → Dashboard, AuthContext, redirections (juin 2026)
- [x] ~~**Route téléchargement documents**~~ - GET /api/documents/:id/telecharger, stream fichier inline (juin 2026)
- [x] ~~**Sprint 3 M1+M4+M3 complété**~~ - Accords, Courriers, Missions — serveur + client complets (juin 2026)
- [x] ~~**Sprint 4 M7+M6+M5 complété**~~ - Glossaire, Traduction IA + éditeur, Demandes — serveur + client complets (juin 2026)
- [x] ~~**Microservice translate-service**~~ - Port 5002, batch, health, détection langue, timeout 3min (juin 2026)
- [x] ~~**Soft delete M8 Documents**~~ - deleted_at, relance OCR, restauration (juin 2026)
- [x] ~~**Soft delete M6 Traductions**~~ - deleted_at, bloqué si approuvée/archivée, reset demande M5 (juin 2026)
