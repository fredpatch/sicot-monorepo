import { Request, Response } from 'express';
import * as parametresService from '../services/parametres.service.js';
import { handleParametresError } from '@/utils/error.js';

// ── GET /api/parametres ───────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { module } = req.query;
    const result = await parametresService.listerParametres(module as string | undefined);
    res.json(result);
  } catch (error) {
    handleParametresError(res, error);
  }
}

// ── GET /api/parametres/:cle ──────────────────────────────────────────────
export async function getByCle(req: Request, res: Response): Promise<void> {
  try {
    const param = await parametresService.getParametre(req.params.cle);
    res.json(param);
  } catch (error) {
    handleParametresError(res, error);
  }
}

// ── PATCH /api/parametres/:cle ────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const { valeur } = req.body;
    if (valeur === undefined || valeur === null) {
      res.status(400).json({ message: 'Champ requis : valeur.' });
      return;
    }

    const param = await parametresService.mettreAJourParametre(
      req.params.cle,
      String(valeur),
      req.user!.userId
    );
    res.json(param);
  } catch (error) {
    handleParametresError(res, error);
  }
}
