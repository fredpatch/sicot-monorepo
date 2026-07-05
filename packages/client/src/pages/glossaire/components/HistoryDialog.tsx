// packages/client/src/pages/glossaire/components/HistoriqueDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { formaterDate } from '../glossary.utils';
import type { Terme } from '../glossary.types';

interface HistoriqueDialogProps {
  terme: Terme | null;
  termeDetail: Terme | undefined;
  onOpenChange: (open: boolean) => void;
}

export function HistoriqueDialog({ terme, termeDetail, onOpenChange }: HistoriqueDialogProps) {
  return (
    <Dialog open={!!terme} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historique — {terme?.termeFr}</DialogTitle>
          <DialogDescription>Modifications successives de ce terme.</DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] overflow-y-auto">
          {!termeDetail?.historique || termeDetail.historique.length === 0 ? (
            <p className="text-sm text-anac-muted text-center py-8">
              Aucune modification enregistrée.
            </p>
          ) : (
            <div className="space-y-3">
              {termeDetail.historique.map((h) => (
                <div key={h.id} className="border border-anac-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-anac-navy">
                      {h.modifieParNom ?? 'Système'}
                    </span>
                    <span className="text-xs text-anac-muted">{formaterDate(h.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] text-anac-muted uppercase tracking-wide mb-0.5">
                        Ancien FR
                      </p>
                      <p className="text-sm text-anac-text">{h.ancienTermeFr ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-anac-muted uppercase tracking-wide mb-0.5">
                        Ancien EN
                      </p>
                      <p className="text-sm text-anac-text">{h.ancienTermeEn ?? '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
