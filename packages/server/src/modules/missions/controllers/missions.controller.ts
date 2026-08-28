import { Request, Response } from 'express';
import * as missionsService from '../services/missions.service.js';
import { genererPDFMission } from '../services/missions.export.service.js';
import { handleMissionsError } from '@/utils/error.js';
import { hasCapability, UserRole } from '@sicot/shared';

// ── Filtre participantId - dérivation d'identité, pas de confiance client ──
// participantId sert deux usages sous la même route : le registre global
// filtré (admin) et "mes missions" (n'importe quel rôle, cf. MesMissionsPage
// / MonEspacePage côté client, qui envoient toujours participantId=user.id).
// Seuls les détenteurs de MISSION_REGISTRY_VIEW (admin/super_admin) peuvent
// consulter les missions d'un autre utilisateur ; pour tout le monde, un
// participantId demandé différent de l'utilisateur authentifié est
// silencieusement remplacé par req.user.userId - l'appelant ne peut jamais
// obtenir la liste "personnelle" de quelqu'un d'autre en modifiant ce
// paramètre (IDOR corrigé Phase 4.3). Un appel sans participantId reste
// inchangé (lecture globale non filtrée, comportement préexistant préservé).
function resolveParticipantFilter(req: Request, requested: number | undefined): number | undefined {
  if (requested === undefined) return undefined;

  const role = req.user!.role as UserRole;
  if (hasCapability(role, 'MISSION_REGISTRY_VIEW')) return requested;

  return requested === req.user!.userId ? requested : req.user!.userId;
}

// ── GET /api/missions ─────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      statut,
      pays,
      participantId,
      confirmationLogistique,
      rapportStatut,
      page,
      pageSize,
    } = req.query;

    const result = await missionsService.listerMissions({
      search: search as string | undefined,
      statut: statut as missionsService.MissionStatut | undefined,
      pays: pays as string | undefined,
      participantId: resolveParticipantFilter(
        req,
        participantId ? parseInt(participantId as string) : undefined
      ),
      confirmationLogistique: confirmationLogistique as
        missionsService.LogistiqueStatut | undefined,
      rapportStatut: rapportStatut as 'disponible' | 'manquant' | undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── GET /api/missions/aggregates ────────────────────────────────────────
export async function aggregates(req: Request, res: Response): Promise<void> {
  try {
    const { participantId } = req.query;
    const result = await missionsService.getMissionsAggregates(
      resolveParticipantFilter(req, participantId ? parseInt(participantId as string) : undefined)
    );
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

// ── GET /api/missions/:id/export/pdf ──────────────────────────────────────
export async function exporterPDF(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const mission = await missionsService.getMission(id);
    const pdf = await genererPDFMission(mission);

    const disposition = req.query.apercu === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="mission-${id}-rapport.pdf"`);
    res.send(pdf);
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
      rapportResponsableId,
      logistiqueBilletReserve,
      logistiqueHebergementConfirme,
      logistiqueFinancementValide,
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
      rapportDocumentId === undefined &&
      rapportResponsableId === undefined &&
      logistiqueBilletReserve === undefined &&
      logistiqueHebergementConfirme === undefined &&
      logistiqueFinancementValide === undefined &&
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

    const mission = await missionsService.mettreAJourMission(id, {
      titre,
      destination,
      pays,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      statut,
      participantsIds: participantsIds ? participantsIds.map(Number) : undefined,
      // null clears the link (removing a mistakenly-uploaded report);
      // undefined (field absent) leaves it untouched.
      rapportDocumentId:
        rapportDocumentId === null
          ? null
          : rapportDocumentId !== undefined
            ? parseInt(rapportDocumentId)
            : undefined,
      // null clears the designated report responsible (mission keeps
      // existing without one); undefined (field absent) leaves it untouched.
      rapportResponsableId:
        rapportResponsableId === null
          ? null
          : rapportResponsableId !== undefined
            ? parseInt(rapportResponsableId)
            : undefined,
      logistiqueBilletReserve,
      logistiqueHebergementConfirme,
      logistiqueFinancementValide,
      // null clears the contact-on-site (removing one set by mistake);
      // undefined (field absent) leaves it untouched.
      contactSurPlaceId:
        contactSurPlaceId === null
          ? null
          : contactSurPlaceId !== undefined
            ? parseInt(contactSurPlaceId)
            : undefined,
      updatedByUserId: req.user!.userId,
    });

    res.json(mission);
  } catch (error) {
    handleMissionsError(res, error);
  }
}

// ── PATCH /api/missions/:id/rapport ───────────────────────────────────────
// Workflow personnel (Phase 8) : seul le participant explicitement désigné
// comme rapportResponsableId peut soumettre/remplacer le rapport officiel
// ici - MISSION_MANAGE (admin+) passe aussi, mais son chemin normal reste
// le PATCH générique ci-dessus (MissionReportSection côté client). Ne
// touche jamais titre/statut/participants/etc - seulement rapportDocumentId,
// par construction (le body n'accepte que documentId).
export async function definirRapportPersonnel(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { documentId } = req.body;
    if (documentId !== null && documentId === undefined) {
      res.status(400).json({ message: 'documentId requis (ou null pour retirer le rapport).' });
      return;
    }

    const role = req.user!.role as UserRole;
    const userId = req.user!.userId;

    const autorise =
      hasCapability(role, 'MISSION_MANAGE') ||
      (hasCapability(role, 'MISSION_VIEW_OWN') &&
        (await missionsService.estResponsableRapportMission(id, userId)));

    if (!autorise) {
      res
        .status(403)
        .json({ message: "Vous n'êtes pas le responsable désigné du rapport de cette mission." });
      return;
    }

    const mission = await missionsService.mettreAJourMission(id, {
      rapportDocumentId: documentId === null ? null : parseInt(documentId),
      updatedByUserId: userId,
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
