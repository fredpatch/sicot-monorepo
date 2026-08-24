import { Eye, Pencil, RotateCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getPrimaryVariant, toGlossaryConceptViewModel } from '../glossary.adapters';
import type { Terme } from '../glossary.types';
import { formaterDate } from '../glossary.utils';
import { GlossaryStatusBadge } from './GlossaryStatusBadge';
import { LanguageVariantBadge } from './LanguageVariantBadge';

interface GlossaryRegistryTableProps {
  termes: Terme[];
  onVoir: (terme: Terme) => void;
  onModifier: (terme: Terme) => void;
  onDesactiver: (id: number) => void;
  desactiverEnCours: boolean;
  onReactiver: (id: number) => void;
  reactiverEnCours: boolean;
}

export function GlossaryRegistryTable({
  termes,
  onVoir,
  onModifier,
  onDesactiver,
  desactiverEnCours,
  onReactiver,
  reactiverEnCours,
}: GlossaryRegistryTableProps) {
  const confirm = useConfirm();

  return (
    <div className="card hidden overflow-hidden p-0 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-anac-border bg-anac-gray text-xs font-semibold text-anac-navy">
          <tr>
            <th className="px-4 py-3">Terme principal</th>
            <th className="px-4 py-3">Traductions disponibles</th>
            <th className="hidden px-4 py-3 lg:table-cell">Domaine</th>
            <th className="px-4 py-3">Statut</th>
            <th className="hidden px-4 py-3 xl:table-cell">Dernière mise à jour</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-anac-border">
          {termes.map((terme) => {
            const concept = toGlossaryConceptViewModel(terme);
            const primaire = getPrimaryVariant(concept);
            return (
              <tr
                key={terme.id}
                className="cursor-pointer transition-colors hover:bg-anac-gray/60"
                onClick={() => onVoir(terme)}
              >
                <td className="max-w-[220px] px-4 py-3 align-top">
                  <p className="truncate font-medium text-anac-navy">{primaire.value}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    {concept.variants.map((variant) => (
                      <LanguageVariantBadge key={variant.language} variant={variant} />
                    ))}
                  </div>
                </td>
                <td className="hidden px-4 py-3 align-top lg:table-cell">
                  {terme.domaine ? (
                    <span className="inline-flex rounded-md border border-anac-border bg-anac-gray px-2 py-0.5 text-xs font-medium text-anac-navy">
                      {terme.domaine}
                    </span>
                  ) : (
                    <span className="text-xs text-anac-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <GlossaryStatusBadge actif={terme.actif} />
                </td>
                <td className="hidden px-4 py-3 align-top text-xs text-anac-muted xl:table-cell">
                  {formaterDate(terme.updatedAt)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <ActionTooltip label="Voir">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onVoir(terme)}
                        aria-label={`Voir le terme ${primaire.value}`}
                      >
                        <Eye size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label="Modifier">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onModifier(terme)}
                        aria-label={`Modifier le terme ${primaire.value}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </Button>
                    </ActionTooltip>
                    {terme.actif ? (
                      <ActionTooltip label="Désactiver">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Désactiver ce terme ?',
                              description: `« ${primaire.value} » ne sera plus proposé dans les suggestions de traduction.`,
                              confirmLabel: 'Désactiver',
                              variant: 'destructive',
                            });
                            if (ok) onDesactiver(terme.id);
                          }}
                          disabled={desactiverEnCours}
                          aria-label={`Désactiver le terme ${primaire.value}`}
                          className="hover:text-anac-danger"
                        >
                          <XCircle size={14} aria-hidden="true" />
                        </Button>
                      </ActionTooltip>
                    ) : (
                      <ActionTooltip label="Réactiver">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onReactiver(terme.id)}
                          disabled={reactiverEnCours}
                          aria-label={`Réactiver le terme ${primaire.value}`}
                        >
                          <RotateCw size={14} aria-hidden="true" />
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

export function GlossaryRegistryMobileCards({
  termes,
  onVoir,
  onReactiver,
  reactiverEnCours,
}: {
  termes: Terme[];
  onVoir: (terme: Terme) => void;
  onReactiver: (id: number) => void;
  reactiverEnCours: boolean;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {termes.map((terme) => {
        const concept = toGlossaryConceptViewModel(terme);
        const primaire = getPrimaryVariant(concept);
        return (
          <button
            type="button"
            key={terme.id}
            onClick={() => onVoir(terme)}
            className="card block w-full p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-anac-sky"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="truncate text-sm font-medium text-anac-navy">{primaire.value}</p>
              <GlossaryStatusBadge actif={terme.actif} />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {concept.variants.map((variant) => (
                <LanguageVariantBadge key={variant.language} variant={variant} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              {terme.domaine ? (
                <span className="inline-flex rounded-md border border-anac-border bg-anac-gray px-2 py-0.5 text-xs font-medium text-anac-navy">
                  {terme.domaine}
                </span>
              ) : (
                <span className="text-xs text-anac-muted">—</span>
              )}
              <span className="text-xs text-anac-muted">{formaterDate(terme.updatedAt)}</span>
            </div>
            {!terme.actif && (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onReactiver(terme.id);
                  }}
                  disabled={reactiverEnCours}
                  className="gap-1.5"
                >
                  <RotateCw size={13} aria-hidden="true" /> Réactiver
                </Button>
              </div>
            )}
          </button>
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
