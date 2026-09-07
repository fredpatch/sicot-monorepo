# Documentation SICOT

Ce dossier est la source canonique et versionnée de la documentation SICOT.

## `user-guide/`

Articles d'aide destinés aux utilisateurs de l'application, rédigés en
français, un fichier Markdown par article avec un en-tête de métadonnées
(_frontmatter_). C'est le seul sous-dossier consommé par le client React :
`packages/client/src/lib/docs/articles.ts` charge chaque fichier au
build/test via `import.meta.glob`, valide son frontmatter, puis l'expose au
centre d'aide (`/aide`) et au tiroir d'aide contextuelle.

Organisation par catégorie (un sous-dossier par catégorie active) :

- `getting-started/` - prise en main générale
- `personal-workspace/` - espace personnel, demandes de traduction
- `translation/` - traitement, relecture, approbation des traductions
- `missions/` - missions et rapport officiel

D'autres catégories (coopération internationale, documents, administration,
etc.) seront ajoutées au fil des phases suivantes, avec leurs propres
sous-dossiers - ce dossier ne préremplit pas de catégories vides.

### Format d'un article

```markdown
---
slug: mon-article
title: Titre de l'article
excerpt: Résumé d'une phrase.
category: getting-started
relatedRoutes: /mon-espace, /demandes
relatedArticles: autre-slug
---

Contenu Markdown de l'article.
```

`relatedRoutes` et `relatedArticles` sont des listes séparées par des
virgules. `capability` (optionnel) restreint la visibilité de l'article à
un rôle disposant de cette capacité (voir `@sicot/shared`) ; un article sans
`capability` est visible par tout utilisateur authentifié.

## `architecture/`

Documentation technique décrivant l'implémentation actuelle du dépôt (pas
une architecture aspirationnelle), destinée aux développeurs et mainteneurs :

- [`overview.md`](./architecture/overview.md) - structure du monorepo,
  composants runtime, flux de requêtes, découpage des couches serveur,
  modèle d'autorisation (résumé).
- [`runtime-topology.md`](./architecture/runtime-topology.md) - comment les
  composants sont reliés en développement, pré-production et production.
- [`data-model.md`](./architecture/data-model.md) - domaines de données
  persistantes, relations clés, règles architecturales notables.

## `security/`

Documentation de l'architecture de sécurité actuelle - y compris ses limites
connues, décrites sans les euphémiser :

- [`authentication.md`](./security/authentication.md) - identité de
  connexion, hachage des mots de passe, OTP, verrouillage de compte.
- [`authorization.md`](./security/authorization.md) - modèle rôle ->
  capacité -> middleware -> politique contextuelle ; acteurs de workflow vs.
  rôles persistants.
- [`csrf-and-session-security.md`](./security/csrf-and-session-security.md) -
  sessions/tokens, posture CSRF actuelle (y compris l'absence de protection
  dédiée), CORS, limitation de débit.
- [`document-access.md`](./security/document-access.md) - fichier stocké vs.
  visibilité interne vs. exposition publique ; portail public et tokens de
  téléchargement.
- [`audit-and-traceability.md`](./security/audit-and-traceability.md) - ce
  que le journal d'audit capture réellement, et ce qu'il ne garantit pas.
- [`security-checklist.md`](./security/security-checklist.md) - liste
  vivante : implémenté / à vérifier avant pré-production / lacunes connues /
  décisions de production requises.

## Autres sous-dossiers (hors périmètre de ce slice)

`workflows/`, `functional-reference/`, `api/`, `operations/`,
`troubleshooting/` et `changelog/` sont prévus par l'architecture cible (voir
l'audit Phase 10 et le plan Phase 11) mais ne sont pas encore créés - ils le
seront quand un travail réel les remplira, pas par anticipation.
