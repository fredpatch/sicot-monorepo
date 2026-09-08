# System settings endpoints

Base path: `/api/parametres`. Router-wide `authenticate`; capability
applied per-route (deliberately split - see below).

## GET /api/parametres
**Capability:** `SYSTEM_SETTINGS_VIEW`

**Request:** query `module` (optional filter).

**Response:** array of parameter objects.

## GET /api/parametres/:cle
**Capability:** `SYSTEM_SETTINGS_VIEW`

**Response:** a single parameter object.

**Important errors:** 404 `PARAMETRE_INTROUVABLE`.

## PATCH /api/parametres/:cle
**Capability:** `SYSTEM_SETTINGS_MANAGE` - deliberately stricter than the
read routes above. This capability is **absent from `ADMIN_CAPABILITIES`**
in the shared role/capability registry, so it cannot silently broaden to
plain `admin` if that tier's capability set grows - effectively
`super_admin`-only today.

**Request:** body `valeur` (required - accepted as any JSON-serializable
primitive, coerced to a string server-side; the target parameter's declared
type then drives further validation).

**Response:** the updated parameter object.

**Important errors:** 400 missing `valeur`, or `VALEUR_INVALIDE_ENTIER`/
`VALEUR_INVALIDE_BOOLEEN` (type mismatch against the parameter's declared
type); 404 `PARAMETRE_INTROUVABLE`.

**Read vs. write capability split confirmed:** `SYSTEM_SETTINGS_VIEW`
(read) vs. `SYSTEM_SETTINGS_MANAGE` (write) are genuinely separate
capabilities, not just a naming convention - see
[../../../security/authorization.md](../../../security/authorization.md).
