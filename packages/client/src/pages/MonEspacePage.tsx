// packages/client/src/pages/MonEspacePage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { demandesApi, type DemandesAggregates } from '@/lib/demandes.api';
import { missionsApi } from '@/lib/missions.api';
import type { MissionsAggregates } from './missions/mission.types';
import { WorkspaceSummaryCards } from './mon-espace/components/WorkspaceSummaryCards';
import { MyRequestsPanel } from './mon-espace/components/MyRequestsPanel';
import { MyMissionsPanel } from './mon-espace/components/MyMissionsPanel';
import { WorkspaceFooterCards } from './mon-espace/components/WorkspaceFooterCards';
import { NouvelleDemandeDialog } from './demandes/components/NewRequestDialog';
import { useDemandesMutations } from './demandes/hooks/mutations';

export default function MonEspacePage() {
  const { user } = useAuth();
  const [modalNouvelle, setModalNouvelle] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

  const demandesAggregatesQuery = useQuery({
    queryKey: ['demandes-aggregates', { demandeurId: user?.id }],
    queryFn: async () => {
      const res = await demandesApi.aggregates({ demandeurId: user!.id });
      return res.data as DemandesAggregates;
    },
    enabled: !!user,
  });

  const missionsAggregatesQuery = useQuery({
    queryKey: ['missions-aggregates', { participantId: user?.id }],
    queryFn: async () => {
      const res = await missionsApi.aggregates({ participantId: user!.id });
      return res.data as MissionsAggregates;
    },
    enabled: !!user,
  });

  const { creerMutation } = useDemandesMutations({
    onDemandeCreee: () => {
      setModalNouvelle(false);
      setErreurCreation(null);
    },
    onCreationErreur: setErreurCreation,
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header>
        <h2 className="text-2xl font-bold leading-tight text-anac-navy">Mon espace</h2>
        <p className="mt-1 text-sm text-anac-muted">
          Bonjour {user.prenom ?? user.nom}, voici votre espace de travail.
        </p>
      </header>

      <WorkspaceSummaryCards
        demandes={demandesAggregatesQuery.data}
        missions={missionsAggregatesQuery.data}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <MyRequestsPanel demandeurId={user.id} />
          <WorkspaceFooterCards />
        </div>

        <div className="space-y-5">
          <div className="card bg-anac-blue p-5 text-white">
            <span className="inline-flex rounded-md bg-white/15 p-2">
              <FilePlus2 size={18} aria-hidden="true" />
            </span>

            <h3 className="mt-3 text-base font-bold">Nouvelle demande</h3>
            <p className="mt-1 text-xs text-white/80">
              Soumettez un document OCR ou un texte libre pour traduction.
            </p>
            <Button
              type="button"
              onClick={() => setModalNouvelle(true)}
              className="mt-4 gap-2 bg-white text-anac-blue hover:bg-white/90"
            >
              {/* <Plus size={14} aria-hidden="true" />  */}
              Créer une demande <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>

          <MyMissionsPanel participantId={user.id} />
        </div>
      </div>

      <NouvelleDemandeDialog
        open={modalNouvelle}
        onOpenChange={(open) => {
          setModalNouvelle(open);
          if (!open) setErreurCreation(null);
        }}
        onSubmit={(data) => creerMutation.mutate(data)}
        chargement={creerMutation.isPending}
        erreur={erreurCreation}
      />
    </div>
  );
}
