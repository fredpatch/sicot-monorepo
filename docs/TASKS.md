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
- [ ] **Flux bootstrap admin** - Sélection agent → email → génération OTP → envoi SMTP
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

- [ ] **Module upload fichiers** - PDF, Word, Doc, Txt, Excel, images — stockage structuré /sicot/documents/
- [ ] **Dossier surveillé /temp/** - Détection auto nouveaux fichiers, import sans action utilisateur
- [ ] **Microservice OCR Python** - Extraction texte multi-format : PDF natif (pdfplumber) + PDF scanné (pdf2image+Tesseract) + DOCX (python-docx) + DOC (LibreOffice headless) + TXT + images (Tesseract direct)
- [ ] **Détection automatique PDF natif vs scanné** - Bascule pdfplumber → Tesseract si page vide
- [ ] **Détection langue source automatique**
- [ ] **Classification auto par mots-clés** - Catégorie proposée, corrigeable par utilisateur
- [ ] **Gestion des versions documentaires** - Historique, version active marquée
- [ ] **Détection doublons MD5** - Alerte si document similaire existant à l'upload
- [ ] **Interface correction OCR manuelle**
- [ ] **Fiche Organisation (M2)** - Création, édition, statut actif/inactif, types (ANAC étrangère / Orga internationale / Autre)
- [ ] **Fiche Contact rattachée** - Plusieurs contacts par organisation, marquage 'principal', historique rattachement
- [ ] **Tableau partenaires** - Filtres pays / région / type
- [ ] **Recherche full-text dans documents archivés** - PostgreSQL FTS

### Décisions techniques Sprint 2

- Microservice Python séparé exposé en HTTP local (port 5001) — appelé par Express
- Formats supportés : .pdf, .docx, .doc, .txt, .xlsx, .xls, .jpg, .png, .tiff
- PDF natif → pdfplumber ; PDF scanné → pdf2image + Tesseract ; DOCX → python-docx ; DOC → LibreOffice headless
- Nettoyage post-OCR : suppression espaces parasites autour apostrophes (identifié lors test LibreTranslate)
- Conversion toujours côté serveur — l'utilisateur uploade le fichier original, pas d'action manuelle requise

## Sprint 3 – Accords, Correspondances & Missions (M1 + M4 + M3) | 2 semaines

- [ ] **Fiche Accord (M1)** - Champs complets, statuts (Actif/Expiré/Suspendu/En renouvellement), référence auto ACC-2026-XXXX
- [ ] **Relation many-to-many accords-partenaires**
- [ ] **Gestion versions accord** - Renouvellement → nouvelle version liée à l'accord parent
- [ ] **Alertes échéances accord** - Email + app à 30/60/90j avant expiration (cron, délais configurables)
- [ ] **Fiche Courrier (M4)** - Entrant/Sortant, référence auto CORR-2026-XXXX, pièces jointes multiples
- [ ] **Fil de correspondance** - Lien réponse à un courrier entrant, rattachement accord/mission optionnel
- [ ] **Suivi réponse courrier** - Date limite, statut (Oui/Non/Pour information)
- [ ] **Fiche Mission (M3)** - Titre, destination, dates, participants ANAC depuis annuaire interne
- [ ] **Double option rapport de mission** - Upload PDF/Word OU formulaire intégré, version active = plus récent
- [ ] **Liste recommandations** - Texte + responsable optionnel + date limite + statut (En attente/En cours/Réalisée)
- [ ] **Alertes recommandations** - Uniquement si date limite définie
- [ ] **Export PDF/DOCX** - Accords, courriers, rapports de mission (templates aux couleurs ANAC)

## Sprint 4 – Traduction IA, Glossaire & Demandes (M6 + M7 + M5) | 3 semaines

- [ ] **Base glossaire (M7)** - Termes FR↔EN, domaines, historique modifications, gestion termes inactifs
- [ ] **Script import glossaire CSV/Excel**
- [ ] **Intégration LibreTranslate on-prem** - Traduction FR↔EN par segments, barre de progression
- [ ] **Configuration DeepL fallback** - Activable/désactivable par admin
- [ ] **Éditeur côte-à-côte (M6)** - Original gauche / traduction droite modifiable
- [ ] **Workflow traduction** - Statuts : À réviser → Valider / Approuver sans modif → Archivée (archivage bloqué sans approbation humaine)
- [ ] **Suggestions glossaire dans éditeur** - Surligné auto si terme connu, clic pour appliquer
- [ ] **Sauvegarde delta corrections** - Différence IA vs corrigé → enrichissement automatique M7
- [ ] **Gestion échec moteur IA** - Statut 'Traduction manuelle requise', alerte traducteur
- [ ] **Inbox commune demandes (M5)** - Fichier uploadé OU texte libre, auto-assignation avec verrou BDD
- [ ] **Statuts demande** - Soumise → En cours → En relecture → Validée → Archivée
- [ ] **Rappel de demande par demandeur** - Possible si statut 'Soumise' uniquement
- [ ] **Système de priorité** - Demandeur propose (Normale/Urgente), Admin/CCIT valide ou modifie
- [ ] **Export DOCX texte libre traduit**

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
- [ ] **Flux bootstrap admin** - Dépend de l'API Personnel ANAC (Sprint 1 partiel)
- [ ] **Accès SERV-APPI** - Confirmer droits d'installation pour l'équipe dev (PostgreSQL, LibreTranslate, Tesseract)
- [ ] **Décision DeepL** - La DG valide-t-elle l'option fallback cloud DeepL ? Contrat RGPD à prévoir

## Done

- [x] ~~**Monorepo SICOT initialisé**~~ - Structure 3 packages, tsconfig, ESLint, Prettier, .gitignore (juin 2026)
- [x] ~~**Schema BDD Drizzle complet**~~ - 10 modules, enums, tables, relations, index, migration appliquée (juin 2026)
- [x] ~~**Stack client configurée**~~ - React 18 + Vite + Tailwind, couleurs ANAC, i18n FR/EN, router (juin 2026)
- [x] ~~**Sprint 1 M10 complété**~~ - Auth, Users, Audit, Backup, Layout, LoginPage, App.tsx, api.ts (juin 2026)
