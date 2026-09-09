# ADR-0003: One official consolidated mission report

Status: Accepted
Date: 2026-09-09

## Context

A mission in SICOT can have multiple participants. Reporting on a mission
could have been modeled per-participant (each participant submits their
own report) or as a single artifact for the mission as a whole.

The implemented schema models one report per mission:
`missions.rapportDocumentId` (references `documents.id`, nullable) and
`missions.rapportResponsableId` (references `users.id`, nullable) both
live directly on the `missions` row - not on a per-participant join table.
`missions.service.ts`'s `validerResponsableRapport` enforces that whenever
`rapportResponsableId` is set, it must name a user currently present in
that mission's `mission_participants` - a domain rule checked in code, not
a database constraint, because participant membership is itself mutable.
If the participant list changes such that the current responsible is no
longer a participant, the same service clears `rapportResponsableId` back
to `null` rather than leaving a dangling reference.

The client's help content
(`packages/client/src/lib/help/help-map.ts`, `/missions/:id` and
`/mes-missions` entries) states this rule directly to end users: "a
mission has only one official report - not one report per participant,"
and that a non-designated participant sees "awaiting the designated
responsible" / "no responsible designated yet" rather than any means to
submit their own competing report.

## Decision

**A mission has exactly one official, consolidated report** - represented
by `rapportDocumentId` on the mission itself - with responsibility for
submitting/replacing it assigned to exactly one participant via
`rapportResponsableId`.

- Responsibility for the report is assigned to **one participant** at a
  time (see [ADR-0002](./0002-workflow-responsibility-not-persistent-role.md)
  for why this is a per-record assignment, not a role).
- The report **belongs to the mission**, not separately to each
  participant - there is one `rapportDocumentId`, not one per participant.
- Broader administrative/global management of missions (creating,
  editing, reassigning the responsible, managing recommendations) remains
  governed by capabilities (`MISSION_MANAGE`,
  `MISSION_RECOMMENDATION_MANAGE`), independent of who the report's
  designated responsible is.

## Consequences

- **One canonical official artifact per mission.** There is never a need
  to reconcile multiple participant-submitted reports into a single
  official one - the schema only allows one to exist.
- **Simpler reporting/audit semantics.** Any question of "what was the
  mission's official report" resolves to a single field, with no
  aggregation or precedence logic required.
- **Participant-level drafts or submissions are not modeled as multiple
  official reports.** Only the designated `rapportResponsableId` can
  submit/replace the mission's report; other participants may view the
  mission and its status but have no path to create a competing "official"
  report of their own for the same mission.
- **Reassigning responsibility never orphans the reference.** Because the
  responsible-participant check is enforced at write time
  (`validerResponsableRapport`) and cleared automatically if the
  participant list changes underneath it, `rapportResponsableId` never
  points at a non-participant.

## Alternatives considered

A per-participant reporting model (each participant able to submit their
own report on the same mission) is not what the schema or service layer
implements - `rapportDocumentId`/`rapportResponsableId` are singular
columns on `missions`, not a join table keyed by participant. This ADR
documents the single-report design that exists, not a competing model that
was implemented and later abandoned.

## References

- [../data-model.md](../data-model.md#special-architectural-data-rules)
- [ADR-0002](./0002-workflow-responsibility-not-persistent-role.md)
- `packages/server/src/db/schema.ts` (`missions.rapportDocumentId`,
  `missions.rapportResponsableId`)
- `packages/server/src/modules/missions/services/missions.service.ts`
  (`validerResponsableRapport`)
- `packages/client/src/lib/help/help-map.ts` (`/missions/:id`,
  `/mes-missions`)
