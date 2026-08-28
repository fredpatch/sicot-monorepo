---
slug: executer-operations-administratives
title: Exécuter les opérations administratives
excerpt: Déclencher manuellement un job planifié et consulter l'historique de ses exécutions.
category: administration
relatedRoutes: /admin
relatedArticles: gerer-parametres-systeme
capability: JOB_EXECUTE
---

L'onglet **Monitoring &amp; Jobs** de la page Administration permet de
déclencher immédiatement un job normalement exécuté automatiquement en
tâche planifiée, et d'en consulter l'historique.

## Lancer un job

Les jobs sont regroupés par module. Lancer un job demande une
confirmation, rappelant ce que le job va faire ; chaque exécution est
enregistrée dans le Journal d'audit ainsi que dans l'historique des
exécutions.

## Opérations à risque élevé

Certains jobs (notamment liés aux sauvegardes) sont réservés au compte
Super Admin : ils restent visibles pour les autres comptes disposant de
ce droit, mais leur bouton d'exécution est désactivé et signalé comme
« Réservé Super Admin ».

## Historique des exécutions

L'historique liste chaque exécution, manuelle ou planifiée, avec son
résultat (succès/échec), sa durée et un résumé - filtrable par job,
origine (manuel ou planifié) et résultat. Le détail d'une exécution
s'affiche en cliquant dessus.

Selon vos droits d'accès, certains jobs peuvent ne pas être exécutables
depuis cette page, même s'ils restent visibles.
