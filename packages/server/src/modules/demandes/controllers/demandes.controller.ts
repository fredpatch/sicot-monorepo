import { Request, Response } from 'express';
import * as demandesService from '../services/demandes.service.js';

function handleDemandesError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    DEMANDE_INTROUVABLE: { status: 404, message: 'Demande introuvable.' },
    DEMANDE_NON_DISPONIBLE: { status: 400, message: "Cette demande n'est plus disponible." },
    DEMANDE_VERROUILEE: { status: 409, message: 'Cette demande a déjà été prise en charge.' },
    DEMANDE_NON_AUTORISEE: {
      status: 403,
      message: "Vous n'êtes pas autorisé à effectuer cette action.",
    },
    DEMANDE_DEJA_PRISE: { status: 400, message: 'Cette demande est déjà en cours de traitement.' },
    DEMANDE_STATUT_INVALIDE: {
      status: 400,
      message: 'Statut de la demande incompatible avec cette action.',
    },
    CONTENU_REQUIS: { status: 400, message: 'Un document ou un texte libre est requis.' },
    DOCUMENT_INTROUVABLE: { status: 404, message: 'Document introuvable.' },
    DOCUMENT_SANS_TEXTE_OCR: {
      status: 400,
      message: "Le document n'a pas de texte extrait (OCR requis).",
    },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[demandes.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/demandes ─────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { statut, priorite, demandeurId, traducteurId, page, pageSize } = req.query;

    const result = await demandesService.listerDemandes({
      statut: statut as demandesService.DemandeStatut | undefined,
      priorite: priorite as demandesService.DemandePriorite | undefined,
      demandeurId: demandeurId ? parseInt(demandeurId as string) : undefined,
      traducteurId: traducteurId ? parseInt(traducteurId as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── GET /api/demandes/:id ─────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.getDemande(id);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── POST /api/demandes ────────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { documentId, texteLibre, direction, priorite } = req.body;

    if (!direction) {
      res.status(400).json({ message: 'Champ requis : direction.' });
      return;
    }

    if (!['fr_en', 'en_fr'].includes(direction)) {
      res.status(400).json({ message: 'Direction invalide : fr_en ou en_fr.' });
      return;
    }

    const demande = await demandesService.creerDemande({
      demandeurId: req.user!.userId,
      documentId: documentId ? parseInt(documentId) : undefined,
      texteLibre,
      direction,
      priorite: priorite ?? 'normale',
    });

    res.status(201).json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/prendre-en-charge ─────────────────────────────
export async function prendreEnCharge(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.prendreEnCharge(id, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/rappeler ─────────────────────────────────────
export async function rappeler(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.rappelerDemande(id, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/priorite ─────────────────────────────────────
export async function validerPriorite(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { priorite } = req.body;
    if (!priorite || !['normale', 'urgente'].includes(priorite)) {
      res.status(400).json({ message: 'Priorité invalide : normale ou urgente.' });
      return;
    }

    const demande = await demandesService.validerPriorite(id, priorite, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/relecture ────────────────────────────────────
export async function passerEnRelecture(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.passerEnRelecture(id, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/valider ──────────────────────────────────────
export async function valider(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.validerDemande(id, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── PATCH /api/demandes/:id/archiver ─────────────────────────────────────
export async function archiver(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.archiverDemande(id, req.user!.userId);
    res.json(demande);
  } catch (error) {
    handleDemandesError(res, error);
  }
}
