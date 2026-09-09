# Architecture Decision Records (ADRs)

An ADR records **why** a significant, already-implemented architectural
decision was made - not how the resulting system works. For "how it
works," see [../overview.md](../overview.md), [../data-model.md](../data-model.md),
[../../security/authorization.md](../../security/authorization.md), and
the rest of the technical documentation tree; ADRs link to those rather
than duplicating them.

## Status

Every ADR carries a `Status`:

- **Accepted** - the decision is implemented and in effect.
- **Superseded** - a later ADR replaced this decision; the superseded ADR
  stays in place (never deleted or rewritten) and links to the one that
  replaced it, so the historical record remains intact.

There is no "Proposed" status in this set - all five ADRs below describe
decisions already made and implemented, not proposals awaiting a decision.

## Numbering

Sequential, zero-padded, four digits (`0001`, `0002`, ...), assigned in the
order an ADR is written - not in the order the underlying decision was
originally made in the codebase's history. A number is never reused, even
if the ADR it belonged to is later superseded.

## Current ADRs

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-single-persistent-role-with-capabilities.md) | Single persistent role with capabilities | Accepted |
| [0002](./0002-workflow-responsibility-not-persistent-role.md) | Workflow responsibility is not a persistent role | Accepted |
| [0003](./0003-single-consolidated-mission-report.md) | One official consolidated mission report | Accepted |
| [0004](./0004-canonical-markdown-help-pipeline.md) | Canonical Markdown help pipeline | Accepted |
| [0005](./0005-migration-baseline-reset.md) | Migration baseline reset | Accepted |

## When to write a new ADR

Create one when a decision **materially affects** the architecture, the
security/authorization model, the persistent data model, the deployment
model, or a cross-cutting development constraint that future work must
respect.

**Do not** use ADRs as a task list or changelog. A bug fix, a routine
feature, a capability rename, or an implementation detail that doesn't
change one of the categories above does not warrant an ADR - it belongs in
regular commit history and the relevant technical doc instead.
