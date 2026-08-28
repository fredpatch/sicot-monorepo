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

## Autres sous-dossiers (hors périmètre de ce slice)

`workflows/`, `functional-reference/`, `architecture/`, `security/`,
`api/`, `operations/`, `troubleshooting/` et `changelog/` sont prévus par
l'architecture cible (voir l'audit Phase 10) mais ne sont pas encore créés

- ils le seront quand un travail réel les remplira, pas par anticipation.
