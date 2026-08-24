import { Eye, RotateCw, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { confirmToast } from '@/lib/confirm-toast';
import type { TraductionVue } from '@/lib/traductions.api';
import type { Traduction } from '../traductions.types';
import { apercu, formaterDate } from '../traductions.utils';
import { BadgeStatut } from './StatusBadge';
import { BadgeDirection } from './DirectionBadge';

interface TraductionsRegistryTableProps {
  traductions: Traduction[];
  vue: TraductionVue;
  onSupprimer: (id: number) => void;
  supprimerEnCours: boolean;
  onRestaurer: (id: number) => void;
  restaurerEnCours: boolean;
}

function sourceLabel(traduction: Traduction): string {
  return traduction.documentId ? `Document #${traduction.documentId}` : 'Texte libre';
}

function voirLabel(statut: Traduction['statut']): string {
  return statut === 'a_reviser' || statut === 'en_relecture' ? 'Réviser' : 'Consulter';
}

export function TraductionsRegistryTable({
  traductions,
  vue,
  onSupprimer,
  supprimerEnCours,
  onRestaurer,
  restaurerEnCours,
}: TraductionsRegistryTableProps) {
  const navigate = useNavigate();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Texte original</th>
            <th className="px-4 py-3">Direction</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 lg:table-cell">Moteur</th>
            <th className="hidden px-4 py-3 xl:table-cell">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {traductions.map((traduction) => (
            <tr
              key={traduction.id}
              className={vue === 'actives' ? 'cursor-pointer transition-colors hover:bg-anac-gray/60' : undefined}
              onClick={vue === 'actives' ? () => navigate(`/traductions/${traduction.id}`) : undefined}
            >
              <td className="max-w-[320px] px-4 py-3 align-top">
                <p className="truncate font-medium text-anac-navy">{apercu(traduction.texteOriginal)}</p>
                <p className="mt-0.5 text-xs text-anac-muted">{sourceLabel(traduction)}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <BadgeDirection direction={traduction.direction} />
              </td>
              <td className="px-4 py-3 align-top">
                <BadgeStatut statut={traduction.statut} />
              </td>
              <td className="hidden px-4 py-3 align-top text-xs capitalize text-anac-muted lg:table-cell">
                {traduction.moteurUtilise}
              </td>
              <td className="hidden px-4 py-3 align-top text-xs text-anac-muted xl:table-cell">
                {formaterDate(traduction.createdAt)}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                  {vue === 'supprimees' ? (
                    <ActionTooltip label="Restaurer">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRestaurer(traduction.id)}
                        disabled={restaurerEnCours}
                        aria-label={`Restaurer la traduction #${traduction.id}`}
                      >
                        <RotateCw size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                  ) : (
                    <>
                      <ActionTooltip label={voirLabel(traduction.statut)}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => navigate(`/traductions/${traduction.id}`)}
                          aria-label={`${voirLabel(traduction.statut)} la traduction #${traduction.id}`}
                        >
                          <Eye size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
                      {traduction.statut !== 'approuvee' && traduction.statut !== 'archivee' && (
                        <ActionTooltip label="Supprimer">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              confirmToast('Supprimer cette traduction ?', () => onSupprimer(traduction.id))
                            }
                            disabled={supprimerEnCours}
                            aria-label={`Supprimer la traduction #${traduction.id}`}
                            className="hover:text-anac-danger"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </Button>
                        </ActionTooltip>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TraductionsRegistryMobileCards({
  traductions,
  vue,
  onRestaurer,
  restaurerEnCours,
}: {
  traductions: Traduction[];
  vue: TraductionVue;
  onRestaurer: (id: number) => void;
  restaurerEnCours: boolean;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {traductions.map((traduction) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-anac-navy">
                  {apercu(traduction.texteOriginal)}
                </p>
                <p className="mt-0.5 text-xs text-anac-muted">{sourceLabel(traduction)}</p>
              </div>
              <BadgeDirection direction={traduction.direction} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <BadgeStatut statut={traduction.statut} />
              <span className="text-xs text-anac-muted">{formaterDate(traduction.createdAt)}</span>
            </div>
          </>
        );

        if (vue === 'supprimees') {
          return (
            <div key={traduction.id} className="card p-4">
              {content}
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRestaurer(traduction.id)}
                  disabled={restaurerEnCours}
                  className="gap-1.5"
                >
                  <RotateCw size={13} aria-hidden="true" /> Restaurer
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={traduction.id}
            to={`/traductions/${traduction.id}`}
            className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
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
