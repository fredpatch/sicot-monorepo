import { Request, Response } from 'express';
import * as organisationsService from '../services/organisations.service.js';

// ── Traduction des codes d'erreur ─────────────────────────────────────────
function handleOrganisationsError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    ORGANISATION_INTROUVABLE: { status: 404, message: 'Organisation introuvable.' },
    ORGANISATION_EXISTANTE: { status: 409, message: 'Une organisation avec ce nom existe déjà.' },
    CONTACT_INTROUVABLE: { status: 404, message: 'Contact introuvable.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[organisations.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── GET /api/organisations ────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, pays, region, type, actif, page, pageSize } = req.query;

    const result = await organisationsService.listerOrganisations({
      search: search as string | undefined,
      pays: pays as string | undefined,
      region: region as string | undefined,
      type: type as organisationsService.OrganisationType | undefined,
      actif: actif !== undefined ? actif === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── GET /api/organisations/meta/pays ──────────────────────────────────────
export async function getPays(req: Request, res: Response): Promise<void> {
  try {
    const pays = await organisationsService.getPaysDisponibles();
    res.json(pays);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── GET /api/organisations/meta/regions ───────────────────────────────────
export async function getRegions(req: Request, res: Response): Promise<void> {
  try {
    const regions = await organisationsService.getRegionsDisponibles();
    res.json(regions);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── GET /api/organisations/:id ────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const organisation = await organisationsService.getOrganisation(id);
    res.json(organisation);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── POST /api/organisations ───────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { nom, pays, region, type, notes } = req.body;

    if (!nom || !pays || !type) {
      res.status(400).json({ message: 'Champs requis : nom, pays, type.' });
      return;
    }

    const typesValides = ['anac_etrangere', 'organisation_internationale', 'autre'];
    if (!typesValides.includes(type)) {
      res.status(400).json({ message: 'Type invalide.' });
      return;
    }

    const organisation = await organisationsService.creerOrganisation({
      nom,
      pays,
      region,
      type,
      notes,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(organisation);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── PATCH /api/organisations/:id ──────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { nom, pays, region, type, actif, notes } = req.body;

    if (!nom && !pays && !region && !type && actif === undefined && !notes) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    const organisation = await organisationsService.mettreAJourOrganisation(id, {
      nom,
      pays,
      region,
      type,
      actif,
      notes,
      updatedByUserId: req.user!.userId,
    });

    res.json(organisation);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── GET /api/organisations/:id/contacts ───────────────────────────────────
export async function listerContacts(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const contactsList = await organisationsService.listerContacts(id);
    res.json(contactsList);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── POST /api/organisations/:id/contacts ──────────────────────────────────
export async function creerContact(req: Request, res: Response): Promise<void> {
  try {
    const organisationId = parseInt(req.params.id);
    if (isNaN(organisationId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { nom, prenom, email, telephone, poste, principal } = req.body;

    if (!nom || !prenom) {
      res.status(400).json({ message: 'Champs requis : nom, prenom.' });
      return;
    }

    const contact = await organisationsService.creerContact({
      organisationId,
      nom,
      prenom,
      email,
      telephone,
      poste,
      principal: principal === true,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json(contact);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── PATCH /api/organisations/contacts/:contactId ──────────────────────────
export async function mettreAJourContact(req: Request, res: Response): Promise<void> {
  try {
    const contactId = parseInt(req.params.contactId);
    if (isNaN(contactId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { nom, prenom, email, telephone, poste, actif } = req.body;

    if (!nom && !prenom && !email && !telephone && !poste && actif === undefined) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

    const contact = await organisationsService.mettreAJourContact(contactId, {
      nom,
      prenom,
      email,
      telephone,
      poste,
      actif,
      updatedByUserId: req.user!.userId,
    });

    res.json(contact);
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}

// ── PATCH /api/organisations/contacts/:contactId/principal ────────────────
export async function definirPrincipal(req: Request, res: Response): Promise<void> {
  try {
    const contactId = parseInt(req.params.contactId);
    if (isNaN(contactId)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const contact = await organisationsService.definirContactPrincipal(contactId, req.user!.userId);

    res.json({ contact, message: 'Contact principal défini.' });
  } catch (error) {
    handleOrganisationsError(res, error);
  }
}
