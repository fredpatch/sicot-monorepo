# Troubleshooting

Symptom-driven index for diagnosing SICOT failures against the current
implementation and operational model. Not a FAQ - each linked article
covers real, verified failure modes only, with real commands.

**Diagnose before changing configuration. Collect evidence first.** Every
article below leads with checks (logs, health endpoints, environment
presence) before any corrective action - resist jumping straight to editing
`.env` files or compose configuration.

## By symptom

| If... | See |
|---|---|
| The application won't start, or the API is up but nothing works | [startup-and-bootstrap.md](./startup-and-bootstrap.md) |
| Login, session, or permission failures | [authentication-and-session.md](./authentication-and-session.md) |
| Database connection or migration errors | [database-and-migrations.md](./database-and-migrations.md) |
| Document upload, OCR, download, or visibility problems | [documents-and-ocr.md](./documents-and-ocr.md) |
| Translation requests fail | [translation-service.md](./translation-service.md) |
| Scheduled jobs or backups aren't running or failing | [jobs-and-backups.md](./jobs-and-backups.md) |
| Deployment fails, or a container/health check looks wrong | [deployment-and-health.md](./deployment-and-health.md) |

## Format

Each article uses the same structure per failure:

```
## Symptom: ...
### Likely causes
### Checks
### Safe corrective actions
### Escalate when
```

Kept compact deliberately - these are meant to be usable during an
incident, not read cover-to-cover.

## Cross-references

These articles link out rather than duplicate:

- Configuration variables: [../operations/configuration-reference.md](../operations/configuration-reference.md)
- Session/cookie/CSRF semantics: [../security/csrf-and-session-security.md](../security/csrf-and-session-security.md)
- Endpoint contracts: [../api/](../api/overview.md)
- Runtime topology: [../architecture/runtime-topology.md](../architecture/runtime-topology.md)

They answer **"what should I check when this fails?"** - not "how does the
whole subsystem work?". For the latter, follow the links.
