// packages/client/src/components/help/HelpDrawer.tsx
//
// Self-contained trigger + Sheet (Phase 10.1) — placed once in Layout's
// header, beside the FR/EN toggle. Manages its own open state (controlled,
// via a plain onClick) rather than Radix's SheetTrigger — matches the app's
// existing dialog convention (NewRequestDialog, PdfPreviewDialog, ...), all
// of which are driven by explicit open/onOpenChange state rather than an
// uncontrolled Trigger + asChild, so this doesn't introduce a second pattern
// for composing the app's custom Button with a Radix trigger.
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { useContextualHelp } from '@/hooks/useContextualHelp';

export function HelpDrawer() {
  const { t } = useTranslation();
  const entry = useContextualHelp();
  const [open, setOpen] = useState(false);

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
              <p className="text-[12px] leading-relaxed text-anac-muted">{t('aide.fallbackBody')}</p>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
