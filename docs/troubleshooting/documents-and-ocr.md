# Documents & OCR

Full access-model reasoning (stored vs. internally visible vs. publicly
exposed, the known soft-delete gap on direct-ID access):
[../security/document-access.md](../security/document-access.md). This
document covers diagnosis only.

**Keep the three-way distinction in mind while diagnosing "who can see
this":**
- **Stored** - the file exists on disk/in the upload volume.
- **Internally visible** - `visibiliteInterne=true` OR the requester is the
  uploader; agents without `DOCUMENT_UPLOAD` only see documents matching
  this rule.
- **Publicly exposed** - separately flagged for the public portal
  (`visibilitePortail` / a portal token), independent of internal
  visibility.

## Symptom: upload rejected

### Likely causes
- MIME type or file size outside what the upload handler accepts.
- Missing required fields on the multipart request (category, etc.).

### Checks
Read the response body - upload validation errors are returned as
structured messages, not silent failures. Confirm the file's actual MIME
type and size against what was sent.

### Safe corrective actions
Fix the request (correct field, supported file type/size) and retry. If
the rejected file type should legitimately be supported, that's a scope
question for the endpoint's documented contract in
[../api/endpoints/documents.md](../api/endpoints/documents.md), not
something to route around client-side.

### Escalate when
A file of a documented-supported type and size is still rejected.

---

## Symptom: file stored but not visible to the uploader or expected viewers

### Likely causes
- `visibiliteInterne` is `false` and the viewer isn't the uploader - this
  is the intended internal-visibility rule, not a bug.
- The viewer's role lacks `DOCUMENT_UPLOAD` (which would grant full
  visibility) and doesn't match either condition above.

### Checks
Confirm the document's `visibiliteInterne` flag and `uploadePar` against
the viewer's identity and role/capability -
[../security/document-access.md](../security/document-access.md) has the
exact rule.

### Safe corrective actions
If the document should be internally visible, toggle
`visibiliteInterne` (operateur+, per the route's own comment
distinguishing it from the more sensitive portal-publish action) rather
than granting the viewer a broader capability just to see one document.

### Escalate when
The visibility flags are confirmed set as expected and the document is
still invisible to a viewer who should see it.

---

## Symptom: an agent can see another user's document unexpectedly

### Likely causes
- The document has `visibiliteInterne=true` - this makes it visible to
  **every** authenticated user with sufficient capability, not just the
  uploader. This is the documented, intended scope - not a leak.
- The viewing account actually holds `DOCUMENT_UPLOAD`, which grants
  visibility regardless of the `visibiliteInterne`/ownership rule.

### Checks
Confirm the document's `visibiliteInterne` value and the viewer's role
capabilities before treating this as a bug.

### Safe corrective actions
If `visibiliteInterne` was set to `true` unintentionally, correct that
flag on the specific document. Do not treat this as a systemic access-
control failure without first confirming the flag's actual value - the
scope described here is exactly what the system is designed to do.

### Escalate when
`visibiliteInterne=false`, the viewer is not the uploader, and does not
hold `DOCUMENT_UPLOAD`, yet the document is still visible to them - this
would be a genuine access-control defect worth escalating with the exact
document ID and both user IDs.

---

## Symptom: OCR status stuck at "pending" or shows "failed"

### Likely causes
- OCR runs **synchronously during upload**, not as a background queue - a
  document sits at `en_attente` (pending) only as its default value, and
  should move to `traite` (processed) or `echec` (failed) within the same
  upload request. A document genuinely stuck at `en_attente` after upload
  completed suggests the OCR call didn't run as expected, not that it's
  "still processing."
- `echec` (failed) - OCR service unreachable, timed out (60s), or returned
  an error for that specific file.

### Checks
```bash
# Is the OCR microservice reachable at all?
curl -i http://localhost:5001/health

# Docker: is it running and healthy?
docker compose ps ocr-service     # dev
docker compose logs ocr-service   # dev
```

### Safe corrective actions
Use the documented manual retry path (`POST` to reprocess OCR on an
existing document, per
[../api/endpoints/documents.md](../api/endpoints/documents.md)) rather than
re-uploading the file. Confirm the OCR service is reachable first - a
retry against an unreachable service will just fail the same way.

### Escalate when
The OCR service is confirmed reachable and healthy, and processing still
fails or hangs for a specific, otherwise-normal file.

---

## Symptom: OCR microservice unreachable

### Likely causes
- Service not started (native dev - it must be launched separately; Docker
  - container not up).
- `OCR_SERVICE_URL` pointing at the wrong host/port for the environment
  you're actually running in.

