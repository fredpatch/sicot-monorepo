import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/lib/dashboard.api';
import { useAuth } from '@/App';
import { DashboardHeader } from './components/DashboardHeader';
import { NextDeadlineCard } from './components/NextDeadlineCard';
import { OperationalKpiGrid } from './components/OperationalKpiGrid';
import { PrioritySection } from './components/PrioritySection';
import { QuickActionsCard } from './components/QuickActionsCard';
import { RecentActivityList } from './components/RecentActivityList';
import { TranslationWorkloadChart } from './components/TranslationWorkloadChart';
import { WorkflowHealthCard } from './components/WorkflowHealthCard';
import type { DashboardData } from './dashboard.types';
import { deriveNextDeadline, derivePriorities } from './dashboard.utils';

function DashboardLoadingState() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
      <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
      Chargement...
    </div>
  );
}

function DashboardErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-anac-danger">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-anac-navy">Tableau de bord indisponible</h2>
        <p className="mt-1 text-sm text-anac-muted">
          Les données opérationnelles n&apos;ont pas pu être chargées.
        </p>
      </div>
      <Button type="button" onClick={onRetry} disabled={retrying} className="bg-anac-navy">
        {retrying && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        Réessayer
      </Button>
    </div>
  );
}

function DashboardEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h2 className="text-lg font-bold text-anac-navy">Aucune donnée disponible</h2>
      <p className="mt-1 text-sm text-anac-muted">
        Le tableau de bord ne contient pas encore d&apos;activité à afficher.
      </p>
      <Button type="button" onClick={onRefresh} variant="outline" className="mt-4">
        Actualiser
      </Button>
    </div>
  );
}

function hasDashboardData(data: DashboardData) {
  return Boolean(
    data.kpi ||
      data.accordsExpirant?.length ||
      data.accordsExpires?.length ||
      data.couriersSansReponse?.length ||
      data.recommandationsEnAttente?.length ||
      data.traductionsParMois?.length ||
      data.demandesParStatut?.length ||
      data.activiteRecente?.length
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await dashboardApi.getData();
      setUpdatedAt(new Date());
      return res.data as DashboardData;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const priorities = useMemo(() => (data ? derivePriorities(data) : []), [data]);
  const nextDeadline = useMemo(() => (data ? deriveNextDeadline(data) : null), [data]);

  if (isLoading) return <DashboardLoadingState />;

  if (isError) {
    return <DashboardErrorState onRetry={() => refetch()} retrying={isFetching} />;
  }

  if (!data || !hasDashboardData(data)) {
    return <DashboardEmptyState onRefresh={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <DashboardHeader
        firstName={user?.prenom}
        updatedAt={updatedAt}
        refreshing={isFetching}
        onRefresh={() => refetch()}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <PrioritySection priorities={priorities} />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <QuickActionsCard role={user?.role} />
          <NextDeadlineCard deadline={nextDeadline} />
        </div>
      </div>

      <OperationalKpiGrid data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <WorkflowHealthCard data={data} />
        <TranslationWorkloadChart data={data.traductionsParMois ?? []} />
      </div>

      <RecentActivityList activities={data.activiteRecente ?? []} />
    </div>
  );
}
