import { db } from '../../../db';
import { auditLogs, users } from '../../../db/schema';
import { eq, gte, lte, ilike, and, desc } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuditFilters {
  userId?: number;
  module?: string;
  action?: string;
  dateDebut?: Date;
  dateFin?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogView {
  id: number;
  userId?: number;
  userMatricule?: string;
  userNom?: string;
  userPrenom?: string;
  action: string;
  module: string;
  entiteId?: number;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

// ── SERVICE : Lister les entrées du journal ────────────────────────────────
export async function listerAuditLogs(filters: AuditFilters): Promise<{
  data: AuditLogView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  // Construction des conditions
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.module) {
    conditions.push(eq(auditLogs.module, filters.module));
  }

  if (filters.action) {
    conditions.push(ilike(auditLogs.action, `%${filters.action}%`));
  }

  if (filters.dateDebut) {
    conditions.push(gte(auditLogs.createdAt, filters.dateDebut));
  }

  if (filters.dateFin) {
    conditions.push(lte(auditLogs.createdAt, filters.dateFin));
  }

  // Jointure avec users pour afficher les infos de l'auteur
  const rows = await db
    .select({
      log: auditLogs,
      user: {
        matricule: users.matricule,
        nom: users.nom,
        prenom: users.prenom,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const data: AuditLogView[] = rows.map(({ log, user }) => ({
    id: log.id,
    userId: log.userId ?? undefined,
    userMatricule: user?.matricule,
    userNom: user?.nom,
    userPrenom: user?.prenom,
    action: log.action,
    module: log.module,
    entiteId: log.entiteId ?? undefined,
    details: log.details as Record<string, unknown> | undefined,
    ip: log.ip ?? undefined,
    createdAt: log.createdAt,
  }));

  // Compte total pour la pagination
  const total = await db.$count(auditLogs, conditions.length > 0 ? and(...conditions) : undefined);

  return { data, total };
}

// ── SERVICE : Récupérer une entrée par ID ──────────────────────────────────
export async function getAuditLog(id: number): Promise<AuditLogView> {
  const [row] = await db
    .select({
      log: auditLogs,
      user: {
        matricule: users.matricule,
        nom: users.nom,
        prenom: users.prenom,
      },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.id, id));

  if (!row) throw new Error('AUDIT_LOG_INTROUVABLE');

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

// ── SERVICE : Liste des modules distincts ──────────────────────────────────
// Utile pour alimenter le filtre "Module" dans l'interface
export async function getModulesDisponibles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ module: auditLogs.module })
    .from(auditLogs)
    .orderBy(auditLogs.module);

  return rows.map((r) => r.module);
}

// ── SERVICE : Liste des actions distinctes ─────────────────────────────────
export async function getActionsDisponibles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action);

  return rows.map((r) => r.action);
}
