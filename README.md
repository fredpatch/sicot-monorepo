# SICOT - Système Intégré de Coopération Internationale et de Traduction

**ANAC Gabon - Cellule CCIT / Service Informatique**

## Qu'est-ce que SICOT ?

SICOT est l'application interne de gestion de la coopération internationale
et de traduction de l'ANAC. Elle couvre aujourd'hui :

- coopération internationale : accords, partenaires, contacts
- correspondances internationales (courriers entrants/sortants)
- missions et rapport officiel consolidé
- demandes de traduction et leur workflow (traitement, relecture,
  approbation)
- glossaire terminologique
- gestion documentaire (dépôt, OCR, versions)
- portail documentaire public contrôlé (liens de téléchargement à durée
  limitée)
- analytics et rapports (avec analyse assistée par IA optionnelle)
- administration, sécurité et journalisation d'audit

Ce README est le point d'entrée du dépôt. **`docs/` est la source de
vérité** pour tout ce qui est technique - ce fichier ne duplique pas cette
documentation, il y renvoie.

## Structure du monorepo

```
sicot-monorepo/
├── packages/
│   ├── client/             # Interface React + TypeScript + Vite
│   ├── server/              # API Express + Drizzle ORM + PostgreSQL
│   ├── shared/               # Types/logique partagés (auth, capacités...)
│   ├── ocr-service/           # Microservice Python/Flask - OCR
│   └── translate-service/      # Microservice Python/Flask - traduction
├── docs/                    # Documentation canonique (voir plus bas)
├── scripts/                 # Scripts d'installation/déploiement
├── nginx/                   # Configuration nginx (pré-prod/prod)
└── .github/workflows/       # CI, publication d'images, déploiement
```

## Stack technique actuelle

