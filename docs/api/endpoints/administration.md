# Administration endpoints

Five smaller domains grouped here. The larger two are split into their own
files for clarity:

- [administration/audit.md](./administration/audit.md) - `/api/audit`
- [administration/settings.md](./administration/settings.md) - `/api/parametres`
- [administration/jobs.md](./administration/jobs.md) - `/api/jobs`

Notifications and system bootstrap (both small) are documented inline
below.

## Notifications (`/api/notifications`)

Every route requires `authenticate`.

### GET /api/notifications/recentes
**Capability:** `ANALYTICS_VIEW` (same capability as the rest of the
dashboard - this is a cross-domain summary with no single-entity ownership
to check contextually).

**Request:** query `limite` (default 10).

**Response:** array of recent notification records.

### GET /api/notifications/historique/:type/:entiteId
**Capability:** none at the router level - **fully contextual**, computed
per-request from `type`:

| `type` | Required to view |
|---|---|
| `accord_echeance` | `AGREEMENT_VIEW` |
| `courrier_relance` | `CORRESPONDENCE_VIEW` |
| `recommandation_rappel` | `MISSION_REGISTRY_VIEW`, **or** (`MISSION_VIEW_OWN` **and** caller is the recommendation's assigned owner) |
| anything else | denied |

**Important errors:** 400 invalid `type`/`entiteId`; 403 policy check
failed.

### POST /api/notifications/envoyer
**Capability:** none at the router level - same contextual pattern as
above, but for **sending**:

| `type` | Required to send |
|---|---|
| `accord_echeance` | `AGREEMENT_MANAGE` |
| `courrier_relance` | `CORRESPONDENCE_MANAGE` |
| `recommandation_rappel` | `MISSION_RECOMMENDATION_MANAGE`, **or** (`MISSION_VIEW_OWN` **and** owner of the recommendation) |
| anything else | denied |

**Request:** body `type`, `entiteId`, `destinataireEmail`, `objet`,
`message` (all required except an optional `destinataireNom`).

**Response:** `201` created notification record.

**Important errors:** 400 missing fields/invalid type; 403 policy check
failed; 400 `EMAIL_DESTINATAIRE_REQUIS`; **502** `ENVOI_ECHEC:{detail}` -
the send itself failed (the notification is still recorded, marked
failed).

**Notes:** this is an outbound email send-log, not an in-app notification
center - see [../../architecture/data-model.md](../../architecture/data-model.md#outbound-notifications).

---

## System bootstrap (`/api/bootstrap`)

**The only entirely public router in the API** - no `authenticate`
middleware at all, by necessity (no user exists yet before first init).

### GET /api/bootstrap/status
**Authentication:** public

**Response:** `{ initialise: boolean }` - whether any `super_admin` account
already exists.

### POST /api/bootstrap/init
**Authentication:** public, but **self-guarded to succeed only once** -
both the controller and the service independently re-check that no
`super_admin` exists yet immediately before acting.

Purpose: create the very first Super Admin account.

**Request:** body `matricule`, `nom`, `prenom`, `email`, `motDePasse`,
`confirmation` (all required; email regex-validated, passwords must match
and pass the same complexity policy used elsewhere). The created account
gets `role: 'super_admin'`, `actif: true`, and skips the OTP flow entirely
(`premiereConnexion: false` - direct login).

**Response:** `201 { message }`.

**Important errors:** 400 missing/invalid fields, password mismatch/weak;
**403** `SYSTEME_DEJA_INITIALISE` (a super_admin already exists); 409
`MATRICULE_EXISTANT`.
