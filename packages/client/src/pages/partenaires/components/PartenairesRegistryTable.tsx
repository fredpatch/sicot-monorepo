import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FileText, Mail, Pencil, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { Organisation } from '../partenaires.types';
import {
  formatContactName,
  getActiveContactsCount,
  getOrganisationTypeLabel,
  getPrincipalContact,
  getTotalContactsCount,
} from '../partenaires.utils';
import { ContactHealthBadge } from './ContactHealthBadge';
import { CountryMark } from './CountryMark';
import { OrganisationStatusBadge } from './OrganisationStatusBadge';
import { OrganisationTypeBadge } from './OrganisationTypeBadge';

type SortField = 'nom' | 'type' | 'pays' | 'region' | 'actif';
type SortOrder = 'asc' | 'desc';

export function PartenairesRegistryTable({
  organisations,
  sortBy,
  sortOrder,
  onSort,
}: {
  organisations: Organisation[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <SortableHead field="nom" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
              Organisation
            </SortableHead>
            <SortableHead field="type" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
              Type
            </SortableHead>
            <SortableHead field="pays" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
              Pays
            </SortableHead>
            <SortableHead field="region" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden xl:table-cell">
              Région
            </SortableHead>
            <th className="px-4 py-3">Contact principal</th>
            <SortableHead field="actif" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
              Statut
            </SortableHead>
            <th className="hidden px-4 py-3 lg:table-cell">Contacts</th>
            <th className="hidden px-4 py-3 lg:table-cell">Accords liés</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {organisations.map((organisation) => {
            const principal = getPrincipalContact(organisation);
            return (
              <tr
                key={organisation.id}
                className="cursor-pointer transition-colors hover:bg-anac-gray/60"
                onClick={() => navigate(`/partenaires/${organisation.id}`)}
              >
                <td className="max-w-[320px] px-4 py-3 align-top">
                  <div className="font-semibold text-anac-navy">{organisation.nom}</div>
                  {organisation.notes && (
                    <div className="mt-1 truncate text-xs text-anac-muted">{organisation.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <OrganisationTypeBadge type={organisation.type} />
                </td>
                <td className="px-4 py-3 align-top text-anac-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CountryMark country={organisation.pays} />
                    {organisation.pays}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top text-anac-muted xl:table-cell">
                  {organisation.region || '-'}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-anac-navy">{formatContactName(principal)}</div>
                  {principal?.email ? (
                    <a
                      href={`mailto:${principal.email}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-anac-muted hover:text-anac-blue"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Mail size={11} aria-hidden="true" />
                      {principal.email}
                    </a>
                  ) : (
                    <div className="mt-1 text-xs text-anac-muted">
                      {principal ? 'Email non renseigné' : 'Principal à définir'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1.5">
                    <OrganisationStatusBadge actif={organisation.actif} />
                    <ContactHealthBadge organisation={organisation} />
                  </div>
                </td>
                <td className="hidden px-4 py-3 align-top text-anac-navy lg:table-cell">
                  <span className="font-semibold tabular-nums">{getActiveContactsCount(organisation)}</span>
                  <span className="text-anac-muted"> / {getTotalContactsCount(organisation)}</span>
                </td>
                <td className="hidden px-4 py-3 align-top lg:table-cell">
                  <Link
                    to={`/accords?partenaireId=${organisation.id}`}
                    className="font-semibold tabular-nums text-anac-blue hover:text-anac-navy"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {organisation.accordsCount ?? 0}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <ActionTooltip label="Voir le détail">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/partenaires/${organisation.id}`)}
                        aria-label={`Voir le détail de ${organisation.nom}`}
                      >
                        <Eye size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Modifier">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/partenaires/${organisation.id}/edit`)}
                        aria-label={`Modifier ${organisation.nom}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Gérer les contacts">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/partenaires/${organisation.id}?section=contacts`)}
                        aria-label={`Gérer les contacts de ${organisation.nom}`}
                      >
                        <Users size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Voir les accords">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/accords?partenaireId=${organisation.id}`)}
                        aria-label={`Voir les accords liés à ${organisation.nom}`}
                      >
                        <FileText size={14} aria-hidden="true" />
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

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onSort,
  className = '',
  children,
}: {
  field: SortField;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sortBy === field;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-anac-blue"
        aria-label={`Trier par ${children}`}
      >
        {children}
        {active ? (
          sortOrder === 'asc' ? (
            <ArrowUp size={13} aria-hidden="true" />
          ) : (
            <ArrowDown size={13} aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={13} className="opacity-40" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

export function PartenairesRegistryMobileCards({ organisations }: { organisations: Organisation[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {organisations.map((organisation) => {
        const principal = getPrincipalContact(organisation);
        return (
          <Link
            key={organisation.id}
            to={`/partenaires/${organisation.id}`}
            className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-anac-navy">{organisation.nom}</h3>
                <p className="mt-1 text-xs text-anac-muted">{getOrganisationTypeLabel(organisation.type)}</p>
              </div>
              <OrganisationStatusBadge actif={organisation.actif} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <span>
                <span className="block text-anac-muted">Pays</span>
                <span className="mt-1 inline-flex items-center gap-1.5 font-medium text-anac-navy">
                  <CountryMark country={organisation.pays} />
                  {organisation.pays}
                </span>
              </span>
              <span>
                <span className="block text-anac-muted">Contact principal</span>
                <span className="font-medium text-anac-navy">{formatContactName(principal)}</span>
              </span>
              <span>
                <span className="block text-anac-muted">Contacts</span>
                <span className="font-medium text-anac-navy">
                  {getActiveContactsCount(organisation)} actif{getActiveContactsCount(organisation) > 1 ? 's' : ''}
                </span>
              </span>
              <span>
                <span className="block text-anac-muted">Accords liés</span>
                <span className="font-medium text-anac-navy">{organisation.accordsCount ?? 0}</span>
              </span>
            </div>
            <div className="mt-3">
              <ContactHealthBadge organisation={organisation} />
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
