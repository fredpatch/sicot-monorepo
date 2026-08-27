// packages/client/src/pages/portal/components/DownloadRequestDialog.tsx
import { useState } from 'react';
import { Mail, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSecureDownloadRequestMutation } from '../hooks/mutations';
import { isEmailValide } from '../portal.utils';
import type { DocumentPortail } from '../portal.types';

interface DownloadRequestDialogProps {
  document: DocumentPortail | null;
  onClose: () => void;
}

export function DownloadRequestDialog({ document, onClose }: DownloadRequestDialogProps) {
  const [email, setEmail] = useState('');
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const genererMutation = useSecureDownloadRequestMutation();

  function handleClose() {
    setEmail('');
    setSucces(false);
    setErreur(null);
    onClose();
  }

  function handleSubmit() {
    if (!document || genererMutation.isPending) return;
    const emailTrimme = email.trim();
    if (!isEmailValide(emailTrimme)) {
      setErreur('Adresse email invalide.');
      return;
    }
    genererMutation.mutate(
      { documentId: document.id, email: emailTrimme },
      {
        onSuccess: () => {
          setSucces(true);
          setErreur(null);
        },
        onError: (err: unknown) => {
          setErreur(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Erreur lors de la génération du lien.'
          );
        },
      }
    );
  }

  if (!document) return null;

  return (
    <Dialog
      open={!!document}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={15} className="text-anac-sky" />
            Recevoir le document
          </DialogTitle>
          <DialogDescription>{document.nomOriginal}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!succes ? (
            <>
              <p className="text-sm text-anac-text">
                Saisissez votre adresse email. Un lien sécurisé vous sera envoyé pour
                télécharger ce document.
                {document.portailTokenDureeJours && (
                  <span className="block text-xs text-anac-muted mt-1">
                    Le lien sera valable {document.portailTokenDureeJours} jour(s).
                  </span>
                )}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email-dl">Adresse email *</Label>
                <Input
                  id="email-dl"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErreur(null);
                  }}
                  placeholder="votre@email.com"
                  autoFocus
                  aria-describedby={erreur ? 'email-dl-erreur' : undefined}
                  aria-invalid={!!erreur}
                />
              </div>

              {erreur && (
                <div
                  id="email-dl-erreur"
                  role="alert"
                  className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs"
                >
                  {erreur}
                </div>
              )}
            </>
          ) : (
            <div
              role="status"
              className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Send size={18} className="text-green-600" />
              </div>
              <p className="font-medium">Lien envoyé</p>
              <p className="text-xs text-green-600">
                Consultez votre boîte email à l&apos;adresse <strong>{email}</strong> pour
                télécharger le document.
                {document.portailTokenDureeJours && (
                  <span className="block mt-1">
                    Le lien sera valable {document.portailTokenDureeJours} jour(s).
                  </span>
                )}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            {succes ? 'Fermer' : 'Annuler'}
          </Button>
          {!succes && (
            <Button
              onClick={handleSubmit}
              disabled={!isEmailValide(email.trim()) || genererMutation.isPending}
              className="gap-2 bg-anac-sky hover:bg-anac-sky/85 text-white"
            >
              {genererMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Envoi...
                </>
              ) : (
                <>
                  <Send size={13} /> Envoyer le lien
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
