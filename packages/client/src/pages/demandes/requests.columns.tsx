// packages/client/src/pages/demandes/demandes.columns.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlignLeft, ExternalLink, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { confirmToast } from '@/lib/confirm-toast';
import { useAuth } from '@/App';
import { BadgeStatut } from './components/StatusBadge';
import { BadgePriorite } from './components/PriorityBadge';
import { formaterDate, apercu } from './requests.utils';
import type { Demande } from './requests.types';

interface UseDemandesColumnsParams {
  t: TFunction;
  onPrendreEnCharge: (id: number) => void;
  prendreEnChargeEnCours: boolean;
  onRappeler: (id: number) => void;
  onPasserEnRelecture: (id: number) => void;
  passerEnRelectureEnCours: boolean;
  onOuvrirValidationPriorite: (demande: Demande) => void;
  onValider: (id: number) => void;
  validerEnCours: boolean;
  onArchiver: (id: number) => void;
  archiverEnCours: boolean;
}

export function useDemandesColumns({
  t,
  onPrendreEnCharge,
  prendreEnChargeEnCours,
  onRappeler,
  onPasserEnRelecture,
  passerEnRelectureEnCours,
  onOuvrirValidationPriorite,
  onValider,
  validerEnCours,
  onArchiver,
  archiverEnCours,
}: UseDemandesColumnsParams): ColumnDef<Demande>[] {
  const navigate = useNavigate();
  const { user } = useAuth();

  return useMemo<ColumnDef<Demande>[]>(
    () => [
      {
        id: 'contenu',
        header: 'Contenu',
        enableSorting: false,
        cell: ({ row }) => {
          const demande = row.original;
          return demande.documentNom ? (
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="text-anac-muted shrink-0" />
              <span className="text-anac-navy font-medium truncate max-w-[160px]">
                {demande.documentNom}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <AlignLeft size={12} className="text-anac-muted shrink-0" />
              <span className="text-anac-muted truncate max-w-[160px]">
                {apercu(demande.texteLibre)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'direction',
        header: 'Direction',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-anac-muted font-medium">
            {row.original.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
          </span>
        ),
      },
      {
        id: 'priorite',
        header: 'Priorité',
        enableSorting: false,
        cell: ({ row }) => {
          const demande = row.original;
          const prioriteActive = demande.prioriteValidee ?? demande.prioriteDemandee;
          return (
            <>
              <BadgePriorite priorite={prioriteActive} />
              {demande.prioriteValidee && demande.prioriteValidee !== demande.prioriteDemandee && (
                <div className="text-[10px] text-anac-muted mt-0.5">
                  Demandée : {demande.prioriteDemandee}
                </div>
              )}
            </>
          );
        },
      },
      {
        accessorKey: 'statut',
        header: 'Statut',
        enableSorting: false,
        cell: ({ row }) => <BadgeStatut statut={row.original.statut} />,
      },
      {
        accessorKey: 'demandeurNom',
        header: 'Demandeur',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted text-xs">{row.original.demandeurNom ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'traducteurNom',
        header: 'Traducteur',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.traducteurNom ? (
            <span className="text-anac-muted text-xs">{row.original.traducteurNom}</span>
          ) : (
            <span className="text-anac-muted text-xs italic">Non assigné</span>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-anac-muted text-xs">{formaterDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        enableSorting: false,
        cell: ({ row }) => {
          const demande = row.original;
          const estDemandeur = demande.demandeurId === user?.id;
          const estTraducteur = demande.traducteurId === user?.id;
          const estReviewer =
            user?.role === 'relecteur' || user?.role === 'admin' || user?.role === 'super_admin';
          const peutPrendreEnCharge =
            demande.statut === 'soumise' &&
            !demande.verrou &&
            (user?.role === 'traducteur' || user?.role === 'admin' || user?.role === 'super_admin');

          return (
            <div className="flex items-center gap-2 flex-wrap">
              {demande.traductionId && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate(`/traductions/${demande.traductionId}`)}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy gap-1"
                >
                  <ExternalLink size={10} /> Traduction
                </Button>
              )}

              {peutPrendreEnCharge && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onPrendreEnCharge(demande.id)}
                  disabled={prendreEnChargeEnCours}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  {prendreEnChargeEnCours ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    'Prendre en charge'
                  )}
                </Button>
              )}

              {estDemandeur && demande.statut === 'soumise' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() =>
                    confirmToast('Rappeler cette demande ?', () => onRappeler(demande.id))
                  }
                  className="h-auto p-0 text-xs text-anac-muted hover:text-anac-danger"
                >
                  Rappeler
                </Button>
              )}

              {estTraducteur && demande.statut === 'en_cours' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onPasserEnRelecture(demande.id)}
                  disabled={passerEnRelectureEnCours}
                  className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy"
                >
                  Soumettre
                </Button>
              )}

              {estReviewer && !demande.prioriteValidee && demande.statut !== 'archivee' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onOuvrirValidationPriorite(demande)}
                  className="h-auto p-0 text-xs text-amber-600 hover:text-amber-800"
                >
                  Priorité
                </Button>
              )}

              {estReviewer && demande.statut === 'en_relecture' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onValider(demande.id)}
                  disabled={validerEnCours}
                  className="h-auto p-0 text-xs text-green-600 hover:text-green-800"
                >
                  Valider
                </Button>
              )}

              {estReviewer && demande.statut === 'validee' && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onArchiver(demande.id)}
                  disabled={archiverEnCours}
                  className="h-auto p-0 text-xs text-anac-muted hover:text-anac-navy"
                >
                  Archiver
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      t,
      user,
      navigate,
      onPrendreEnCharge,
      prendreEnChargeEnCours,
      onRappeler,
      onPasserEnRelecture,
      passerEnRelectureEnCours,
      onOuvrirValidationPriorite,
      onValider,
      validerEnCours,
      onArchiver,
      archiverEnCours,
    ]
  );
}
