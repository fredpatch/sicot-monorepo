// packages/client/src/lib/docs/articles.ts
//
// Loads every Markdown article under docs/user-guide/ at build/test time via
// Vite's import.meta.glob - no backend article API, no CMS, no
// documentation framework (Phase 10.3 audit: Vite already does this, a
// dependency would only add risk for five files). `eager: true` inlines the
// raw text directly into this module's output (no extra network request at
// runtime); `query: '?raw'` gets the literal file content, not an HTML-
// transformed module. Docs live outside packages/client (at the repo root),
// which import.meta.glob can still reach via a relative path - Rollup
// resolves it statically at build time, so there's no dev-server fs.allow
// concern in production, and this repo's workspace root (package-lock.json
// at repo root) is already inside Vite's default dev allow-list.
//
// docs/README.md documents the frontmatter contract for anyone editing
// these files directly.
import { hasCapability, type UserRole } from '@sicot/shared';
import { ArticleFrontmatterSchema, type Article } from './article.schema';

const LIST_FIELDS = new Set(['relatedRoutes', 'relatedArticles']);

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    throw new Error('Article Markdown file is missing a frontmatter block (--- ... ---).');
  }
  const [, frontmatterBlock, content] = match;
  const data: Record<string, string> = {};
  for (const line of frontmatterBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    data[key] = value;
  }
  return { data, content: content.trim() };
}

function toFrontmatterInput(data: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = LIST_FIELDS.has(key)
      ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value;
  }
  return result;
}

export function buildArticle(path: string, raw: string): Article {
  const { data, content } = parseFrontmatter(raw);
  const result = ArticleFrontmatterSchema.safeParse(toFrontmatterInput(data));
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in ${path}: ${result.error.issues.map((i) => i.message).join(', ')}`
    );
  }
  return { ...result.data, content };
}

const rawFiles = import.meta.glob('../../../../../docs/user-guide/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const ARTICLES: Article[] = Object.entries(rawFiles)
  .map(([path, raw]) => buildArticle(path, raw))
  .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

// Fail fast (build/test time) rather than silently letting one slug shadow
// another at lookup time.
const seenSlugs = new Set<string>();
for (const article of ARTICLES) {
  if (seenSlugs.has(article.slug)) {
    throw new Error(`Duplicate article slug: ${article.slug}`);
  }
  seenSlugs.add(article.slug);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

// Fails closed: an article with a capability requirement is invisible to
// anyone lacking it, same as every other capability check in this app.
export function isArticleVisible(article: Article, role: UserRole | undefined): boolean {
  return !article.capability || (!!role && hasCapability(role, article.capability));
}

export function visibleArticles(role: UserRole | undefined): Article[] {
  return ARTICLES.filter((a) => isArticleVisible(a, role));
}

/** Slug lookup restricted to the known registry (never a raw filesystem/URL path) AND capability-filtered - used by both direct /aide/:slug access and related-article links. */
export function getVisibleArticleBySlug(
  slug: string,
  role: UserRole | undefined
): Article | undefined {
  const article = getArticleBySlug(slug);
  if (!article) return undefined;
  return isArticleVisible(article, role) ? article : undefined;
}

// Unicode combining diacritical marks block (U+0300-U+036F) - built from
// character codes rather than a regex literal, so no combining-mark
// character ever needs to appear literally in this source file.
const COMBINING_DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
);

function normalize(value: string): string {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '').toLowerCase();
}

/** Case- and accent-insensitive substring match over title/excerpt/category. */
export function searchArticles(articles: Article[], query: string): Article[] {
  const q = normalize(query.trim());
  if (!q) return articles;
  return articles.filter(
    (a) =>
      normalize(a.title).includes(q) ||
      normalize(a.excerpt).includes(q) ||
      normalize(a.category).includes(q)
  );
}
