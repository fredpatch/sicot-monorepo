import { Eye, Globe2, Pencil, RefreshCw, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { Accord } from '../accord.types';
import {
  formatAccordDate,
  getPartnerCountries,
  formatPartnersSummary,
  isRenewable,
} from '../accord.utils';
import { AccordExpiryBadge } from './AccordExpiryBadge';
import { AccordStatusBadge } from './AccordStatusBadge';

export function AccordRegistryTable({
  accords,
  canManage,
}: {
  accords: Accord[];
  canManage: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Référence</th>
            <th className="px-4 py-3">Intitulé</th>
            <th className="px-4 py-3">Partenaire</th>
            <th className="hidden px-4 py-3 lg:table-cell">Pays</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 xl:table-cell">Date signature</th>
            <th className="px-4 py-3">Échéance</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {accords.map((accord) => (
            <tr
              key={accord.id}
              className="cursor-pointer transition-colors hover:bg-anac-gray/60"
              onClick={() => navigate(`/accords/${accord.id}`)}
            >
              <td className="px-4 py-3 align-top font-mono text-xs font-semibold text-anac-blue">
                {accord.reference}
              </td>
              <td className="max-w-[340px] px-4 py-3 align-top">
                <div className="font-semibold text-anac-navy">{accord.titre}</div>
                {accord.parentId && (
                  <div className="mt-1 text-xs text-anac-muted">Version renouvelée</div>
                )}
              </td>
              <td className="px-4 py-3 align-top text-anac-navy">
                <span title={accord.partenaires.map((partner) => partner.nom).join(', ')}>
                  {formatPartnersSummary(accord.partenaires)}
                </span>
              </td>
              <td className="hidden px-4 py-3 align-top text-anac-muted lg:table-cell">
                <CountryList accord={accord} />
              </td>
              <td className="px-4 py-3 align-top">
                <AccordStatusBadge statut={accord.statut} />
              </td>
              <td className="hidden px-4 py-3 align-top text-anac-muted xl:table-cell">
                {formatAccordDate(accord.dateSignature)}
              </td>
              <td className="px-4 py-3 align-top">
                <AccordExpiryBadge accord={accord} />
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                  <ActionTooltip label="Voir le détail">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => navigate(`/accords/${accord.id}`)}
                      aria-label={`Voir le détail de ${accord.reference}`}
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
                          onClick={() => navigate(`/accords/${accord.id}/edit`)}
                          aria-label={`Modifier ${accord.reference}`}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
                      {isRenewable(accord) && (
                        <ActionTooltip label="Renouveler">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/accords/${accord.id}?action=renew`)}
                            aria-label={`Renouveler ${accord.reference}`}
                          >
                            <RefreshCw size={14} aria-hidden="true" />
                          </Button>
                        </ActionTooltip>
                      )}
                      <ActionTooltip label="Préparer une relance">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => navigate(`/accords/${accord.id}?section=notifications`)}
                          aria-label={`Préparer une relance pour ${accord.reference}`}
                        >
                          <Send size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
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

export function AccordRegistryMobileCards({ accords }: { accords: Accord[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {accords.map((accord) => (
        <Link
          key={accord.id}
          to={`/accords/${accord.id}`}
          className="card block p-4 outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-anac-blue">{accord.reference}</p>
              <h3 className="mt-1 font-semibold leading-snug text-anac-navy">{accord.titre}</h3>
            </div>
            <AccordStatusBadge statut={accord.statut} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <span>
              <span className="block text-anac-muted">Partenaire</span>
              <span className="font-medium text-anac-navy">
                {formatPartnersSummary(accord.partenaires)}
              </span>
              <span className="mt-0.5 block text-anac-muted">
                <CountryList accord={accord} />
              </span>
            </span>
            <span>
              <span className="block text-anac-muted">Échéance</span>
              <AccordExpiryBadge accord={accord} showDate={false} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CountryList({ accord }: { accord: Accord }) {
  const countries = getPartnerCountries(accord.partenaires);
  if (countries.length === 0) return <>-</>;

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {countries.map((country) => (
        <span key={country} className="inline-flex min-w-0 items-center gap-1.5">
          <CountryFlag country={country} />
          <span className="truncate">{country}</span>
        </span>
      ))}
    </span>
  );
}

function CountryFlag({ country }: { country: string }) {
  const flag = getFlagMark(country);

  if (!flag) {
    return (
      <span
        className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[2px] border border-anac-border bg-white text-anac-muted"
        title={country}
        aria-label={`Pays : ${country}`}
      >
        <Globe2 size={10} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.25)]"
      style={{ background: flag.background }}
      title={country}
      aria-label={`Pays : ${country}`}
    >
      {flag.symbol === 'dot' && (
        <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300" />
      )}
      {flag.symbol === 'cross' && (
        <>
          <span className="absolute left-[8px] top-0 h-full w-[3px] bg-white" />
          <span className="absolute left-0 top-[5px] h-[3px] w-full bg-white" />
        </>
      )}
      {flag.symbol === 'canada' && (
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-red-600" />
      )}
    </span>
  );
}

function getFlagMark(country: string) {
  const normalized = country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const flags: Record<string, { background: string; symbol?: 'dot' | 'cross' | 'canada' }> = {
    allemagne: { background: 'linear-gradient(#000 0 33%, #dd0000 33% 66%, #ffce00 66%)' },
    belgique: { background: 'linear-gradient(90deg, #000 0 33%, #ffd90c 33% 66%, #ef3340 66%)' },
    cameroun: { background: 'linear-gradient(90deg, #007a5e 0 33%, #ce1126 33% 66%, #fcd116 66%)', symbol: 'dot' },
    canada: { background: 'linear-gradient(90deg, #d80621 0 25%, #fff 25% 75%, #d80621 75%)', symbol: 'canada' },
    chine: { background: '#de2910', symbol: 'dot' },
    'cote d ivoire': { background: 'linear-gradient(90deg, #f77f00 0 33%, #fff 33% 66%, #009e60 66%)' },
    espagne: { background: 'linear-gradient(#aa151b 0 25%, #f1bf00 25% 75%, #aa151b 75%)' },
    'etats-unis': { background: 'linear-gradient(#b22234 0 14%, #fff 14% 28%, #b22234 28% 42%, #fff 42% 56%, #b22234 56% 70%, #fff 70% 84%, #b22234 84%)' },
    'etats unis': { background: 'linear-gradient(#b22234 0 14%, #fff 14% 28%, #b22234 28% 42%, #fff 42% 56%, #b22234 56% 70%, #fff 70% 84%, #b22234 84%)' },
    france: { background: 'linear-gradient(90deg, #002395 0 33%, #fff 33% 66%, #ed2939 66%)' },
    gabon: { background: 'linear-gradient(#009e60 0 33%, #fcd116 33% 66%, #3a75c4 66%)' },
    maroc: { background: '#c1272d', symbol: 'dot' },
    senegal: { background: 'linear-gradient(90deg, #00853f 0 33%, #fdef42 33% 66%, #e31b23 66%)', symbol: 'dot' },
    suisse: { background: '#d52b1e', symbol: 'cross' },
  };

  return flags[normalized];
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
