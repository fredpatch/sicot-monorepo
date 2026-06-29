import { Request, Response } from 'express';
import * as glossaireService from '../services/glossaire.service.js';

// ── Gestion erreurs ────────────────────────────────────────────────────────
function handleGlossaireError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    TERME_INTROUVABLE: { status: 404, message: 'Terme introuvable.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[glossaire.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/glossaire ────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, domaine, actif, page, pageSize } = req.query;

    const result = await glossaireService.listerTermes({
      search: search as string | undefined,
      domaine: domaine as string | undefined,
      actif: actif !== undefined ? actif === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── GET /api/glossaire/suggestions ───────────────────────────────────────
export async function suggestions(req: Request, res: Response): Promise<void> {
  try {
    const { q, limite } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: 'Paramètre q requis.' });
      return;
    }

    const termes = await glossaireService.suggererTermes(
      q,
      limite ? parseInt(limite as string) : 5
    );

    res.json(termes);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── GET /api/glossaire/:id ────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const terme = await glossaireService.getTerme(id);
    res.json(terme);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── POST /api/glossaire ───────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { termeFr, termeEn, domaine, contexte } = req.body;

    if (!termeFr || !termeEn) {
      res.status(400).json({ message: 'Champs requis : termeFr, termeEn.' });
      return;
    }

    const terme = await glossaireService.creerTerme({
      termeFr,
      termeEn,
      domaine,
      contexte,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(terme);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── PATCH /api/glossaire/:id ──────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { termeFr, termeEn, domaine, contexte, actif } = req.body;

    if (!termeFr && !termeEn && !domaine && !contexte && actif === undefined) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    const terme = await glossaireService.mettreAJourTerme(id, {
      termeFr,
      termeEn,
      domaine,
      contexte,
      actif,
      updatedByUserId: req.user!.userId,
    });

    res.json(terme);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── PATCH /api/glossaire/:id/desactiver ───────────────────────────────────
export async function desactiver(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const terme = await glossaireService.desactiverTerme(id, req.user!.userId);
    res.json(terme);
  } catch (error) {
    handleGlossaireError(res, error);
  }
}

// ── POST /api/glossaire/import ────────────────────────────────────────────
export async function importerCSV(req: Request, res: Response): Promise<void> {
  try {
    const { termes } = req.body;

    if (!Array.isArray(termes) || termes.length === 0) {
      res.status(400).json({ message: 'termes doit être un tableau non vide.' });
      return;
    }

    const result = await glossaireService.importerTermes(termes, req.user!.userId);
    res.json({
      ...result,
      message: `${result.importes} terme(s) importé(s), ${result.ignores} ignoré(s).`,
    });
  } catch (error) {
    handleGlossaireError(res, error);
  }
}
