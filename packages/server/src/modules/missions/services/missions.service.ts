import { db } from '@/db/index';
import { missions, missionParticipants, recommandations, users } from '@/db/schema';
import { eq, ilike, and, or, desc, isNotNull } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { sendRecommandationEmail } from '@/utils/email';

// ── Types ──────────────────────────────────────────────────────────────────
export type MissionStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type RecommandationStatut = 'en_attente' | 'en_cours' | 'realisee';

export interface CreateMissionParams {
  titre: string;
  destination: string;
  pays: string;
  dateDebut: Date;
  dateFin: Date;
  participantsIds: number[];
  createdByUserId: number;
}

export interface UpdateMissionParams {
  titre?: string;
  destination?: string;
  pays?: string;
  dateDebut?: Date;
  dateFin?: Date;
  statut?: MissionStatut;
  participantsIds?: number[];
  rapportDocumentId?: number;
  updatedByUserId: number;
}

export interface CreateRecommandationParams {
  missionId: number;
  texte: string;
  responsableId?: number;
  dateLimite?: Date;
  createdByUserId: number;
}

export interface UpdateRecommandationParams {
  texte?: string;
  responsableId?: number;
  dateLimite?: Date;
  statut?: RecommandationStatut;
  updatedByUserId: number;
}

export interface MissionFilters {
  search?: string;
  statut?: MissionStatut;
  pays?: string;
  participantId?: number;
  page?: number;
  pageSize?: number;
}

export interface ParticipantResume {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string; // ← ajouter
}

export interface RecommandationView {
  id: number;
  missionId: number;
  texte: string;
  responsableId?: number;
  responsable?: ParticipantResume;
  dateLimite?: Date;
  statut: RecommandationStatut;
  createdAt: Date;
  updatedAt: Date;
}

export interface MissionView {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: Date;
  dateFin: Date;
  statut: MissionStatut;
  participants: ParticipantResume[];
  recommandations?: RecommandationView[];
  rapportDocumentId?: number;
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Utilitaires ────────────────────────────────────────────────────────────
async function getParticipantsMission(missionId: number): Promise<ParticipantResume[]> {
  const rows = await db
    .select({
      id: users.id,
      matricule: users.matricule,
      nom: users.nom,
      prenom: users.prenom,
    })
    .from(missionParticipants)
    .innerJoin(users, eq(missionParticipants.userId, users.id))
    .where(eq(missionParticipants.missionId, missionId));

  return rows;
}

async function getRecommandationsMission(missionId: number): Promise<RecommandationView[]> {
  const rows = await db
    .select()
    .from(recommandations)
    .where(eq(recommandations.missionId, missionId))
    .orderBy(recommandations.createdAt);

  return Promise.all(
    rows.map(async (rec) => {
      let responsable: ParticipantResume | undefined;

      if (rec.responsableId) {
        const [user] = await db
          .select({
            id: users.id,
            matricule: users.matricule,
            nom: users.nom,
            prenom: users.prenom,
            email: users.email, // ← ajouter
          })
          .from(users)
          .where(eq(users.id, rec.responsableId));
        responsable = user;
      }

      return {
        id: rec.id,
        missionId: rec.missionId,
        texte: rec.texte,
        responsableId: rec.responsableId ?? undefined,
        responsable,
        dateLimite: rec.dateLimite ?? undefined,
        statut: rec.statut as RecommandationStatut,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      };
    })
  );
}

function toMissionView(
  mission: typeof missions.$inferSelect,
  participants: ParticipantResume[],
  recommandationsList?: RecommandationView[]
): MissionView {
  return {
    id: mission.id,
    titre: mission.titre,
    destination: mission.destination,
    pays: mission.pays,
    dateDebut: mission.dateDebut,
    dateFin: mission.dateFin,
    statut: mission.statut as MissionStatut,
    participants,
    recommandations: recommandationsList,
    rapportDocumentId: mission.rapportDocumentId ?? undefined,
    createdPar: mission.createdPar ?? undefined,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
  };
}

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
      return toMissionView(mission, participants);
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

  return toMissionView(mission, participants, recommandationsList);
}

// ── SERVICE : Créer une mission ───────────────────────────────────────────
export async function creerMission(params: CreateMissionParams): Promise<MissionView> {
  if (params.dateDebut >= params.dateFin) {
    throw new Error('DATES_INVALIDES');
  }

  // Vérifier que les participants existent
  for (const userId of params.participantsIds) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error(`PARTICIPANT_INTROUVABLE:${userId}`);
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
      createdPar: params.createdByUserId,
    })
    .returning();

  // Ajouter les participants
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
  return toMissionView(mission, participants, []);
}

// ── SERVICE : Mettre à jour une mission ───────────────────────────────────
export async function mettreAJourMission(
  id: number,
  params: UpdateMissionParams
): Promise<MissionView> {
  const [existante] = await db.select().from(missions).where(eq(missions.id, id));

  if (!existante) throw new Error('MISSION_INTROUVABLE');

  // Une mission annulée ne peut pas être modifiée
  if (existante.statut === 'annulee') {
    throw new Error('MISSION_ANNULEE');
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

  const [updated] = await db
    .update(missions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(missions.id, id))
    .returning();

  // Mettre à jour les participants si fournis
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
  return toMissionView(updated, participants, recommandationsList);
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

  return {
    id: rec.id,
    missionId: rec.missionId,
    texte: rec.texte,
    responsableId: rec.responsableId ?? undefined,
    dateLimite: rec.dateLimite ?? undefined,
    statut: rec.statut as RecommandationStatut,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
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

  return {
    id: updated.id,
    missionId: updated.missionId,
    texte: updated.texte,
    responsableId: updated.responsableId ?? undefined,
    dateLimite: updated.dateLimite ?? undefined,
    statut: updated.statut as RecommandationStatut,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
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
      let responsable: ParticipantResume | undefined;
      if (rec.responsableId) {
        const [user] = await db
          .select({
            id: users.id,
            matricule: users.matricule,
            nom: users.nom,
            prenom: users.prenom,
          })
          .from(users)
          .where(eq(users.id, rec.responsableId));
        responsable = user;
      }

      return {
        id: rec.id,
        missionId: rec.missionId,
        texte: rec.texte,
        responsableId: rec.responsableId ?? undefined,
        responsable,
        dateLimite: rec.dateLimite ?? undefined,
        statut: rec.statut as RecommandationStatut,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      };
    })
  );
}
