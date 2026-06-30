import { Request, Response } from 'express';
import * as notificationsService from '../services/notifications.service.js';

function handleNotificationsError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  if (message === 'EMAIL_DESTINATAIRE_REQUIS') {
    res.status(400).json({
      message: 'Email destinataire requis — vérifiez la fiche contact.',
      code: message,
    });
    return;
  }

  if (message.startsWith('ENVOI_ECHEC:')) {
    res.status(502).json({
      message: "Échec de l'envoi de l'email. La notification a été enregistrée comme échouée.",
      code: 'ENVOI_ECHEC',
      detail: message.split(':')[1],
    });
    return;
  }

  console.error('[notifications.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── POST /api/notifications/envoyer ───────────────────────────────────────
export async function envoyer(req: Request, res: Response): Promise<void> {
  try {
    const { type, entiteId, destinataireEmail, destinataireNom, objet, message } = req.body;

    if (!type || !entiteId || !destinataireEmail || !objet || !message) {
      res.status(400).json({
        message: 'Champs requis : type, entiteId, destinataireEmail, objet, message.',
      });
      return;
    }

    const notification = await notificationsService.envoyerNotificationCiblee({
      type,
      entiteId: parseInt(entiteId),
      destinataireEmail,
      destinataireNom,
      objet,
      message,
      userId: req.user!.userId,
    });

    res.status(201).json(notification);
  } catch (error) {
    handleNotificationsError(res, error);
  }
}

// ── GET /api/notifications/historique/:type/:entiteId ────────────────────
export async function historiqueEntite(req: Request, res: Response): Promise<void> {
  try {
    const { type, entiteId } = req.params;
    const id = parseInt(entiteId);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const historique = await notificationsService.getHistoriqueEntite(
      type as notificationsService.NotificationType,
      id
    );

    res.json(historique);
  } catch (error) {
    handleNotificationsError(res, error);
  }
}

// ── GET /api/notifications/recentes ───────────────────────────────────────
export async function recentes(req: Request, res: Response): Promise<void> {
  try {
    const { limite } = req.query;
    const notifications = await notificationsService.getNotificationsRecentes(
      limite ? parseInt(limite as string) : 10
    );
    res.json(notifications);
  } catch (error) {
    handleNotificationsError(res, error);
  }
}
