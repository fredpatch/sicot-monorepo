import { db } from '@/db/index';
import { missions, missionParticipants, recommandations, users, contacts } from '@/db/schema';
import { eq, ilike, and, or, desc, isNotNull } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { sendRecommandationEmail } from '@/utils/email';
import {
  getParticipantsMission,
  getRecommandationsMission,
  toMissionView,
  toRecommandationView,
  getContactSurPlace,
  getResponsableSansEmail,
} from './missions.helpers';
import type {
  MissionStatut,
  RecommandationStatut,
  LogistiqueStatut,
  ContactResume,
  CreateMissionParams,
  UpdateMissionParams,
  CreateRecommandationParams,
  UpdateRecommandationParams,
  MissionFilters,
  ParticipantResume,
  RecommandationView,
  MissionView,
} from './missions.types';

export type {
  MissionStatut,
  RecommandationStatut,
  LogistiqueStatut,
  ContactResume,
  CreateMissionParams,
  UpdateMissionParams,
  CreateRecommandationParams,
  UpdateRecommandationParams,
  MissionFilters,
  ParticipantResume,
  RecommandationView,
  MissionView,
} from './missions.types';

// ── SERVICE : Lister les missions ─────────────────────────────────────────
export async function listerMissions(filters: MissionFilters): Promise<{
  data: MissionView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(missions.titre, `%${filters.search}%`),
        ilike(missions.destination, `%${filters.search}%`)
      )
    );
  }

  if (filters.statut) {
    conditions.push(eq(missions.statut, filters.statut));
  }

  if (filters.pays) {
    conditions.push(ilike(missions.pays, `%${filters.pays}%`));
  }

  const rows = await db
    .select()
    .from(missions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(missions.dateDebut))
    .limit(pageSize)
    .offset(offset);

  const data = await Promise.all(
    rows.map(async (mission) => {
      const participants = await getParticipantsMission(mission.id);
      const contactSurPlace = await getContactSurPlace(mission.contactSurPlaceId ?? undefined);
      return toMissionView(mission, participants, undefined, contactSurPlace);
    })
  );

  const total = await db.$count(missions, conditions.length > 0 ? and(...conditions) : undefined);

  return { data, total };
}

// ── SERVICE : Récupérer une mission par ID ────────────────────────────────
export async function getMission(id: number): Promise<MissionView> {
  const [mission] = await db.select().from(missions).where(eq(missions.id, id));

  if (!mission) throw new Error('MISSION_INTROUVABLE');

  const participants = await getParticipantsMission(id);
  const recommandationsList = await getRecommandationsMission(id);
  const contactSurPlace = await getContactSurPlace(mission.contactSurPlaceId ?? undefined);

  return toMissionView(mission, participants, recommandationsList, contactSurPlace);
}

// ── SERVICE : Créer une mission ───────────────────────────────────────────
export async function creerMission(params: CreateMissionParams): Promise<MissionView> {
  if (params.dateDebut >= params.dateFin) {
    throw new Error('DATES_INVALIDES');
  }

  for (const userId of params.participantsIds) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error(`PARTICIPANT_INTROUVABLE:${userId}`);
  }

  // Vérifier que le contact existe si fourni
  if (params.contactSurPlaceId) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, params.contactSurPlaceId));
    if (!contact) throw new Error('CONTACT_INTROUVABLE');
  }

  const [mission] = await db
    .insert(missions)
    .values({
      titre: params.titre,
      destination: params.destination,
      pays: params.pays,
      dateDebut: params.dateDebut,
      dateFin: params.dateFin,
      statut: 'planifiee',
      contactSurPlaceId: params.contactSurPlaceId,
      createdPar: params.createdByUserId,
    })
    .returning();

  if (params.participantsIds.length > 0) {
    await db.insert(missionParticipants).values(
      params.participantsIds.map((userId) => ({
        missionId: mission.id,
        userId,
      }))
    );
  }

  await logAudit({
    userId: params.createdByUserId,
    action: 'MISSION_CREEE',
    module: 'M3',
    entiteId: mission.id,
    details: {
      titre: params.titre,
      destination: params.destination,
      participants: params.participantsIds,
    },
  });

  const participants = await getParticipantsMission(mission.id);
  const contactSurPlace = await getContactSurPlace(params.contactSurPlaceId);
  return toMissionView(mission, participants, [], contactSurPlace);
}

