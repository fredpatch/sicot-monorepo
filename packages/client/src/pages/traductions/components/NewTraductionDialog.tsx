// packages/client/src/pages/traductions/components/NouvelleTraductionDialog.tsx
import { Loader2, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import type { TraductionDirection } from '@/lib/traductions.api';

interface NouvelleTraductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: TraductionDirection;
  onDirectionChange: (direction: TraductionDirection) => void;
  texteLibre: string;
  onTexteLibreChange: (texte: string) => void;
  onLancer: () => void;
  chargement: boolean;
  erreur: string | null;
  moteurAccessible?: boolean;
}

export function NouvelleTraductionDialog({
  open,
  onOpenChange,
  direction,
  onDirectionChange,
  texteLibre,
  onTexteLibreChange,
  onLancer,
  chargement,
  erreur,
  moteurAccessible,
}: NouvelleTraductionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle traduction</DialogTitle>
          <DialogDescription>
            Saisissez le texte à traduire. La traduction IA sera lancée immédiatement et vous
            pourrez la réviser dans l&apos;éditeur.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label>Direction</Label>
            <Select
              value={direction}
              onValueChange={(v) => onDirectionChange(v as TraductionDirection)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr_en">Français → Anglais</SelectItem>
                <SelectItem value="en_fr">Anglais → Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="texte-libre">
              Texte à traduire *
              <span className="text-anac-muted font-normal ml-2 text-xs">
                ({texteLibre.length} caractères)
              </span>
            </Label>
            <textarea
              id="texte-libre"
              value={texteLibre}
              onChange={(e) => onTexteLibreChange(e.target.value)}
              rows={10}
              className="input resize-none text-sm font-mono"
              placeholder={
                direction === 'fr_en'
                  ? 'Saisissez le texte en français...'
                  : 'Enter text in English...'
              }
            />
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {erreur}
            </div>
          )}

          {moteurAccessible === false && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-xs">
              ⚠ LibreTranslate est hors ligne. La traduction sera créée avec statut &quot;Manuelle
              requise&quot; - vous pourrez saisir la traduction manuellement.
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onLancer} disabled={!texteLibre.trim() || chargement} className="gap-2">
            {chargement ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Traduction en cours...
              </>
            ) : (
              <>
                <Languages size={13} /> Lancer la traduction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
