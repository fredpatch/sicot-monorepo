import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileText, History, Info, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/App';
import { courriersApi } from '@/lib/courriers.api';
import type { Courrier } from './courrier.types';
import { canManageCourriers } from './courrier.permissions';
import { formatCourrierDate } from './courrier.utils';
import { CourrierDetailHeader } from './components/CourrierDetailHeader';
import { CourrierSummaryStrip } from './components/CourrierSummaryStrip';
import { CourrierOverview } from './components/CourrierOverview';
import { CourrierDocumentSection } from './components/CourrierDocumentSection';
import { CourrierResponseSection } from './components/CourrierResponseSection';

const SECTIONS = [
  { key: 'overview', label: 'Aperçu', icon: Info },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'reponse', label: 'Réponse / Courriers liés', icon: RefreshCw },
  { key: 'historique', label: 'Historique', icon: History },
] as const;

export default function CourrierDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = canManageCourriers(user?.role);
  const { id } = useParams<{ id: string }>();
  const courrierId = id ? parseInt(id, 10) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(searchParams.get('section') ?? 'overview');

  useEffect(() => {
    const next = searchParams.get('section');
    if (next) setSection(next);
  }, [searchParams]);

  function chooseSection(next: string) {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('section', next);
    setSearchParams(params, { replace: true });
  }

  const courrierQuery = useQuery({
    queryKey: ['courrier', courrierId],
    queryFn: async () => {
      const res = await courriersApi.getById(courrierId!);
      return res.data as Courrier;
    },
    enabled: Boolean(courrierId),
  });

  const archiverMutation = useMutation({
    mutationFn: () => courriersApi.mettreAJour(courrierId!, { suiviStatut: 'archive' as const }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      queryClient.invalidateQueries({ queryKey: ['courriers'] });
      queryClient.invalidateQueries({ queryKey: ['courriers-aggregates'] });
    },
  });

  if (!courrierId) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Courrier introuvable.</p>
        <Link to="/courriers" className="mt-4 inline-block text-sm text-anac-blue hover:underline">
          Retour aux courriers
        </Link>
      </div>
    );
  }

  if (courrierQuery.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-anac-muted">
        <Loader2 size={17} className="mr-2 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (courrierQuery.isError || !courrierQuery.data) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold text-anac-navy">Impossible de charger ce courrier.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/courriers')} className="mt-4">
          Retour aux courriers
        </Button>
      </div>
    );
  }

  const courrier = courrierQuery.data;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <CourrierDetailHeader
        courrier={courrier}
        canManage={canManage}
        onEdit={() => navigate(`/courriers/${courrier.id}/edit`)}
        onRepondre={() => navigate(`/courriers/new?reponseAId=${courrier.id}`)}
        onArchiver={() => archiverMutation.mutate()}
        onRelancer={() => chooseSection('reponse')}
        archiverEnCours={archiverMutation.isPending}
      />

      <CourrierSummaryStrip courrier={courrier} />

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="card h-fit p-3" aria-label="Sections du courrier">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseSection(key)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-anac-sky ${
                section === key ? 'bg-blue-50 text-anac-blue' : 'text-anac-muted hover:bg-anac-gray'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <main>
          {section === 'overview' && <CourrierOverview courrier={courrier} />}
          {section === 'documents' && (
            <CourrierDocumentSection courrier={courrier} canManage={canManage} />
          )}
          {section === 'reponse' && (
            <CourrierResponseSection courrier={courrier} canManage={canManage} />
          )}

          {section === 'historique' && (
            <section className="card p-5">
              <h3 className="font-bold text-anac-navy">Historique</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-anac-border pb-2">
                  <dt className="text-anac-muted">Créé le</dt>
                  <dd className="font-medium text-anac-navy">{formatCourrierDate(courrier.createdAt, 'long')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-anac-muted">Dernière modification</dt>
                  <dd className="font-medium text-anac-navy">{formatCourrierDate(courrier.updatedAt, 'long')}</dd>
                </div>
              </dl>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
