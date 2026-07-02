import { db } from '@/db/index';
import { missions, missionParticipants, recommandations, users, contacts, organisations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type {
  MissionStatut,
  RecommandationStatut,
  LogistiqueStatut,
  ContactResume,
  ParticipantResume,
  RecommandationView,
  MissionView,
} from './missions.types';

export async function getParticipantsMission(missionId: number): Promise<ParticipantResume[]> {
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

// Récupérer le responsable d'une recommandation — email inclus optionnellement
async function getResponsableResume(
  responsableId: number,
  avecEmail: boolean
): Promise<ParticipantResume | undefined> {
  if (avecEmail) {
    const [user] = await db
      .select({
        id: users.id,
        matricule: users.matricule,
        nom: users.nom,
        prenom: users.prenom,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, responsableId));
    return user;
  }

  const [user] = await db
    .select({
      id: users.id,
      matricule: users.matricule,
      nom: users.nom,
      prenom: users.prenom,
    })
    .from(users)
    .where(eq(users.id, responsableId));

  return user;
}

// ── Convertisseur unique pour une recommandation ──────────────────────────
export function toRecommandationView(
  rec: typeof recommandations.$inferSelect,
  responsable?: ParticipantResume
): RecommandationView {
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
}

export async function getRecommandationsMission(missionId: number): Promise<RecommandationView[]> {
  const rows = await db
    .select()
    .from(recommandations)
    .where(eq(recommandations.missionId, missionId))
    .orderBy(recommandations.createdAt);

  return Promise.all(
    rows.map(async (rec) => {
      const responsable = rec.responsableId
        ? await getResponsableResume(rec.responsableId, true)
        : undefined;
      return toRecommandationView(rec, responsable);
    })
  );
}

export function toMissionView(
  mission: typeof missions.$inferSelect,
  participants: ParticipantResume[],
  recommandationsList?: RecommandationView[],
  contactSurPlace?: ContactResume
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
    confirmationLogistique: mission.confirmationLogistique as LogistiqueStatut,
    contactSurPlace,
    createdPar: mission.createdPar ?? undefined,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
  };
}

// ── SERVICE : Récupérer un contact sur place ───────────────────────────────
export async function getContactSurPlace(contactId?: number): Promise<ContactResume | undefined> {
  if (!contactId) return undefined;

  const [contact] = await db
    .select({
      id: contacts.id,
      nom: contacts.nom,
      prenom: contacts.prenom,
      email: contacts.email,
      telephone: contacts.telephone,
      poste: contacts.poste,
      organisationNom: organisations.nom,
    })
    .from(contacts)
    .innerJoin(organisations, eq(contacts.organisationId, organisations.id))
    .where(eq(contacts.id, contactId));

  if (!contact) return undefined;

  return {
    id: contact.id,
    nom: contact.nom,
    prenom: contact.prenom,
    email: contact.email ?? undefined,
    telephone: contact.telephone ?? undefined,
    poste: contact.poste ?? undefined,
    organisationNom: contact.organisationNom,
  };
}

// Utilisé par getRecommandationsEnAttente — responsable sans email
export async function getResponsableSansEmail(
  responsableId: number
): Promise<ParticipantResume | undefined> {
  return getResponsableResume(responsableId, false);
}
