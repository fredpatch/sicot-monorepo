// packages/client/src/lib/docs/articles.test.ts
import { describe, it, expect } from 'vitest';
import {
  ARTICLES,
  buildArticle,
  getArticleBySlug,
  getVisibleArticleBySlug,
  isArticleVisible,
  visibleArticles,
  searchArticles,
} from './articles';

describe('article registry - loaded from docs/user-guide/**/*.md', () => {
  it('loads exactly the five Phase 10.3 articles', () => {
    expect(ARTICLES).toHaveLength(5);
  });

  it('every article has unique, kebab-case slugs (registry construction throws on duplicates)', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every article has non-empty title, excerpt, and a valid category', () => {
    for (const a of ARTICLES) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.excerpt.length).toBeGreaterThan(0);
      expect(['getting-started', 'personal-workspace', 'translation', 'missions']).toContain(
        a.category
      );
      expect(a.content.length).toBeGreaterThan(0);
    }
  });

  it('the required first five slugs are all present', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    expect(slugs.has('premiers-pas')).toBe(true);
    expect(slugs.has('creer-suivre-demande')).toBe(true);
    expect(slugs.has('statuts-demande')).toBe(true);
    expect(slugs.has('traiter-relire-approuver')).toBe(true);
    expect(slugs.has('rapport-mission')).toBe(true);
  });
});

describe('buildArticle - frontmatter parsing/validation', () => {
  it('parses a well-formed article', () => {
    const raw = [
      '---',
      'slug: test-article',
      'title: Un titre',
      'excerpt: Un resume.',
      'category: getting-started',
      'relatedRoutes: /a, /b',
      'relatedArticles: autre-slug',
      '---',
      '',
      'Corps **markdown**.',
    ].join('\n');
    const article = buildArticle('fake.md', raw);
    expect(article.slug).toBe('test-article');
    expect(article.title).toBe('Un titre');
    expect(article.relatedRoutes).toEqual(['/a', '/b']);
    expect(article.relatedArticles).toEqual(['autre-slug']);
    expect(article.content).toBe('Corps **markdown**.');
    expect(article.capability).toBeUndefined();
  });

  it('parses an optional capability field when present and known', () => {
    const raw = [
      '---',
      'slug: gated',
      'title: T',
      'excerpt: E',
      'category: translation',
      'capability: TRANSLATION_PROCESS',
      '---',
      'Corps.',
    ].join('\n');
    expect(buildArticle('fake.md', raw).capability).toBe('TRANSLATION_PROCESS');
  });

  it('rejects an unknown capability value', () => {
    const raw = [
      '---',
      'slug: bad',
      'title: T',
      'excerpt: E',
      'category: translation',
      'capability: NOT_A_REAL_CAPABILITY',
      '---',
      'Corps.',
    ].join('\n');
    expect(() => buildArticle('fake.md', raw)).toThrow();
  });

  it('rejects a missing frontmatter block', () => {
    expect(() => buildArticle('fake.md', '# Just markdown, no frontmatter')).toThrow(/frontmatter/);
  });

  it('rejects an invalid category', () => {
    const raw = [
      '---',
      'slug: x',
      'title: T',
      'excerpt: E',
      'category: not-a-category',
      '---',
      'Corps.',
    ].join('\n');
    expect(() => buildArticle('fake.md', raw)).toThrow();
  });

  it('rejects a non-kebab-case slug', () => {
    const raw = [
      '---',
      'slug: Not_Kebab',
      'title: T',
      'excerpt: E',
      'category: missions',
      '---',
      'Corps.',
    ].join('\n');
    expect(() => buildArticle('fake.md', raw)).toThrow();
  });
});

describe('slug resolution - known-registry only, never an arbitrary path', () => {
  it('resolves a known slug', () => {
    expect(getArticleBySlug('premiers-pas')?.title).toBe('Premiers pas dans SICOT');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getArticleBySlug('does-not-exist')).toBeUndefined();
    expect(getArticleBySlug('../../etc/passwd')).toBeUndefined();
    expect(getArticleBySlug('')).toBeUndefined();
  });
});

