# SICOT – Task List / Plan de Développement

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
- [x] ~~**Journal d'audit**~~ - service/controller/route lecture seule, filtres, métadonnées modules/actions (juin 2026). _Interface de consultation + export PDF/Excel restés en `ComingSoon` jusqu'à Sprint 10, voir section dédiée._
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

## Sprint 5 – Dashboard & Statistiques (M9) | ✅ COMPLÉTÉ (V1 — gaps identifiés, voir Sprint 8)

- [x] ~~**Dashboard général (8 KPI cards)**~~ - Accords actifs / Courriers sans réponse / Missions en cours / Traductions à réviser / Documents archivés / Termes glossaire / Demandes ouvertes / Recommandations en attente (juin 2026)
- [x] ~~**Courriers sans réponse flagués**~~ - Bloc dédié avec jours d'attente, lien direct vers le courrier (juin 2026)
- [x] ~~**Accords expirant sous 90j mis en évidence**~~ - Bloc dédié avec jours restants, lien direct vers l'accord (juin 2026)
- [x] ~~**Graphique traductions par mois**~~ - Barres Chart.js, total vs approuvées, 6 derniers mois (juin 2026)
- [x] ~~**Graphique demandes par statut**~~ - Donut Chart.js (juin 2026)
- [x] ~~**Graphique documents par catégorie**~~ - Barres horizontales Chart.js (juin 2026)
- [x] ~~**Activité récente cross-modules**~~ - 8 dernières actions toutes catégories confondues, triées par date (juin 2026)
- [x] ~~**Recommandations en attente avec alerte dépassement**~~ - Liste avec badge si date limite dépassée (juin 2026)
- [ ] **Rapport mensuel automatique** - Cron 1er du mois → PDF + Excel → archivé dans M8
- [ ] **Rapport manuel à la demande** - Sélection période + modules inclus
- [ ] **Template PDF rapport** - Couleurs ANAC, logo, mise en page professionnelle
- [ ] **Export Excel données brutes** - Un onglet par module
- [ ] **Historique des rapports générés** - Consultable dans l'interface
- [x] ~~**Gestion état vide au premier démarrage**~~ - Tous les blocs gèrent les listes vides proprement, pas de chiffre cassé (juin 2026)

### Fichiers complétés Sprint 5

**Serveur**

- [x] ~~`src/services/dashboard.service.ts`~~ - getDashboardData, agrégation parallèle 8 KPI, accords expirants, courriers sans réponse, recommandations, 3 séries graphiques, activité récente cross-modules (juin 2026)
- [x] ~~`src/controllers/dashboard.controller.ts`~~ - getDashboard (juin 2026)
- [x] ~~`src/routes/dashboard.ts`~~ - GET / (juin 2026)

**Client**

- [x] ~~`src/lib/dashboard.api.ts`~~ - getData (juin 2026)
- [x] ~~`src/pages/DashboardPage.tsx`~~ - KPI cards cliquables, alertes accords/courriers, 3 graphiques Chart.js (bar, donut, horizontal bar), recommandations, activité récente, refetch 5min (juin 2026)

**Routes App.tsx**

- [x] ~~`/dashboard`~~ (juin 2026)

### Gaps identifiés après revue terrain CCIT (juin 2026) — voir Sprint 8/9/10

Le dashboard V1 affiche des compteurs mais ne couvre pas le vrai besoin métier exprimé : rappels ciblés actionnables, seuils configurables, traçabilité des relances, suivi logistique missions, contact partenaire lié aux missions, portail externe documentaire. Détail complet dans Sprint 8, 9, 10 ci-dessous.

## Sprint 6 – Tests, Recette & Corrections | ⬜ À FAIRE (repoussé après Sprint 8/9/10)

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

## Sprint 8 – Centre de Notifications & Rappels CCIT (transverse M1+M3+M4+M9) | ✅ COMPLÉTÉ

### Principe directeur — validé avec CCIT (juin 2026)

**Toutes les alertes système (cron, seuils dépassés) sont envoyées à la CCIT en premier — jamais directement à l'agent, au demandeur, ou à la DG.** C'est la CCIT qui juge de la pertinence et de l'opportunité d'une relance. Une fois informée, la CCIT peut déclencher manuellement, depuis l'interface, une notification ciblée vers la personne ou le service concerné (email avec message contextualisé). Aucun envoi automatique vers un tiers externe à la CCIT.

