import { db } from '@/db/index';
import { missions, missionParticipants, recommandations, users, contacts } from '@/db/schema';
import {
  eq,
  ilike,
  and,
  or,
  desc,
  isNotNull,
  isNull,
  ne,
  gte,
  lte,
  inArray,
  type SQL,
} from 'drizzle-orm';
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
  CreateMissionParams,
  UpdateMissionParams,
  CreateRecommandationParams,
  UpdateRecommandationParams,
  MissionFilters,
  RecommandationView,
  MissionView,
  MissionsAggregates,
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
  MissionsAggregates,
} from './missions.types';

// Kept in sync with the client's mission.constants.ts LOGISTICS_RISK_DAYS -
// a mission departing soon with logistics not yet confirmed.
const LOGISTIQUE_RISQUE_JOURS = 14;

// ── SERVICE : Agrégats globaux, ou scopés à un participant ───────────────
// participantId optionnel - quand fourni, tous les comptes sont restreints
// aux missions où l'utilisateur figure dans mission_participants (ex.
// l'espace de travail agent "Mon espace").
export async function getMissionsAggregates(participantId?: number): Promise<MissionsAggregates> {
  const now = new Date();
  const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dansNJoursRisque = new Date(now.getTime() + LOGISTIQUE_RISQUE_JOURS * 24 * 60 * 60 * 1000);

  let scope: SQL | undefined;
  if (participantId !== undefined) {
    const rows = await db
      .select({ missionId: missionParticipants.missionId })
      .from(missionParticipants)
      .where(eq(missionParticipants.userId, participantId));
    scope = inArray(
      missions.id,
      rows.map((r) => r.missionId)
    );
  }

  const withScope = (...conditions: (SQL | undefined)[]) => and(...conditions, scope);

  const [
    total,
    planifiees,
    enCours,
    terminees,
    annulees,
    aVenir30Jours,
    logistiqueARisque,
    rapportsEnAttente,
  ] = await Promise.all([
    db.$count(missions, scope),
    db.$count(missions, withScope(eq(missions.statut, 'planifiee'))),
    db.$count(missions, withScope(eq(missions.statut, 'en_cours'))),
    db.$count(missions, withScope(eq(missions.statut, 'terminee'))),
    db.$count(missions, withScope(eq(missions.statut, 'annulee'))),
    db.$count(
      missions,
      withScope(
        eq(missions.statut, 'planifiee'),
        gte(missions.dateDebut, now),
        lte(missions.dateDebut, dans30Jours)
      )
    ),
    db.$count(
      missions,
      withScope(
        eq(missions.statut, 'planifiee'),
        ne(missions.confirmationLogistique, 'confirme'),
        gte(missions.dateDebut, now),
        lte(missions.dateDebut, dansNJoursRisque)
      )
    ),
    db.$count(
      missions,
      withScope(eq(missions.statut, 'terminee'), isNull(missions.rapportDocumentId))
    ),
  ]);

  return {
    total,
    planifiees,
    enCours,
    terminees,
    annulees,
    aVenir30Jours,
    logistiqueARisque,
    rapportsEnAttente,
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

  if (filters.confirmationLogistique) {
    conditions.push(eq(missions.confirmationLogistique, filters.confirmationLogistique));
  }

  if (filters.rapportStatut === 'disponible') {
    conditions.push(isNotNull(missions.rapportDocumentId));
  } else if (filters.rapportStatut === 'manquant') {
    conditions.push(isNull(missions.rapportDocumentId));
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

// ── Validation : rapportResponsableId doit nommer un participant actuel ───
// Pure (aucun I/O) - la relation "responsable ⇒ participant" est une règle
// de domaine, pas un rôle : validée ici contre la liste de participants que
// l'appelant fait autorité (voir mettreAJourMission), jamais contre un rôle.
export function validerResponsableRapport(
  rapportResponsableId: number | null,
  participantsIds: number[]
): void {
  if (rapportResponsableId !== null && !participantsIds.includes(rapportResponsableId)) {
    throw new Error('RESPONSABLE_RAPPORT_NON_PARTICIPANT');
  }
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

  // A real id (not null/undefined) must reference an existing contact;
  // null explicitly clears the link (removing a contact set by mistake)
  // and skips the lookup entirely.
  if (params.contactSurPlaceId !== undefined && params.contactSurPlaceId !== null) {
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
  // `!== undefined` so an explicit `null` clears the link (removing a
  // mistakenly-uploaded report) while an omitted field leaves it untouched.
  if (params.rapportDocumentId !== undefined) {
    updates.rapportDocumentId = params.rapportDocumentId;
  }
  if (params.contactSurPlaceId !== undefined) {
    updates.contactSurPlaceId = params.contactSurPlaceId;
  }

  // rapportResponsableId must always name a current participant of this
  // mission (Phase 8) - checked against the participant list this same
  // update is about to leave in place (params.participantsIds if the
  // caller is also changing it in this request, otherwise the existing
  // membership). Never a role check: purely a domain relationship.
  const participantsFinaux =
    params.participantsIds !== undefined
      ? params.participantsIds
      : (await getParticipantsMission(id)).map((p) => p.id);

  if (params.rapportResponsableId !== undefined) {
    validerResponsableRapport(params.rapportResponsableId, participantsFinaux);
    updates.rapportResponsableId = params.rapportResponsableId;
  } else if (
    params.participantsIds !== undefined &&
    existante.rapportResponsableId !== null &&
    !participantsFinaux.includes(existante.rapportResponsableId)
  ) {
    // The participant list changed underneath the current report
    // responsible (e.g. they were removed) without the caller explicitly
    // reassigning it in the same request - silently clear rather than
    // fail an otherwise-unrelated participant-list edit, and never leave
    // a dangling reference to a non-participant.
    updates.rapportResponsableId = null;
  }

  // confirmationLogistique is derived from the checklist, never set
  // directly - recompute it whenever any checklist item changes, using the
  // merged (existing + incoming) state so a partial update still lands on
  // the correct overall status.
  const checklistChanged =
    params.logistiqueBilletReserve !== undefined ||
    params.logistiqueHebergementConfirme !== undefined ||
    params.logistiqueFinancementValide !== undefined;

  if (checklistChanged) {
    const billet = params.logistiqueBilletReserve ?? existante.logistiqueBilletReserve;
    const hebergement =
      params.logistiqueHebergementConfirme ?? existante.logistiqueHebergementConfirme;
    const financement = params.logistiqueFinancementValide ?? existante.logistiqueFinancementValide;

    updates.logistiqueBilletReserve = billet;
    updates.logistiqueHebergementConfirme = hebergement;
    updates.logistiqueFinancementValide = financement;
    updates.confirmationLogistique =
      billet && hebergement && financement
        ? 'confirme'
        : !billet && !hebergement && !financement
          ? 'a_planifier'
          : 'en_cours';
  }

  const [updated] = await db
    .update(missions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(missions.id, id))
    .returning();

  // `!== undefined` (not truthy/`.length > 0`) - an explicit empty array
  // means "remove all participants" and must actually clear the join
  // table, not be silently ignored; `undefined` (field omitted from the
  // PATCH body) correctly leaves participants untouched.
  if (params.participantsIds !== undefined) {
    await db.delete(missionParticipants).where(eq(missionParticipants.missionId, id));
    if (params.participantsIds.length > 0) {
      await db.insert(missionParticipants).values(
        params.participantsIds.map((userId) => ({
          missionId: id,
          userId,
        }))
      );
    }
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

// ── SERVICE : L'utilisateur est-il le responsable de cette recommandation ──
// Relation métier (recommandations.responsableId) utilisée pour le repli
// personnel des notifications de relance (module notifications - Phase 7.1) :
// un agent qui n'a pas MISSION_REGISTRY_VIEW peut quand même relancer/
// consulter l'historique d'une recommandation dont il est explicitement
// responsable, sans devenir admin.
export async function estResponsableRecommandation(
  recommandationId: number,
  userId: number
): Promise<boolean> {
  const [rec] = await db
    .select({ responsableId: recommandations.responsableId })
    .from(recommandations)
    .where(eq(recommandations.id, recommandationId));

  return !!rec && rec.responsableId === userId;
}

// ── SERVICE : L'utilisateur est-il le responsable du rapport de mission ────
// Relation métier (missions.rapportResponsableId) - Phase 8 : seul le
// participant explicitement désigné peut soumettre/remplacer le rapport
// officiel via le workflow personnel, sans passer par MISSION_MANAGE.
export async function estResponsableRapportMission(
  missionId: number,
  userId: number
): Promise<boolean> {
  const [mission] = await db
    .select({ rapportResponsableId: missions.rapportResponsableId })
    .from(missions)
    .where(eq(missions.id, missionId));

  return !!mission && mission.rapportResponsableId === userId;
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
