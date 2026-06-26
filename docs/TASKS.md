# SICOT – Task List / Plan de Développement

## Phase 0 – Initialisation (2 semaines)

- [ ] **Kick-off : validation CDC, affectation ressources** - CR de kick-off signé par toute l'équipe
- [ ] **Audit de l'existant** - Collecter et analyser les fichiers Excel CCIT actuels, documenter les process manuels
- [ ] **Valider la stack technique** - Confirmer React + Express + Drizzle + PostgreSQL, configurer ESLint/Prettier/tsconfig, initialiser le monorepo
- [ ] **Installer l'environnement dev sur SERV-APPI** - PostgreSQL, LibreTranslate, Tesseract 5
- [ ] **Test OCR sur corpus réel ANAC** - 5 à 10 documents représentatifs (accords, correspondances), produire rapport qualité
- [ ] **Test LibreTranslate FR↔EN** - Extraits aéronautiques réels, produire rapport qualité traduction
- [ ] **Import glossaire initial** - Si fichier fourni par CCIT, script import CSV/Excel → seed BDD
- [ ] **Modélisation BDD complète** - Schéma de toutes les entités (10 modules), validé par l'équipe

## Sprint 1 – Administration & Auth (M10) | 2 semaines

- [ ] **Structure projet** - Routing, middleware, modèles BDD de base
- [ ] **Intégration API Personnel ANAC** - Fetch liste agents en temps réel
- [ ] **Flux bootstrap admin** - Sélection agent → email → génération OTP → envoi SMTP
- [ ] **Page connexion** - Matricule + OTP → changement mot de passe obligatoire à la première connexion
- [ ] **Gestion des rôles** - Agent / Traducteur / Relecteur / Admin / Super Admin
- [ ] **Interface admin utilisateurs** - Liste, activation/désactivation, réinitialisation OTP
- [ ] **Journal d'audit** - Enregistrement toutes actions, interface consultation + export PDF/Excel (non modifiable)
- [ ] **Sauvegarde automatique BDD** - Cron quotidien local (SERV-APPI) + hebdomadaire NAS, rétention 30j/12 mois
- [ ] **Interface bilingue FR/EN** - i18n configuré sur toute l'application
- [ ] **Charte graphique ANAC** - Police Candara, couleurs institutionnelles, logo officiel

## Sprint 2 – Documentaire & Partenaires (M8 + M2) | 2 semaines

- [ ] **Module upload fichiers** - PDF, Word, images — stockage structuré /sicot/documents/
- [ ] **Dossier surveillé /temp/** - Détection auto nouveaux fichiers, import sans action utilisateur
- [ ] **Intégration Tesseract** - Extraction texte depuis PDF scanné et images, microservice Python
- [ ] **Détection langue source automatique**
- [ ] **Classification auto par mots-clés** - Catégorie proposée, corrigeable par utilisateur
- [ ] **Gestion des versions documentaires** - Historique, version active marquée
- [ ] **Détection doublons MD5** - Alerte si document similaire existant à l'upload
- [ ] **Interface correction OCR manuelle**
- [ ] **Fiche Organisation (M2)** - Création, édition, statut actif/inactif, types (ANAC étrangère / Orga internationale / Autre)
- [ ] **Fiche Contact rattachée** - Plusieurs contacts par organisation, marquage 'principal', historique rattachement
- [ ] **Tableau partenaires** - Filtres pays / région / type
- [ ] **Recherche full-text dans documents archivés** - PostgreSQL FTS

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
- [ ] **Accès API Personnel ANAC** - Confirmer disponibilité et documentation de l'API pour M10
- [ ] **Accès SERV-APPI** - Confirmer droits d'installation pour l'équipe dev (PostgreSQL, LibreTranslate, Tesseract)
- [ ] **Décision DeepL** - La DG valide-t-elle l'option fallback cloud DeepL ? Contrat RGPD à prévoir

## Done

