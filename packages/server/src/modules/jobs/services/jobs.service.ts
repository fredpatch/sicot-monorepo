import { REGISTRE_JOBS, getJobParCle } from '@/jobs/registre.js';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { enregistrerExecutionJob, listerExecutionsJobs } from './job-executions.service.js';
import type { JobExecutionFilters } from './job-executions.service.js';
import { hasCapability, UserRole } from '@sicot/shared';

export { listerExecutionsJobs };
export type { JobExecutionFilters };

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
    executionCapability: j.executionCapability,
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

  // Autorisation directe via la capacité requise par CE job - distincte de
  // la garde JOB_EXECUTE au niveau route (voir jobs.route.ts), qui ne fait
  // que vérifier l'accès général à l'écran Jobs. Un job ordinaire exige
  // JOB_EXECUTE (déjà garanti par la route) ; un job à haut risque exige en
  // plus SYSTEM_ADMIN_OPERATION - plus aucune comparaison de rôle brute ni
  // de champ roleMinimum ici (Phase 4.8.3 contract cleanup).
  if (!hasCapability(userRole as UserRole, job.executionCapability)) {
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
    await enregistrerExecutionJob({
      jobCle: cle,
      module: job.module,
      source: 'manuel',
      succes: true,
      resume,
      dureeMs,
      declenchePar: userId,
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
    await enregistrerExecutionJob({
      jobCle: cle,
      module: job.module,
      source: 'manuel',
      succes: false,
      resume: "Échec de l'exécution.",
      erreur,
      dureeMs,
      declenchePar: userId,
    });

    return { cle, succes: false, resume: "Échec de l'exécution.", erreur, dureeMs };
  }
}
