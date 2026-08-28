import { Eye, FileText, Paperclip, Pencil, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { CountryMark } from '@/pages/partenaires/components/CountryMark';
import type { Courrier } from '../courrier.types';
import { formatCourrierDate, formatCourrierDeadline, getCourrierHealth, getCourrierInterlocutor } from '../courrier.utils';
import { CourrierDirectionBadge } from './CourrierDirectionBadge';
import { CourrierHealthBadge } from './CourrierHealthBadge';

export function CourriersRegistryTable({
  courriers,
  canManage,
}: {
  courriers: Courrier[];
  canManage: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3">Objet</th>
            <th className="px-4 py-3">Type</th>
            <th className="hidden px-4 py-3 lg:table-cell">Expéditeur / Destinataire</th>
            <th className="hidden px-4 py-3 xl:table-cell">Date</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 lg:table-cell">Échéance</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {courriers.map((courrier) => {
            const interlocuteur = getCourrierInterlocutor(courrier);
            const health = getCourrierHealth(courrier);
            return (
              <tr
                key={courrier.id}
                className="cursor-pointer transition-colors hover:bg-anac-gray/60"
                onClick={() => navigate(`/courriers/${courrier.id}`)}
              >
                <td className="px-4 py-3 align-top font-mono text-xs text-anac-navy">{courrier.reference}</td>
                <td className="max-w-[280px] px-4 py-3 align-top">
                  <div className="truncate font-semibold text-anac-navy">{courrier.objet}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <CourrierDirectionBadge direction={courrier.direction} />
                </td>
                <td className="hidden px-4 py-3 align-top text-anac-muted lg:table-cell">
                  {interlocuteur ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CountryMark country={interlocuteur.pays} />
                      {interlocuteur.nom}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="hidden px-4 py-3 align-top text-anac-muted xl:table-cell">
                  {formatCourrierDate(courrier.dateReception)}
                </td>
                <td className="px-4 py-3 align-top">
                  <CourrierHealthBadge health={health} />
                </td>
                <td className="hidden px-4 py-3 align-top text-xs text-anac-muted lg:table-cell">
                  {formatCourrierDeadline(courrier)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <ActionTooltip label="Voir">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/courriers/${courrier.id}`)}
                        aria-label={`Voir le courrier ${courrier.reference}`}
                      >
                        <Eye size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    {canManage && (
                      <>
                        <ActionTooltip label="Modifier">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/courriers/${courrier.id}/edit`)}
                            aria-label={`Modifier ${courrier.reference}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </Button>
                        </ActionTooltip>
                        {courrier.direction === 'entrant' && courrier.suiviStatut !== 'archive' && (
                          <ActionTooltip label="Répondre">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => navigate(`/courriers/new?reponseAId=${courrier.id}`)}
                              aria-label={`Répondre à ${courrier.reference}`}
                            >
                              <Send size={14} aria-hidden="true" />
                            </Button>
                          </ActionTooltip>
                        )}
                      </>
                    )}
                    {courrier.documents.length > 0 && (
                      <ActionTooltip label="Pièces jointes">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => navigate(`/courriers/${courrier.id}?section=documents`)}
                          aria-label={`Voir la pièce jointe de ${courrier.reference}`}
                        >
                          <Paperclip size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CourriersRegistryMobileCards({ courriers }: { courriers: Courrier[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {courriers.map((courrier) => {
        const interlocuteur = getCourrierInterlocutor(courrier);
        const health = getCourrierHealth(courrier);
        return (
          <Link
            key={courrier.id}
            to={`/courriers/${courrier.id}`}
            className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-anac-muted">{courrier.reference}</p>
                <h3 className="mt-0.5 truncate font-semibold leading-snug text-anac-navy">{courrier.objet}</h3>
              </div>
              <CourrierDirectionBadge direction={courrier.direction} />
            </div>

            <div className="mt-2">
              <CourrierHealthBadge health={health} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <span>
                <span className="block text-anac-muted">
                  {courrier.direction === 'entrant' ? 'Expéditeur' : 'Destinataire'}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-anac-navy">
                  {interlocuteur ? (
                    <>
                      <CountryMark country={interlocuteur.pays} />
                      {interlocuteur.nom}
                    </>
                  ) : (
                    '-'
                  )}
                </span>
              </span>
              <span>
                <span className="block text-anac-muted">Date</span>
                <span className="font-medium text-anac-navy">{formatCourrierDate(courrier.dateReception)}</span>
              </span>
              <span>
                <span className="block text-anac-muted">Échéance</span>
                <span className="font-medium text-anac-navy">{formatCourrierDeadline(courrier)}</span>
              </span>
              <span>
                <span className="block text-anac-muted">Documents</span>
                {courrier.documents.length > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-anac-navy">
                    <FileText size={12} aria-hidden="true" /> {courrier.documents.length}
                  </span>
                ) : (
                  <span className="text-anac-muted">Aucun</span>
                )}
              </span>
            </div>
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