### Checks
```bash
curl -i http://localhost:5001/health
docker compose ps ocr-service
```

### Safe corrective actions
Start/restart the service, or correct `OCR_SERVICE_URL` for the
environment - see
[../operations/configuration-reference.md](../operations/configuration-reference.md#ocr).
The API itself tolerates OCR being down (boot-time check is non-fatal) -
document upload/OCR-dependent features simply won't work until it's
reachable.

### Escalate when
The service reports healthy at its own `/health` endpoint but the API
still can't reach it - check for a network-level issue between the two
(e.g. wrong Docker network) rather than assuming the service itself is
broken.

---

## Symptom: LibreOffice/Tesseract executable path issue (native dev only)

### Likely causes
`packages/ocr-service/main.py`'s `TESSERACT_CMD`/`LIBREOFFICE_CMD` defaults
are hardcoded to one specific developer's Windows paths. Anyone else
running OCR natively without setting these env vars explicitly will point
at binaries that don't exist on their machine.

### Checks
```bash
# Confirm the vars are actually set in your shell before running natively
node -e "console.log(!!process.env.TESSERACT_CMD, !!process.env.LIBREOFFICE_CMD)"
```

### Safe corrective actions
Set `TESSERACT_CMD` and `LIBREOFFICE_CMD` to your own local Tesseract 5 and
LibreOffice install paths. This is purely a native-dev environment-setup
step, not an application bug - see
[../operations/installation-bootstrap.md](../operations/installation-bootstrap.md#1-native-host-development)
and
[../operations/configuration-reference.md](../operations/configuration-reference.md#ocr).
This does not apply to Docker - the image sets both correctly.

### Escalate when
Both variables are confirmed set to real, working local installs and OCR
still fails to invoke them.

---

## Symptom: download returns file-not-found

### Likely causes
- The document row exists in the database, but the underlying file was
  moved/deleted from the storage volume independently (`FICHIER_INTROUVABLE`
  is a distinct error from a missing DB row - `DOCUMENT_INTROUVABLE`).
- `UPLOAD_DIR` misconfigured or pointing at a different location than
  where the file was originally written.

### Checks
Read the exact error code in the response - `DOCUMENT_INTROUVABLE` (no DB
row) vs. `FICHIER_INTROUVABLE` (row exists, file missing on disk) point at
different problems.

### Safe corrective actions
If the file is genuinely missing from storage, this needs manual
investigation of what happened to the volume/mount - it is not something
to fix by re-running OCR or re-uploading under the same document ID.

### Escalate when
`FICHIER_INTROUVABLE` occurs for a document that should have an intact
file - treat this as a storage-integrity incident, not a routine retry.

---

## Symptom: soft-deleted document still directly retrievable

### Likely causes
This is a **known, documented gap**, not unexpected behavior:
`GET /api/documents/:id` and `GET /api/documents/:id/telecharger` do **not**
filter on `deletedAt` - a soft-deleted document remains directly
retrievable by ID even though it's correctly excluded from listings.
Full detail: [../security/document-access.md](../security/document-access.md).

### Checks
Confirm whether you're hitting the direct-by-ID routes (affected) or a
listing/search endpoint (correctly filters `deletedAt`).

### Safe corrective actions
None available at the documentation level - this is an access-control gap
in the current implementation, tracked in
[../security/security-checklist.md](../security/security-checklist.md). Do
not attempt to work around it by adding client-side filtering only; that
does not close the server-side gap.

### Escalate when
This needs to actually be fixed in application code (not this phase) - if
you're evaluating whether it's exploitable in your environment, treat any
soft-deleted document as still reachable by anyone who has (or can guess)
its ID and otherwise passes the visibility check.

---

## Symptom: public portal file not downloadable

### Likely causes
- `TOKEN_INTROUVABLE` - the portal token doesn't exist (typo'd/tampered
  link).
- `TOKEN_EXPIRE` - the token's `expiresAt` has passed.
- The underlying document was deleted or its portal visibility was revoked
  after the token was issued (`DOCUMENT_PORTAIL_INTROUVABLE`).
- Portal tokens are reusable until expiry (not single-use) - this is a
  documented characteristic, not a symptom of malfunction; see
  [../security/document-access.md](../security/document-access.md).

### Checks
Read the exact error code returned by the portal download endpoint - the
three codes above are distinct and diagnostic on their own.

### Safe corrective actions
For an expired or invalid token, a new portal link must be issued through
the normal internal flow - there is no way to "extend" an existing token.

### Escalate when
A token that should still be valid (per its `expiresAt`) is rejected as
expired or not found - check server clock/timezone consistency before
assuming the token itself is corrupt.
