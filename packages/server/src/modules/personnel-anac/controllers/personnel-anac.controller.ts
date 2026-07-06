// packages/server/src/modules/personnel-anac/controllers/personnel-anac.controller.ts
import { Request, Response } from 'express';
import * as personnelAnacService from '../services/personnel-anac.service';
import { handlePersonnelAnacError } from '@/utils/error';

// ── GET /api/personnel-anac/rechercher?q= ─────────────────────────────────
export async function rechercher(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string) ?? '';
    const resultats = await personnelAnacService.rechercher(q);
    res.json({ data: resultats });
  } catch (error) {
    handlePersonnelAnacError(res, error);
  }
}

// ── GET /api/personnel-anac/matricule/:matricule ──────────────────────────
export async function getParMatricule(req: Request, res: Response): Promise<void> {
  try {
    const personnel = await personnelAnacService.getParMatricule(req.params.matricule);
    res.json(personnel);
  } catch (error) {
    handlePersonnelAnacError(res, error);
  }
}

// ── GET /api/personnel-anac?page=&limit=&sortBy=&order= ──────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const sortBy = (req.query.sortBy as 'id' | 'lastName') ?? 'lastName';
    const order = (req.query.order as 'asc' | 'desc') ?? 'asc';

    const resultat = await personnelAnacService.lister(page, limit, sortBy, order);
    res.json(resultat);
  } catch (error) {
    handlePersonnelAnacError(res, error);
  }
}