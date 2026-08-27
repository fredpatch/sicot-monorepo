// packages/client/src/pages/admin/components/JobRow.tsx
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { canRunJob } from '../admin.permissions';
import type { JobDisponible, JobResultat } from '../admin.types';

interface JobRowProps {
  job: JobDisponible;
  role: string | undefined;
  enCours: boolean;
  resultat?: JobResultat;
  onExecuter: (cle: string) => void;
}

export function JobRow({ job, role, enCours, resultat, onExecuter }: JobRowProps) {
  const confirm = useConfirm();
  const autorise = canRunJob(role, job);

  async function handleClick() {
    const ok = await confirm({
      title: `Lancer « ${job.label} » ?`,
      description: `${job.description} Cette action sera enregistrée dans le Journal d'audit.`,
      confirmLabel: 'Lancer',
      variant: job.roleMinimum === 'super_admin' ? 'destructive' : 'default',
    });
    if (ok) onExecuter(job.cle);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-anac-navy">{job.label}</p>
          <p className="mt-0.5 text-xs text-anac-muted">{job.description}</p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleClick}
          disabled={enCours || !autorise}
          className="shrink-0 gap-1.5"
        >
          {!autorise ? (
            <span className="text-xs text-anac-muted">Réservé Super Admin</span>
          ) : enCours ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Exécution...
            </>
          ) : (
            <>
              <Play size={12} /> Lancer
            </>
          )}
        </Button>
      </div>

      {resultat && (
        <div
          className={`mt-2.5 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
            resultat.succes ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {resultat.succes ? (
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={13} className="mt-0.5 shrink-0" />
          )}
          <span>
            {resultat.resume}
            {resultat.erreur && ` — ${resultat.erreur}`}
            <span className="ml-1.5 text-anac-muted">({resultat.dureeMs}ms)</span>
          </span>
        </div>
      )}
    </div>
  );
}
