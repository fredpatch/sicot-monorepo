import { db } from '@/db/index.js';
import { notifications } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { sendNotificationManuelle } from '@/utils/email.js';

// ── Types ──────────────────────────────────────────────────────────────────
export type NotificationType = 'accord_echeance' | 'courrier_relance' | 'recommandation_rappel';
export type NotificationStatut = 'envoyee' | 'echec';

export interface NotificationView {
  id: number;
  type: NotificationType;
  entiteId: number;
  destinataireEmail: string;
  destinataireNom?: string;
  message: string;
  declenchePar: number;
  declencheParNom?: string;
  statut: NotificationStatut;
  erreur?: string;
  createdAt: Date;
}

export interface EnvoyerNotificationParams {
  type: NotificationType;
  entiteId: number;
  destinataireEmail: string;
  destinataireNom?: string;
  objet: string;
  message: string;
  userId: number;
}

// ── Utilitaire ─────────────────────────────────────────────────────────────
function toNotificationView(
  n: typeof notifications.$inferSelect,
  declencheParNom?: string
): NotificationView {
  return {
    id: n.id,
    type: n.type as NotificationType,
    entiteId: n.entiteId,
    destinataireEmail: n.destinataireEmail,
    destinataireNom: n.destinataireNom ?? undefined,
    message: n.message,
    declenchePar: n.declenchePar,
    declencheParNom,
    statut: n.statut as NotificationStatut,
    erreur: n.erreur ?? undefined,
    createdAt: n.createdAt,
  };
}

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

// ── Vérifier si déjà notifié aujourd'hui sur cette entité ────────────────
async function verifierDejaNotifieAujourdhui(
  type: NotificationType,
  entiteId: number
): Promise<boolean> {
  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.type, type),
        eq(notifications.entiteId, entiteId),
        gte(notifications.createdAt, debutJournee)
      )
    );

  return rows.length > 0;
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
