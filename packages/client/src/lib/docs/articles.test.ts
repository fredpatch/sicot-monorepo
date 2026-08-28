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
import { ARTICLE_CATEGORIES } from './article.schema';

describe('article registry - loaded from docs/user-guide/**/*.md', () => {
  it('loads exactly the twelve articles (5 from Phase 10.3 + 4 from Phase 10.4 + 3 from Phase 10.5)', () => {
    expect(ARTICLES).toHaveLength(12);
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
      expect(ARTICLE_CATEGORIES).toContain(a.category);
      expect(a.content.length).toBeGreaterThan(0);
    }
  });

  it('the Phase 10.3 required slugs are all present', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    expect(slugs.has('premiers-pas')).toBe(true);
    expect(slugs.has('creer-suivre-demande')).toBe(true);
    expect(slugs.has('statuts-demande')).toBe(true);
    expect(slugs.has('traiter-relire-approuver')).toBe(true);
    expect(slugs.has('rapport-mission')).toBe(true);
  });

  it('the Phase 10.4 required slugs are all present', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    expect(slugs.has('comprendre-bibliotheque-documents')).toBe(true);
    expect(slugs.has('publier-portail-externe')).toBe(true);
    expect(slugs.has('utiliser-glossaire')).toBe(true);
    expect(slugs.has('mon-espace')).toBe(true);
  });

  it('the Phase 10.5 required slugs are all present', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    expect(slugs.has('gerer-suivre-accords')).toBe(true);
    expect(slugs.has('gerer-partenaires')).toBe(true);
    expect(slugs.has('suivre-courriers')).toBe(true);
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

  it('the PORTAL_PUBLICATION_MANAGE-gated article is visible to admin+ only', () => {
    const article = getArticleBySlug('publier-portail-externe')!;
    expect(article.capability).toBe('PORTAL_PUBLICATION_MANAGE');
    expect(isArticleVisible(article, 'admin')).toBe(true);
    expect(isArticleVisible(article, 'operateur')).toBe(false);
    expect(isArticleVisible(article, 'agent')).toBe(false);
  });

  it('visibleArticles excludes gated articles for agent, includes TRANSLATION_PROCESS-only for operateur, includes all for admin+', () => {
    // 12 total: 3 cooperation articles now require AGREEMENT_VIEW/
    // PARTNER_VIEW/CORRESPONDENCE_VIEW (admin+ only today, Phase 10.5
    // capability-visibility fix) - agent/operateur lose all three,
    // admin/super_admin (who hold every capability) keep all 12.
    const forAgent = visibleArticles('agent').map((a) => a.slug);
    expect(forAgent).not.toContain('traiter-relire-approuver');
    expect(forAgent).not.toContain('publier-portail-externe');
    expect(forAgent).not.toContain('gerer-suivre-accords');
    expect(forAgent).not.toContain('gerer-partenaires');
    expect(forAgent).not.toContain('suivre-courriers');
    expect(forAgent).toHaveLength(7);

    const forOperateur = visibleArticles('operateur').map((a) => a.slug);
    expect(forOperateur).toContain('traiter-relire-approuver');
    expect(forOperateur).not.toContain('publier-portail-externe');
    expect(forOperateur).not.toContain('gerer-suivre-accords');
    expect(forOperateur).not.toContain('gerer-partenaires');
    expect(forOperateur).not.toContain('suivre-courriers');
    expect(forOperateur).toHaveLength(8);

    const forAdmin = visibleArticles('admin').map((a) => a.slug);
    expect(forAdmin).toContain('traiter-relire-approuver');
    expect(forAdmin).toContain('publier-portail-externe');
    expect(forAdmin).toContain('gerer-suivre-accords');
    expect(forAdmin).toContain('gerer-partenaires');
    expect(forAdmin).toContain('suivre-courriers');
    expect(forAdmin).toHaveLength(12);
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

  it('publier-portail-externe never appears in listing/direct/related resolution below admin+ (Phase 10.4)', () => {
    for (const role of ['agent', 'operateur'] as const) {
      expect(visibleArticles(role).map((a) => a.slug)).not.toContain('publier-portail-externe');
      expect(getVisibleArticleBySlug('publier-portail-externe', role)).toBeUndefined();
    }
    // comprendre-bibliotheque-documents links to it as a related article -
    // resolving that link below admin+ must come back empty too.
    const related = getArticleBySlug('comprendre-bibliotheque-documents')!.relatedArticles;
    expect(related).toContain('publier-portail-externe');
    for (const role of ['agent', 'operateur'] as const) {
      const resolved = related
        .map((slug) => getVisibleArticleBySlug(slug, role))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      expect(resolved.map((a) => a.slug)).not.toContain('publier-portail-externe');
    }
    expect(getVisibleArticleBySlug('publier-portail-externe', 'admin')?.slug).toBe(
      'publier-portail-externe'
    );
  });
});

describe('cooperation articles - gated on their module VIEW capability (Phase 10.5 capability-visibility fix)', () => {
  it('each article carries the capability of its own module, not a shared/borrowed one', () => {
    expect(getArticleBySlug('gerer-suivre-accords')!.capability).toBe('AGREEMENT_VIEW');
    expect(getArticleBySlug('gerer-partenaires')!.capability).toBe('PARTNER_VIEW');
    expect(getArticleBySlug('suivre-courriers')!.capability).toBe('CORRESPONDENCE_VIEW');
  });

  it('agent (no AGREEMENT_VIEW/PARTNER_VIEW/CORRESPONDENCE_VIEW) cannot discover or open any of the three', () => {
    for (const slug of ['gerer-suivre-accords', 'gerer-partenaires', 'suivre-courriers']) {
      expect(visibleArticles('agent').map((a) => a.slug)).not.toContain(slug);
      expect(getVisibleArticleBySlug(slug, 'agent')).toBeUndefined();
    }
  });

  it('operateur (also lacking all three VIEW capabilities today) cannot discover or open any of the three', () => {
    for (const slug of ['gerer-suivre-accords', 'gerer-partenaires', 'suivre-courriers']) {
      expect(visibleArticles('operateur').map((a) => a.slug)).not.toContain(slug);
      expect(getVisibleArticleBySlug(slug, 'operateur')).toBeUndefined();
    }
  });

  it('admin+ (the only roles holding AGREEMENT_VIEW/PARTNER_VIEW/CORRESPONDENCE_VIEW today) can find and open all three', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      for (const slug of ['gerer-suivre-accords', 'gerer-partenaires', 'suivre-courriers']) {
        expect(visibleArticles(role).map((a) => a.slug)).toContain(slug);
        expect(getVisibleArticleBySlug(slug, role)?.slug).toBe(slug);
      }
    }
  });

  it('undefined role (unauthenticated) cannot discover or open any of the three', () => {
    for (const slug of ['gerer-suivre-accords', 'gerer-partenaires', 'suivre-courriers']) {
      expect(getVisibleArticleBySlug(slug, undefined)).toBeUndefined();
    }
  });

  it('gerer-suivre-accords links to gerer-partenaires and back, each independently filtered by its own capability', () => {
    const accords = getArticleBySlug('gerer-suivre-accords')!;
    const partenaires = getArticleBySlug('gerer-partenaires')!;
    expect(accords.relatedArticles).toContain('gerer-partenaires');
    expect(partenaires.relatedArticles).toContain('gerer-suivre-accords');

    // A role holding AGREEMENT_VIEW but not PARTNER_VIEW would resolve the
    // accords article but not the related partenaires link - not a real
    // combination today (both are bundled at admin+), but proves the
    // resolution mechanism filters each related slug on its own capability
    // rather than inheriting the parent article's visibility.
    for (const role of ['admin', 'super_admin'] as const) {
      const related = accords.relatedArticles
        .map((slug) => getVisibleArticleBySlug(slug, role))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      expect(related.map((a) => a.slug)).toContain('gerer-partenaires');
    }
    for (const role of ['agent', 'operateur'] as const) {
      const related = accords.relatedArticles
        .map((slug) => getVisibleArticleBySlug(slug, role))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      expect(related.map((a) => a.slug)).not.toContain('gerer-partenaires');
    }
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

  it('finds the Phase 10.4 articles by title/category', () => {
    expect(searchArticles(ARTICLES, 'bibliothèque').map((a) => a.slug)).toContain(
      'comprendre-bibliotheque-documents'
    );
    expect(searchArticles(ARTICLES, 'portail externe').map((a) => a.slug)).toContain(
      'publier-portail-externe'
    );
    expect(searchArticles(ARTICLES, 'glossaire').map((a) => a.slug)).toContain('utiliser-glossaire');
    expect(searchArticles(ARTICLES, 'documents').map((a) => a.slug)).toContain(
      'comprendre-bibliotheque-documents'
    );
    expect(searchArticles(ARTICLES, 'mon espace').map((a) => a.slug)).toContain('mon-espace');
  });

  it('finds the Phase 10.5 cooperation articles by title/category', () => {
    expect(searchArticles(ARTICLES, 'accords').map((a) => a.slug)).toContain('gerer-suivre-accords');
    expect(searchArticles(ARTICLES, 'partenaires').map((a) => a.slug)).toContain('gerer-partenaires');
    expect(searchArticles(ARTICLES, 'courriers').map((a) => a.slug)).toContain('suivre-courriers');
    expect(searchArticles(ARTICLES, 'cooperation').map((a) => a.slug)).toEqual(
      expect.arrayContaining(['gerer-suivre-accords', 'gerer-partenaires', 'suivre-courriers'])
    );
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
