# 🗄️ SICOT - Database Schema

All defined in `packages/server/src/db/schema.ts` (Drizzle ORM).

## Enums

| Enum | Values |
|------|--------|
| `user_role` | `agent` `traducteur` `relecteur` `admin` `super_admin` |
| `organisation_type` | `anac_etrangere` `organisation_internationale` `autre` |
| `accord_statut` | `actif` `expire` `suspendu` `en_renouvellement` |
| `courrier_direction` | `entrant` `sortant` |
| `courrier_reponse_statut` | `oui` `non` `pour_information` |
| `courrier_suivi_statut` | `en_attente` `repondu` `archive` |
| `mission_statut` | `planifiee` `en_cours` `terminee` `annulee` |
| `recommandation_statut` | `en_attente` `en_cours` `realisee` |
| `document_categorie` | `accord` `correspondance` `mission` `traduction` `glossaire` `autre` |
| `document_statut_ocr` | `en_attente` `traite` `a_retraiter` `echec` |
| `traduction_statut` | `a_reviser` `en_relecture` `approuvee` `archivee` `manuelle_requise` |
| `traduction_direction` | `fr_en` `en_fr` |
| `moteur_traduction` | `libretranslate` `deepl` `manuel` |
| `demande_statut` | `soumise` `en_cours` `en_relecture` `validee` `archivee` |
| `demande_priorite` | `normale` `urgente` |

## Tables

### `users` (M10)
```
id               serial PK
matricule        varchar(20) UNIQUE — format: AG-2026-XXX
nom / prenom     varchar(100)
email            varchar(255) UNIQUE
mot_de_passe_hash varchar(255) nullable (not set until first login)
otp_hash         varchar(255) nullable
otp_expires_at   timestamp   nullable
role             user_role   default: agent
actif            boolean     default: false (admin must activate first)
premiere_connexion boolean   default: true
tentatives_echouees integer  default: 0
bloque_jusqu_a   timestamp   nullable (lockout until)
created_at / updated_at timestamp
```
Index: `users_matricule_idx` (unique)

### `audit_logs` (M10)
```
id         serial PK
user_id    FK → users (nullable — system actions)
action     varchar(100) — CONNEXION | OTP_VALIDE | MOT_DE_PASSE_DEFINI | ...
module     varchar(20)  — M10 | M8 | ...
entite_id  integer nullable
details    jsonb nullable
ip         varchar(45)
created_at timestamp
```
Indexes: `user_idx`, `module_idx`, `created_at_idx`

### `organisations` (M2)
```
id         serial PK
nom        varchar(255)
pays       varchar(100)
region     varchar(100) nullable
type       organisation_type
actif      boolean default: true
notes      text nullable
created_at / updated_at
```

### `contacts` (M2)
```
id               serial PK
organisation_id  FK → organisations
nom / prenom     varchar(100)
email            varchar(255) nullable
telephone        varchar(30) nullable
poste            varchar(150) nullable
principal        boolean default: false
actif            boolean default: true
created_at
```

### `documents` (M8)
```
id             serial PK
nom / nom_original varchar(255)
chemin         varchar(500)   — storage path
mime_type      varchar(100)
taille         integer        — bytes
categorie      document_categorie default: autre
langue         varchar(10) nullable
texte_extrait  text nullable  — OCR output
statut_ocr     document_statut_ocr default: en_attente
hash_md5       varchar(32)    — dedup key
version        integer default: 1
parent_id      integer nullable — links to previous version
uploade_par    FK → users
created_at
```
Indexes: `hash_idx`, `categorie_idx`, `statut_ocr_idx`

### `accords` (M1)
```
id              serial PK
reference       varchar(20) UNIQUE — ACC-2026-XXXX
titre           varchar(255)
statut          accord_statut default: actif
date_signature  timestamp
date_expiration timestamp nullable
parent_id       integer nullable  — renewal chain
document_id     FK → documents nullable
notes           text nullable
cree_par        FK → users
created_at / updated_at
```
Many-to-many with organisations via `accords_organisations(accord_id, organisation_id)`

### `courriers` (M4)
```
id                          serial PK
reference                   varchar(20) UNIQUE — CORR-2026-XXXX
reference_expediteur        varchar(100) nullable
direction                   courrier_direction
objet                       varchar(500)
expediteur_organisation_id  FK → organisations nullable
destinataire_organisation_id FK → organisations nullable
date_reception              timestamp
reponse_requise             courrier_reponse_statut
date_limite_reponse         timestamp nullable
suivi_statut                courrier_suivi_statut default: en_attente
reponse_a_id                integer nullable — reply chain
accord_id                   FK → accords nullable
mission_id                  integer nullable
cree_par                    FK → users
created_at / updated_at
```
Indexes: `direction_idx`, `statut_idx`

### `missions` (M3)
```
id                  serial PK
titre               varchar(255)
destination / pays  varchar(255/100)
date_debut / date_fin timestamp
statut              mission_statut default: planifiee
rapport_document_id FK → documents nullable
cree_par            FK → users
created_at / updated_at
```
Participants via `mission_participants(mission_id, user_id)` pivot.

### `recommandations` (M3)
```
id            serial PK
mission_id    FK → missions
texte         text
responsable_id FK → users nullable
date_limite   timestamp nullable
statut        recommandation_statut default: en_attente
created_at / updated_at
```

### `glossaire` (M7)
```
id          serial PK
terme_fr    varchar(255)
terme_en    varchar(255)
domaine     varchar(100) nullable
contexte    text nullable
actif       boolean default: true
cree_par    FK → users
created_at / updated_at
```
Indexes: `terme_fr_idx`, `terme_en_idx`
History via `glossaire_historique(id, terme_id, ancien_terme_fr, ancien_terme_en, modifie_par, created_at)`

### `traductions` (M6)
```
id              serial PK
document_id     FK → documents nullable
texte_original  text nullable
texte_ia        text nullable   — raw AI output
texte_final     text nullable   — human-corrected
direction       traduction_direction
statut          traduction_statut default: a_reviser
moteur_utilise  moteur_traduction default: libretranslate
traducteur_id   FK → users nullable
relecteur_id    FK → users nullable
created_at / updated_at
```

### `demandes_traduction` (M5)
```
id                serial PK
demandeur_id      FK → users (requester)
traducteur_id     FK → users nullable (assigned)
document_id       FK → documents nullable
texte_libre       text nullable  — free-text instead of file
direction         traduction_direction
priorite_demandee demande_priorite default: normale
priorite_validee  demande_priorite nullable (admin override)
statut            demande_statut default: soumise
traduction_id     FK → traductions nullable
verrou            boolean default: false  — concurrent lock
created_at / updated_at
```
Indexes: `statut_idx`, `traducteur_idx`

## Drizzle Relations (defined)
- `users` → many `audit_logs`, many `demandes_traduction` (demandeur), many `traductions` (traducteur)
- `organisations` → many `contacts`, many `accordsOrganisations`
- `accords` → many `accordsOrganisations`, one `documents`
- `missions` → many `missionParticipants`, many `recommandations`

## DB Commands
```bash
npm run db:generate    # generate migration from schema changes
npm run db:migrate     # apply migrations
npm run db:studio      # open Drizzle Studio UI
```
