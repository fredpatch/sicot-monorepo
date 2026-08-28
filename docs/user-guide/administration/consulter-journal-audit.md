---
slug: consulter-journal-audit
title: Consulter le journal d'audit
excerpt: Retrouver qui a fait quoi dans SICOT, à des fins de traçabilité.
category: administration
relatedRoutes: /audit
capability: AUDIT_VIEW
---

Le **Journal d'audit** trace les actions effectuées dans SICOT, à des
fins de traçabilité. Il est **en lecture seule** : aucune entrée ne peut
être modifiée ou supprimée depuis l'application.

## Trouver un événement

Les entrées peuvent être filtrées par module, par action et par période
(date de début / date de fin).

## Lire une entrée

Chaque ligne indique la date et l'heure, l'utilisateur à l'origine de
l'action (ou « Système » pour une action automatique), le module,
l'action effectuée et l'entité concernée. Le bouton **Détails** ouvre
une fiche complète avec, en plus, l'adresse IP et des informations
techniques additionnelles propres à l'action.

## Limites

Le journal d'audit permet de retracer les actions effectuées - il ne
permet ni de les annuler, ni de les modifier.
