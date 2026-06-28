import { Request, Response } from 'express';
import * as auditService from '../services/audit.service.js';
import { handleAuditError } from '../../../utils/error.js';

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