describe('capability visibility - fails closed, affects listing and direct/related lookup alike', () => {
  it('an article with no capability is visible to every role, including undefined', () => {
    const article = getArticleBySlug('premiers-pas')!;
    expect(isArticleVisible(article, 'agent')).toBe(true);
    expect(isArticleVisible(article, 'super_admin')).toBe(true);
    expect(isArticleVisible(article, undefined)).toBe(true);
  });

  it('the TRANSLATION_PROCESS-gated article is visible to operateur+ only', () => {
    const article = getArticleBySlug('traiter-relire-approuver')!;
    expect(article.capability).toBe('TRANSLATION_PROCESS');
    expect(isArticleVisible(article, 'operateur')).toBe(true);
    expect(isArticleVisible(article, 'admin')).toBe(true);
    expect(isArticleVisible(article, 'agent')).toBe(false);
    expect(isArticleVisible(article, undefined)).toBe(false);
  });

  it('visibleArticles excludes the gated article for agent, includes it for operateur+', () => {
    const forAgent = visibleArticles('agent').map((a) => a.slug);
    expect(forAgent).not.toContain('traiter-relire-approuver');
    expect(forAgent).toHaveLength(4);

    const forOperateur = visibleArticles('operateur').map((a) => a.slug);
    expect(forOperateur).toContain('traiter-relire-approuver');
    expect(forOperateur).toHaveLength(5);
  });

  it('getVisibleArticleBySlug denies direct access to a gated article for a role lacking the capability', () => {
    expect(getVisibleArticleBySlug('traiter-relire-approuver', 'agent')).toBeUndefined();
    expect(getVisibleArticleBySlug('traiter-relire-approuver', 'operateur')?.slug).toBe(
      'traiter-relire-approuver'
    );
  });

  it('getVisibleArticleBySlug also governs related-article link resolution the same way', () => {
    // statuts-demande links to traiter-relire-approuver as a related article
    // - resolving that link for an agent must come back empty, same rule.
    const related = getArticleBySlug('statuts-demande')!.relatedArticles;
    expect(related).toContain('traiter-relire-approuver');
    const resolvedForAgent = related
      .map((slug) => getVisibleArticleBySlug(slug, 'agent'))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    expect(resolvedForAgent.map((a) => a.slug)).not.toContain('traiter-relire-approuver');
  });
});

describe('searchArticles - case- and accent-insensitive over title/excerpt/category', () => {
  it('matches by title, case-insensitive', () => {
    const results = searchArticles(ARTICLES, 'PREMIERS PAS');
    expect(results.map((a) => a.slug)).toContain('premiers-pas');
  });

  it('matches by excerpt', () => {
    const results = searchArticles(ARTICLES, 'responsable désigné');
    expect(results.map((a) => a.slug)).toContain('rapport-mission');
  });

  it('matches by category', () => {
    const results = searchArticles(ARTICLES, 'translation');
    expect(results.map((a) => a.slug)).toContain('traiter-relire-approuver');
  });

  it('is accent-insensitive', () => {
    // "désigné" without accents should still find the mission article
    const results = searchArticles(ARTICLES, 'designe');
    expect(results.map((a) => a.slug)).toContain('rapport-mission');
  });

  it('returns everything for an empty/whitespace query', () => {
    expect(searchArticles(ARTICLES, '')).toHaveLength(ARTICLES.length);
    expect(searchArticles(ARTICLES, '   ')).toHaveLength(ARTICLES.length);
  });

  it('returns no results for a query matching nothing', () => {
    expect(searchArticles(ARTICLES, 'zzzznotarealword')).toHaveLength(0);
  });
});

describe('mission article - preserves the designated-responsible model', () => {
  const article = getArticleBySlug('rapport-mission')!;

  it('states one report per mission, not one per participant', () => {
    expect(article.content).toMatch(/un seul rapport officiel/i);
  });

  it('never claims every participant can submit the report', () => {
    expect(article.content).not.toMatch(/chaque participant peut d[ée]poser/i);
    expect(article.content).not.toMatch(/tout participant peut d[ée]poser/i);
  });

  it('names the designated-responsible constraint explicitly', () => {
    expect(article.content).toMatch(/responsable d[ée]sign[ée]/i);
  });
});