| Couche | Technologie |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM / base de données | Drizzle ORM + PostgreSQL |
| Authentification | JWT (cookies) + bcrypt + OTP |
| OCR | Microservice Python/Flask (Tesseract, LibreOffice, Poppler) |
| Traduction | Microservice Python/Flask + LibreTranslate auto-hébergé (+ DeepL optionnel) |
| Jobs planifiés | node-cron (en processus, dans l'API) |
| Conteneurisation | Docker Compose + nginx |
| CI/CD | GitHub Actions + GHCR |

## Démarrage pour le développement

**Docker Compose est le parcours de développement complet recommandé** -
le développement natif est seulement partiellement supporté aujourd'hui
(build préalable du package partagé, chemins natifs des exécutables OCR,
absence de parcours natif documenté pour LibreTranslate) ; voir
[`docs/operations/installation-bootstrap.md`](./docs/operations/installation-bootstrap.md)
pour le détail complet des deux parcours.

```bash
npm install
cp .env.example .env   # renseigner au minimum DB_USER/DB_PASSWORD/DB_NAME/JWT_SECRET/JWT_REFRESH_SECRET
docker compose up --build -d
```

Les migrations s'appliquent automatiquement au démarrage du conteneur
`api`. L'application est ensuite disponible sur
`http://localhost:5173` (client) et `http://localhost:3001/api/health`
(API).

Le développement natif (`npm run dev` à la racine) reste possible en
alternative, **partiellement supporté** - voir le même document pour ses
limites exactes avant de s'y engager.

Instructions complètes (installation, configuration, bootstrap) :
[`docs/operations/installation-bootstrap.md`](./docs/operations/installation-bootstrap.md).

## Initialisation de l'application (bootstrap)

La création du premier compte Super Admin est **pilotée par API**, pas par
script CLI :

- `GET /api/bootstrap/status`
- `POST /api/bootstrap/init`

Le client redirige automatiquement vers cet écran tant qu'aucun Super Admin
n'existe. Procédure complète :
[`docs/operations/installation-bootstrap.md`](./docs/operations/installation-bootstrap.md).

## Base de données et migrations

PostgreSQL + Drizzle ORM. La baseline active est
`packages/server/drizzle/0000_initial_schema.sql` ; les évolutions futures
s'ajoutent en `0001_*.sql` et suivants. **Une fois que `0000` a été
consommée par un environnement pré-production/production persistant, elle
ne doit plus être réécrite.** Procédure et commandes complètes :
[`docs/operations/migrations.md`](./docs/operations/migrations.md).

## Vérification locale

```bash
npm run build   # tsc + build pour shared/server/client
npm test        # suites de tests par workspace
```

La CI (`.github/workflows/ci.yml`) exécute `npm run lint` et `npm run
build` sur chaque push/PR - elle **n'exécute pas** `npm test` aujourd'hui.

## Documentation

`docs/` est la documentation canonique et versionnée du projet. Index
complet : [`docs/README.md`](./docs/README.md).

| Domaine | Emplacement |
|---|---|
| Guide utilisateur | [`docs/user-guide/`](./docs/user-guide/) |
| Architecture | [`docs/architecture/`](./docs/architecture/) |
| Décisions d'architecture (ADR) | [`docs/architecture/decisions/`](./docs/architecture/decisions/) |
| Sécurité | [`docs/security/`](./docs/security/) |
| API | [`docs/api/`](./docs/api/) |
| Opérations | [`docs/operations/`](./docs/operations/) |
| Dépannage | [`docs/troubleshooting/`](./docs/troubleshooting/) |
| Artefacts de référence | [`docs/others/`](./docs/others/) |

`docs/operations/` est la documentation canonique pour l'exploitation et le
déploiement de SICOT. `docs/deployment-documentation.md` est un playbook
générique réutilisable, marqué référence uniquement / non canonique - il
ne décrit pas SICOT spécifiquement.

## Limitations opérationnelles actuelles

Faits à connaître avant d'opérer ou de faire évoluer le système - le détail
complet vit dans `docs/`, pas ici.

- **Sauvegardes** : chaque exécution produit un jeu complet (base
  PostgreSQL + fichiers de documents + manifeste avec SHA-256). Un outil de
  restauration existe et son fonctionnement de bout en bout est prouvé en
  CI contre un PostgreSQL jetable réel, avec des données synthétiques
  uniquement (mode `verify`) - le mode `disaster-recovery` n'est pas encore
  répété de bout en bout contre une cible réaliste de production, et une
  incompatibilité réelle de version `pg_dump`/serveur cible a été
  identifiée (à confirmer avant tout usage réel).
  Détail : [`docs/operations/backups.md`](./docs/operations/backups.md),
  [`docs/operations/restore-drill.md`](./docs/operations/restore-drill.md).
- **Santé/supervision** : `GET /api/health` de l'API principale est une
  vérification de vivacité superficielle, pas une vérification complète
  de disponibilité des dépendances (base de données, services externes).
  Détail : [`docs/operations/monitoring-and-health.md`](./docs/operations/monitoring-and-health.md).

Les lacunes de sécurité connues sont documentées en détail dans
[`docs/security/security-checklist.md`](./docs/security/security-checklist.md),
pas ici.

## Autorisation - résumé

Chaque compte porte un seul rôle persistant parmi `agent`, `operateur`,
`admin`, `super_admin` ; l'étendue des droits est exprimée par des
**capacités** (additives par palier), avec des politiques contextuelles
au-dessus pour les décisions propres à un enregistrement (ex. participant
désigné responsable d'un rapport de mission). Les responsabilités de
workflow (ex. responsable d'un rapport) sont des affectations par
enregistrement, jamais des rôles persistants.

Détail : [`docs/security/authorization.md`](./docs/security/authorization.md)
et [`docs/architecture/decisions/0001-single-persistent-role-with-capabilities.md`](./docs/architecture/decisions/0001-single-persistent-role-with-capabilities.md).

## Déploiement

Le dépôt définit les procédures de déploiement pré-production et
production (Docker Compose, nginx, GitHub Actions). **Ceci décrit ce que
le dépôt définit, pas une infrastructure de production confirmée en
fonctionnement** - le dépôt seul ne prouve pas qu'un VPS de production réel
existe ou sert du trafic actuellement.

Procédure complète : [`docs/operations/deployment.md`](./docs/operations/deployment.md).
