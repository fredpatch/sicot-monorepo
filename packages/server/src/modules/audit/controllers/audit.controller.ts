import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';
import * as auditExportService from '../services/audit.export.service';
import { handleAuditError } from '@/utils/error';
import { logAudit } from '@/modules/auth/services/auth.service';

// ── GET /api/audit ────────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { userId, module, action, dateDebut, dateFin, page, pageSize } = req.query;

    const result = await auditService.listerAuditLogs({
      userId: userId ? parseInt(userId as string) : undefined,
      module: module as string | undefined,
      action: action as string | undefined,
      dateDebut: dateDebut ? new Date(dateDebut as string) : undefined,
      dateFin: dateFin ? new Date(dateFin as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleAuditError(res, error);
  }
}

// ── GET /api/audit/:id ────────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const log = await auditService.getAuditLog(id);
    res.json(log);
  } catch (error) {
    handleAuditError(res, error);
  }
}

// ── GET /api/audit/meta/modules ───────────────────────────────────────────
// Alimente la liste déroulante "Module" dans l'interface de filtrage
export async function getModules(req: Request, res: Response): Promise<void> {
  try {
    const modules = await auditService.getModulesDisponibles();
    res.json(modules);
  } catch (error) {
    handleAuditError(res, error);
  }
}

// ── GET /api/audit/meta/actions ───────────────────────────────────────────
// Alimente la liste déroulante "Action" dans l'interface de filtrage
export async function getActions(req: Request, res: Response): Promise<void> {
  try {
    const actions = await auditService.getActionsDisponibles();
    res.json(actions);
  } catch (error) {
    handleAuditError(res, error);
  }
}

// ── GET /api/audit/export/pdf ─────────────────────────────────────────────
export async function exporterPDF(req: Request, res: Response): Promise<void> {
  try {
    const { module, action, dateDebut, dateFin } = req.query;

    const filters = {
      module: module as string | undefined,
      action: action as string | undefined,
      dateDebut: dateDebut ? new Date(dateDebut as string) : undefined,
      dateFin: dateFin ? new Date(dateFin as string) : undefined,
    };

    const { data, tronque } = await auditService.listerAuditLogsExport(filters);
    const resume = auditExportService.resumerFiltres(filters);
    const pdf = await auditExportService.genererPDFAudit(data, resume, tronque);

    await logAudit({
      userId: req.user!.userId,
      action: 'AUDIT_EXPORT_PDF',
      module: 'M10',
      details: { ...filters, nbLignes: data.length },
      ip: req.ip,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="journal-audit-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    handleAuditError(res, error);
  }
}

// ── GET /api/audit/export/excel ───────────────────────────────────────────
export async function exporterExcel(req: Request, res: Response): Promise<void> {
  try {
    const { module, action, dateDebut, dateFin } = req.query;

    const filters = {
      module: module as string | undefined,
      action: action as string | undefined,
      dateDebut: dateDebut ? new Date(dateDebut as string) : undefined,
      dateFin: dateFin ? new Date(dateFin as string) : undefined,
    };

    const { data } = await auditService.listerAuditLogsExport(filters);
    const excel = await auditExportService.genererExcelAudit(data);

    await logAudit({
      userId: req.user!.userId,
      action: 'AUDIT_EXPORT_EXCEL',
      module: 'M10',
      details: { ...filters, nbLignes: data.length },
      ip: req.ip,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="journal-audit-${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    res.send(excel);
  } catch (error) {
    handleAuditError(res, error);
  }
}
