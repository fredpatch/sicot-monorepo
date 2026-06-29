import { Request, Response } from 'express';
import * as traductionService from '../services/traduction.service.js';
import { TraductionDirection } from '@/utils/traduction.js';

function handleTraductionError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    TRADUCTION_INTROUVABLE: { status: 404, message: 'Traduction introuvable.' },
    TEXTE_FINAL_REQUIS: { status: 400, message: 'Un texte final est requis avant approbation.' },
    APPROBATION_REQUISE: {
      status: 400,
      message: 'La traduction doit être approuvée avant archivage.',
    },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[traduction.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/traductions ──────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { statut, direction, page, pageSize } = req.query;

    const result = await traductionService.listerTraductions({
      statut: statut as traductionService.TraductionStatut | undefined,
      direction: direction as TraductionDirection | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/moteur/status ────────────────────────────────────
export async function moteurStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await traductionService.verifierMoteur();
    res.json(status);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/:id ──────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.getTraduction(id);
    res.json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── POST /api/traductions ─────────────────────────────────────────────────
export async function lancer(req: Request, res: Response): Promise<void> {
  try {
    const { documentId, texteOriginal, direction } = req.body;

    if (!texteOriginal || !direction) {
      res.status(400).json({ message: 'Champs requis : texteOriginal, direction.' });
      return;
    }

    if (!['fr_en', 'en_fr'].includes(direction)) {
      res.status(400).json({ message: 'Direction invalide : fr_en ou en_fr.' });
      return;
    }

    const traduction = await traductionService.lancerTraduction({
      documentId: documentId ? parseInt(documentId) : undefined,
      texteOriginal,
      direction,
      userId: req.user!.userId,
    });

    res.status(201).json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── PATCH /api/traductions/:id/correction ─────────────────────────────────
export async function sauvegarderCorrection(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { texteFinal } = req.body;
    if (!texteFinal) {
      res.status(400).json({ message: 'texteFinal est requis.' });
      return;
    }

    const traduction = await traductionService.sauvegarderCorrection({
      id,
      texteFinal,
      userId: req.user!.userId,
    });

    res.json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── PATCH /api/traductions/:id/approuver ──────────────────────────────────
export async function approuver(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.approuverTraduction(id, req.user!.userId);
    res.json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── PATCH /api/traductions/:id/archiver ───────────────────────────────────
export async function archiver(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.archiverTraduction(id, req.user!.userId);
    res.json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/:id/suggestions ──────────────────────────────────
export async function suggestions(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { texte } = req.query;
    if (!texte || typeof texte !== 'string') {
      res.status(400).json({ message: 'Paramètre texte requis.' });
      return;
    }

    const traduction = await traductionService.getTraduction(id);
    const resultats = await traductionService.getSuggestionsGlossaire(texte, traduction.direction);

    res.json(resultats);
  } catch (error) {
    handleTraductionError(res, error);
  }
}