- [x] ~~**Table `parametres` (Administration)**~~ - Stockage clé-valeur générique (cle/valeur/type/module), enum entier/booleen/texte, seed 4 valeurs par défaut (juillet 2026)
- [x] ~~**Refactor cron alertes.ts**~~ - Lecture de `accord_alerte_jours` depuis parametres (défaut 90j), paliers 1/3-2/3-complet calculés dynamiquement (juillet 2026)
- [x] ~~**Job `mettreAJourAccordsExpires`**~~ - Cron 08h00 + déclenchement manuel, corrige les accords dont dateExpiration est dépassée mais statut resté "actif" (juillet 2026)
- [x] ~~**Table `notifications`**~~ - Historique complet : type, entiteId, destinataireEmail/Nom, message, declenchePar, statut envoyee/echec, erreur (juillet 2026)
- [x] ~~**Service `notifications.service.ts`**~~ - envoyerNotificationCiblee, verifierDejaNotifieAujourdhui (non bloquant), getHistoriqueEntite, getNotificationsRecentes (juillet 2026)
- [x] ~~**`ModalRelance.tsx` composant réutilisable**~~ - Sélecteur destinataire suggéré/libre, historique compact, avertissement double-envoi jour même (juillet 2026)
- [x] ~~**Bouton "Relancer" sur AccordDetail**~~ - ModalRelance branchée, destinataires suggérés = contacts principaux des partenaires, bouton "Notifier tous" si plusieurs partenaires avec email (juillet 2026)
- [x] ~~**Bouton "Relancer" sur CourrierDetail**~~ - ModalRelance branchée, destinataire = contact principal expéditeur/destinataire selon direction, message pré-rempli avec contexte (juillet 2026)
- [x] ~~**Bouton "Relancer responsable" sur recommandation (MissionDetail)**~~ - ModalRelance par recommandation, fallback saisie libre si responsable sans email (juillet 2026)
- [x] ~~**`HistoriqueNotifications.tsx` composant réutilisable**~~ - Affiché en lecture passive sur AccordDetail, CourrierDetail, et par recommandation sur MissionDetail (juillet 2026)
- [x] ~~**Indicateur visuel de criticité Courriers — 3 paliers**~~ - normal / à surveiller / critique, seuils lus depuis parametres, badge couleur sur CourriersPage, CourrierDetail et dashboard (juillet 2026)
- [x] ~~**Bloc dashboard "Notifications envoyées récemment"**~~ - Traçabilité visible pour CCIT, navigation directe vers l'entité (juillet 2026)
- [x] ~~**Bloc dashboard "Accords expirés — action requise"**~~ - Liste des accords expiré(s) avec jours depuis expiration, lien direct vers la fiche, message d'invite à décider (juillet 2026)
- [x] ~~**KPI dashboard enrichis avec criticité réelle**~~ - Accords/Courriers/Missions/Recommandations portent leur propre niveau d'alerte avec sous-ligne contextuelle, compteur accords expirés inclus dans KPI accords (juillet 2026)
- [x] ~~**Filtre "Accords par partenaire" sur AccordsPage**~~ - Filtre back-end `partenairesId` branché, sélecteur organisation côté UI (juillet 2026)
- [x] ~~**Navigation croisée M2→M1**~~ - Bouton "Accords" sur PartenairesPage, lecture param URL `partenaireId`, indicateur de filtre actif (juillet 2026)
- [x] ~~**Champ `confirmationLogistique` sur Mission**~~ - Enum a_planifier/en_cours/confirme, badge sur MissionDetail, alerte si départ sous 14j sans confirmation (juillet 2026)
- [x] ~~**Champ `contactSurPlaceId` sur Mission**~~ - Lien optionnel vers un contact M2, affiché sur MissionDetail avec email/téléphone, sélectionnable dans MissionFormPage (juillet 2026)
- [x] ~~**AdminParametresPage.tsx**~~ - Interface CRUD groupée par module, validation par type, modification réservée super_admin (juillet 2026)
- [x] ~~**Registre de jobs manuels (`src/jobs/registre.ts`)**~~ - Pattern extensible avec roleMinimum par job, 6 jobs enregistrés : accords x2 (expiration + alertes), courriers criticité, recommandations retard, backup local, backup NAS (juillet 2026)
- [x] ~~**Permissions différenciées sur jobs**~~ - admin pour vérifications courantes, super_admin pour sauvegardes, bouton désactivé côté UI si rôle insuffisant (juillet 2026)

### Edge cases couverts

- [x] ~~Notification déclenchée deux fois le même jour~~ - Avertissement non bloquant dans ModalRelance (juillet 2026)
- [x] ~~Contact destinataire sans email renseigné~~ - Fallback automatique sur saisie libre (juillet 2026)
- [x] ~~Recommandation sans responsable assigné~~ - Bascule sur saisie libre, CCIT choisit le destinataire (juillet 2026)
- [x] ~~Accord avec plusieurs partenaires — notification unique~~ - Bouton "Notifier tous" envoie en séquence à chaque contact principal, rapport envoyes/ignores détaillé (juillet 2026)
- [x] ~~Accord expiré mais statut BDD resté "actif"~~ - Job `accords_expiration` corrige (cron 08h00 ou manuel), bloc dashboard dédié "Accords expirés — action requise" (juillet 2026)
- [x] ~~Jobs cron non fiables en environnement dev~~ - Registre de jobs manuels pilotable depuis l'UI admin (juillet 2026)
- [x] ~~Seed table parametres non exécuté~~ - Identifié et corrigé ; à surveiller en migration production (juillet 2026)
- [x] ~~pg_dump introuvable en PATH Windows dev~~ - Documenté : PG_DUMP_PATH + BACKUP_LOCAL_DIR dans .env (juillet 2026)
- [ ] pg_dump sur SERV-APPI (Linux production) — à valider que pg_dump est accessible en PATH sur l'environnement de production

### Fichiers complétés Sprint 8

**Serveur**

