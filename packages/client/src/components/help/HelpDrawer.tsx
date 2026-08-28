// packages/client/src/components/help/HelpDrawer.tsx
//
// Self-contained trigger + Sheet (Phase 10.1) - placed once in Layout's
// header, beside the FR/EN toggle. Manages its own open state (controlled,
// via a plain onClick) rather than Radix's SheetTrigger - matches the app's
// existing dialog convention (NewRequestDialog, PdfPreviewDialog, ...), all
// of which are driven by explicit open/onOpenChange state rather than an
// uncontrolled Trigger + asChild, so this doesn't introduce a second pattern
// for composing the app's custom Button with a Radix trigger.
//
// Phase 10.3: "En savoir plus" links to long-form /aide articles, resolved
// through getVisibleArticleBySlug() so a capability-gated article never
// renders as a link the current user can't actually open (same fail-closed
// rule as everywhere else). Also the one persistent, low-intrusion path to
// /aide beyond contextual links - "Ouvrir le centre d'aide" in the footer,
// present in both the contextual and fallback states, per the Phase 10.3
// brief's explicit example (no sidebar entry added).
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { useAuth } from '@/App';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { getVisibleArticleBySlug } from '@/lib/docs/articles';

export function HelpDrawer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const entry = useContextualHelp();
  const [open, setOpen] = useState(false);

  const relatedArticles = (entry?.articles ?? [])
    .map((slug) => getVisibleArticleBySlug(slug, user?.role))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('aide.trigger')}
        title={t('aide.trigger')}
        className="h-8 w-8 text-anac-muted hover:text-anac-navy"
        onClick={() => setOpen(true)}
      >
        <HelpCircle size={15} strokeWidth={1.75} />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{entry ? entry.title : t('aide.fallbackTitle')}</SheetTitle>
            <SheetDescription>
              {entry ? t('aide.contextualDescription') : t('aide.fallbackBody')}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-5">
            {entry ? (
              entry.sections.map((section) => (
                <section key={section.id}>
                  <h3 className="text-[12px] font-semibold text-anac-navy">{section.heading}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-anac-muted">{section.body}</p>
                </section>
              ))
            ) : (
              <p className="text-[12px] leading-relaxed text-anac-muted">
                {t('aide.fallbackBody')}
              </p>
            )}

            {relatedArticles.length > 0 && (
              <section className="border-t border-anac-border pt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-anac-muted">
                  En savoir plus
                </h3>
                <div className="mt-2 space-y-1.5">
                  {relatedArticles.map((article) => (
                    <Link
                      key={article.slug}
                      to={`/aide/${article.slug}`}
                      onClick={() => setOpen(false)}
                      className="block text-[12px] font-medium text-anac-blue hover:underline"
                    >
                      {article.title} →
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </SheetBody>

          <SheetFooter>
            <Link
              to="/aide"
              onClick={() => setOpen(false)}
              className="text-[12px] font-medium text-anac-blue hover:underline"
            >
              Ouvrir le centre d&apos;aide
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
