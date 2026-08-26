// packages/client/src/pages/mon-espace/components/MyRequestsPanel.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useDemandesQuery } from '@/pages/demandes/hooks/queries';
import { useDemandesMutations } from '@/pages/demandes/hooks/mutations';
import {
  RequestsRegistryTable,
  RequestsRegistryMobileCards,
} from '@/pages/demandes/components/RequestsRegistryTable';
import { RequestWorkspace } from '@/pages/demandes/components/RequestWorkspace';
import type { Demande } from '@/pages/demandes/requests.types';

const TABS = [
  { value: '', label: 'Toutes' },
  { value: 'soumise', label: 'À assigner' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_relecture', label: 'En relecture' },
  { value: 'validee', label: 'Validées' },
  { value: 'archivee', label: 'Archivées' },
];

export function MyRequestsPanel({ demandeurId }: { demandeurId: number }) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [statut, setStatut] = useState('');
  const [demandeOuverteId, setDemandeOuverteId] = useState<number | null>(null);

  const demandesQuery = useDemandesQuery({
    statut,
    priorite: '',
    demandeurId,
    search: '',
    page: 1,
  });

  const {
    prendreEnChargeMutation,
    rappelerMutation,
    passerEnRelectureMutation,
    validerMutation,
    archiverMutation,
  } = useDemandesMutations();

  const demandes = (demandesQuery.data?.data ?? []).slice(0, 5);
  const demandeOuverte = demandeOuverteId ? demandes.find((d) => d.id === demandeOuverteId) ?? null : null;

  async function handleRappeler(demande: Demande) {
    const ok = await confirm({
      title: 'Rappeler cette demande ?',
      description: 'Elle sera archivée et ne pourra plus être prise en charge.',
      confirmLabel: 'Rappeler',
      variant: 'destructive',
    });
    if (ok) rappelerMutation.mutate(demande.id);
  }

  const actionsProps = {
    onOpen: (demande: Demande) => setDemandeOuverteId(demande.id),
    onPrendreEnCharge: (id: number) => prendreEnChargeMutation.mutate(id),
    prendreEnChargeEnCours: prendreEnChargeMutation.isPending,
    onRappeler: handleRappeler,
    onPasserEnRelecture: (id: number) => passerEnRelectureMutation.mutate(id),
    passerEnRelectureEnCours: passerEnRelectureMutation.isPending,
    // Reviewer-only action — an agent's own requests never satisfy
    // canValidatePriority, so this never actually fires here.
    onOuvrirValidationPriorite: () => {},
    onValider: (id: number) => validerMutation.mutate(id),
    validerEnCours: validerMutation.isPending,
    onArchiver: (id: number) => archiverMutation.mutate(id),
    archiverEnCours: archiverMutation.isPending,
  };

  return (
    <section className="card p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-anac-border p-4">
        <h3 className="text-base font-bold text-anac-navy">Mes demandes de traduction</h3>
        <Link
          to="/demandes?assignation=mes_demandes"
          className="flex items-center gap-1 text-xs font-medium text-anac-blue hover:text-anac-navy"
        >
          Voir toutes <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-anac-border px-4 py-3">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatut(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statut === tab.value
                ? 'bg-anac-navy text-white'
                : 'bg-anac-gray text-anac-muted hover:text-anac-navy'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {demandesQuery.isLoading ? (
          <div className="flex min-h-32 items-center justify-center text-anac-muted">
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
            Chargement...
          </div>
        ) : demandes.length === 0 ? (
          <p className="py-8 text-center text-sm text-anac-muted">
            Aucune demande {statut ? 'dans ce statut' : 'pour le moment'}.
          </p>
        ) : (
          <>
            <RequestsRegistryTable demandes={demandes} {...actionsProps} />
            <RequestsRegistryMobileCards demandes={demandes} {...actionsProps} />
          </>
        )}
      </div>

      {demandes.length > 0 && (
        <div className="border-t border-anac-border p-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/demandes?assignation=mes_demandes')}
            className="gap-1.5"
          >
            Voir toutes mes demandes <ArrowRight size={13} aria-hidden="true" />
          </Button>
        </div>
      )}

      <RequestWorkspace
        demande={demandeOuverte}
        onOpenChange={(open) => !open && setDemandeOuverteId(null)}
        {...actionsProps}
      />
    </section>
  );
}
