import { Request, Response } from 'express';
import * as courriersService from '../services/courriers.service';

// ── Traduction des codes d'erreur ─────────────────────────────────────────
function handleCourriersError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    COURRIER_INTROUVABLE: { status: 404, message: 'Courrier introuvable.' },
    COURRIER_PARENT_INTROUVABLE: { status: 404, message: 'Courrier parent introuvable.' },
    ACCORD_INTROUVABLE: { status: 404, message: 'Accord introuvable.' },
    MISSION_INTROUVABLE: { status: 404, message: 'Mission introuvable.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[courriers.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/courriers ────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      direction,
      suiviStatut,
      reponseRequise,
      sansReponse,
      organisationId,
      page,
      pageSize,
    } = req.query;

    const result = await courriersService.listerCourriers({
      search: search as string | undefined,
      direction: direction as courriersService.CourrierDirection | undefined,
      suiviStatut: suiviStatut as courriersService.CourrierSuiviStatut | undefined,
      reponseRequise: reponseRequise as courriersService.CourrierReponseStatut | undefined,
      sansReponse: sansReponse === 'true',
      organisationId: organisationId ? parseInt(organisationId as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── GET /api/courriers/sans-reponse ───────────────────────────────────────
export async function sansReponse(req: Request, res: Response): Promise<void> {
  try {
    const courriers = await courriersService.getCouriersSansReponse();
    res.json(courriers);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── GET /api/courriers/:id ────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const courrier = await courriersService.getCourrier(id);
    res.json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── GET /api/courriers/:id/fil ────────────────────────────────────────────
export async function getFilCorrespondance(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const fil = await courriersService.getFilCorrespondance(id);
    res.json(fil);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── POST /api/courriers ───────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const {
      direction,
      objet,
      expediteurOrganisationId,
      destinataireOrganisationId,
      dateReception,
      reponseRequise,
      dateLimiteReponse,
      reponseAId,
      accordId,
      missionId,
      documentId,
    } = req.body;

    // Validation des champs requis
    if (!direction || !objet || !dateReception || !reponseRequise) {
      res.status(400).json({
        message: 'Champs requis : direction, objet, dateReception, reponseRequise.',
      });
      return;
    }

    // Validation direction
    if (!['entrant', 'sortant'].includes(direction)) {
      res.status(400).json({ message: 'Direction invalide : entrant ou sortant.' });
      return;
    }

    // Validation reponseRequise
    if (!['oui', 'non', 'pour_information'].includes(reponseRequise)) {
      res.status(400).json({
        message: 'reponseRequise invalide : oui, non ou pour_information.',
      });
      return;
    }

    // Si reponseRequise = 'oui', la date limite est fortement recommandée
    if (reponseRequise === 'oui' && !dateLimiteReponse) {
      console.warn('[courriers] Courrier créé sans date limite de réponse');
    }

    const courrier = await courriersService.creerCourrier({
      direction,
      objet,
      expediteurOrganisationId: expediteurOrganisationId
        ? parseInt(expediteurOrganisationId)
        : undefined,
      destinataireOrganisationId: destinataireOrganisationId
        ? parseInt(destinataireOrganisationId)
        : undefined,
      dateReception: new Date(dateReception),
      reponseRequise,
      dateLimiteReponse: dateLimiteReponse ? new Date(dateLimiteReponse) : undefined,
      reponseAId: reponseAId ? parseInt(reponseAId) : undefined,
      accordId: accordId ? parseInt(accordId) : undefined,
      missionId: missionId ? parseInt(missionId) : undefined,
      documentId: documentId ? parseInt(documentId) : undefined,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── PATCH /api/courriers/:id ──────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { objet, suiviStatut, dateLimiteReponse, accordId, missionId, documentId } = req.body;

    if (!objet && !suiviStatut && !dateLimiteReponse && !accordId && !missionId) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    // Validation suiviStatut
    const statutsValides = ['en_attente', 'repondu', 'archive'];
    if (suiviStatut && !statutsValides.includes(suiviStatut)) {
      res.status(400).json({ message: 'Statut de suivi invalide.' });
      return;
    }

    const courrier = await courriersService.mettreAJourCourrier(id, {
      objet,
      suiviStatut,
      dateLimiteReponse: dateLimiteReponse ? new Date(dateLimiteReponse) : undefined,
      accordId: accordId ? parseInt(accordId) : undefined,
      missionId: missionId ? parseInt(missionId) : undefined,
      documentId: documentId ? parseInt(documentId) : undefined,
      updatedByUserId: req.user!.userId,
    });

    res.json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}
