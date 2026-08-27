import { Request, Response } from 'express';
import * as jobsService from '../services/jobs.service.js';

export async function lister(req: Request, res: Response): Promise<void> {
  res.json(jobsService.listerJobs());
}

// ── GET /api/jobs/historique ────────────────────────────────────────────
export async function historique(req: Request, res: Response): Promise<void> {
  try {
    const { jobCle, module, source, succes, page, pageSize } = req.query;

    const result = await jobsService.listerExecutionsJobs({
      jobCle: jobCle as string | undefined,
      module: module as string | undefined,
      source: source === 'manuel' || source === 'cron' ? source : undefined,
      succes: succes !== undefined ? succes === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[jobs.controller] historique', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}

export async function executer(req: Request, res: Response): Promise<void> {
  try {
    const { cle } = req.params;
    const resultat = await jobsService.executerJobManuel(cle, req.user!.userId, req.user!.role);

    if (!resultat.succes) {
      res.status(502).json(resultat);
      return;
    }

    res.json(resultat);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';
    if (message === 'ROLE_INSUFFISANT') {
      res.status(403).json({ message: 'Ce job nécessite le rôle Super Admin.' });
      return;
    }
    if (message === 'JOB_INTROUVABLE') {
      res.status(404).json({ message: 'Job introuvable.' });
      return;
    }
    console.error('[jobs.controller]', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}
