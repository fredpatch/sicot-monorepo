import { REGISTRE_JOBS, getJobParCle } from '@/jobs/registre.js';
import { logAudit } from '@/modules/auth/services/auth.service.js';

export interface JobResultat {
  cle: string;
  succes: boolean;
  resume: string;
  details?: Record<string, unknown>;
  erreur?: string;
  dureeMs: number;
}

// ── SERVICE : Lister les jobs disponibles ──────────────────────────────────
export function listerJobs() {
  return REGISTRE_JOBS.map((j) => ({
    cle: j.cle,
    label: j.label,
    description: j.description,
    module: j.module,
    roleMinimum: j.roleMinimum,
  }));
}

// ── SERVICE : Exécuter un job manuellement ─────────────────────────────────
export async function executerJobManuel(
  cle: string,
  userId: number,
  userRole: string
): Promise<JobResultat> {
  const job = getJobParCle(cle);
  if (!job) throw new Error('JOB_INTROUVABLE');

  if (job.roleMinimum === 'super_admin' && userRole !== 'super_admin') {
    throw new Error('ROLE_INSUFFISANT');
  }

  const debut = Date.now();

  try {
    const { resume, details } = await job.executer();
    const dureeMs = Date.now() - debut;

    await logAudit({
      userId,
      action: 'JOB_EXECUTE_MANUEL',
      module: job.module,
      details: { cle, resume, dureeMs },
    });

    return { cle, succes: true, resume, details, dureeMs };
  } catch (error) {
    const dureeMs = Date.now() - debut;
    const erreur = error instanceof Error ? error.message : 'Erreur inconnue';

    await logAudit({
      userId,
      action: 'JOB_ECHEC_MANUEL',
      module: job.module,
      details: { cle, erreur, dureeMs },
    });

    return { cle, succes: false, resume: "Échec de l'exécution.", erreur, dureeMs };
  }
}
