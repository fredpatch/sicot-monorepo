import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { handleAnalyticsError } from '@/utils/error';
import * as analyticsExportService from '../services/analytics.export.service';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { SERVICE_PAR_MODULE } from '../services/analytics.service.js';
import * as geminiQuotaService from '../services/gemini-quota.service.js';

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

// ── GET /api/analytics/export?module=accords&format=excel ─────────────────
export async function exporterAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const moduleCle = req.query.module as string;
    const format = req.query.format as string;

    const serviceFn = SERVICE_PAR_MODULE[moduleCle];
    if (!serviceFn) {
      res.status(400).json({ message: `Module analytics inconnu : ${moduleCle}` });
      return;
    }
    if (format !== 'excel' && format !== 'csv') {
      res.status(400).json({ message: 'Format invalide — excel ou csv attendu' });
      return;
    }

    const periode = parsePeriode(req);
    const data = await serviceFn(periode);
    const dateStr = new Date().toISOString().slice(0, 10);

    await logAudit({
      userId: req.user!.userId,
      action: `ANALYTICS_EXPORT_${format.toUpperCase()}`,
      module: 'M11',
      details: { module: moduleCle, ...periode },
      ip: req.ip,
    });

    if (format === 'excel') {
      const buffer = await analyticsExportService.genererExcelAnalytics(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${moduleCle}-${dateStr}.xlsx"`
      );
      res.send(buffer);
    } else {
      const csv = analyticsExportService.genererCSVAnalytics(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${moduleCle}-${dateStr}.csv"`
      );
      res.send('\uFEFF' + csv); // BOM — accents corrects à l'ouverture dans Excel
    }
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}

// ── GET /api/analytics/gemini-usage ────────────────────────────────────────
export async function statutGemini(req: Request, res: Response): Promise<void> {
  try {
    const statut = await geminiQuotaService.getStatutUsageGemini();
    res.json(statut);
  } catch (error) {
    handleAnalyticsError(res, error);
  }
}
