# Audit endpoints

Base path: `/api/audit`. Router-wide `authenticate` + `AUDIT_VIEW` -
applies to every route below. What the audit log actually captures (and
doesn't): [../../../security/audit-and-traceability.md](../../../security/audit-and-traceability.md).

## GET /api/audit/meta/modules
Distinct module codes present in the log, for a filter dropdown.

## GET /api/audit/meta/actions
Distinct action names present in the log, for a filter dropdown.

## GET /api/audit/export/pdf
**Request:** query `module`, `action`, `dateDebut`, `dateFin` (all
optional).

**Response:** binary PDF, filename `journal-audit-{date}.pdf`. Very large
result sets are truncated (a `tronque` flag is embedded in the PDF
summary).

**Notes:** writes its own audit entry (`AUDIT_EXPORT_PDF`).

## GET /api/audit/export/excel
Same query params as PDF export. `.xlsx` binary, filename
`journal-audit-{date}.xlsx`. Writes `AUDIT_EXPORT_EXCEL`.

## GET /api/audit
**Request:** query `userId`, `module`, `action`, `dateDebut`, `dateFin`,
`page`, `pageSize`.

**Response:** paginated log entries.

## GET /api/audit/:id
**Response:** a single log entry.

**Important errors:** 400 invalid id; 404 `AUDIT_LOG_INTROUVABLE`.

**Notes:** `meta/*` and `export/*` are declared before `/:id` in the router
to keep those literal segments from being captured as an id.