- [x] ~~`src/services/parametres.service.ts`~~ - listerParametres, getParametre, getValeurEntier, getValeurBooleen, mettreAJourParametre, creerParametre (juillet 2026)
- [x] ~~`src/controllers/parametres.controller.ts`~~ - lister, getByCle, mettreAJour (juillet 2026)
- [x] ~~`src/routes/parametres.ts`~~ - GET / (admin), GET /:cle (admin), PATCH /:cle (super_admin) (juillet 2026)
- [x] ~~`src/jobs/alertes.ts`~~ - mettreAJourAccordsExpires et envoyerAlertesAccords avec retours structurés exportés (juillet 2026)
- [x] ~~`src/jobs/backup.ts`~~ - effectuerSauvegarde avec retour structuré, BACKUP_LOCAL_DIR/BACKUP_NAS_DIR exportés, declencherSauvegardeManuelle (juillet 2026)
- [x] ~~`src/jobs/registre.ts`~~ - REGISTRE_JOBS extensible avec roleMinimum par job, 6 jobs enregistrés (juillet 2026)
- [x] ~~`src/services/jobs.service.ts`~~ - listerJobs (expose roleMinimum), executerJobManuel avec vérification roleMinimum et logAudit (juillet 2026)
- [x] ~~`src/controllers/jobs.controller.ts`~~ - lister, executer avec gestion ROLE_INSUFFISANT (403) (juillet 2026)
- [x] ~~`src/routes/jobs.ts`~~ - GET / (admin), POST /:cle/executer (admin, contrôle fin par job dans service) (juillet 2026)
- [x] ~~`src/services/notifications.service.ts`~~ - envoyerNotificationCiblee, verifierDejaNotifieAujourdhui, getHistoriqueEntite, getNotificationsRecentes (juillet 2026)
- [x] ~~`src/controllers/notifications.controller.ts`~~ - envoyer, historiqueEntite, recentes (juillet 2026)
- [x] ~~`src/routes/notifications.ts`~~ - POST /envoyer (admin), GET /historique/:type/:entiteId (agent), GET /recentes (admin) (juillet 2026)
- [x] ~~`src/utils/email.ts`~~ - sendNotificationManuelle ajoutée, template HTML générique relance CCIT (juillet 2026)
- [x] ~~`src/services/accords.service.ts`~~ - getPartenairesAccord enrichi avec contactPrincipal, filtre partenairesId branché dans listerAccords (juillet 2026)
- [x] ~~`src/services/courriers.service.ts`~~ - getOrganisationAvecContact, calcul criticite/joursAttente via seuils parametres (juillet 2026)
- [x] ~~`src/services/missions.service.ts`~~ - ParticipantResume enrichi avec email, contactSurPlaceId/confirmationLogistique, ContactResume + getContactSurPlace (juillet 2026)
- [x] ~~`src/services/dashboard.service.ts`~~ - KPI enrichis avec criticité, accordsExpires bloc dédié, notificationsRecentes, nettoyage dead code (juillet 2026)

**Migration BDD**

- [x] ~~`CREATE TABLE parametres`~~ - enum parametre_type, seed 4 valeurs (juillet 2026)
- [x] ~~`CREATE TABLE notifications`~~ - enums notification_type/statut, index composé (juillet 2026)
- [x] ~~`ALTER TABLE missions ADD COLUMN confirmation_logistique`~~ - enum logistique_statut (juillet 2026)
- [x] ~~`ALTER TABLE missions ADD COLUMN contact_sur_place_id`~~ - référence contacts(id) (juillet 2026)

**Client React Sprint 8**

- [x] ~~`src/lib/parametres.api.ts`~~ - lister, getByCle, mettreAJour (juillet 2026)
- [x] ~~`src/lib/notifications.api.ts`~~ - envoyer, historiqueEntite, recentes (juillet 2026)
- [x] ~~`src/lib/jobs.api.ts`~~ - lister, executer (timeout 60s) (juillet 2026)
- [x] ~~`src/pages/AdminParametresPage.tsx`~~ - groupement par module, édition inline, section jobs manuels avec résultats détaillés et permissions par rôle (juillet 2026)
- [x] ~~`src/components/ModalRelance.tsx`~~ - composant réutilisable, sélecteur destinataire suggéré/libre, historique compact, avertissement double-envoi (juillet 2026)
- [x] ~~`src/components/HistoriqueNotifications.tsx`~~ - composant réutilisable, lecture passive, branchée sur AccordDetail/CourrierDetail/MissionDetail (juillet 2026)
- [x] ~~`src/pages/AccordsPage.tsx`~~ - sélecteur filtre partenaire, lecture param URL partenaireId, indicateur filtre actif (juillet 2026)
- [x] ~~`src/pages/AccordDetail.tsx`~~ - bouton Relancer + Notifier tous, affichage contact principal par partenaire, HistoriqueNotifications (juillet 2026)
- [x] ~~`src/pages/PartenairesPage.tsx`~~ - bouton "Accords" navigant vers /accords?partenaireId=X (juillet 2026)
- [x] ~~`src/pages/CourriersPage.tsx`~~ - badge criticité 3 paliers, affichage jours d'attente réel (juillet 2026)
- [x] ~~`src/pages/CourrierDetail.tsx`~~ - bouton Relancer, bloc alerte criticité contextuel, HistoriqueNotifications (juillet 2026)
- [x] ~~`src/pages/MissionDetail.tsx`~~ - bouton Relancer par recommandation, badge logistique, alerte départ proche, contact sur place, HistoriqueNotifications par recommandation (juillet 2026)
- [x] ~~`src/pages/MissionFormPage.tsx`~~ - champs confirmationLogistique et contactSurPlaceId en édition (juillet 2026)
- [x] ~~`src/pages/DashboardPage.tsx`~~ - KpiCard avec niveau/sous-ligne, bloc accords expirés, bloc notifications récentes (juillet 2026)

