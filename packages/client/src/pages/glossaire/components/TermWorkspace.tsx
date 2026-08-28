// packages/client/src/pages/glossaire/components/TermWorkspace.tsx
import { Loader2, Pencil, RotateCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getPrimaryVariant, toGlossaryConceptViewModel } from '../glossary.adapters';
import type { Terme } from '../glossary.types';
import { formaterDate } from '../glossary.utils';
import { GlossaryStatusBadge } from './GlossaryStatusBadge';
import { LanguageVariantBadge } from './LanguageVariantBadge';

interface TermWorkspaceProps {
  terme: Terme | null;
  termeDetail?: Terme;
  detailLoading: boolean;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onModifier: (terme: Terme) => void;
  onDesactiver: (id: number) => void;
  desactiverEnCours: boolean;
  onReactiver: (id: number) => void;
  reactiverEnCours: boolean;
}

export function TermWorkspace({
  terme,
  termeDetail,
  detailLoading,
  canManage,
  onOpenChange,
  onModifier,
  onDesactiver,
  desactiverEnCours,
  onReactiver,
  reactiverEnCours,
}: TermWorkspaceProps) {
  const confirm = useConfirm();

  if (!terme) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const concept = toGlossaryConceptViewModel(terme);
  const primaire = getPrimaryVariant(concept);

  return (
    <Dialog open={!!terme} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-base">{primaire.value}</DialogTitle>
              <DialogDescription>Fiche terminologique du concept.</DialogDescription>
            </div>
            <GlossaryStatusBadge actif={terme.actif} />
          </div>
        </DialogHeader>

        <DialogBody className="max-h-[65vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex min-h-[160px] items-center justify-center text-anac-muted">
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
              Chargement...
            </div>
          ) : (
            <Tabs defaultValue="traductions">
              <TabsList variant="line">
                <TabsTrigger value="traductions">Traductions</TabsTrigger>
                <TabsTrigger value="contexte">Contexte d&apos;utilisation</TabsTrigger>
                <TabsTrigger value="informations">Informations</TabsTrigger>
                <TabsTrigger value="historique">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="traductions">
                <p className="mb-2 text-xs font-medium text-anac-muted">Traductions du terme</p>
                <div className="space-y-2 rounded-lg border border-anac-border p-3">
                  {concept.variants.map((variant) => (
                    <LanguageVariantBadge key={variant.language} variant={variant} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contexte">
                {terme.contexte ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-anac-text">
                    {terme.contexte}
                  </p>
                ) : (
                  <p className="text-sm text-anac-muted">Aucun contexte renseigné pour ce terme.</p>
                )}
              </TabsContent>

              <TabsContent value="informations">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-anac-muted">Domaine</dt>
                    <dd className="mt-0.5 text-anac-text">{terme.domaine ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-anac-muted">Statut</dt>
                    <dd className="mt-0.5">
                      <GlossaryStatusBadge actif={terme.actif} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-anac-muted">Créé le</dt>
                    <dd className="mt-0.5 text-anac-text">{formaterDate(terme.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-anac-muted">Dernière mise à jour</dt>
                    <dd className="mt-0.5 text-anac-text">{formaterDate(terme.updatedAt)}</dd>
                  </div>
                </dl>
              </TabsContent>

              <TabsContent value="historique">
                {!termeDetail?.historique || termeDetail.historique.length === 0 ? (
                  <p className="py-6 text-center text-sm text-anac-muted">
                    Aucune modification enregistrée.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {termeDetail.historique.map((h) => (
                      <div key={h.id} className="rounded-lg border border-anac-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-anac-navy">
                            {h.modifieParNom ?? 'Système'}
                          </span>
                          <span className="text-xs text-anac-muted">
                            {formaterDate(h.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-anac-muted">
                              Ancien FR
                            </p>
                            <p className="text-sm text-anac-text">{h.ancienTermeFr ?? '-'}</p>
                          </div>
                          <div>
                            <p className="mb-0.5 text-[10px] uppercase tracking-wide text-anac-muted">
                              Ancien EN
                            </p>
                            <p className="text-sm text-anac-text">{h.ancienTermeEn ?? '-'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogBody>

        {canManage && (
          <div className="flex items-center justify-end gap-2.5 border-t border-anac-border px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onModifier(terme)}
              className="gap-2"
            >
              <Pencil size={13} aria-hidden="true" /> Modifier
            </Button>
            {terme.actif ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2 text-anac-danger hover:text-anac-danger"
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
              >
                <XCircle size={13} aria-hidden="true" /> Désactiver
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => onReactiver(terme.id)}
                disabled={reactiverEnCours}
              >
                <RotateCw size={13} aria-hidden="true" /> Réactiver
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
