# Translation endpoints

Two base paths covering one workflow domain: `/api/demandes` (requests) and
`/api/traductions` (the translation records themselves, and processing
actions on them). Every route requires `authenticate`.

**Workflow assignments are not roles.** `traducteurId`/`relecteurId` on a
translation or request record are ordinary foreign keys to whichever
`operateur`+ user performed the relevant action - never checked against a
stored "role" value. Any user with the right capability
(`TRANSLATION_PROCESS`, `REQUEST_TAKE`, etc.) can become the recorded
`traducteurId`/`relecteurId` on a given record. See
[../../security/authorization.md](../../security/authorization.md).

Status enums: `demandesTraduction.statut` = `soumise|en_cours|en_relecture|validee|archivee`;
`traductions.statut` = `a_reviser|en_relecture|approuvee|archivee|manuelle_requise`
(same name, different table - don't conflate them); `priorite` =
`normale|urgente`; `direction` = `fr_en|en_fr`.

## Requests (`/api/demandes`)

### GET /api/demandes
**Capability:** none - if the caller lacks `REQUEST_QUEUE_VIEW`, the
`demandeurId` filter is forced to their own id and `traducteurId` filtering
is dropped entirely (personal-scope override, not an error).

**Request:** query `statut`, `priorite`, `direction`, `demandeurId`,
`traducteurId`, `search`, `page`, `pageSize`.

**Response:** `{ data: DemandeView[], total }`.

### GET /api/demandes/aggregates
**Capability:** none, same personal-scope override on `demandeurId`.

**Response:** `{ total, aAssigner, enCours, enRelecture, validees, archivees, urgentes, normales }`.

### GET /api/demandes/:id
**Capability:** none - if personal scope and the caller isn't the
`demandeurId`, throws `DEMANDE_NON_AUTORISEE` (403).

**Response:** `DemandeView`.

### POST /api/demandes
**Capability:** `REQUEST_CREATE_OWN`

Purpose: submit a translation request from free text or a document.

**Request:** body `direction` (required), `documentId` or `texteLibre`
(one required), `priorite` (default `'normale'`). `demandeurId` is always
the caller - never client-supplied.

**Response:** `201 DemandeView`.

**Important errors:** 400 `CONTENU_REQUIS` (neither field given), 400
`DOCUMENT_SANS_TEXTE_OCR`; 404 `DOCUMENT_INTROUVABLE`.

### PATCH /api/demandes/:id/rappeler
**Capability:** `REQUEST_RECALL_OWN`. Contextual: only the request's own
`demandeurId` may recall it, and only while `statut='soumise'`.

**Important errors:** 403 `DEMANDE_NON_AUTORISEE`; 400 `DEMANDE_DEJA_PRISE`.

### PATCH /api/demandes/:id/prendre-en-charge
**Capability:** `REQUEST_TAKE` (operateur+; agent deliberately excluded)

Purpose: **the "take"/lock mechanism.** Atomically self-assigns the request
(`traducteurId = caller`, `statut='en_cours'`, `verrou=true`) via a
`WHERE verrou=false` compare-and-set - first request wins. On success,
automatically launches a machine translation and links it; if MT launch
fails, the request stays `en_cours` awaiting manual translation
(non-blocking).

**Important errors:** 400 `DEMANDE_NON_DISPONIBLE` (not `soumise`); 409
`DEMANDE_VERROUILEE` (lost the race).

### PATCH /api/demandes/:id/relecture
**Capability:** `REQUEST_SUBMIT_REVIEW`. Contextual: only the request's own
`traducteurId` (the one who took it) may submit for review, and only while
`statut='en_cours'`.

**Important errors:** 403 `DEMANDE_NON_AUTORISEE`; 400 `DEMANDE_STATUT_INVALIDE`.

### PATCH /api/demandes/:id/priorite
**Capability:** `REQUEST_PRIORITY_VALIDATE`

**Request:** body `priorite` (`'normale'|'urgente'`).

### PATCH /api/demandes/:id/valider
**Capability:** `REQUEST_VALIDATE`. Requires `statut='en_relecture'`.

### PATCH /api/demandes/:id/archiver
**Capability:** `REQUEST_ARCHIVE`. Requires `statut='validee'`.

---

## Translation records & processing (`/api/traductions`)

### GET /api/traductions/moteur/status
**Capability:** none

**Response:** `{ accessible, langues, deeplConfigure, erreur? }` - reachability of the translation engine.

### GET /api/traductions/aggregates
**Capability:** `TRANSLATION_VIEW`

**Response:** `{ total, aReviser, enRelecture, manuelleRequise, approuvees, archivees, supprimees }`.

### GET /api/traductions
**Capability:** `TRANSLATION_VIEW`

**Request:** query `search`, `statut`, `direction`, `vue` (`'supprimees'`
or default active), `source` (`'libre'|'document'`), `page`, `pageSize`.

### GET /api/traductions/:id
**Capability:** none directly - contextual: allowed with `TRANSLATION_VIEW`,
or if the caller is the *requester* of a demande linked to this translation
(`estDemandeurDeTraduction`). Otherwise 403 `TRADUCTION_NON_AUTORISEE`.

### GET /api/traductions/:id/export/pdf, GET /api/traductions/:id/export/docx
Same access gate as `GET :id`, plus: only allowed once
`statut ∈ {approuvee, archivee}` (else 400 `TRADUCTION_NON_APPROUVEE`).

**Response (pdf):** `Content-Type: application/pdf`, inline if `?apercu=1`
else attachment.
**Response (docx):** `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`, always attachment.

### GET /api/traductions/:id/suggestions
**Capability:** `TRANSLATION_VIEW`

**Request:** query `texte` (required), `origine` (`'source'` or target,
default target).

**Response:** up to 10 `{ termeFr, termeEn, domaine? }` glossary suggestions.

### POST /api/traductions
**Capability:** `TRANSLATION_PROCESS`

**Request:** body `texteOriginal` (required), `direction` (required),
`documentId` (optional).

**Response:** `201 TraductionView`.

### PATCH /api/traductions/:id/relancer
**Capability:** `TRANSLATION_PROCESS`

Purpose: re-run the MT engine on a `manuelle_requise` translation (never
overwrites `texteFinal`).

**Important errors:** 400 `RELANCE_NON_APPLICABLE` (wrong status); 503
`MOTEUR_INACCESSIBLE`.

### PATCH /api/traductions/:id/correction
**Capability:** `TRANSLATION_PROCESS`

Purpose: save the translator's manual correction; sets `traducteurId` to
the caller; auto-enriches the glossary if the correction differs from the
MT draft.

**Request:** body `texteFinal` (required).

### PATCH /api/traductions/:id/approuver
**Capability:** `TRANSLATION_REVIEW` **and** `TRANSLATION_APPROVE` (both
required today - a deliberate double gate with no observable behavioral
difference from a single check at the current role/capability mapping).

Sets `statut='approuvee'`, `relecteurId = caller`.

**Important errors:** 400 `TEXTE_FINAL_REQUIS`.

### PATCH /api/traductions/:id/archiver
**Capability:** `TRANSLATION_ARCHIVE`. Requires `statut='approuvee'` first
(400 `APPROBATION_REQUISE` otherwise).

### DELETE /api/traductions/:id
**Capability:** `TRANSLATION_PROCESS` (no separate `TRANSLATION_DELETE` -
deliberate, to avoid capability proliferation).

Purpose: soft-delete; if a linked demande exists it's reset to
`statut='soumise'`, unassigned, unlocked.

**Important errors:** 400 `TRADUCTION_APPROUVEE_NON_SUPPRIMABLE` /
`TRADUCTION_ARCHIVEE_NON_SUPPRIMABLE` / `TRADUCTION_DEJA_SUPPRIMEE`.

### PATCH /api/traductions/:id/restaurer
**Capability:** `TRANSLATION_PROCESS`. Important errors: 400
`TRADUCTION_NON_SUPPRIMEE`.
