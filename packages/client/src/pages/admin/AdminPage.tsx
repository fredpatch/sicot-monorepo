// packages/client/src/pages/admin/AdminPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Settings2 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/App';

import { AdminInfoBanner } from './components/AdminInfoBanner';
import { ParameterSection } from './components/ParameterSection';
import { AdminSystemOverview } from './components/AdminSystemOverview';
import { TranslationEngineStatusCard } from './components/TranslationEngineStatusCard';
import { GeminiUsageSection } from './components/GeminiUsageSection';
import { JobsList } from './components/JobsList';
import { JobHistoryTable } from './components/JobHistoryTable';
import { useParametresQuery, useJobsQuery, useMoteurStatusQuery, useGeminiUsageQuery } from './hooks/queries';
import { useMettreAJourParametreMutation } from './hooks/mutations';
import { canEditParameter } from './admin.permissions';
import { grouperParametresParSection } from './admin.utils';

type Onglet = 'parametres' | 'monitoring';
type SousOngletMonitoring = 'apercu' | 'jobs' | 'historique';

export default function AdminPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const onglet: Onglet = searchParams.get('tab') === 'monitoring' ? 'monitoring' : 'parametres';
  const sousOngletParam = searchParams.get('sub');
  const sousOnglet: SousOngletMonitoring =
    sousOngletParam === 'jobs' || sousOngletParam === 'historique' ? sousOngletParam : 'apercu';

  const [cleEnCours, setCleEnCours] = useState<string | null>(null);
  const [succesCle, setSuccesCle] = useState<string | null>(null);

  const { data: parametres, isLoading: parametresLoading } = useParametresQuery();
  const { data: jobs } = useJobsQuery();
  const { data: moteurStatus, isLoading: moteurLoading } = useMoteurStatusQuery();
  const { data: geminiUsage, isLoading: geminiLoading } = useGeminiUsageQuery();

  const mettreAJourMutation = useMettreAJourParametreMutation();
  const peutModifier = canEditParameter(user?.role);

  function handleSave(cle: string, valeur: string) {
    setCleEnCours(cle);
    mettreAJourMutation.mutate(
      { cle, valeur },
      {
        onSuccess: () => {
          setSuccesCle(cle);
          setTimeout(() => setSuccesCle(null), 2000);
        },
        onSettled: () => setCleEnCours(null),
      }
    );
  }

  function setOnglet(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', value);
      if (value !== 'monitoring') next.delete('sub');
      return next;
    });
  }

  function setSousOnglet(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sub', value);
      return next;
    });
  }

  const sections = grouperParametresParSection(parametres ?? []);

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-anac-navy/8">
          <Settings2 size={18} className="text-anac-navy" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-anac-navy">Administration</h2>
          <p className="mt-0.5 text-sm text-anac-muted">
            Paramètres système et monitoring des processus.
          </p>
        </div>
      </div>

      <Tabs value={onglet} onValueChange={setOnglet}>
        <TabsList>
          <TabsTrigger value="parametres">Paramètres</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring &amp; Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="parametres" className="space-y-6 pt-4">
          <AdminInfoBanner peutModifier={peutModifier} />

          {parametresLoading ? (
            <div className="flex items-center justify-center py-16 text-anac-muted">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Chargement...
            </div>
          ) : sections.length === 0 ? (
            <div className="py-16 text-center text-sm text-anac-muted">Aucun paramètre configuré.</div>
          ) : (
            sections.map((section) => (
              <ParameterSection
                key={section.label}
                label={section.label}
                parametres={section.parametres}
                peutModifier={peutModifier}
                cleEnCours={cleEnCours}
                succesCle={succesCle}
                saving={mettreAJourMutation.isPending}
                onSave={handleSave}
                deeplConfigure={moteurStatus?.deeplConfigure}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="pt-4">
          <Tabs value={sousOnglet} onValueChange={setSousOnglet}>
            <TabsList>
              <TabsTrigger value="apercu" className="px-2.5 py-1.5 text-xs">
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="jobs" className="px-2.5 py-1.5 text-xs">
                Jobs
              </TabsTrigger>
              <TabsTrigger value="historique" className="px-2.5 py-1.5 text-xs">
                Historique
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apercu" className="space-y-6 pt-4">
              <AdminSystemOverview
                parametresCount={parametres?.length}
                jobsCount={jobs?.length}
                moteurStatus={moteurStatus}
                geminiUsage={geminiUsage}
              />

              <TranslationEngineStatusCard status={moteurStatus} isLoading={moteurLoading} />

              <GeminiUsageSection data={geminiUsage} isLoading={geminiLoading} />
            </TabsContent>

            <TabsContent value="jobs" className="pt-4">
              <JobsList />
            </TabsContent>

            <TabsContent value="historique" className="pt-4">
              <JobHistoryTable jobs={jobs} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
