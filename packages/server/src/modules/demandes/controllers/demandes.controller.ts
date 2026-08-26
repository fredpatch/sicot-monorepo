import { Request, Response } from 'express';
import * as demandesService from '../services/demandes.service.js';
import { handleDemandesError } from '@/utils/error.js';

// ── GET /api/demandes ─────────────────────────────────────────────────────
// Lecture ouverte à tous les rôles authentifiés, MAIS un agent ne peut
// jamais lister que ses propres demandes — le paramètre demandeurId fourni
// par le client est ignoré/écrasé pour ce rôle plutôt que fait confiance.
// (Rien n'empêchait avant ce correctif un agent d'appeler l'API directement
// sans ce paramètre et de lire les demandes de tout le monde.)
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { statut, priorite, direction, demandeurId, traducteurId, search, page, pageSize } = req.query;
    const estAgent = req.user!.role === 'agent';

    const result = await demandesService.listerDemandes({
      statut: statut as demandesService.DemandeStatut | undefined,
      priorite: priorite as demandesService.DemandePriorite | undefined,
      direction: direction as ('fr_en' | 'en_fr') | undefined,
      demandeurId: estAgent ? req.user!.userId : demandeurId ? parseInt(demandeurId as string) : undefined,
      traducteurId: estAgent ? undefined : traducteurId ? parseInt(traducteurId as string) : undefined,
      search: search ? String(search) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── GET /api/demandes/aggregates ──────────────────────────────────────────
// Même principe — un agent n'obtient jamais que ses propres compteurs.
export async function aggregates(req: Request, res: Response): Promise<void> {
  try {
    const { demandeurId } = req.query;
    const estAgent = req.user!.role === 'agent';
    const result = await demandesService.getDemandesAggregates(
      estAgent ? req.user!.userId : demandeurId ? parseInt(demandeurId as string) : undefined
    );
    res.json(result);
  } catch (error) {
    handleDemandesError(res, error);
  }
}

// ── GET /api/demandes/:id ─────────────────────────────────────────────────
// Un agent ne peut consulter que ses propres demandes par ID direct.
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const demande = await demandesService.getDemande(id);

    if (req.user!.role === 'agent' && demande.demandeurId !== req.user!.userId) {
      throw new Error('DEMANDE_NON_AUTORISEE');
    }

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
