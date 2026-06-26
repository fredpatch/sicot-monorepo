# SICOT – Système Intégré de Coopération Internationale et de Traduction

**ANAC Gabon – Cellule CCIT / Service Informatique**  
Version 1.0 – Juin 2026

---

## Structure du monorepo

```
sicot/
├── docs/
├── packages/
│   ├── shared/          # Types TypeScript partagés (client + serveur)
│   ├── server/          # API Express + Drizzle ORM + PostgreSQL
│   └── client/          # Interface React + Vite + Tailwind CSS
├── scripts/
│   └── setup-db.sql     # Initialisation PostgreSQL
├── tsconfig.base.json
├── .eslintrc.json
├── .prettierrc
└── package.json
```

## Stack technique

| Couche          | Technologie                          |
| --------------- | ------------------------------------ |
| Frontend        | React 18 + TypeScript + Tailwind CSS |
| Backend         | Node.js + Express + TypeScript       |
| ORM             | Drizzle ORM                          |
| Base de données | PostgreSQL                           |
| Auth            | JWT + bcrypt + OTP                   |
| OCR             | Tesseract 5 (microservice Python)    |
| Traduction IA   | LibreTranslate (on-prem)             |
| Jobs planifiés  | node-cron                            |
| Export PDF      | Puppeteer                            |
| Export Excel    | ExcelJS                              |

## Démarrage rapide (développement)

### 1. Prérequis

- Node.js ≥ 22
- PostgreSQL ≥ 15
- LibreTranslate (optionnel pour Phase 0)
- Tesseract 5 (optionnel pour Phase 0)

### 2. Installation

```bash
# Cloner le dépôt
git clone <repo> sicot && cd sicot

# Installer toutes les dépendances
npm install

# Configurer les variables d'environnement
cp packages/server/.env.example packages/server/.env
# Éditer packages/server/.env avec les valeurs SERV-APPI

# Initialiser la base de données
psql -U postgres -f scripts/setup-db.sql

# Générer et appliquer les migrations Drizzle
npm run db:generate
npm run db:migrate
```

### 3. Lancer en développement

```bash
npm run dev
# → API  : http://localhost:3001
# → App  : http://localhost:5173
```

## Plan de développement

| Phase                         | Sprints     | Durée      |
| ----------------------------- | ----------- | ---------- |
| Phase 0 – Initialisation      | –           | 2 semaines |
| Phase 1 – Beta opérationnelle | Sprints 1–4 | 9 semaines |
| Phase 2 – Version 1.0         | Sprints 5–6 | 4 semaines |
| Phase 3 – Déploiement         | Sprint 7    | 2 semaines |

## Modules (10)

- **M1** Gestion des Accords et Partenariats
- **M2** Gestion des Partenaires Internationaux
- **M3** Gestion des Missions et Événements
- **M4** Gestion des Correspondances Internationales
- **M5** Gestion des Demandes de Traduction
- **M6** Traduction Assistée par IA
- **M7** Glossaire et Mémoire de Traduction
- **M8** Gestion Documentaire (OCR & Archivage)
- **M9** Tableaux de Bord et Statistiques
- **M10** Administration, Sécurité et Journalisation

---
