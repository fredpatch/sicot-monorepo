import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send } from 'lucide-react';

import ModalRelance from '@/components/ModalRelance';
import HistoriqueNotifications from '@/pages/HistoriqueNotifications';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { missionsApi, type RecommandationStatut } from '@/lib/missions.api';
import { useAuth } from '@/App';
import { RECOMMANDATION_STATUS_LABELS } from '../mission.constants';
import type { Mission, RecommandationView } from '../mission.types';
import { isRecommendationOverdue } from '../mission.utils';
import type { RecommandationFormData } from '../mission.schemas';
import { canManageRecommendations } from '../missions.permissions';
import { RecommendationDialog } from './RecommendationDialog';

type RecFilter = 'toutes' | 'a_traiter' | 'depassees' | 'realisees';

export function MissionRecommendationsSection({ mission }: { mission: Mission }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<RecFilter>('toutes');
  const [relanceRec, setRelanceRec] = useState<RecommandationView | null>(null);
  const peutGerer = canManageRecommendations(user);

  const recommandations = useMemo(() => mission.recommandations ?? [], [mission.recommandations]);

  const addMutation = useMutation({
    mutationFn: (data: RecommandationFormData) => missionsApi.ajouterRecommandation(mission.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', mission.id] });
      setDialogOpen(false);
    },
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: RecommandationStatut }) =>
      missionsApi.mettreAJourRecommandation(id, { statut }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mission', mission.id] }),
  });

  const overdueCount = useMemo(
    () => recommandations.filter((rec) => isRecommendationOverdue(rec)).length,
    [recommandations]
  );
  const pendingCount = recommandations.filter((rec) => rec.statut !== 'realisee').length;

  const sorted = useMemo(() => {
    function rank(rec: RecommandationView) {
      if (isRecommendationOverdue(rec)) return 0;
      if (rec.statut === 'en_attente' && rec.dateLimite) return 1;
      if (rec.statut === 'en_cours') return 2;
      if (rec.statut !== 'realisee') return 3;
      return 4;
    }
    return [...recommandations].sort((a, b) => rank(a) - rank(b));
  }, [recommandations]);

  const filtered = sorted.filter((rec) => {
    if (filter === 'a_traiter') return rec.statut !== 'realisee';
    if (filter === 'depassees') return isRecommendationOverdue(rec);
    if (filter === 'realisees') return rec.statut === 'realisee';
    return true;
  });

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-anac-navy">
            {recommandations.length} recommandation{recommandations.length > 1 ? 's' : ''}
          </h3>
          <p className="mt-1 text-sm text-anac-muted">
            {pendingCount} en cours{overdueCount > 0 ? ` · ${overdueCount} dépassée${overdueCount > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        {peutGerer && (
          <Button type="button" onClick={() => setDialogOpen(true)} disabled={mission.statut === 'annulee'} className="gap-2 bg-anac-blue">
            <Plus size={14} aria-hidden="true" />
            Ajouter
          </Button>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-b border-anac-border pb-3">
        {(
          [
            { key: 'toutes', label: 'Toutes' },
            { key: 'a_traiter', label: 'À traiter' },
            { key: 'depassees', label: 'Dépassées' },
            { key: 'realisees', label: 'Réalisées' },
          ] as { key: RecFilter; label: string }[]
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === option.key ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-anac-muted">Aucune recommandation dans cette catégorie.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((rec) => {
            const overdue = isRecommendationOverdue(rec);
            return (
              <div key={rec.id} className="rounded-md border border-anac-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm ${rec.statut === 'realisee' ? 'text-anac-muted line-through' : 'text-anac-navy'}`}>
                    {rec.texte}
                  </p>
                  {peutGerer ? (
                    <Select
                      value={rec.statut}
                      onValueChange={(value) => statutMutation.mutate({ id: rec.id, statut: value as RecommandationStatut })}
                    >
                      <SelectTrigger className="h-8 w-36 shrink-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(RECOMMANDATION_STATUS_LABELS) as [RecommandationStatut, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-anac-muted">
                      {RECOMMANDATION_STATUS_LABELS[rec.statut]}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-anac-muted">
                  <span>
                    {rec.responsable ? `${rec.responsable.prenom} ${rec.responsable.nom}` : 'Non assigné'}
                    {rec.dateLimite && (
                      <span className={overdue ? 'ml-2 font-semibold text-anac-danger' : 'ml-2'}>
                        {overdue ? '⚠ Dépassée le ' : "Échéance : "}
                        {new Date(rec.dateLimite).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </span>
                  {rec.statut !== 'realisee' && peutGerer && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRelanceRec(rec)}
                      className="h-7 gap-1.5 text-anac-blue"
                    >
                      <Send size={12} aria-hidden="true" />
                      Relancer
                    </Button>
                  )}
                </div>
                <div className="mt-2">
                  <HistoriqueNotifications type="recommandation_rappel" entiteId={rec.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecommendationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => addMutation.mutate(data)}
        submitting={addMutation.isPending}
      />

      {relanceRec && (
        <ModalRelance
          open
          onClose={() => setRelanceRec(null)}
          type="recommandation_rappel"
          entiteId={relanceRec.id}
          objetParDefaut={`Rappel - Recommandation mission "${mission.titre}"`}
          messageParDefaut={`La recommandation "${relanceRec.texte}" nécessite votre attention.${
            relanceRec.dateLimite
              ? ` Échéance : ${new Date(relanceRec.dateLimite).toLocaleDateString('fr-FR')}.`
              : ''
          }`}
          destinatairesSuggeres={
            relanceRec.responsable?.email
              ? [
                  {
                    label: `${relanceRec.responsable.prenom} ${relanceRec.responsable.nom}`,
                    email: relanceRec.responsable.email,
                    nom: `${relanceRec.responsable.prenom} ${relanceRec.responsable.nom}`,
                  },
                ]
              : []
          }
        />
      )}
    </section>
  );
}
