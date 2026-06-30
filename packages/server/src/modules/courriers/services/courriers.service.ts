import { db } from '@/db/index';
import { courriers, organisations, accords, missions, contacts } from '@/db/schema';
import { eq, ilike, and, or, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service';

// ── Types ──────────────────────────────────────────────────────────────────
export type CourrierDirection = 'entrant' | 'sortant';
export type CourrierReponseStatut = 'oui' | 'non' | 'pour_information';
export type CourrierSuiviStatut = 'en_attente' | 'repondu' | 'archive';
export type CourrierCriticite = 'normal' | 'a_surveiller' | 'critique';

export interface CreateCourrierParams {
  direction: CourrierDirection;
  objet: string;
  expediteurOrganisationId?: number;
  destinataireOrganisationId?: number;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  createdByUserId: number;
}

export interface UpdateCourrierParams {
  objet?: string;
  suiviStatut?: CourrierSuiviStatut;
  dateLimiteReponse?: Date;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  updatedByUserId: number;
}

export interface CourrierFilters {
  search?: string;
  direction?: CourrierDirection;
  suiviStatut?: CourrierSuiviStatut;
  reponseRequise?: CourrierReponseStatut;
  sansReponse?: boolean;
  organisationId?: number;
  page?: number;
  pageSize?: number;
}

export interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  contactPrincipal?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
}

export interface CourrierView {
  id: number;
  reference: string;
  referenceExpediteur?: string;
  direction: CourrierDirection;
  objet: string;
  expediteur?: OrganisationResume;
  destinataire?: OrganisationResume;
  dateReception: Date;
  reponseRequise: CourrierReponseStatut;
  dateLimiteReponse?: Date;
  suiviStatut: CourrierSuiviStatut;
  reponseAId?: number;
  accordId?: number;
  missionId?: number;
  documentId?: number;
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
  criticite?: CourrierCriticite; // calculé uniquement si en_attente + reponseRequise=oui
  joursAttente?: number;
}

// ── Utilitaires ────────────────────────────────────────────────────────────

// Fonction utilitaire de calcul
async function calculerCriticite(
  courrier: typeof courriers.$inferSelect,
  seuils: { surveiller: number; critique: number }
): Promise<{ criticite?: CourrierCriticite; joursAttente?: number }> {
  if (
    courrier.direction !== 'entrant' ||
    courrier.reponseRequise !== 'oui' ||
    courrier.suiviStatut !== 'en_attente'
  ) {
    return {};
  }

  const joursAttente = Math.floor(
    (Date.now() - new Date(courrier.dateReception).getTime()) / (1000 * 60 * 60 * 24)
  );

  let criticite: CourrierCriticite = 'normal';
  if (joursAttente >= seuils.critique) criticite = 'critique';
  else if (joursAttente >= seuils.surveiller) criticite = 'a_surveiller';

  return { criticite, joursAttente };
}

// Générer la référence automatique CORR-YYYY-XXXX
async function genererReference(): Promise<string> {
  const annee = new Date().getFullYear();
  const prefix = `CORR-${annee}-`;

  const rows = await db
    .select({ reference: courriers.reference })
    .from(courriers)
    .where(ilike(courriers.reference, `${prefix}%`));

  const numero = (rows.length + 1).toString().padStart(4, '0');
  return `${prefix}${numero}`;
}

async function toCourrierView(
  courrier: typeof courriers.$inferSelect,
  seuils: { surveiller: number; critique: number }
): Promise<CourrierView> {
  let expediteur: OrganisationResume | undefined;
  if (courrier.expediteurOrganisationId) {
    expediteur = await getOrganisationAvecContact(courrier.expediteurOrganisationId);
  }

  let destinataire: OrganisationResume | undefined;
  if (courrier.destinataireOrganisationId) {
    destinataire = await getOrganisationAvecContact(courrier.destinataireOrganisationId);
  }

  const { criticite, joursAttente } = await calculerCriticite(courrier, seuils);
  return {
    id: courrier.id,
    reference: courrier.reference,
    referenceExpediteur: courrier.referenceExpediteur ?? undefined,
    direction: courrier.direction as CourrierDirection,
    objet: courrier.objet,
    expediteur,
    destinataire,
    dateReception: courrier.dateReception,
    reponseRequise: courrier.reponseRequise as CourrierReponseStatut,
    dateLimiteReponse: courrier.dateLimiteReponse ?? undefined,
    suiviStatut: courrier.suiviStatut as CourrierSuiviStatut,
    reponseAId: courrier.reponseAId ?? undefined,
    accordId: courrier.accordId ?? undefined,
    missionId: courrier.missionId ?? undefined,
    documentId: courrier.documentId ?? undefined,
    createdPar: courrier.createdPar ?? undefined,
    createdAt: courrier.createdAt,
    updatedAt: courrier.updatedAt,
    criticite,
    joursAttente,
  };
}

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
  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

  const data = await Promise.all(rows.map((c) => toCourrierView(c, seuils)));

  const total = await db.$count(courriers, conditions.length > 0 ? and(...conditions) : undefined);

  return { data, total };
}

// ── SERVICE : Récupérer un courrier par ID ────────────────────────────────
export async function getCourrier(id: number): Promise<CourrierView> {
  const [courrier] = await db.select().from(courriers).where(eq(courriers.id, id));
  if (!courrier) throw new Error('COURRIER_INTROUVABLE');

  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

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

  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

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

  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

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

  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

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

  const seuils = {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };

  return Promise.all(rows.map((c) => toCourrierView(c, seuils)));
}

async function getOrganisationAvecContact(orgId: number): Promise<OrganisationResume> {
  const [org] = await db
    .select({ id: organisations.id, nom: organisations.nom, pays: organisations.pays })
    .from(organisations)
    .where(eq(organisations.id, orgId));

  const [contactPrincipal] = await db
    .select({
      nom: contacts.nom,
      prenom: contacts.prenom,
      email: contacts.email,
      telephone: contacts.telephone,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.organisationId, orgId),
        eq(contacts.principal, true),
        eq(contacts.actif, true)
      )
    );

  return {
    id: org.id,
    nom: org.nom,
    pays: org.pays,
    contactPrincipal: contactPrincipal
      ? {
          nom: contactPrincipal.nom,
          prenom: contactPrincipal.prenom,
          email: contactPrincipal.email ?? undefined,
          telephone: contactPrincipal.telephone ?? undefined,
        }
      : undefined,
  };
}
