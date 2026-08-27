// packages/client/src/pages/demandes/components/RequestWorkspace.tsx
import { ArrowUpRight, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { UserRole } from '@sicot/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/App';
import type { DemandeStatut } from '@/lib/demandes.api';
import type { Demande } from '../requests.types';
import { formaterDate } from '../requests.utils';
import { BadgeStatut } from './StatusBadge';
import { RequestPriorityCell } from './PriorityBadge';
import { TraductionPreview } from './TraductionPreview';
import {
  canArchiveRequest,
  canOpenTranslation,
  canRecallRequest,
  canSubmitForReview,
  canTakeRequest,
  canValidatePriority,
  canValidateRequest,
} from '../requests.permissions';

const WORKFLOW_STATES: { statut: DemandeStatut; label: string }[] = [
  { statut: 'soumise', label: 'Soumise' },
  { statut: 'en_cours', label: 'En cours' },
  { statut: 'en_relecture', label: 'En relecture' },
  { statut: 'validee', label: 'Validée' },
  { statut: 'archivee', label: 'Archivée' },
];

interface RequestWorkspaceProps {
  demande: Demande | null;
  onOpenChange: (open: boolean) => void;
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

export function RequestWorkspace({
  demande,
  onOpenChange,
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
}: RequestWorkspaceProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!demande) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const currentIndex = WORKFLOW_STATES.findIndex((s) => s.statut === demande.statut);

  return (
    <Dialog open={!!demande} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demande #{demande.id}</DialogTitle>
          <DialogDescription>
            {demande.direction === 'fr_en' ? 'Français → Anglais' : 'Anglais → Français'} — Créée le{' '}
            {formaterDate(demande.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Tabs defaultValue="apercu">
            <TabsList>
              <TabsTrigger value="apercu">Aperçu</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="traduction">Traduction liée</TabsTrigger>
            </TabsList>

            <TabsContent value="apercu" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <SummaryField label="Statut">
                  <BadgeStatut statut={demande.statut} />
                </SummaryField>
                <SummaryField label="Direction">
                  <span className="text-sm font-medium text-anac-navy">
                    {demande.direction === 'fr_en' ? 'FR → EN' : 'EN → FR'}
                  </span>
                </SummaryField>
                <SummaryField label="Priorité">
                  <RequestPriorityCell demande={demande} />
                </SummaryField>
                <SummaryField label="Demandeur">
                  <span className="text-sm text-anac-navy">{demande.demandeurNom ?? '—'}</span>
                </SummaryField>
                <SummaryField label="Traducteur">
                  <span className="text-sm text-anac-navy">
                    {demande.traducteurNom ?? 'Non assignée'}
                  </span>
                </SummaryField>
                <SummaryField label="Créée le">
                  <span className="text-sm text-anac-navy">{formaterDate(demande.createdAt)}</span>
                </SummaryField>
              </div>

              <RequestWorkspaceActions
                demande={demande}
                user={user}
                navigate={navigate}
                onPrendreEnCharge={onPrendreEnCharge}
                prendreEnChargeEnCours={prendreEnChargeEnCours}
                onRappeler={onRappeler}
                onPasserEnRelecture={onPasserEnRelecture}
                passerEnRelectureEnCours={passerEnRelectureEnCours}
                onOuvrirValidationPriorite={onOuvrirValidationPriorite}
                onValider={onValider}
                validerEnCours={validerEnCours}
                onArchiver={onArchiver}
                archiverEnCours={archiverEnCours}
              />
            </TabsContent>

            <TabsContent value="source">
              {demande.documentNom ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-anac-muted">Document</p>
                  <p className="text-sm font-medium text-anac-navy">{demande.documentNom}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-anac-muted">Texte libre</p>
                  <p className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap text-sm text-anac-navy">
                    {demande.texteLibre || '—'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="workflow">
              <ol className="space-y-3">
                {WORKFLOW_STATES.map((state, index) => {
                  const reached = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  return (
                    <li key={state.statut} className="flex items-center gap-3">
                      {reached ? (
                        <CheckCircle2
                          size={16}
                          className={isCurrent ? 'text-anac-blue' : 'text-anac-success'}
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle size={16} className="text-anac-border" aria-hidden="true" />
                      )}
                      <span
                        className={
                          isCurrent
                            ? 'text-sm font-semibold text-anac-navy'
                            : reached
                              ? 'text-sm text-anac-navy'
                              : 'text-sm text-anac-muted'
                        }
                      >
                        {state.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </TabsContent>

            <TabsContent value="traduction">
              {demande.traductionId !== undefined ? (
                canOpenTranslation(demande, user) ? (
                  <div className="flex items-center justify-between rounded-lg border border-anac-border bg-anac-gray/40 p-4">
                    <div>
                      <p className="text-sm font-medium text-anac-navy">
                        Traduction associée #{demande.traductionId}
                      </p>
                      <p className="text-xs text-anac-muted">Production et correction du texte.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => navigate(`/traductions/${demande.traductionId}`)}
                      className="gap-2"
                    >
                      Ouvrir la traduction <ArrowUpRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <TraductionPreview traductionId={demande.traductionId} />
                )
              ) : (
                <p className="text-sm text-anac-muted">Aucune traduction associée pour le moment.</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-anac-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RequestWorkspaceActions({
  demande,
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
}: {
  demande: Demande;
  user: { id: number; role: UserRole } | null;
  navigate: ReturnType<typeof useNavigate>;
} & Omit<RequestWorkspaceProps, 'demande' | 'onOpenChange'>) {
  const buttons: React.ReactNode[] = [];

  if (canTakeRequest(demande, user)) {
    buttons.push(
      <Button
        key="prendre"
        type="button"
        onClick={() => onPrendreEnCharge(demande.id)}
        disabled={prendreEnChargeEnCours}
      >
        Prendre en charge
      </Button>
    );
  }
  if (canRecallRequest(demande, user)) {
    buttons.push(
      <Button
        key="rappeler"
        type="button"
        variant="outline"
        onClick={() => onRappeler(demande)}
        className="text-anac-danger"
      >
        Rappeler la demande
      </Button>
    );
  }
  if (canSubmitForReview(demande, user)) {
    buttons.push(
      <Button
        key="relecture"
        type="button"
        onClick={() => onPasserEnRelecture(demande.id)}
        disabled={passerEnRelectureEnCours}
      >
        Soumettre pour relecture
      </Button>
    );
  }
  if (canValidatePriority(demande, user)) {
    buttons.push(
      <Button
        key="priorite"
        type="button"
        variant="outline"
        onClick={() => onOuvrirValidationPriorite(demande)}
      >
        Valider la priorité
      </Button>
    );
  }
  if (canValidateRequest(demande, user)) {
    buttons.push(
      <Button key="valider" type="button" onClick={() => onValider(demande.id)} disabled={validerEnCours}>
        Valider
      </Button>
    );
  }
  if (canArchiveRequest(demande, user)) {
    buttons.push(
      <Button
        key="archiver"
        type="button"
        variant="outline"
        onClick={() => onArchiver(demande.id)}
        disabled={archiverEnCours}
      >
        Archiver
      </Button>
    );
  }
  if (canOpenTranslation(demande, user)) {
    buttons.push(
      <Button
        key="traduction"
        type="button"
        variant="secondary"
        onClick={() => navigate(`/traductions/${demande.traductionId}`)}
        className="gap-2"
      >
        Ouvrir la traduction <ArrowUpRight size={14} aria-hidden="true" />
      </Button>
    );
  }

  if (buttons.length === 0) return null;

  return <div className="flex flex-wrap gap-2 border-t border-anac-border pt-4">{buttons}</div>;
}
