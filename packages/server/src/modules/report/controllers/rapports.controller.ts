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

// GET /api/analytics/rapports/:id/analyse-ia ───────────────────────────────
export async function genererAnalyseIA(req: Request, res: Response): Promise<void> {
  try {
    const rapportId = parseInt(req.params.id);
    await rapportsService.genererAnalyseIA(rapportId);
    const rapport = await rapportsService.getRapportById(rapportId);
    res.json(rapport);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('LIMITE_QUOTIDIENNE_ATTEINTE')) {
      const [utilises, max] = error.message.split(':')[1].split('/');
      res.status(429).json({
        message: `Limite quotidienne de rapports IA atteinte (${utilises}/${max}). Réessayez demain.`,
      });
      return;
    }
    handleAnalyticsError(res, error);
  }
}

// GET /api/analytics/rapports/:id ─────────────────────────────────────────
export async function getRapportDetail(req: Request, res: Response): Promise<void> {
  try {
    const rapport = await rapportsService.getRapportById(parseInt(req.params.id));
    res.json(rapport);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

//
export async function validerAnalyseIA(req: Request, res: Response): Promise<void> {
  try {
    const { statutRelectureIA, contenuIAValide } = req.body;
    if (statutRelectureIA !== 'valide' && statutRelectureIA !== 'rejete') {
      res.status(400).json({ message: 'statutRelectureIA doit être "valide" ou "rejete".' });
      return;
    }

    await rapportsService.validerOuRejeterAnalyseIA(parseInt(req.params.id), {
      statutRelectureIA,
      contenuIAValide,
      relecteurId: req.user!.userId,
    });

    res.status(204).send();
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}
