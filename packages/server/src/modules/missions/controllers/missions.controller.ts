import { Request, Response } from 'express';
import * as missionsService from '../services/missions.service.js';
import { handleMissionsError } from '@/utils/error.js';

// ── GET /api/missions ─────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, statut, pays, participantId, page, pageSize } = req.query;

    const result = await missionsService.listerMissions({
      search: search as string | undefined,
      statut: statut as missionsService.MissionStatut | undefined,
      pays: pays as string | undefined,
      participantId: participantId ? parseInt(participantId as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── GET /api/missions/recommandations/en-attente ───────────────────────────
export async function recommandationsEnAttente(req: Request, res: Response): Promise<void> {
  try {
    const recs = await missionsService.getRecommandationsEnAttente();
    res.json(recs);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── GET /api/missions/:id ─────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const mission = await missionsService.getMission(id);
    res.json(mission);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── POST /api/missions ────────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { titre, destination, pays, dateDebut, dateFin, participantsIds, contactSurPlaceId } =
      req.body;

    if (!titre || !destination || !pays || !dateDebut || !dateFin) {
      res.status(400).json({
        message: 'Champs requis : titre, destination, pays, dateDebut, dateFin.',
      });
      return;
    }

    if (participantsIds && !Array.isArray(participantsIds)) {
      res.status(400).json({ message: 'participantsIds doit être un tableau.' });
      return;
    }

    const mission = await missionsService.creerMission({
      titre,
      destination,
      pays,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      participantsIds: participantsIds ? participantsIds.map(Number) : [],
      contactSurPlaceId: contactSurPlaceId ? parseInt(contactSurPlaceId) : undefined,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(mission);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── PATCH /api/missions/:id ───────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const {
      titre,
      destination,
      pays,
      dateDebut,
      dateFin,
      statut,
      participantsIds,
      rapportDocumentId,
      confirmationLogistique,
      contactSurPlaceId,
    } = req.body;

    if (
      !titre &&
      !destination &&
      !pays &&
      !dateDebut &&
      !dateFin &&
      !statut &&
      !participantsIds &&
      !rapportDocumentId &&
      !confirmationLogistique &&
      contactSurPlaceId === undefined
    ) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    const statutsValides = ['planifiee', 'en_cours', 'terminee', 'annulee'];
    if (statut && !statutsValides.includes(statut)) {
      res.status(400).json({ message: 'Statut invalide.' });
      return;
    }

    const logistiqueValides = ['a_planifier', 'en_cours', 'confirme'];
    if (confirmationLogistique && !logistiqueValides.includes(confirmationLogistique)) {
      res.status(400).json({ message: 'Statut logistique invalide.' });
      return;
    }

    const mission = await missionsService.mettreAJourMission(id, {
      titre,
      destination,
      pays,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      statut,
      participantsIds: participantsIds ? participantsIds.map(Number) : undefined,
      rapportDocumentId: rapportDocumentId ? parseInt(rapportDocumentId) : undefined,
      confirmationLogistique,
      contactSurPlaceId: contactSurPlaceId !== undefined ? parseInt(contactSurPlaceId) : undefined,
      updatedByUserId: req.user!.userId,
    });

    res.json(mission);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── GET /api/missions/:id/recommandations ─────────────────────────────────
export async function listerRecommandations(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    // Récupérer la mission avec ses recommandations
    const mission = await missionsService.getMission(id);
    res.json(mission.recommandations ?? []);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── POST /api/missions/:id/recommandations ────────────────────────────────
export async function ajouterRecommandation(req: Request, res: Response): Promise<void> {
  try {
    const missionId = parseInt(req.params.id);
    if (isNaN(missionId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { texte, responsableId, dateLimite } = req.body;

    if (!texte) {
      res.status(400).json({ message: 'Le texte de la recommandation est requis.' });
      return;
    }

    const recommandation = await missionsService.ajouterRecommandation({
      missionId,
      texte,
      responsableId: responsableId ? parseInt(responsableId) : undefined,
      dateLimite: dateLimite ? new Date(dateLimite) : undefined,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(recommandation);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── PATCH /api/missions/recommandations/:recId ────────────────────────────
export async function mettreAJourRecommandation(req: Request, res: Response): Promise<void> {
  try {
    const recId = parseInt(req.params.recId);
    if (isNaN(recId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { texte, responsableId, dateLimite, statut } = req.body;

    if (!texte && !responsableId && !dateLimite && !statut) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    // Valider le statut si fourni
    const statutsValides = ['en_attente', 'en_cours', 'realisee'];
    if (statut && !statutsValides.includes(statut)) {
      res.status(400).json({ message: 'Statut de recommandation invalide.' });
      return;
    }

    const recommandation = await missionsService.mettreAJourRecommandation(recId, {
      texte,
      responsableId: responsableId ? parseInt(responsableId) : undefined,
      dateLimite: dateLimite ? new Date(dateLimite) : undefined,
      statut,
      updatedByUserId: req.user!.userId,
    });

    res.json(recommandation);
  } catch (error) {
    handleMissionsError(res, error);
  }
}