**Routes App.tsx**

- [x] ~~`/admin/parametres`~~ - protégé AdminRoute (juillet 2026)

## Sprint 9 – Portail Documentaire Externe (module M8-bis) | ✅ COMPLÉTÉ

### Architecture retenue (juillet 2026)

- Route `/portail` dans la même app React (pas d'app séparée) — hors ProtectedRoute
- Navigation libre sans authentification pour la consultation
- Téléchargement via token UUID envoyé par email — traçabilité complète sans compte permanent
- Consultation = stream inline (PDF viewer natif navigateur)
- Téléchargement = email → lien tokené → stream attachment

### Principe de visibilité

- Seuls les documents `statutOCR: traite` sont éligibles à l'exposition portail
- Admin marque le document "exposable" + configure durée token (7j/30j/90j/permanent)
- Badge "Portail" visible sur chaque document exposé dans DocumentsPage
- Admin peut retirer la visibilité à tout moment via bouton "Retirer"
- Lien rapide "Portail externe" dans la sidebar admin → ouvre `/portail` dans un nouvel onglet

### Traçabilité & Analytics (prérequis M11)

- Chaque génération de token enregistrée : email, IP, date, document, expiration
- Chaque téléchargement consommé tracé : email, IP, date
- Table `portail_tokens` conçue pour alimenter les stats M11 (docs les plus téléchargés, emails uniques, etc.)

- [x] ~~**Migration BDD**~~ - `ALTER TABLE documents ADD COLUMN visibilite_portail` + `portail_token_duree_jours`, `CREATE TABLE portail_tokens` avec index token/document/email (juillet 2026)
- [x] ~~**`portail.service.ts`**~~ - listerDocumentsPortail (search + filtre catégorie), getDocumentPortail, genererTokenTelechargement (UUID + expiresAt selon portailTokenDureeJours), validerEtConsumeToken (mark utiliseLe), toggleVisibilitePortail, getStatsTelechargements (prérequis M11) (juillet 2026)
- [x] ~~**`portail.controller.ts`**~~ - lister, getDocument, consulter (stream inline), genererToken, telecharger (stream attachment), toggleVisibilite (juillet 2026)
- [x] ~~**`portail.route.ts`**~~ - routes publiques (lister, getDocument, consulter, genererToken, telecharger) + route admin authentifiée (toggleVisibilite) (juillet 2026)
- [x] ~~**`portail.api.ts`**~~ - instance publicApi sans cookie auth pour routes publiques, instance api auth pour admin, getUrlConsultation/getUrlTelechargement (juillet 2026)
- [x] ~~**`PortailPage.tsx`**~~ - page publique sans sidebar ANAC, header navy ANAC, grille 3 colonnes, recherche + filtre catégorie, ViewerDocument (plein écran iframe PDF), ModalTelechargement (email → mutation → message succès), pagination (juillet 2026)
- [x] ~~**`DocumentsPage.tsx`**~~ - bouton "Portail/Exposé" toggle, modal configuration durée token (7j/30j/90j/permanent), badge vert "Portail" sur docs exposés, bouton "Retirer" pour masquer du portail, affichage durée token configurée (juillet 2026)
- [x] ~~**`documents.service.ts`**~~ - toDocumentView enrichi avec visibilitePortail + portailTokenDureeJours (juillet 2026)
- [x] ~~**`Layout.tsx`**~~ - lien rapide "Portail externe" en bas de sidebar, ouvre /portail dans nouvel onglet (juillet 2026)
- [x] ~~**Route `/portail`**~~ - hors ProtectedRoute dans App.tsx (juillet 2026)

### Edge cases couverts

- [x] ~~Document non OCR traité non éligible~~ - Bouton portail masqué si statutOCR !== 'traite' (juillet 2026)
- [x] ~~Token expiré~~ - Erreur 410 avec message explicite "Lien expiré, générez-en un nouveau" (juillet 2026)
- [x] ~~Token invalide~~ - Erreur 404 propre (juillet 2026)
- [x] ~~Document retiré du portail après génération d'un token~~ - validerEtConsumeToken vérifie visibilitePortail au moment du téléchargement (juillet 2026)
- [x] ~~Consultation sans compte~~ - Route /consulter publique, pas de cookie requis (juillet 2026)

### Fichiers complétés Sprint 9

**Serveur**

- [x] ~~`src/services/portail.service.ts`~~ (juillet 2026)
- [x] ~~`src/controllers/portail.controller.ts`~~ (juillet 2026)
- [x] ~~`src/routes/portail.ts`~~ (juillet 2026)

**Migration BDD**

- [x] ~~`ALTER TABLE documents ADD COLUMN visibilite_portail`~~ (juillet 2026)
- [x] ~~`ALTER TABLE documents ADD COLUMN portail_token_duree_jours`~~ (juillet 2026)
- [x] ~~`CREATE TABLE portail_tokens`~~ - index token/document/email (juillet 2026)

**Client React Sprint 9**

- [x] ~~`src/lib/portail.api.ts`~~ (juillet 2026)
- [x] ~~`src/pages/PortailPage.tsx`~~ - browse public, viewer inline, modal téléchargement (juillet 2026)
- [x] ~~`src/pages/DocumentsPage.tsx`~~ - toggle portail, badge exposé, modal durée, bouton retirer (juillet 2026)
- [x] ~~`src/services/documents.service.ts`~~ - toDocumentView enrichi (juillet 2026)
- [x] ~~`src/components/Layout.tsx`~~ - lien rapide portail externe (juillet 2026)

**Routes App.tsx**

- [x] ~~`/portail`~~ - route publique hors ProtectedRoute (juillet 2026)

## Sprint 10 – Paramètres Système Élargis | ✅ COMPLÉTÉ (upload max reporté volontairement)

### Reporté du Sprint 8 — chantier de fond distinct, hors urgence rappels CCIT

- [x] ~~**Délai expiration OTP configurable**~~ - Migré vers `parametres` (`otp_expiration_minutes`, défaut 10 min), `otp.ts` ne lit plus l'env var (juillet 2026)
- [x] ~~**Seuil blocage compte configurable**~~ - Migré vers `parametres` (`lockout_max_tentatives` défaut 5, `lockout_duree_minutes` défaut 30) — nom final diffère du `compte_tentatives_max` prévu à la planification, et la durée de blocage (`BLOCAGE_MINUTES`, aussi en dur) a été migrée avec, non prévue séparément à l'origine (juillet 2026)
- [x] ~~**Toggle fallback DeepL**~~ - Paramètre `deepl_fallback_actif` (booléen, défaut false), résolu côté Flask `translate-service` par requête (`resoudre_deepl_actif`) au lieu de l'env var figé au démarrage ; avertissement UI si activé sans `DEEPL_API_KEY` configuré. Implémentation technique terminée — **activation réelle toujours en attente validation DG/contrat RGPD** (voir Waiting On) (juillet 2026)
- [x] ~~**Rétention sauvegardes configurable**~~ - Migré vers `parametres` (`backup_retention_locale_jours` défaut 30, `backup_retention_nas_jours` défaut 360) — NAS en jours et non en mois comme prévu initialement, pour rester cohérent avec les autres seuils déjà exprimés en jours (juillet 2026)
- [ ] **Taille max upload et formats acceptés configurables** - Reporté volontairement, limite actuelle (50 Mo, en dur dans `upload.ts`) jugée suffisante pour l'instant ; nécessiterait une factory middleware pour lire la valeur par requête, non prioritaire
- [x] ~~**Job manuel rapport mensuel**~~ - Implémenté en Sprint 11 (`rapport_mensuel` dans `registre.ts`), en même temps que le cron automatique et la génération à la demande (juillet 2026)
- [x] ~~**Seed parametres sans SQL manuel**~~ - Approche différente de celle prévue : plutôt qu'intégré à une migration Drizzle, seed idempotent (`ON CONFLICT DO NOTHING`) exécuté au démarrage serveur via `start/services/parametres-seed.service.ts`, avant `app.listen` — même résultat (zéro étape manuelle), mécanisme différent (juillet 2026)
- [x] ~~**Réorganisation UI `AdminParametresPage.tsx`**~~ - Non planifiée initialement, ajoutée en cours de sprint : grille par module (au lieu de liste), libellés lisibles via `PARAMETRE_LABELS`, unité correcte par clé (`uniteDepuisCle`), clé technique reléguée en tag discret (juillet 2026)
- [x] ~~**Journal d'audit — interface de consultation**~~ - Non planifiée dans Sprint 10, mais chantier ouvert depuis Sprint 1 (backend fait, UI restée en `ComingSoon`). `AuditPage.tsx` : filtres Module/Action/Date, tableau paginé, modal détails JSON. Filtre `search` du type `AuditFilters` constaté déclaré mais jamais utilisé côté service — volontairement exclu de l'UI plutôt que branché sur un filtre inopérant (juillet 2026)
- [x] ~~**Journal d'audit — export PDF/Excel**~~ - Première utilisation de `puppeteer`/`exceljs` dans le projet (dépendances présentes depuis le début, jamais câblées). `utils/pdf.ts` conçu générique et réutilisable pour les futurs exports (Accords/Courriers/Missions, cf. Sprint 3/11). Export plafonné à 10 000 lignes avec détection de troncature ; l'export lui-même est audité (`AUDIT_EXPORT_PDF` / `AUDIT_EXPORT_EXCEL`) (juillet 2026)

## Sprint 11 – Module Analytics & Rapports (M11) | ✅ COMPLÉTÉ

### Positionnement — distinction claire avec le Dashboard M9

Le dashboard M9 est un outil d'**action rapide** (que dois-je faire aujourd'hui ?).
Le module M11 est un outil de **pilotage stratégique** (comment l'activité évolue-t-elle, quelles tendances, quels volumes ?).
Les rapports générés par M11 puisent dans les agrégats analytics — analytics = couche de calcul, rapport = couche de présentation.

### Serveur

- [x] ~~**`analytics.service.ts`**~~ - Agrégats par module et par période, requêtes SQL brutes (raw `sql` Drizzle) pour les agrégations complexes, cache mémoire 60s (`utils/cache.ts`, réutilisable) (juillet 2026)
- [x] ~~**`analytics.controller.ts`**~~ - Un handler par module + `/global`, plus `/export` générique (voir plus bas) (juillet 2026)
- [x] ~~**`analytics.route.ts`**~~ - Tous les endpoints prévus + `/export` et `/rapports`, rôle `traducteur` minimum via `requireTraducteur` (juillet 2026)

### Périmètre analytics par module

**M1 Accords**

- [x] ~~Durée moyenne des accords par type de partenaire~~
- [x] ~~Taux de renouvellement vs clôture~~ - Basé sur `statut IN ('en_renouvellement','expire')`, pas de self-join `parentId` nécessaire (juillet 2026)
- [x] ~~Répartition géographique des partenaires actifs~~ - Volontairement indépendante de la période (photo instantanée), badge UI explicite
- [x] ~~Évolution du nombre d'accords signés par année/mois~~

**M4 Courriers**

- [x] ~~Volume entrant vs sortant par mois~~
- [x] ~~Temps moyen de réponse~~ - _Proxy `updated_at`, pas de colonne `date_reponse` dédiée — caveat affiché dans l'UI (voir dette technique ci-dessous)_
- [x] ~~Taux de réponse~~
- [x] ~~Répartition par organisation expéditrice (top 5)~~
- [x] ~~Évolution de la criticité dans le temps~~ - Nécessitait une nouvelle table `courriers_criticite_snapshots` + cron quotidien 23h55, la criticité n'étant jamais persistée nativement. S'accumule à partir du déploiement (juillet 2026)

**M3 Missions**

- [x] ~~Nombre de missions par destination/pays~~
- [x] ~~Taux de recommandations réalisées vs en attente vs dépassées~~ - Bucket `en_cours` conservé séparément plutôt que fondu, même convention que `dashboard.helpers.ts`
- [x] ~~Délai moyen entre fin de mission et dépôt du rapport~~ - Seule métrique de délai basée sur une vraie colonne dédiée (`documents.created_at`), pas un proxy
- [x] ~~Agents les plus mobilisés (top participants)~~ - Top 10

**M6 Traduction**

- [x] ~~Volume traduit par mois~~ - _Décompte des traductions uniquement — aucune colonne/table "segments" n'existe, dropped plutôt que fabriqué (voir dette technique)_
- [x] ~~Taux de correction IA~~
- [x] ~~Temps moyen de traitement~~ - _Proxy `updated_at`, même caveat que courriers_
- [x] ~~Répartition FR→EN vs EN→FR~~
- [x] ~~Termes ajoutés au glossaire via delta corrections M6~~ - _Détection par chaîne fixe dans `contexte`, pas une colonne dédiée (voir dette technique)_

**M5 Demandes**

- [x] ~~Délai moyen de prise en charge~~ - _Proxy `updated_at`, même caveat_
- [x] ~~Taux d'urgence validée vs demandée~~
- [x] ~~Volume par demandeur/service~~ - Top 10
- [x] ~~Taux de complétion~~

**M8 Documents**

- [x] ~~Volume archivé par catégorie et par mois~~
- [x] ~~Taux de succès OCR~~
- [x] ~~Évolution du stock documentaire total~~ - Cumul : base pré-période + additions mois par mois

**M7 Glossaire**

- [x] ~~Croissance du glossaire dans le temps~~
- [x] ~~Répartition termes ajoutés manuellement vs automatiquement~~
- [x] ~~Répartition par domaine~~

### Client React

- [x] ~~**`analytics.api.ts`**~~
- [x] ~~**`AnalyticsPage.tsx`**~~ - 8 onglets (7 modules + vue globale) + 9ème onglet Rapports. Tabs faits maison migrés vers shadcn/ui (voir section dédiée "Sprint de durcissement UI" ci-dessous)
- [x] ~~**Sélecteur de période global**~~ - 5 préréglages + personnalisé
- [x] ~~**Export CSV/Excel par section**~~ - Un seul endpoint générique `/analytics/export?module=X&format=Y` plutôt que dupliqué par module, réutilisable pour tout futur module analytics
- [x] ~~**Vue globale cross-modules**~~ - Réutilise les 7 fonctions service existantes plutôt que dupliquer les requêtes SQL

### Rapports (dépend des analytics)

- [x] ~~**`rapports.service.ts`**~~ - Génération PDF (Puppeteer, sections par module, saut de page entre modules) + Excel (une feuille par métrique, noms préfixés par module et dédupliqués)
- [x] ~~**Rapport mensuel automatique**~~ - Cron 1er du mois 06h00, tous modules confondus, PDF + Excel, attribué à un `super_admin` système (`resoudreUtilisateurSysteme`). Job manuel `rapport_mensuel` dans `registre.ts`
- [x] ~~**Rapport à la demande**~~ - Formulaire période + sélection modules (checkboxes) + format, dans l'onglet Rapports
- [x] ~~**Historique des rapports générés**~~ - Nouvelle table `rapports`, liste consultable dans `AnalyticsPage.tsx`, lien direct de téléchargement vers le document M8
- [x] ~~**Template PDF ANAC**~~ - `utils/pdf.ts`, générique et déjà réutilisé par l'export Journal d'audit (Sprint 10)
- [x] ~~**Migration schéma**~~ - Non planifiée à l'origine : ajout de `rapport` à `document_categorie` (les rapports ont leur propre catégorie M8 plutôt que `autre`), nouvelles tables `rapports` et `courriers_criticite_snapshots`

### Routes App.tsx

- [x] ~~`/analytics`~~ - accessible à tous les rôles connectés (lecture)
- [ ] `/analytics/:module` - **Non implémenté tel que prévu.** Choix différent : une seule page avec navigation par onglets côté client (état React), pas de sous-routes URL par module. Fonctionnellement équivalent, mais un lien direct vers un onglet précis (ex: partagé par email) n'est pas possible sans état d'URL. À revoir si ce besoin se manifeste.

### Ajout post-clôture — Rapports IA (Gemini)

Non planifié dans le périmètre initial de Sprint 11 — proposé et scopé en cours de route, implémenté immédiatement après clôture du sprint plutôt que reporté (dépendait directement des fondations analytics déjà en place).

- [x] ~~**Architecture brouillon séparé**~~ - Narratif IA jamais inclus dans un PDF téléchargeable avant validation (modèle `texteIA`/`texteFinal` de M6, transposé aux rapports). Validation = rôle Admin minimum. Texte validé figé définitivement, jamais régénéré silencieusement
- [x] ~~**Anonymisation obligatoire**~~ - Noms/matricules des agents (top participants, top demandeurs) systématiquement retirés du payload envoyé à Gemini, remplacés par "Agent A/B/C..." — appliqué par défaut, indépendamment de toute décision de gouvernance
- [x] ~~**Deltas déterministes**~~ - Comparaison vs le dernier rapport _validé_ calculée en code (jamais par le modèle), gère l'absence de rapport précédent et les écarts d'historique
- [x] ~~**Garde-fou activité insuffisante**~~ - Seuil dur en code (pas une instruction de prompt) : en dessous d'un volume minimal, aucun appel Gemini n'est fait, message fixe déterministe renvoyé à la place
- [x] ~~**Rotation de modèles + quota auto-imposé**~~ - 3 modèles candidats (`gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`), plafond auto-imposé de 15/jour/modèle (sur un quota réel de 20), très large marge sous le vrai quota. Limite globale de 10 rapports IA à la demande/jour, tous utilisateurs confondus, paramétrable via `parametres`
- [x] ~~**Contrôle du thinking budget**~~ - `thinkingBudget: 0` (Gemini 2.5) / `ThinkingLevel.LOW` (Gemini 3.x) explicitement fixé sur chaque appel — laissé par défaut, un test a montré jusqu'à 2092 tokens de réflexion facturés pour une réponse triviale
- [x] ~~**Workflow de relecture**~~ - Génération → `en_attente` → admin édite/valide/rejette, avec confirmation avant rejet (bug initial : rejet sans confirmation déclenché par un simple clic d'exploration)
- [x] ~~**Disclaimer à 3 endroits**~~ - Bannière dans la modale de relecture, badge de statut dans l'historique, modèle/version tracé sur chaque enregistrement (`moteurIA`)
- [x] ~~**Régénération après rejet**~~ - Bouton dédié pour les rapports `rejete`, absent initialement (gap découvert en test)
- [x] ~~**Rendu Markdown sécurisé**~~ - `react-markdown` plutôt que `dangerouslySetInnerHTML` + regex — le contenu vient d'un LLM externe, non fiable par défaut (risque d'injection identifié dans le scoping)

**Bugs réels trouvés et corrigés pendant l'implémentation** (pour référence future) :

- `listerRapports()` retournait un objet reconstruit manuellement, sans les champs IA — chaque ligne de l'historique affichait "IA - rejeté" par défaut (`undefined` ne correspondant à aucun cas du switch), quel que soit le vrai statut
- Tri par `createdAt` ascendant plutôt que descendant — nouveaux rapports invisibles en haut de tableau
- `cn()` utilisait `clsx` seul, sans `tailwind-merge` — une classe `className` personnalisée (ex: `max-w-4xl`) ne l'emportait pas de façon fiable sur les styles par défaut d'un composant (`max-w-lg`). Corrigé à la racine (`lib/utils.ts`), corrige potentiellement le même bug latent ailleurs dans l'app
- Catégorie de document `rapport` ajoutée côté serveur (schéma) mais oubliée côté client (`DocumentsPage.tsx` avait sa propre liste de catégories non synchronisée) — catégorie vide affichée pour tout document de type rapport

**Reporté** :

- [x] ~~**Écran de suivi Gemini dans `AdminParametresPage.tsx`**~~ - Barres d'usage par modèle vs plafond (15/jour), compteur global rapports IA (X/10), dernier rapport mensuel auto, cumul tokens de réflexion. Rafraîchissement automatique toutes les 60s (juillet 2026)
- [ ] **Export PDF/DOCX du narratif IA validé** - PDF réutilise `utils/pdf.ts` ; DOCX nécessiterait la lib `docx` (aucune génération DOCX n'existe encore dans le projet, même gap que Sprint 4). Décision à prendre : narratif seul ou fusionné avec les tableaux numériques ?

### Ajout post-clôture — Sprint de durcissement UI (shadcn/ui)

Planifié dans Sprint 11 comme suivi ("à migrer plus tard"), réalisé en session dédiée juillet 2026.

- [x] ~~**`components/ui/table.tsx`**~~ - Composant Table shadcn générique (via CLI shadcn, style `data-slot`), remplace les balises `<table>` HTML brutes
- [x] ~~**`components/table/data-table.tsx`**~~ - Wrapper générique sur `@tanstack/react-table` : sorting/pagination/filtering en mode manuel (serveur), rendu via les primitives `table.tsx`. Pas de filtrage colonne générique — chaque page garde sa propre barre de filtres métier
- [x] ~~**`components/table/data-table-pagination.tsx`**~~ - Composant de pagination extrait et partagé (initialement dupliqué sur PartenairesPage puis Audit, extrait dès la 2ème occurrence identique)
- [x] ~~**`components/ui/tabs.tsx`**~~ - Nouveau composant Tabs shadcn sur `@radix-ui/react-tabs` (nouvellement installé), remplace les tabs faits maison (`role="tab"` + state manuel) d'AnalyticsPage
- [x] ~~**Migration des 7 pages à tableaux HTML bruts**~~ - PartenairesPage, AuditPage, DocumentsPage, GlossairePage, DemandesPage, TraductionsPage, AnalyticsPage — toutes basculées sur `Table`/`DataTable`
- [x] ~~**Éclatement en sous-dossiers `pages/{module}/`**~~ - Chaque page refactorée avec colonnes (`{module}.columns.tsx`), hooks (`hooks/queries.ts` + `hooks/mutations.ts`), types, constants, et composants (filtres, dialogs) séparés du fichier page (devenu un simple orchestrateur)
- [x] ~~**`pages/analytics/` — éclatement complet**~~ - Le plus gros morceau (2150 lignes, 9 onglets) : un fichier par onglet sous `onglets/`, dialog IA extrait (`AnalyseIADialog.tsx`), sélecteur de période extrait (`PeriodeSelector.tsx`)
- [x] ~~**PartenairesPage — tri serveur ajouté**~~ - Colonnes triables (`sortBy`/`sortOrder`) branchées jusqu'au service Drizzle, profitant du passage à `DataTable`/TanStack Table — extension au-delà du périmètre initial du ticket
- [x] ~~**Bug corrigé gratuitement — `colSpan` incorrect**~~ - AuditPage et DocumentsPage avaient un `colSpan` désynchronisé du nombre réel de colonnes sur les lignes vide/chargement ; `DataTable` le calcule automatiquement depuis `columns.length`
- [x] ~~**`sonner` + `confirmToast`**~~ - Remplacement de `window.confirm`/`alert` par des toasts sonner non bloquants, adopté en cours de route sur Documents/Demandes/Traductions (`lib/confirm-toast.ts`)

**Décisions de scope prises pendant l'implémentation** :

- Pas de composant `DataTable` générique avec props `data`/`columns`/`filters`/`extra` construit à la main : `@tanstack/react-table` (bibliothèque mûre) utilisé à la place, évite de réinventer un moteur de tri/pagination/filtrage
- Les 6 tableaux d'AnalyticsPage (petits, statiques, sans pagination ni actions par ligne au-delà d'un bouton) utilisent les primitives `Table` simples, pas `DataTable` — `DataTable` réservé aux tableaux avec état serveur réel (pagination/tri/filtres)

### Dette technique identifiée (voir aussi Notion, tâches différées)

- Aucune colonne segments pour les traductions (M6 volume)
- 3 métriques de délai (courriers, demandes, traductions) reposent sur `updated_at` comme proxy, pas de colonne de transition de statut dédiée
- Origine des termes glossaire détectée par convention de texte libre, pas un enum dédié
- Historique de criticité courriers : s'accumule seulement depuis juillet 2026, pas de reconstruction rétroactive possible

## Waiting On

- [ ] **Glossaire CCIT existant** - Attente fichier CSV/Excel de la Cellule CCIT pour seed initial M7
- [ ] **Intégration API Personnel ANAC** - En attente documentation complète de l'API (Sprint 1 partiel)
- [ ] **Accès SERV-APPI** - Confirmer droits d'installation pour l'équipe dev (PostgreSQL, LibreTranslate, Tesseract)
- [ ] **Décision DeepL** - La DG valide-t-elle l'option fallback cloud DeepL ? Contrat RGPD à prévoir
- [ ] **Validation périmètre portail externe** - La DG/CCIT doit confirmer quels types de documents sont éligibles à exposition externe avant Sprint 9
- [ ] **Validation pg_dump sur SERV-APPI (Linux production)** - Confirmer que pg_dump est installé/accessible en PATH sur l'environnement de production, éviter la même erreur qu'en dev Windows

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
- [x] ~~**Sprint 5 M9 Dashboard V1 complété**~~ - 8 KPI, 3 graphiques Chart.js, alertes accords/courriers, recommandations, activité récente (juin 2026)
- [x] ~~**Revue terrain CCIT post-Sprint 5**~~ - Gaps identifiés sur rappels ciblés, suivi logistique missions, contact partenaire, portail externe — Sprints 8/9/10 planifiés (juin 2026)
- [x] ~~**Sprint 8 Centre Notifications & Rappels CCIT complété**~~ - Table parametres + notifications, ModalRelance + HistoriqueNotifications réutilisables, boutons Relancer sur Accord/Courrier/Mission, 6 jobs manuels, KPI dashboard enrichis, bloc accords expirés, criticité courriers 3 paliers (juillet 2026)
- [x] ~~**M11 Analytics planifié**~~ - Périmètre défini post-Sprint 8 : analytics stratégique distinct du dashboard opérationnel M9, 7 modules couverts, rapports PDF/Excel en couche présentation sur les agrégats analytics (juillet 2026)
