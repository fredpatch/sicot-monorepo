import { db } from '@/db/index.js';
import { notifications } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import type { NotificationType, NotificationStatut, NotificationView } from './notifications.types';

export function toNotificationView(
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

// ── Vérifier si déjà notifié aujourd'hui sur cette entité ────────────────
export async function verifierDejaNotifieAujourdhui(
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
