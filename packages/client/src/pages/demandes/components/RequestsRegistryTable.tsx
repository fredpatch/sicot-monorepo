// packages/client/src/pages/demandes/components/RequestsRegistryTable.tsx
import { Archive, ArrowUpRight, CheckCircle2, Eye, Flag, Loader2, UserCheck, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import type { Demande } from '../requests.types';
import { formaterDate } from '../requests.utils';
import { BadgeStatut } from './StatusBadge';
import { RequestPriorityCell } from './PriorityBadge';
import { RequestSourceCell } from './SourceBadge';
import {
  canArchiveRequest,
  canOpenTranslation,
  canRecallRequest,
  canSubmitForReview,
  canTakeRequest,
  canValidatePriority,
  canValidateRequest,
} from '../requests.permissions';

interface RequestsActionsProps {
  onOpen: (demande: Demande) => void;
  onPrendreEnCharge: (id: number) => void;
  prendreEnChargeEnCours: boolean;
  onRappeler: (demande: Demande) => void;
  onPasserEnRelecture: (id: number) => void;
  passerEnRelectureEnCours: boolean;
  onOuvrirValidationPriorite: (demande: Demande) => void;
  onValider: (id: number) => void;
  validerEnCours: boolean;
  onArchiver: (id: number) => void;
  archiverEnCours: boolean;
}

function ActionTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex" title={label}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-anac-border bg-white px-2 py-1 text-xs font-medium text-anac-navy shadow-sm group-hover:block group-focus-within:block">
        {label}
      </span>
    </span>
  );
}

function RequestActions({
  demande,
  user,
  navigate,
  actions,
}: {
  demande: Demande;
  user: { id: number; role: string } | null;
  navigate: ReturnType<typeof useNavigate>;
  actions: RequestsActionsProps;
}) {
  return (
    <div className="flex justify-end gap-1">
      {canOpenTranslation(demande, user) && (
        <ActionTooltip label="Ouvrir la traduction">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/traductions/${demande.traductionId}`)}
            aria-label={`Ouvrir la traduction liée à la demande #${demande.id}`}
          >
            <ArrowUpRight size={14} aria-hidden="true" />
          </Button>
        </ActionTooltip>
      )}

      {canTakeRequest(demande, user) && (
        <ActionTooltip label="Prendre en charge">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onPrendreEnCharge(demande.id)}
            disabled={actions.prendreEnChargeEnCours}
            aria-label={`Prendre en charge la demande #${demande.id}`}
          >
            {actions.prendreEnChargeEnCours ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <UserCheck size={14} aria-hidden="true" />
            )}
          </Button>
        </ActionTooltip>
      )}

      {canRecallRequest(demande, user) && (
        <ActionTooltip label="Rappeler">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onRappeler(demande)}
            className="hover:text-anac-danger"
            aria-label={`Rappeler la demande #${demande.id}`}
          >
            <Undo2 size={14} aria-hidden="true" />
          </Button>
        </ActionTooltip>
      )}

      {canSubmitForReview(demande, user) && (
        <ActionTooltip label="Soumettre en relecture">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onPasserEnRelecture(demande.id)}
            disabled={actions.passerEnRelectureEnCours}
            aria-label={`Soumettre la demande #${demande.id} en relecture`}
          >
            {actions.passerEnRelectureEnCours ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Eye size={14} aria-hidden="true" />
            )}
          </Button>
        </ActionTooltip>
      )}

      {canValidatePriority(demande, user) && (
        <ActionTooltip label="Valider la priorité">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onOuvrirValidationPriorite(demande)}
            className="text-amber-600 hover:text-amber-800"
            aria-label={`Valider la priorité de la demande #${demande.id}`}
          >
            <Flag size={14} aria-hidden="true" />
          </Button>
        </ActionTooltip>
      )}

      {canValidateRequest(demande, user) && (
        <ActionTooltip label="Valider">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onValider(demande.id)}
            disabled={actions.validerEnCours}
            className="text-anac-success hover:text-green-800"
            aria-label={`Valider la demande #${demande.id}`}
          >
            {actions.validerEnCours ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={14} aria-hidden="true" />
            )}
          </Button>
        </ActionTooltip>
      )}

      {canArchiveRequest(demande, user) && (
        <ActionTooltip label="Archiver">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onArchiver(demande.id)}
            disabled={actions.archiverEnCours}
            aria-label={`Archiver la demande #${demande.id}`}
          >
            {actions.archiverEnCours ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Archive size={14} aria-hidden="true" />
            )}
          </Button>
        </ActionTooltip>
      )}
    </div>
  );
}

export function RequestsRegistryTable({
  demandes,
  ...actions
}: { demandes: Demande[] } & RequestsActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Demande / source</th>
            <th className="px-4 py-3">Direction</th>
            <th className="px-4 py-3">Priorité</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 lg:table-cell">Demandeur</th>
            <th className="hidden px-4 py-3 lg:table-cell">Traducteur</th>
            <th className="hidden px-4 py-3 xl:table-cell">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {demandes.map((demande) => (
            <tr
              key={demande.id}
              className="cursor-pointer transition-colors hover:bg-anac-gray/60"
              onClick={() => actions.onOpen(demande)}
            >
              <td className="max-w-[220px] px-4 py-3 align-top">
                <RequestSourceCell demande={demande} />
              </td>
              <td className="px-4 py-3 align-top">
                <span className="text-xs font-medium text-anac-muted">
                  {demande.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
                </span>
              </td>
              <td className="px-4 py-3 align-top">
                <RequestPriorityCell demande={demande} />
              </td>
              <td className="px-4 py-3 align-top">
                <BadgeStatut statut={demande.statut} />
              </td>
              <td className="hidden px-4 py-3 align-top text-xs text-anac-muted lg:table-cell">
                {demande.demandeurNom ?? '—'}
              </td>
              <td className="hidden px-4 py-3 align-top text-xs lg:table-cell">
                {demande.traducteurNom ? (
                  <span className="text-anac-muted">{demande.traducteurNom}</span>
                ) : (
                  <span className="italic text-anac-muted">Non assignée</span>
                )}
              </td>
              <td className="hidden px-4 py-3 align-top text-xs text-anac-muted xl:table-cell">
                {formaterDate(demande.createdAt)}
              </td>
              <td className="px-4 py-3 align-top" onClick={(event) => event.stopPropagation()}>
                <RequestActions demande={demande} user={user} navigate={navigate} actions={actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequestsRegistryMobileCards({
  demandes,
  ...actions
}: { demandes: Demande[] } & RequestsActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-3 md:hidden">
      {demandes.map((demande) => (
        <div
          key={demande.id}
          role="button"
          tabIndex={0}
          onClick={() => actions.onOpen(demande)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') actions.onOpen(demande);
          }}
          className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <RequestSourceCell demande={demande} maxWidth={200} />
            </div>
            <span className="shrink-0 text-xs font-medium text-anac-muted">
              {demande.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <BadgeStatut statut={demande.statut} />
            <RequestPriorityCell demande={demande} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-anac-muted">
            <span>{demande.traducteurNom ? `Traducteur : ${demande.traducteurNom}` : 'Non assignée'}</span>
            <span>{formaterDate(demande.createdAt)}</span>
          </div>
          <div
            className="mt-3 flex justify-end gap-1 border-t border-anac-border pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <RequestActions demande={demande} user={user} navigate={navigate} actions={actions} />
          </div>
        </div>
      ))}
    </div>
  );
}
