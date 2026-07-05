// packages/client/src/pages/analytics/onglets/AnalyseIADialog.tsx
import { Check, ShieldAlert, X } from 'lucide-react';
import Markdown from 'react-markdown';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmToast } from '@/lib/confirm-toast';
import type { RapportHistorique } from '../analytics.types';

interface AnalyseIADialogProps {
  rapport: RapportHistorique | null;
  onOpenChange: (open: boolean) => void;
  estAdmin: boolean;
  texteEdite: string;
  onTexteEditeChange: (texte: string) => void;
  onValider: (statut: 'valide' | 'rejete') => void;
  validationEnCours: boolean;
}

export function AnalyseIADialog({
  rapport,
  onOpenChange,
  estAdmin,
  texteEdite,
  onTexteEditeChange,
  onValider,
  validationEnCours,
}: AnalyseIADialogProps) {
  const enAttente = rapport?.statutRelectureIA === 'en_attente';

  return (
    <Dialog open={!!rapport} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Analyse IA - {rapport && new Date(rapport.periodeDebut).toLocaleDateString('fr-FR')} au{' '}
            {rapport && new Date(rapport.periodeFin).toLocaleDateString('fr-FR')}
          </DialogTitle>
          <DialogDescription>
            {rapport?.moteurIA && `Généré par ${rapport.moteurIA}`}
            {rapport?.relusLeIA &&
              ` - relu le ${new Date(rapport.relusLeIA).toLocaleDateString('fr-FR')}`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex-1 flex flex-col min-h-0">
          <div className="bg-anac-attention/10 border border-anac-attention/30 rounded-lg p-3 mb-3 flex items-start gap-2 shrink-0">
            <ShieldAlert size={16} className="text-anac-attention shrink-0 mt-0.5" />
            <p className="text-sm text-anac-text">
              <strong>Analyse générée par intelligence artificielle (Gemini).</strong> Les faits,
              chiffres et recommandations doivent être vérifiés avant toute décision.
              {enAttente && " Ce contenu n'a pas encore été relu par un administrateur."}
            </p>
          </div>

          {estAdmin && enAttente ? (
            <textarea
              value={texteEdite}
              onChange={(e) => onTexteEditeChange(e.target.value)}
              className="input w-full flex-1 text-sm font-mono leading-relaxed resize-none"
            />
          ) : (
            <div className="prose prose-sm max-w-none flex-1 overflow-y-auto text-sm text-anac-text">
              <Markdown>{rapport?.contenuIAValide ?? rapport?.contenuIA ?? ''}</Markdown>
            </div>
          )}
        </DialogBody>
        {estAdmin && enAttente && (
          <DialogFooter>
            <Button
              variant="destructive"
              className="gap-1.5"
              disabled={validationEnCours}
              onClick={() =>
                confirmToast(
                  'Rejeter cette analyse ? Une nouvelle génération sera nécessaire.',
                  () => onValider('rejete')
                )
              }
            >
              <X size={13} /> Rejeter
            </Button>
            <Button
              className="gap-1.5"
              disabled={validationEnCours}
              onClick={() => onValider('valide')}
            >
              <Check size={13} /> Valider
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
