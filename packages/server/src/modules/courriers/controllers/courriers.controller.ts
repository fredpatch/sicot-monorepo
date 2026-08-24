import { Request, Response } from 'express';
import * as courriersService from '../services/courriers.service';
import { genererPDFCourrier } from '../services/courriers.export.service.js';
import { handleCourriersError } from '@/utils/error.js';

// ── GET /api/courriers ────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      direction,
      suiviStatut,
      reponseRequise,
      sansReponse,
      enDepassement,
      organisationId,
      dateDebut,
      dateFin,
      page,
      pageSize,
    } = req.query;

    const result = await courriersService.listerCourriers({
      search: search as string | undefined,
      direction: direction as courriersService.CourrierDirection | undefined,
      suiviStatut: suiviStatut as courriersService.CourrierSuiviStatut | undefined,
      reponseRequise: reponseRequise as courriersService.CourrierReponseStatut | undefined,
      sansReponse: sansReponse === 'true',
      enDepassement: enDepassement === 'true',
      organisationId: organisationId ? parseInt(organisationId as string) : undefined,
      dateDebut: dateDebut ? new Date(dateDebut as string) : undefined,
      dateFin: dateFin ? new Date(dateFin as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── GET /api/courriers/aggregates ─────────────────────────────────────────
export async function aggregates(req: Request, res: Response): Promise<void> {
  try {
    const result = await courriersService.getCourriersAggregates();
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

// ── GET /api/courriers/:id/export/pdf ─────────────────────────────────────
export async function exporterPDF(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const courrier = await courriersService.getCourrier(id);
    const pdf = await genererPDFCourrier(courrier);

    const disposition = req.query.apercu === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="courrier-${courrier.reference}.pdf"`
    );
    res.send(pdf);
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
      expediteurContactId,
      destinataireContactId,
      dateReception,
      reponseRequise,
      dateLimiteReponse,
      reponseAId,
      accordId,
      missionId,
      documentIds,
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
      expediteurContactId: expediteurContactId ? parseInt(expediteurContactId) : undefined,
      destinataireContactId: destinataireContactId ? parseInt(destinataireContactId) : undefined,
      dateReception: new Date(dateReception),
      reponseRequise,
      dateLimiteReponse: dateLimiteReponse ? new Date(dateLimiteReponse) : undefined,
      reponseAId: reponseAId ? parseInt(reponseAId) : undefined,
      accordId: accordId ? parseInt(accordId) : undefined,
      missionId: missionId ? parseInt(missionId) : undefined,
      documentIds: Array.isArray(documentIds) ? documentIds.map(Number) : undefined,
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

    const {
      objet,
      dateReception,
      reponseRequise,
      expediteurOrganisationId,
      destinataireOrganisationId,
      expediteurContactId,
      destinataireContactId,
      suiviStatut,
      dateLimiteReponse,
      accordId,
      missionId,
    } = req.body;

    if (
      !objet &&
      !dateReception &&
      !reponseRequise &&
      !expediteurOrganisationId &&
      !destinataireOrganisationId &&
      expediteurContactId === undefined &&
      destinataireContactId === undefined &&
      !suiviStatut &&
      !dateLimiteReponse &&
      !accordId &&
      !missionId
    ) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    // Validation suiviStatut
    const statutsValides = ['en_attente', 'repondu', 'archive'];
    if (suiviStatut && !statutsValides.includes(suiviStatut)) {
      res.status(400).json({ message: 'Statut de suivi invalide.' });
      return;
    }

    // Validation reponseRequise
    if (reponseRequise && !['oui', 'non', 'pour_information'].includes(reponseRequise)) {
      res.status(400).json({ message: 'reponseRequise invalide.' });
      return;
    }

    const courrier = await courriersService.mettreAJourCourrier(id, {
      objet,
      dateReception: dateReception ? new Date(dateReception) : undefined,
      reponseRequise,
      expediteurOrganisationId: expediteurOrganisationId ? parseInt(expediteurOrganisationId) : undefined,
      destinataireOrganisationId: destinataireOrganisationId
        ? parseInt(destinataireOrganisationId)
        : undefined,
      expediteurContactId:
        expediteurContactId === null
          ? null
          : expediteurContactId !== undefined
            ? parseInt(expediteurContactId)
            : undefined,
      destinataireContactId:
        destinataireContactId === null
          ? null
          : destinataireContactId !== undefined
            ? parseInt(destinataireContactId)
            : undefined,
      suiviStatut,
      dateLimiteReponse: dateLimiteReponse ? new Date(dateLimiteReponse) : undefined,
      accordId: accordId ? parseInt(accordId) : undefined,
      missionId: missionId ? parseInt(missionId) : undefined,
      updatedByUserId: req.user!.userId,
    });

    res.json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── POST /api/courriers/:id/documents ─────────────────────────────────────
export async function ajouterDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    const documentId = parseInt(req.body.documentId);
    if (isNaN(id) || isNaN(documentId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const courrier = await courriersService.ajouterDocumentCourrier(id, documentId, req.user!.userId);
    res.json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}

// ── DELETE /api/courriers/:id/documents/:documentId ───────────────────────
export async function retirerDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    const documentId = parseInt(req.params.documentId);
    if (isNaN(id) || isNaN(documentId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const courrier = await courriersService.retirerDocumentCourrier(id, documentId, req.user!.userId);
    res.json(courrier);
  } catch (error) {
    handleCourriersError(res, error);
  }
}
