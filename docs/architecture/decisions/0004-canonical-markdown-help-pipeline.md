# ADR-0004: Canonical Markdown help pipeline

Status: Accepted
Date: 2026-09-09

## Context

SICOT needs two structurally different kinds of user-facing guidance:
short, contextual hints tied to the exact screen/action a user is on, and
long-form articles explaining a workflow end-to-end. These have different
content shapes and different lifecycles, and the codebase implements them
as two deliberately separate systems rather than one.

Long-form content lives as Markdown files under `docs/user-guide/**/*.md`,
one file per article, each with a frontmatter block (`slug`, `title`,
`excerpt`, `category`, optional `relatedRoutes`/`relatedArticles`/
`capability`). `packages/client/src/lib/docs/articles.ts` loads every such
file at build/test time via Vite's `import.meta.glob(...,  { query: '?raw',
eager: true })`, parses and validates the frontmatter
(`article.schema.ts`), and exposes the resulting `ARTICLES` corpus to the
Help Center (`/aide`). Its own header comment records the reasoning
directly: "no backend article API, no CMS, no documentation framework
(Phase 10.3 audit: Vite already does this, a dependency would only add
risk for five files)."

Short contextual hints live as typed TypeScript objects in
`packages/client/src/lib/help/help-map.ts` (`HELP_MAP`), keyed by route
pattern, each with short `HelpSection` entries (heading + body) and an
optional list of related long-form article slugs. Its header comment
states the same distinction explicitly: "this content is short, changes
alongside the workflow rules it documents, and benefits from being
type-checked against real Capability literals... Long-form /aide and /docs
content... is a different shape and is Markdown."

Both systems gate visibility through the same mechanism -
`hasCapability()` from `@sicot/shared` - never a raw role-name check:
`isArticleVisible`/`visibleArticles` in `articles.ts` for long-form
articles, `filterHelpEntry` in `help-map.ts` for contextual sections.

## Decision

**Long-form functional help content lives canonically under
`docs/user-guide/**/*.md`**, one Markdown file per article with a
validated frontmatter contract, and the React client consumes those files
directly via Vite's `import.meta.glob` import pipeline - no separate CMS,
backend content API, or documentation framework.

Two distinct kinds of help content are recognized:

- **Long-form canonical article** (Markdown, `docs/user-guide/`) - a
  complete explanation of a workflow, versioned with the code, editable as
  a normal source file, capability-gated per article.
- **Short typed contextual help snippet** (`HELP_MAP` in
  `help-map.ts`) - a few sentences tied to a specific route, capability-
  gated per section, that links out to the relevant long-form article
  rather than duplicating it.

The flow from a user's point of view: **UI contextual hint (Help Drawer,
triggered from the current route) → optionally links to → full long-form
article (Help Center, `/aide`)**. The two are connected (`HelpEntry.articles`
names related article slugs, resolved through the same capability-filtered
lookup so a gated article never appears as a link to a viewer who couldn't
open it), but neither duplicates the other's content.

## Consequences

- **One source of truth for long-form user guidance** - `docs/user-guide/`
  is the only place a complete workflow explanation is written; the Help
  Drawer never repeats it, only points to it.
- **Content is versioned with code** - a Markdown file lives in the same
  repository, same commits, same review process as the feature it
  documents; there is no separate content-management system with its own
  deploy/versioning lifecycle to keep in sync.
- **The Help Center and contextual Help Drawer reuse the same article
  corpus** rather than maintaining two independent copies of long-form
  content - `help-map.ts` only ever references articles by slug, resolved
  against the same `ARTICLES` array the Help Center itself renders.
- **Markdown rendering remains constrained and safe** - articles are
  parsed through a validated frontmatter schema and a fixed content shape,
  not arbitrary rendered HTML from an untrusted source; this is an
  implementation detail already covered by the code itself and is not
  re-explained here.

## Alternatives considered

Not applicable in the sense of a rejected system that was built and
removed - the header comments in both `articles.ts` and `help-map.ts`
record that the Markdown-plus-Vite approach and the typed-contextual-object
approach were each chosen directly for their respective content shape (a
CMS/backend API was considered and explicitly rejected for the small,
code-versioned long-form corpus; a Markdown format was considered and
rejected for the short, capability-typed contextual snippets). This ADR
records that reasoning rather than inventing a competing alternative that
was never implemented.

## References

- [../../user-guide/](../../user-guide/) (the article corpus itself; see
  `docs/README.md` for the frontmatter contract)
- `packages/client/src/lib/docs/articles.ts`
- `packages/client/src/lib/docs/article.schema.ts`
- `packages/client/src/lib/help/help-map.ts`
