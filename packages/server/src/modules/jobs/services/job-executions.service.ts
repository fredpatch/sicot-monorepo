import { db } from '@/db/index.js';
import { jobExecutions } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export interface JobExecutionView {
  id: number;
  jobCle: string;
  module: string;
  source: 'manuel' | 'cron';
  succes: boolean;
  resume: string;
  erreur: string | null;
  dureeMs: number;
  declenchePar: number | null;
  createdAt: Date;
}

export interface JobExecutionFilters {
  jobCle?: string;
  module?: string;
  source?: 'manuel' | 'cron';
  succes?: boolean;
  page?: number;
  pageSize?: number;
}

function toView(row: typeof jobExecutions.$inferSelect): JobExecutionView {
  return {
    id: row.id,
    jobCle: row.jobCle,
    module: row.module,
    source: row.source,
    succes: row.succes,
    resume: row.resume,
    erreur: row.erreur,
    dureeMs: row.dureeMs,
    declenchePar: row.declenchePar,
    createdAt: row.createdAt,
  };
}

// ── SERVICE : Enregistrer une exécution (manuelle ou cron) ────────────────
// Best-effort - une panne de journalisation ne doit jamais faire échouer le
// job lui-même (surtout pour un cron, sans admin pour voir l'erreur).
export async function enregistrerExecutionJob(params: {
  jobCle: string;
  module: string;
  source: 'manuel' | 'cron';
  succes: boolean;
  resume: string;
  erreur?: string;
  dureeMs: number;
  declenchePar?: number;
}): Promise<void> {
  try {
    await db.insert(jobExecutions).values({
      jobCle: params.jobCle,
      module: params.module,
      source: params.source,
      succes: params.succes,
      resume: params.resume,
      erreur: params.erreur,
      dureeMs: params.dureeMs,
      declenchePar: params.declenchePar,
    });
  } catch (error) {
    console.error('[job-executions] Échec enregistrement historique:', error);
  }
}

// ── SERVICE : Lister l'historique, filtrable et paginé ─────────────────────
export async function listerExecutionsJobs(
  filters: JobExecutionFilters
): Promise<{ data: JobExecutionView[]; total: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.jobCle) conditions.push(eq(jobExecutions.jobCle, filters.jobCle));
  if (filters.module) conditions.push(eq(jobExecutions.module, filters.module));
  if (filters.source) conditions.push(eq(jobExecutions.source, filters.source));
  if (filters.succes !== undefined) conditions.push(eq(jobExecutions.succes, filters.succes));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(jobExecutions)
    .where(where)
    .orderBy(desc(jobExecutions.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(jobExecutions, where);

  return { data: rows.map(toView), total };
}
