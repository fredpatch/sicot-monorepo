import { Request, Response } from 'express';
import * as rapportsService from '../services/rapports.service';
import { handleAnalyticsError } from '@/utils/error.js';

// ── POST /api/analytics/rapports ───────────────────────────────────────────
export async function genererRapport(req: Request, res: Response): Promise<void> {
  try {
    const { periodeDebut, periodeFin, modules, format } = req.body;

    if (!periodeDebut || !periodeFin || !Array.isArray(modules) || modules.length === 0) {
      res
        .status(400)
        .json({ message: 'periodeDebut, periodeFin et modules (non vide) sont requis.' });
      return;
    }
    if (format !== 'pdf' && format !== 'excel') {
      res.status(400).json({ message: 'Format invalide — pdf ou excel attendu.' });
      return;
    }

    const resultat = await rapportsService.genererRapport({
      periodeDebut: new Date(periodeDebut),
      periodeFin: new Date(periodeFin),
      modules,
      format,
      type: 'a_la_demande',
      userId: req.user!.userId,
    });

    res.status(201).json(resultat);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/rapports ────────────────────────────────────────────
export async function listerRapports(req: Request, res: Response): Promise<void> {
  try {
    const rapports = await rapportsService.listerRapports();
    res.json(rapports);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}
