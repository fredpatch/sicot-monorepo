import { db } from '@/db/index.js';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { sendNotificationManuelle } from '@/utils/email.js';
import { toNotificationView, verifierDejaNotifieAujourdhui } from './notifications.helpers';
import type { NotificationType, NotificationStatut, NotificationView, EnvoyerNotificationParams } from './notifications.types';

export type {
  NotificationType,
  NotificationStatut,
  NotificationView,
  EnvoyerNotificationParams,
} from './notifications.types';

// ── SERVICE : Envoyer une notification ciblée ─────────────────────────────
export async function envoyerNotificationCiblee(
  params: EnvoyerNotificationParams
): Promise<NotificationView> {
  if (!params.destinataireEmail) {
    throw new Error('EMAIL_DESTINATAIRE_REQUIS');
  }

  // Avertissement non bloquant si déjà notifié aujourd'hui sur cette entité
  const dejaNotifieAujourdhui = await verifierDejaNotifieAujourdhui(params.type, params.entiteId);

  let statut: NotificationStatut = 'envoyee';
  let erreur: string | undefined;

  try {
    await sendNotificationManuelle({
      to: params.destinataireEmail,
      nomDestinataire: params.destinataireNom,
      objet: params.objet,
      message: params.message,
    });
  } catch (err) {
    statut = 'echec';
    erreur = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[notifications] Échec envoi:', err);
  }

  const [notif] = await db
    .insert(notifications)
    .values({
      type: params.type,
      entiteId: params.entiteId,
      destinataireEmail: params.destinataireEmail,
      destinataireNom: params.destinataireNom,
      message: params.message,
      declenchePar: params.userId,
      statut,
      erreur,
    })
    .returning();

  await logAudit({
    userId: params.userId,
    action: 'NOTIFICATION_ENVOYEE',
    module: 'NOTIF',
    entiteId: params.entiteId,
    details: {
      type: params.type,
      destinataireEmail: params.destinataireEmail,
      statut,
      dejaNotifieAujourdhui,
    },
  });

  if (statut === 'echec') {
    throw new Error('ENVOI_ECHEC:' + erreur);
  }

  return toNotificationView(notif);
}

// ── SERVICE : Historique des notifications pour une entité ───────────────
export async function getHistoriqueEntite(
  type: NotificationType,
  entiteId: number
): Promise<NotificationView[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.type, type), eq(notifications.entiteId, entiteId)))
    .orderBy(desc(notifications.createdAt));

  return rows.map((n) => toNotificationView(n));
}

// ── SERVICE : Notifications récentes (dashboard) ──────────────────────────
export async function getNotificationsRecentes(limite: number = 10): Promise<NotificationView[]> {
  const rows = await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limite);

  return rows.map((n) => toNotificationView(n));
}
