import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import ModalRelance from '@/components/ModalRelance';
import HistoriqueNotifications from '@/pages/HistoriqueNotifications';
import { courriersApi } from '@/lib/courriers.api';
import { accordsApi } from '@/lib/accords.api';
import type { Courrier } from '../courrier.types';
import { formatCourrierDate, getCourrierContact, getCourrierInterlocutor } from '../courrier.utils';
import { CourrierStatusBadge } from './CourrierStatusBadge';

interface Accord {
  id: number;
  reference: string;
  titre: string;
}

// Réponse tracking + fil de correspondance + relance, combined into one
// section (Phase 2 plan §5/§9) - a separate near-empty "Notifications" tab
// isn't warranted; the relance history already lives in ModalRelance.
export function CourrierResponseSection({
  courrier,
  canManage,
}: {
  courrier: Courrier;
  canManage: boolean;
}) {
  const [modalRelance, setModalRelance] = useState(false);

  const { data: parent } = useQuery({
    queryKey: ['courrier', courrier.reponseAId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrier.reponseAId!);
      return res.data as Courrier;
    },
    enabled: Boolean(courrier.reponseAId),
  });

  const { data: fil } = useQuery({
    queryKey: ['courrier-fil', courrier.id],
    queryFn: async () => {
      const res = await courriersApi.getFilCorrespondance(courrier.id);
      return res.data as Courrier[];
    },
  });

  const { data: accordLie } = useQuery({
    queryKey: ['accord', courrier.accordId],
    queryFn: async () => {
      const res = await accordsApi.getById(courrier.accordId!);
      return res.data as Accord;
    },
    enabled: Boolean(courrier.accordId),
  });

  const interlocuteur = getCourrierInterlocutor(courrier);
  const contactChoisi = getCourrierContact(courrier);
  // The explicitly chosen contact takes priority over the organisation's
  // generic contactPrincipal - an explicit choice shouldn't be silently
  // swapped for someone else.
  const contactRelance = contactChoisi ?? interlocuteur?.contactPrincipal;
  const destinatairesSuggeres = contactRelance?.email
    ? [
        {
          label: `${contactRelance.prenom} ${contactRelance.nom} - ${interlocuteur?.nom ?? ''}`,
          email: contactRelance.email,
          nom: `${contactRelance.prenom} ${contactRelance.nom}`,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Suivi de la réponse</h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-anac-border px-3 py-2.5">
            <dt className="text-anac-muted">Statut</dt>
            <dd>
              <CourrierStatusBadge statut={courrier.suiviStatut} />
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-md border border-anac-border px-3 py-2.5">
            <dt className="text-anac-muted">Date limite</dt>
            <dd className="font-medium text-anac-navy">
              {courrier.dateLimiteReponse
                ? formatCourrierDate(courrier.dateLimiteReponse)
                : 'Aucune'}
            </dd>
          </div>
        </dl>

        {canManage && courrier.direction === 'entrant' && courrier.suiviStatut !== 'archive' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalRelance(true)}
            className="mt-4 gap-1.5"
          >
            <Send size={13} aria-hidden="true" />
            Préparer une relance
          </Button>
        )}
      </section>

      {accordLie && (
        <section className="card p-5">
          <h3 className="font-bold text-anac-navy">Accord lié</h3>
          <Link
            to={`/accords/${accordLie.id}`}
            className="mt-3 block rounded-md border border-anac-border px-4 py-3 hover:bg-anac-gray"
          >
            <span className="font-mono text-xs text-anac-muted">{accordLie.reference}</span>
            <span className="mt-0.5 block text-sm font-medium text-anac-navy">
              {accordLie.titre}
            </span>
          </Link>
        </section>
      )}

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Courriers liés</h3>
        <div className="mt-3 space-y-2">
          {parent && (
            <Link
              to={`/courriers/${parent.id}`}
              className="flex items-center gap-2 rounded-md border border-anac-border px-4 py-3 text-sm hover:bg-anac-gray"
            >
              <ArrowDownLeft size={14} className="shrink-0 text-anac-muted" aria-hidden="true" />
              <span>
                <span className="block text-xs text-anac-muted">En réponse à</span>
                <span className="font-medium text-anac-navy">
                  {parent.reference} - {parent.objet}
                </span>
              </span>
            </Link>
          )}
          {(fil ?? []).map((reponse) => (
            <Link
              key={reponse.id}
              to={`/courriers/${reponse.id}`}
              className="flex items-center gap-2 rounded-md border border-anac-border px-4 py-3 text-sm hover:bg-anac-gray"
            >
              <ArrowUpRight size={14} className="shrink-0 text-anac-muted" aria-hidden="true" />
              <span>
                <span className="block text-xs text-anac-muted">Réponse</span>
                <span className="font-medium text-anac-navy">
                  {reponse.reference} - {reponse.objet}
                </span>
              </span>
            </Link>
          ))}
          {!parent && (fil ?? []).length === 0 && (
            <p className="text-sm text-anac-muted">Aucun courrier lié.</p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-anac-navy">Historique des relances</h3>
        <div className="mt-3">
          <HistoriqueNotifications type="courrier_relance" entiteId={courrier.id} />
        </div>
      </section>

      <ModalRelance
        open={modalRelance}
        onClose={() => setModalRelance(false)}
        type="courrier_relance"
        entiteId={courrier.id}
        objetParDefaut={`Relance - Courrier ${courrier.reference}`}
        messageParDefaut={
          `Le courrier "${courrier.objet}" (réf. ${courrier.reference}), reçu le ` +
          `${formatCourrierDate(courrier.dateReception, 'long')}, est toujours en attente de réponse.` +
          `\n\nPourriez-vous nous indiquer où en est le traitement de ce dossier ?`
        }
        destinatairesSuggeres={destinatairesSuggeres}
      />
    </div>
  );
}
