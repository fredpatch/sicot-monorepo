/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, AlertTriangle, History, X } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { notificationsApi, type NotificationType } from '@/lib/notifications.api';

// ── Types ──────────────────────────────────────────────────────────────────
interface NotificationHistorique {
  id: number;
  destinataireEmail: string;
  destinataireNom?: string;
  message: string;
  declencheParNom?: string;
  statut: 'envoyee' | 'echec';
  createdAt: string;
}

interface DestinataireOption {
  label: string;
  email: string;
  nom?: string;
}

interface ModalRelanceProps {
  open: boolean;
  onClose: () => void;
  type: NotificationType;
  entiteId: number;
  objetParDefaut: string;
  messageParDefaut: string;
  destinatairesSuggeres?: DestinataireOption[];
}

// ── Composant ──────────────────────────────────────────────────────────────
export default function ModalRelance({
  open,
  onClose,
  type,
  entiteId,
  objetParDefaut,
  messageParDefaut,
  destinatairesSuggeres = [],
}: ModalRelanceProps) {
  const queryClient = useQueryClient();

  const [destinataireChoisi, setDestinataireChoisi] = useState<string>(
    destinatairesSuggeres.length > 0 ? destinatairesSuggeres[0].email : '__libre__'
  );
  const [emailLibre, setEmailLibre] = useState('');
  const [nomLibre, setNomLibre] = useState('');
  const [objet, setObjet] = useState(objetParDefaut);
  const [message, setMessage] = useState(messageParDefaut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  // ── Historique des relances déjà envoyées sur cette entité ────────────
  const { data: historique } = useQuery({
    queryKey: ['notifications-historique', type, entiteId],
    queryFn: async () => {
      const res = await notificationsApi.historiqueEntite(type, entiteId);
      return res.data as NotificationHistorique[];
    },
    enabled: open,
  });

  const dejaNotifieAujourdhui = historique?.some((h) => {
    const date = new Date(h.createdAt);
    const aujourdhui = new Date();
    return date.toDateString() === aujourdhui.toDateString();
  });

  // ── Mutation envoi ───────────────────────────────────────────────────
  const envoyerMutation = useMutation({
    mutationFn: () => {
      const destinataire =
        destinataireChoisi === '__libre__'
          ? { email: emailLibre, nom: nomLibre || undefined }
          : destinatairesSuggeres.find((d) => d.email === destinataireChoisi);

      if (!destinataire?.email) {
        throw new Error('Email destinataire manquant.');
      }

      return notificationsApi.envoyer({
        type,
        entiteId,
        destinataireEmail: destinataire.email,
        destinataireNom: destinataire.nom,
        objet,
        message,
      });
    },
    onSuccess: () => {
      setSucces(true);
      queryClient.invalidateQueries({ queryKey: ['notifications-historique', type, entiteId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => {
        setSucces(false);
        onClose();
      }, 1500);
    },
    onError: (err: unknown) => {
      setErreur(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ??
          (err as Error)?.message ??
          "Erreur lors de l'envoi."
      );
    },
  });

  function handleEnvoyer() {
    setErreur(null);

    const destinataire = destinataireChoisi === '__libre__' ? emailLibre : destinataireChoisi;

    if (!destinataire || (destinataireChoisi === '__libre__' && !emailLibre.includes('@'))) {
      setErreur('Veuillez renseigner un email destinataire valide.');
      return;
    }

    envoyerMutation.mutate();
  }

  function handleClose() {
    setErreur(null);
    setSucces(false);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send size={15} className="text-anac-sky" />
            Relancer / Notifier
          </DialogTitle>
          <DialogDescription>
            Le message sera envoyé directement au destinataire choisi. Cette action est tracée.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Avertissement déjà notifié aujourd'hui */}
          {dejaNotifieAujourdhui && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2.5 text-xs flex items-start gap-2">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>
                Une notification a déjà été envoyée aujourd&apos;hui sur cet élément. Vous pouvez
                quand même continuer si nécessaire.
              </span>
            </div>
          )}

          {/* Sélection destinataire */}
          <div className="space-y-1.5">
            <Label>Destinataire</Label>
            <Select value={destinataireChoisi} onValueChange={setDestinataireChoisi}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinatairesSuggeres.map((d) => (
                  <SelectItem key={d.email} value={d.email}>
                    {d.label}
                  </SelectItem>
                ))}
                <SelectItem value="__libre__">— Saisir un email —</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email libre si choisi */}
          {destinataireChoisi === '__libre__' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-libre">Email *</Label>
                <Input
                  id="email-libre"
                  type="email"
                  value={emailLibre}
                  onChange={(e) => setEmailLibre(e.target.value)}
                  placeholder="destinataire@exemple.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom-libre">Nom (optionnel)</Label>
                <Input
                  id="nom-libre"
                  value={nomLibre}
                  onChange={(e) => setNomLibre(e.target.value)}
                  placeholder="Nom du destinataire"
                />
              </div>
            </div>
          )}

          {/* Objet */}
          <div className="space-y-1.5">
            <Label htmlFor="objet">Objet</Label>
            <Input id="objet" value={objet} onChange={(e) => setObjet(e.target.value)} />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="input resize-none text-sm"
            />
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs">
              {erreur}
            </div>
          )}

          {succes && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2.5 text-xs">
              ✓ Notification envoyée avec succès.
            </div>
          )}

          {/* Historique compact */}
          {historique && historique.length > 0 && (
            <div className="border-t border-anac-border pt-3">
              <p className="text-[11px] font-medium text-anac-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <History size={10} />
                Relances précédentes ({historique.length})
              </p>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {historique.slice(0, 3).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-[11px] text-anac-muted"
                  >
                    <span className="truncate max-w-[60%]">
                      {h.destinataireNom ?? h.destinataireEmail}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {h.statut === 'echec' && <span className="text-red-500">échec</span>}
                      {new Date(h.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleEnvoyer}
            disabled={envoyerMutation.isPending || succes}
            className="gap-2"
          >
            {envoyerMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Envoi...
              </>
            ) : (
              <>
                <Send size={13} /> Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
