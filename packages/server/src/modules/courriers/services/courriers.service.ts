import { db } from '@/db/index';
import { courriers, accords, missions } from '@/db/schema';
import { eq, ilike, and, or, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { chargerSeuils, genererReference, toCourrierView } from './courriers.helpers';
import type {
  CreateCourrierParams,
  UpdateCourrierParams,
  CourrierFilters,
  CourrierView,
} from './courriers.types';

export type {
  CourrierDirection,
  CourrierReponseStatut,
  CourrierSuiviStatut,
  CourrierCriticite,
  CreateCourrierParams,
  UpdateCourrierParams,
  CourrierFilters,
  OrganisationResume,
  CourrierView,
} from './courriers.types';

// ── SERVICE : Lister les courriers ────────────────────────────────────────
export async function listerCourriers(filters: CourrierFilters): Promise<{
  data: CourrierView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(courriers.objet, `%${filters.search}%`),
        ilike(courriers.reference, `%${filters.search}%`)
      )
    );
  }

  if (filters.direction) {
    conditions.push(eq(courriers.direction, filters.direction));
  }

  if (filters.suiviStatut) {
    conditions.push(eq(courriers.suiviStatut, filters.suiviStatut));
  }

  if (filters.reponseRequise) {
    conditions.push(eq(courriers.reponseRequise, filters.reponseRequise));
  }

  // Courriers entrants sans réponse — pour le dashboard M9
  if (filters.sansReponse) {
    conditions.push(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )!
    );
  }

  if (filters.organisationId) {
    conditions.push(
      or(
        eq(courriers.expediteurOrganisationId, filters.organisationId),
        eq(courriers.destinataireOrganisationId, filters.organisationId)
      )
    );
  }

  const rows = await db
    .select()
    .from(courriers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(courriers.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Charger les seuils une seule fois pour tout le batch
  const seuils = await chargerSeuils();

  const data = await Promise.all(rows.map((c) => toCourrierView(c, seuils)));

  const total = await db.$count(courriers, conditions.length > 0 ? and(...conditions) : undefined);

  return { data, total };
}

// ── SERVICE : Récupérer un courrier par ID ────────────────────────────────
export async function getCourrier(id: number): Promise<CourrierView> {
  const [courrier] = await db.select().from(courriers).where(eq(courriers.id, id));
  if (!courrier) throw new Error('COURRIER_INTROUVABLE');

  const seuils = await chargerSeuils();

  return toCourrierView(courrier, seuils);
}

// ── SERVICE : Créer un courrier ───────────────────────────────────────────
export async function creerCourrier(params: CreateCourrierParams): Promise<CourrierView> {
  // Vérifier que le courrier parent existe si fil de correspondance
  if (params.reponseAId) {
    const [parent] = await db.select().from(courriers).where(eq(courriers.id, params.reponseAId));
    if (!parent) throw new Error('COURRIER_PARENT_INTROUVABLE');
  }

  // Vérifier que l'accord existe si rattachement
  if (params.accordId) {
    const [accord] = await db.select().from(accords).where(eq(accords.id, params.accordId));
    if (!accord) throw new Error('ACCORD_INTROUVABLE');
  }

  // Vérifier que la mission existe si rattachement
  if (params.missionId) {
    const [mission] = await db.select().from(missions).where(eq(missions.id, params.missionId));
    if (!mission) throw new Error('MISSION_INTROUVABLE');
  }

  const reference = await genererReference();

  const [courrier] = await db
    .insert(courriers)
    .values({
      reference,
      direction: params.direction,
      objet: params.objet,
      expediteurOrganisationId: params.expediteurOrganisationId,
      destinataireOrganisationId: params.destinataireOrganisationId,
      dateReception: params.dateReception,
      reponseRequise: params.reponseRequise,
      dateLimiteReponse: params.dateLimiteReponse,
      suiviStatut: 'en_attente',
      reponseAId: params.reponseAId,
      accordId: params.accordId,
      missionId: params.missionId,
      documentId: params.documentId,
      createdPar: params.createdByUserId,
    })
    .returning();

  // Si c'est une réponse à un courrier entrant, marquer le parent comme répondu
  if (params.reponseAId && params.direction === 'sortant') {
    await db
      .update(courriers)
      .set({ suiviStatut: 'repondu', updatedAt: new Date() })
      .where(eq(courriers.id, params.reponseAId));
  }

  await logAudit({
    userId: params.createdByUserId,
    action: 'COURRIER_CREE',
    module: 'M4',
    entiteId: courrier.id,
    details: {
      reference,
      direction: params.direction,
      reponseAId: params.reponseAId,
    },
  });

  const seuils = await chargerSeuils();

  return toCourrierView(courrier, seuils);
}

// ── SERVICE : Mettre à jour un courrier ───────────────────────────────────
export async function mettreAJourCourrier(
  id: number,
  params: UpdateCourrierParams
): Promise<CourrierView> {
  const [existant] = await db.select().from(courriers).where(eq(courriers.id, id));

  if (!existant) throw new Error('COURRIER_INTROUVABLE');

  const updates: Partial<typeof courriers.$inferInsert> = {};
  if (params.objet !== undefined) updates.objet = params.objet;
  if (params.suiviStatut !== undefined) updates.suiviStatut = params.suiviStatut;
  if (params.dateLimiteReponse !== undefined) updates.dateLimiteReponse = params.dateLimiteReponse;
  if (params.accordId !== undefined) updates.accordId = params.accordId;
  if (params.missionId !== undefined) updates.missionId = params.missionId;
  if (params.documentId !== undefined) updates.documentId = params.documentId;

  const [updated] = await db
    .update(courriers)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(courriers.id, id))
    .returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'COURRIER_MODIFIE',
    module: 'M4',
    entiteId: id,
    details: updates,
  });

  const seuils = await chargerSeuils();

  return toCourrierView(updated, seuils);
}

// ── SERVICE : Courriers sans réponse ──────────────────────────────────────
// Pour le dashboard M9 — courriers entrants nécessitant une réponse
export async function getCouriersSansReponse(): Promise<CourrierView[]> {
  const rows = await db
    .select()
    .from(courriers)
    .where(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    )
    .orderBy(courriers.dateReception);

  const seuils = await chargerSeuils();

  return Promise.all(rows.map((c) => toCourrierView(c, seuils)));
}

// ── SERVICE : Fil de correspondance ───────────────────────────────────────
// Récupérer tous les courriers liés (réponses à un courrier entrant)
export async function getFilCorrespondance(courrierId: number): Promise<CourrierView[]> {
  const rows = await db
    .select()
    .from(courriers)
    .where(eq(courriers.reponseAId, courrierId))
    .orderBy(courriers.createdAt);

  const seuils = await chargerSeuils();

  return Promise.all(rows.map((c) => toCourrierView(c, seuils)));
}
