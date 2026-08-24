import { ClipboardCheck, Eye, FileWarning, Pencil, Truck, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { CountryMark } from '@/pages/partenaires/components/CountryMark';
import type { Mission } from '../mission.types';
import { getMissionHealth } from '../mission.utils';
import { MissionLogisticsBadge } from './MissionLogisticsBadge';
import { MissionPeriod } from './MissionPeriod';
import { MissionStatusBadge } from './MissionStatusBadge';
import { MissionHealthBadge } from './MissionHealthBadge';

export function MissionsRegistryTable({ missions }: { missions: Mission[] }) {
  const navigate = useNavigate();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Mission</th>
            <th className="px-4 py-3">Destination</th>
            <th className="hidden px-4 py-3 lg:table-cell">Pays</th>
            <th className="hidden px-4 py-3 xl:table-cell">Dates</th>
            <th className="px-4 py-3">Participants</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 lg:table-cell">Logistique</th>
            <th className="hidden px-4 py-3 xl:table-cell">Rapport</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {missions.map((mission) => {
            const health = getMissionHealth(mission, mission.recommandations);
            return (
              <tr
                key={mission.id}
                className="cursor-pointer transition-colors hover:bg-anac-gray/60"
                onClick={() => navigate(`/missions/${mission.id}`)}
              >
                <td className="max-w-[280px] px-4 py-3 align-top">
                  <div className="font-semibold text-anac-navy">{mission.titre}</div>
                  {health && <div className="mt-1">
                    <MissionHealthBadge health={health} />
                  </div>}
                </td>
                <td className="px-4 py-3 align-top text-anac-navy">{mission.destination}</td>
                <td className="hidden px-4 py-3 align-top text-anac-muted lg:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <CountryMark country={mission.pays} />
                    {mission.pays}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top text-anac-muted xl:table-cell">
                  <MissionPeriod dateDebut={mission.dateDebut} dateFin={mission.dateFin} />
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1 text-anac-muted">
                    <Users size={13} aria-hidden="true" />
                    {mission.participants.length}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <MissionStatusBadge statut={mission.statut} />
                </td>
                <td className="hidden px-4 py-3 align-top lg:table-cell">
                  <MissionLogisticsBadge statut={mission.confirmationLogistique} />
                </td>
                <td className="hidden px-4 py-3 align-top xl:table-cell">
                  {mission.rapportDocumentId ? (
                    <span className="text-xs font-medium text-green-700">Disponible</span>
                  ) : mission.statut === 'terminee' ? (
                    <span className="text-xs font-medium text-anac-warning">À déposer</span>
                  ) : (
                    <span className="text-xs text-anac-muted">Non requis</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <ActionTooltip label="Voir">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/missions/${mission.id}`)}
                        aria-label={`Voir la mission ${mission.titre}`}
                      >
                        <Eye size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Modifier">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/missions/${mission.id}/edit`)}
                        aria-label={`Modifier ${mission.titre}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Gérer la logistique">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/missions/${mission.id}?section=logistique`)}
                        aria-label={`Gérer la logistique de ${mission.titre}`}
                      >
                        <Truck size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    {mission.statut === 'terminee' && !mission.rapportDocumentId && (
                      <ActionTooltip label="Déposer le rapport">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => navigate(`/missions/${mission.id}?section=rapport`)}
                          aria-label={`Déposer le rapport de ${mission.titre}`}
                        >
                          <FileWarning size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
                    )}
                    <ActionTooltip label="Voir les recommandations">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/missions/${mission.id}?section=recommandations`)}
                        aria-label={`Voir les recommandations de ${mission.titre}`}
                      >
                        <ClipboardCheck size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
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

export function MissionsRegistryMobileCards({ missions }: { missions: Mission[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {missions.map((mission) => {
        const health = getMissionHealth(mission, mission.recommandations);
        return (
          <Link
            key={mission.id}
            to={`/missions/${mission.id}`}
            className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-anac-navy">{mission.titre}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-anac-muted">
                  <CountryMark country={mission.pays} />
                  {mission.destination}, {mission.pays}
                </p>
              </div>
              <MissionStatusBadge statut={mission.statut} />
            </div>

            {health && (
              <div className="mt-2">
                <MissionHealthBadge health={health} />
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <span>
                <span className="block text-anac-muted">Période</span>
                <span className="font-medium text-anac-navy">
                  <MissionPeriod dateDebut={mission.dateDebut} dateFin={mission.dateFin} />
                </span>
              </span>
              <span>
                <span className="block text-anac-muted">Participants</span>
                <span className="inline-flex items-center gap-1 font-medium text-anac-navy">
                  <Users size={12} aria-hidden="true" />
                  {mission.participants.length}
                </span>
              </span>
              <span>
                <span className="block text-anac-muted">Logistique</span>
                <MissionLogisticsBadge statut={mission.confirmationLogistique} />
              </span>
              <span>
                <span className="block text-anac-muted">Rapport</span>
                {mission.rapportDocumentId ? (
                  <span className="text-xs font-medium text-green-700">Disponible</span>
                ) : mission.statut === 'terminee' ? (
                  <span className="text-xs font-medium text-anac-warning">À déposer</span>
                ) : (
                  <span className="text-xs text-anac-muted">Non requis</span>
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
