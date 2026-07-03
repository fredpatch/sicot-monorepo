import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { handleAnalyticsError } from '@/utils/error';

function parsePeriode(req: Request): { dateDebut?: Date; dateFin?: Date } {
  const { dateDebut, dateFin } = req.query;

  // dateFin arrive en date seule ("2026-07-04"), parsée comme minuit UTC —
  // ça exclurait tout ce qui se passe "aujourd'hui" après minuit. Poussé à
  // 23:59:59.999 UTC pour couvrir la journée entière.
  let finResolue: Date | undefined;
  if (dateFin) {
    finResolue = new Date(dateFin as string);
    finResolue.setUTCHours(23, 59, 59, 999);
  }

  return {
    dateDebut: dateDebut ? new Date(dateDebut as string) : undefined,
    dateFin: finResolue,
  };
}

// ── GET /api/analytics/accords ─────────────────────────────────────────────
export async function accords(req: Request, res: Response): Promise<void> {
  try {
    const data = await analyticsService.getAccordsAnalytics(parsePeriode(req));
    res.json(data);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/courriers ───────────────────────────────────────────
export async function courriers(req: Request, res: Response): Promise<void> {
  try {
    const data = await analyticsService.getCourriersAnalytics(parsePeriode(req));
    res.json(data);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/missions ────────────────────────────────────────────
export async function missions(req: Request, res: Response): Promise<void> {
  try {
    const data = await analyticsService.getMissionsAnalytics(parsePeriode(req));
    res.json(data);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/traduction ─────────────────────────────────────────
export async function traduction(req: Request, res: Response): Promise<void> {
  try {
    res.json(await analyticsService.getTraductionAnalytics(parsePeriode(req)));
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/demandes ───────────────────────────────────────────
export async function demandes(req: Request, res: Response): Promise<void> {
  try {
    res.json(await analyticsService.getDemandesAnalytics(parsePeriode(req)));
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/documents ──────────────────────────────────────────
export async function documents(req: Request, res: Response): Promise<void> {
  try {
    res.json(await analyticsService.getDocumentsAnalytics(parsePeriode(req)));
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/glossaire ───────────────────────────────────────────
export async function glossaire(req: Request, res: Response): Promise<void> {
  try {
    res.json(await analyticsService.getGlossaireAnalytics(parsePeriode(req)));
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/global ─────────────────────────────────────────────
export async function global(req: Request, res: Response): Promise<void> {
  try {
    res.json(await analyticsService.getGlobalAnalytics(parsePeriode(req)));
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}
