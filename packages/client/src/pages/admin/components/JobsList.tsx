// packages/client/src/pages/admin/components/JobsList.tsx
import { useMemo, useState } from 'react';
import { ChevronDown, Zap } from 'lucide-react';

import { useAuth } from '@/App';
import { getModuleLabel } from '../admin.constants';
import { useJobsQuery } from '../hooks/queries';
import { useExecuterJobMutation } from '../hooks/mutations';
import { JobRow } from './JobRow';
import type { JobDisponible, JobResultat } from '../admin.types';

// Résultats d'exécution gardés en état local (pas de persistance serveur -
// l'historique persistant vit dans JobHistoryTable/job_executions). Disparaît
// au rechargement, volontairement - ne pas laisser croire à un historique
// permanent sur cette vue.
export function JobsList() {
  const { user } = useAuth();
  const { data: jobs } = useJobsQuery();
  const executerMutation = useExecuterJobMutation();

  const [resultats, setResultats] = useState<Record<string, JobResultat>>({});
  const [jobEnCours, setJobEnCours] = useState<string | null>(null);
  // Repliés par défaut - 12 jobs à plat forçaient une lecture linéaire ;
  // regroupés par module, un administrateur ouvre seulement ce qu'il cherche.
  const [modulesOuverts, setModulesOuverts] = useState<Set<string>>(new Set());

  const groupes = useMemo(() => {
    const parModule = new Map<string, JobDisponible[]>();
    for (const job of jobs ?? []) {
      const liste = parModule.get(job.module) ?? [];
      liste.push(job);
      parModule.set(job.module, liste);
    }
    return Array.from(parModule.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [jobs]);

  function toggleModule(module: string) {
    setModulesOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function handleExecuter(cle: string) {
    setJobEnCours(cle);
    executerMutation.mutate(cle, {
      onSuccess: (res) => {
        setResultats((prev) => ({ ...prev, [cle]: res.data as JobResultat }));
      },
      onError: (err: unknown) => {
        const data = (err as { response?: { data?: JobResultat } })?.response?.data;
        setResultats((prev) => ({
          ...prev,
          [cle]: data ?? {
            cle,
            succes: false,
            resume: 'Erreur',
            erreur: 'Erreur inconnue',
            dureeMs: 0,
          },
        }));
      },
      onSettled: () => setJobEnCours(null),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Zap size={12} className="text-anac-muted" />
        <p className="text-xs font-semibold uppercase tracking-wide text-anac-muted">
          Jobs manuels
        </p>
      </div>
      <p className="px-1 text-xs text-anac-muted">
        Déclenche immédiatement un job normalement programmé en cron. Chaque exécution est
        enregistrée dans le Journal d&apos;audit et dans l&apos;historique ci-contre.
      </p>

      <div className="space-y-2">
        {groupes.map(([module, jobsDuModule]) => {
          const ouvert = modulesOuverts.has(module);
          const resultatsDuModule = jobsDuModule.filter((j) => resultats[j.cle]).length;

          return (
            <div key={module} className="card overflow-hidden p-0">
              <button
                type="button"
                onClick={() => toggleModule(module)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-anac-gray/60"
                aria-expanded={ouvert}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-anac-navy">
                    {getModuleLabel(module)}
                  </span>
                  <span className="badge-neutre text-[10px]">{jobsDuModule.length} job(s)</span>
                  {resultatsDuModule > 0 && (
                    <span className="text-[10px] text-anac-muted">
                      {resultatsDuModule} exécuté(s) cette session
                    </span>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-anac-muted transition-transform ${ouvert ? 'rotate-180' : ''}`}
                />
              </button>

              {ouvert && (
                <div className="divide-y divide-anac-border/60 border-t border-anac-border">
                  {jobsDuModule.map((job) => (
                    <JobRow
                      key={job.cle}
                      job={job}
                      role={user?.role}
                      enCours={jobEnCours === job.cle}
                      resultat={resultats[job.cle]}
                      onExecuter={handleExecuter}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
