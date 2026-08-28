// packages/client/src/pages/aide/AideArticlePage.tsx
//
// Article view - resolves :slug against the known article registry only
// (getVisibleArticleBySlug never touches the filesystem/URL directly), and
// applies the same capability gate as the /aide listing: an article the
// current user cannot access renders the same not-found state as a slug
// that doesn't exist at all - never a distinguishing error that would leak
// its existence.
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

import { useAuth } from '@/App';
import { getVisibleArticleBySlug } from '@/lib/docs/articles';
import { CATEGORY_LABELS } from './aide.constants';
import { ArticleMarkdown } from './components/ArticleMarkdown';

export default function AideArticlePage() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  const article = useMemo(
    () => (slug ? getVisibleArticleBySlug(slug, user?.role) : undefined),
    [slug, user?.role]
  );

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return article.relatedArticles
      .map((relatedSlug) => getVisibleArticleBySlug(relatedSlug, user?.role))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [article, user?.role]);

  if (!article) {
    return (
      <div className="mx-auto max-w-[760px]">
        <div className="card flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
          <FileQuestion size={28} className="text-anac-muted" aria-hidden="true" />
          <p className="font-semibold text-anac-navy">Article introuvable.</p>
          <p className="text-sm text-anac-muted">
            Cet article n&apos;existe pas ou n&apos;est pas disponible pour votre compte.
          </p>
          <Link
            to="/aide"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-anac-blue hover:underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour au centre d&apos;aide
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <Link
        to="/aide"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-anac-blue hover:underline"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Retour au centre d&apos;aide
      </Link>

      <header className="space-y-2">
        <span className="w-fit rounded-full border border-anac-border bg-anac-gray px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-anac-muted">
          {CATEGORY_LABELS[article.category]}
        </span>
        <h1 className="text-2xl font-bold leading-tight text-anac-navy">{article.title}</h1>
        <p className="text-sm text-anac-muted">{article.excerpt}</p>
      </header>

      <div className="card p-5">
        <ArticleMarkdown content={article.content} />
      </div>

      {relatedArticles.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-anac-navy">Articles liés</h3>
          <div className="mt-3 space-y-1">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                to={`/aide/${related.slug}`}
                className="block rounded-md px-2 py-1.5 text-sm font-medium text-anac-blue hover:bg-anac-gray"
              >
                {related.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
