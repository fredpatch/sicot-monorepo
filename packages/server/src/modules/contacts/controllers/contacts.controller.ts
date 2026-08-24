import { Request, Response } from 'express';
import * as contactsService from '../services/contacts.service';

// ── GET /api/contacts ───────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, actif, organisationId, pageSize } = req.query;

    const data = await contactsService.listerContacts({
      search: search as string | undefined,
      actif: actif !== undefined ? actif === 'true' : undefined,
      organisationId: organisationId ? parseInt(organisationId as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json({ data });
  } catch (error) {
    console.error('[contacts.controller]', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}
