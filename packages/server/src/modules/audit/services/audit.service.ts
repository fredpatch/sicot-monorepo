import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq, gte, lte, ilike, and, desc } from 'drizzle-orm';
import { toAuditLogView } from './audit.helpers';
import type { AuditFilters, AuditLogView } from './audit.types';

export type { AuditFilters, AuditLogView } from './audit.types';

// ── SERVICE : Lister les entrées du journal ────────────────────────────────
export async function listerAuditLogs(filters: AuditFilters): Promise<{
  data: AuditLogView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  // Construction des conditions
  const conditions = construireConditions(filters);

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

  const data: AuditLogView[] = rows.map(toAuditLogView);

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

  return toAuditLogView(row);
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

// ── Construction des conditions de filtre — partagée liste + export ───────
function construireConditions(filters: AuditFilters) {
  const conditions = [];

  if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters.module) conditions.push(eq(auditLogs.module, filters.module));
  if (filters.action) conditions.push(ilike(auditLogs.action, `%${filters.action}%`));
  if (filters.dateDebut) conditions.push(gte(auditLogs.createdAt, filters.dateDebut));
  if (filters.dateFin) conditions.push(lte(auditLogs.createdAt, filters.dateFin));

  return conditions;
}

// ── SERVICE : Lister pour export — sans pagination, plafonné ──────────────
// Les exports PDF/Excel portent sur l'ensemble des résultats filtrés, pas
// seulement la page affichée. Plafond de sécurité pour éviter une requête
// incontrôlée si les filtres sont trop larges (ex: aucune date).
const EXPORT_LIMITE_MAX = 10000;

export async function listerAuditLogsExport(
  filters: AuditFilters
): Promise<{ data: AuditLogView[]; tronque: boolean }> {
  const conditions = construireConditions(filters);

  const rows = await db
    .select({
      log: auditLogs,
      user: { matricule: users.matricule, nom: users.nom, prenom: users.prenom },
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(EXPORT_LIMITE_MAX + 1);

  const tronque = rows.length > EXPORT_LIMITE_MAX;
  const data = rows.slice(0, EXPORT_LIMITE_MAX).map(toAuditLogView);

  return { data, tronque };
}
