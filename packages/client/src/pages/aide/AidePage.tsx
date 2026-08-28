// packages/client/src/pages/aide/AidePage.tsx
//
// Help centre index - search + category filter over the article registry
// (Phase 10.3). Accessible to every authenticated user (no CapabilityRoute
// gate, like /documents and /profil); per-article capability gating happens
// inside visibleArticles(), never a route-level restriction.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LifeBuoy } from 'lucide-react';

import { useAuth } from '@/App';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { visibleArticles, searchArticles } from '@/lib/docs/articles';
import type { ArticleCategory } from '@/lib/docs/article.schema';
import { CATEGORY_LABELS } from './aide.constants';

export default function AidePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ArticleCategory | null>(null);

  const articles = useMemo(() => visibleArticles(user?.role), [user?.role]);
  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  const filtered = useMemo(() => {
    const searched = searchArticles(articles, query);
    return category ? searched.filter((a) => a.category === category) : searched;
  }, [articles, query, category]);

  const hasFilters = Boolean(query.trim() || category);

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <header>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-anac-blue">
            <LifeBuoy size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-anac-navy">Centre d&apos;aide</h2>
            <p className="mt-0.5 text-sm text-anac-muted">
              Guides et explications sur le fonctionnement de SICOT.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-anac-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article..."
            className="pl-9"
            aria-label="Rechercher dans le centre d'aide"
          />
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              category === null
                ? 'border-anac-blue bg-blue-50 text-anac-blue'
                : 'border-anac-border text-anac-muted hover:bg-anac-gray'
            )}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === cat
                  ? 'border-anac-blue bg-blue-50 text-anac-blue'
                  : 'border-anac-border text-anac-muted hover:bg-anac-gray'
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card flex min-h-48 flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-anac-navy">
            Aucun article ne correspond à votre recherche.
          </p>
          <p className="text-sm text-anac-muted">
            {hasFilters
              ? 'Essayez un autre mot-clé ou réinitialisez les filtres.'
              : 'Aucun article disponible pour le moment.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory(null);
              }}
              className="text-sm font-medium text-anac-blue hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((article) => (
            <Link
              key={article.slug}
              to={`/aide/${article.slug}`}
              className="card flex flex-col gap-1.5 p-4 transition-colors hover:border-anac-blue"
            >
              <span className="w-fit rounded-full border border-anac-border bg-anac-gray px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-anac-muted">
                {CATEGORY_LABELS[article.category]}
              </span>
              <h3 className="font-semibold text-anac-navy">{article.title}</h3>
              <p className="text-sm text-anac-muted">{article.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
