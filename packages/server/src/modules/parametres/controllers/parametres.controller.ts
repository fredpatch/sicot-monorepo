import { Request, Response } from 'express';
import * as parametresService from '../services/parametres.service.js';

function handleParametresError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    PARAMETRE_INTROUVABLE: { status: 404, message: 'Paramètre introuvable.' },
    VALEUR_INVALIDE_ENTIER: { status: 400, message: 'La valeur doit être un nombre entier.' },
    VALEUR_INVALIDE_BOOLEEN: { status: 400, message: 'La valeur doit être true ou false.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[parametres.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

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
