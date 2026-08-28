---
slug: gerer-comptes-utilisateurs
title: Gérer les comptes utilisateurs
excerpt: Trouver un compte SICOT, sa fiche, son rôle et son statut d'activation.
category: administration
relatedRoutes: /utilisateurs
capability: USER_MANAGE
---

La page **Utilisateurs** regroupe les comptes SICOT et l'annuaire du
Personnel ANAC utilisé pour en créer de nouveaux.

## Trouver un compte

L'onglet **Utilisateurs** liste les comptes SICOT, avec des filtres par
rôle et par statut (actif/inactif) et une recherche par nom.

## Créer un compte

Un compte peut être créé manuellement, ou pré-rempli depuis l'onglet
**Personnel ANAC** - un annuaire en lecture seule de l'ANAC (matricule,
nom, prénom, service) qui ne fournit ni email ni rôle SICOT : ces deux
champs restent à saisir vous-même. Un code de connexion (OTP) est
automatiquement envoyé par email lors de la création.

## Le modèle de rôles

Chaque compte porte **un seul rôle**, parmi :

- **Agent**
- **Opérateur**
- **Admin**
- **Super Admin**

Le rôle peut être modifié depuis la fiche du compte ; le matricule, lui,
n'est jamais modifiable après création.

## Statut et protections

Un compte peut être **activé** ou **désactivé** ; un code OTP peut aussi
être réinitialisé pour un compte actif. Deux protections s'appliquent :
un compte ne peut pas se désactiver lui-même, et le compte Super Admin ne
peut jamais être désactivé par personne, afin de garantir qu'il existe
toujours au moins un accès d'administration au système.

Ces deux protections sont indépendantes de vos droits d'accès : elles
s'appliquent à tout compte disposant du droit de gestion des
utilisateurs.
