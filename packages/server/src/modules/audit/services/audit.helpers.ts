import { auditLogs } from '@/db/schema';
import type { AuditLogView } from './audit.types';

export function toAuditLogView(row: {
  log: typeof auditLogs.$inferSelect;
  user: { matricule?: string; nom?: string; prenom?: string } | null;
}): AuditLogView {
  return {
    id: row.log.id,
    userId: row.log.userId ?? undefined,
    userMatricule: row.user?.matricule,
    userNom: row.user?.nom,
    userPrenom: row.user?.prenom,
    action: row.log.action,
    module: row.log.module,
    entiteId: row.log.entiteId ?? undefined,
    details: row.log.details as Record<string, unknown> | undefined,
    ip: row.log.ip ?? undefined,
    createdAt: row.log.createdAt,
  };
}
