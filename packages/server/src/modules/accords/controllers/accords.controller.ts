import { Request, Response } from 'express';
import * as accordsService from '../services/accords.service.js';

// ── Traduction des codes d'erreur ─────────────────────────────────────────
function handleAccordsError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    ACCORD_INTROUVABLE: { status: 404, message: 'Accord introuvable.' },
    PARTENAIRES_REQUIS: { status: 400, message: 'Au moins un partenaire est requis.' },
    ORGANISATION_INTROUVABLE: { status: 404, message: 'Organisation partenaire introuvable.' },
  };

  // Gérer le cas ORGANISATION_INTROUVABLE:ID
  if (message.startsWith('ORGANISATION_INTROUVABLE:')) {
    const id = message.split(':')[1];
    res.status(404).json({
      message: `Organisation partenaire introuvable (ID: ${id}).`,
      code: 'ORGANISATION_INTROUVABLE',
    });
    return;
  }

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[accords.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/accords ──────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, statut, partenairesId, expirantAvant, page, pageSize } = req.query;

    const result = await accordsService.listerAccords({
      search: search as string | undefined,
      statut: statut as accordsService.AccordStatut | undefined,
      partenairesId: partenairesId ? parseInt(partenairesId as string) : undefined,
      expirantAvant: expirantAvant ? new Date(expirantAvant as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleAccordsError(res, error);
  }
}

// ── GET /api/accords/expirant ─────────────────────────────────────────────
// Accords expirant dans les N prochains jours — pour le dashboard
export async function expirantBientot(req: Request, res: Response): Promise<void> {
  try {
    const jours = req.query.jours ? parseInt(req.query.jours as string) : 90;
    const accords = await accordsService.getAccordsExpirantDans(jours);
    res.json(accords);
  } catch (error) {
    handleAccordsError(res, error);
  }
}

// ── GET /api/accords/:id ──────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const accord = await accordsService.getAccord(id);
    res.json(accord);
  } catch (error) {
    handleAccordsError(res, error);
  }
}

// ── POST /api/accords ─────────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { titre, dateSignature, dateExpiration, partenairesIds, documentId, notes } = req.body;

    if (!titre || !dateSignature || !partenairesIds) {
      res.status(400).json({
        message: 'Champs requis : titre, dateSignature, partenairesIds.',
      });
      return;
    }

    if (!Array.isArray(partenairesIds) || partenairesIds.length === 0) {
      res.status(400).json({
        message: 'partenairesIds doit être un tableau non vide.',
      });
      return;
    }

    const accord = await accordsService.creerAccord({
      titre,
      dateSignature: new Date(dateSignature),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
      partenairesIds: partenairesIds.map(Number),
      documentId: documentId ? parseInt(documentId) : undefined,
      notes,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(accord);
  } catch (error) {
    handleAccordsError(res, error);
  }
}

// ── PATCH /api/accords/:id ────────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { titre, statut, dateSignature, dateExpiration, partenairesIds, documentId, notes } =
      req.body;

    if (
      !titre &&
      !statut &&
      !dateSignature &&
      !dateExpiration &&
      !partenairesIds &&
      !documentId &&
      !notes
    ) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    // Valider le statut si fourni
    const statutsValides = ['actif', 'expire', 'suspendu', 'en_renouvellement'];
    if (statut && !statutsValides.includes(statut)) {
      res.status(400).json({ message: 'Statut invalide.' });
      return;
    }

    const accord = await accordsService.mettreAJourAccord(id, {
      titre,
      statut,
      dateSignature: dateSignature ? new Date(dateSignature) : undefined,
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
      partenairesIds: partenairesIds ? partenairesIds.map(Number) : undefined,
      documentId: documentId ? parseInt(documentId) : undefined,
      notes,
      updatedByUserId: req.user!.userId,
    });

    res.json(accord);
  } catch (error) {
    handleAccordsError(res, error);
  }
}

// ── POST /api/accords/:id/renouveler ─────────────────────────────────────
export async function renouveler(req: Request, res: Response): Promise<void> {
  try {
    const parentId = parseInt(req.params.id);
    if (isNaN(parentId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { dateSignature, dateExpiration, notes } = req.body;

    if (!dateSignature) {
      res.status(400).json({ message: 'dateSignature est requis.' });
      return;
    }

    const accord = await accordsService.renouvelerAccord(parentId, {
      dateSignature: new Date(dateSignature),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
      notes,
      userId: req.user!.userId,
    });

    res.status(201).json({
      accord,
      message: `Accord renouvelé — nouvelle référence : ${accord.reference}`,
    });
  } catch (error) {
    handleAccordsError(res, error);
  }
}