// ── SERVICE : Mettre à jour une mission ───────────────────────────────────
export async function mettreAJourMission(
  id: number,
  params: UpdateMissionParams
): Promise<MissionView> {
  const [existante] = await db.select().from(missions).where(eq(missions.id, id));

  if (!existante) throw new Error('MISSION_INTROUVABLE');

  if (existante.statut === 'annulee') {
    throw new Error('MISSION_ANNULEE');
  }

  if (params.contactSurPlaceId !== undefined) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, params.contactSurPlaceId));
    if (!contact) throw new Error('CONTACT_INTROUVABLE');
  }

  const updates: Partial<typeof missions.$inferInsert> = {};
  if (params.titre !== undefined) updates.titre = params.titre;
  if (params.destination !== undefined) updates.destination = params.destination;
  if (params.pays !== undefined) updates.pays = params.pays;
  if (params.dateDebut !== undefined) updates.dateDebut = params.dateDebut;
  if (params.dateFin !== undefined) updates.dateFin = params.dateFin;
  if (params.statut !== undefined) updates.statut = params.statut;
  if (params.rapportDocumentId !== undefined) {
    updates.rapportDocumentId = params.rapportDocumentId;
  }
  if (params.confirmationLogistique !== undefined) {
    updates.confirmationLogistique = params.confirmationLogistique;
  }
  if (params.contactSurPlaceId !== undefined) {
    updates.contactSurPlaceId = params.contactSurPlaceId;
  }

  const [updated] = await db
    .update(missions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(missions.id, id))
    .returning();

  if (params.participantsIds && params.participantsIds.length > 0) {
    await db.delete(missionParticipants).where(eq(missionParticipants.missionId, id));
    await db.insert(missionParticipants).values(
      params.participantsIds.map((userId) => ({
        missionId: id,
        userId,
      }))
    );
  }

  await logAudit({
    userId: params.updatedByUserId,
    action: 'MISSION_MODIFIEE',
    module: 'M3',
    entiteId: id,
    details: updates,
  });

  const participants = await getParticipantsMission(id);
  const recommandationsList = await getRecommandationsMission(id);
  const contactSurPlace = await getContactSurPlace(updated.contactSurPlaceId ?? undefined);
  return toMissionView(updated, participants, recommandationsList, contactSurPlace);
}

// ── SERVICE : Ajouter une recommandation ──────────────────────────────────
export async function ajouterRecommandation(
  params: CreateRecommandationParams
): Promise<RecommandationView> {
  const [mission] = await db.select().from(missions).where(eq(missions.id, params.missionId));

  if (!mission) throw new Error('MISSION_INTROUVABLE');

  const [rec] = await db
    .insert(recommandations)
    .values({
      missionId: params.missionId,
      texte: params.texte,
      responsableId: params.responsableId,
      dateLimite: params.dateLimite,
      statut: 'en_attente',
    })
    .returning();

  // Envoyer email au responsable si date limite définie
  if (params.responsableId && params.dateLimite) {
    const [responsable] = await db.select().from(users).where(eq(users.id, params.responsableId));

    if (responsable?.email) {
      try {
        await sendRecommandationEmail({
          to: responsable.email,
          nomDestinataire: `${responsable.prenom} ${responsable.nom}`,
          texteRecommandation: params.texte,
          missionTitre: mission.titre,
          dateLimite: params.dateLimite,
        });
      } catch (error) {
        console.warn('[missions] Échec envoi email recommandation:', error);
      }
    }
  }

  await logAudit({
    userId: params.createdByUserId,
    action: 'RECOMMANDATION_AJOUTEE',
    module: 'M3',
    entiteId: rec.id,
    details: { missionId: params.missionId },
  });

  return toRecommandationView(rec);
}

// ── SERVICE : Mettre à jour une recommandation ────────────────────────────
export async function mettreAJourRecommandation(
  id: number,
  params: UpdateRecommandationParams
): Promise<RecommandationView> {
  const [existante] = await db.select().from(recommandations).where(eq(recommandations.id, id));

  if (!existante) throw new Error('RECOMMANDATION_INTROUVABLE');

  const updates: Partial<typeof recommandations.$inferInsert> = {};
  if (params.texte !== undefined) updates.texte = params.texte;
  if (params.responsableId !== undefined) updates.responsableId = params.responsableId;
  if (params.dateLimite !== undefined) updates.dateLimite = params.dateLimite;
  if (params.statut !== undefined) updates.statut = params.statut;

  const [updated] = await db
    .update(recommandations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(recommandations.id, id))
    .returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'RECOMMANDATION_MODIFIEE',
    module: 'M3',
    entiteId: id,
    details: updates,
  });

  return toRecommandationView(updated);
}

// ── SERVICE : Recommandations en attente ──────────────────────────────────
// Pour le dashboard M9
export async function getRecommandationsEnAttente(): Promise<RecommandationView[]> {
  const rows = await db
    .select()
    .from(recommandations)
    .where(and(eq(recommandations.statut, 'en_attente'), isNotNull(recommandations.dateLimite)))
    .orderBy(recommandations.dateLimite);

  return Promise.all(
    rows.map(async (rec) => {
      const responsable = rec.responsableId
        ? await getResponsableSansEmail(rec.responsableId)
        : undefined;
      return toRecommandationView(rec, responsable);
    })
  );
}
