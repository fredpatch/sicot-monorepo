import { Request, Response } from 'express';
import * as traductionService from '../services/traduction.service.js';
import { genererPDFTraduction, genererDOCXTraduction } from '../services/traduction.export.service.js';
import { estDemandeurDeTraduction } from '@/modules/demandes/services/demandes.service.js';
import { TraductionDirection } from '@/utils/traduction.js';
import { handleTraductionError } from '@/utils/error.js';
import { hasCapability, UserRole } from '@sicot/shared';

// ── GET /api/traductions ──────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, statut, direction, vue, source, page, pageSize } = req.query;

    const result = await traductionService.listerTraductions({
      search: search as string | undefined,
      statut: statut as traductionService.TraductionStatut | undefined,
      direction: direction as TraductionDirection | undefined,
      vue: vue === 'supprimees' ? 'supprimees' : undefined,
      source: source === 'libre' || source === 'document' ? source : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/aggregates ───────────────────────────────────────
export async function aggregates(_req: Request, res: Response): Promise<void> {
  try {
    const result = await traductionService.getTraductionsAggregates();
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

// ── Garde commune GET /:id, /:id/export/pdf, /:id/export/docx ──────────────
// Sans TRANSLATION_VIEW (l'atelier de traduction opérationnel), l'accès est
// dérivé de la relation avec la demande liée — via estDemandeurDeTraduction,
// pas du nom du rôle — de sorte que quiconque n'a que la portée personnelle
// ne peut jamais accéder à une traduction arbitraire par ID, seulement celle
// liée à l'une de ses propres demandes (Phase 4.6).
async function verifierAcces(req: Request, id: number): Promise<void> {
  if (!hasCapability(req.user!.role as UserRole, 'TRANSLATION_VIEW')) {
    const autorise = await estDemandeurDeTraduction(id, req.user!.userId);
    if (!autorise) throw new Error('TRADUCTION_NON_AUTORISEE');
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

    await verifierAcces(req, id);

    const traduction = await traductionService.getTraduction(id);
    res.json(traduction);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/:id/export/pdf ───────────────────────────────────
// Réservé aux traductions approuvées/archivées — le texte n'est définitif
// qu'à partir de là, avant ça il peut encore changer.
export async function exporterPDF(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    await verifierAcces(req, id);

    const traduction = await traductionService.getTraduction(id);
    if (!['approuvee', 'archivee'].includes(traduction.statut)) {
      throw new Error('TRADUCTION_NON_APPROUVEE');
    }

    const pdf = await genererPDFTraduction(traduction);
    const disposition = req.query.apercu === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="traduction-${id}.pdf"`);
    res.send(pdf);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── GET /api/traductions/:id/export/docx ──────────────────────────────────
export async function exporterDOCX(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    await verifierAcces(req, id);

    const traduction = await traductionService.getTraduction(id);
    if (!['approuvee', 'archivee'].includes(traduction.statut)) {
      throw new Error('TRADUCTION_NON_APPROUVEE');
    }

    const docx = await genererDOCXTraduction(traduction);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="traduction-${id}.docx"`);
    res.send(docx);
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

// ── PATCH /api/traductions/:id/relancer ───────────────────────────────────
export async function relancer(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.relancerTraduction(id, req.user!.userId);
    res.json(traduction);
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

    const { texte, origine } = req.query;
    if (!texte || typeof texte !== 'string') {
      res.status(400).json({ message: 'Paramètre texte requis.' });
      return;
    }

    const traduction = await traductionService.getTraduction(id);
    // origine=source → langue de départ de la traduction ; origine=traduction (défaut) →
    // langue d'arrivée. Le texte sélectionné n'est jamais dans la langue "direction" globale
    // quand il vient du panneau traduction.
    const langueSource = traduction.direction === 'fr_en' ? 'fr' : 'en';
    const langueCible = traduction.direction === 'fr_en' ? 'en' : 'fr';
    const langue = origine === 'source' ? langueSource : langueCible;

    const resultats = await traductionService.getSuggestionsGlossaire(texte, langue);

    res.json(resultats);
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── DELETE /api/traductions/:id ───────────────────────────────────────────
export async function supprimer(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.supprimerTraduction(id, req.user!.userId);
    res.json({ traduction, message: 'Traduction supprimée.' });
  } catch (error) {
    handleTraductionError(res, error);
  }
}

// ── PATCH /api/traductions/:id/restaurer ──────────────────────────────────
export async function restaurer(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const traduction = await traductionService.restaurerTraduction(id, req.user!.userId);
    res.json({ traduction, message: 'Traduction restaurée.' });
  } catch (error) {
    handleTraductionError(res, error);
  }
}
