import { db } from '@/db/index';
import { courriers, courrierDocuments, accords, missions, contacts, documents } from '@/db/schema';
import { eq, ilike, and, or, desc, lte, gte } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { chargerSeuils, genererReference, toCourrierView } from './courriers.helpers';
import type {
  CreateCourrierParams,
  UpdateCourrierParams,
  CourrierFilters,
  CourrierView,
  CourriersAggregates,
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
  ContactResume,
  DocumentResume,
  CourrierView,
  CourriersAggregates,
} from './courriers.types';

// ── Date-limite de réception en-deçà de laquelle un courrier entrant en
// attente de réponse est "en dépassement" — partagée entre les agrégats et
// le filtre de liste, pour rester cohérente avec calculerCriticite() ──────
async function calculerLimiteCritique(): Promise<Date> {
  const seuils = await chargerSeuils();
  return new Date(Date.now() - seuils.critique * 24 * 60 * 60 * 1000);
}

// ── SERVICE : Agrégats globaux (indépendants des filtres courants) ────────
export async function getCourriersAggregates(): Promise<CourriersAggregates> {
  const limiteCritique = await calculerLimiteCritique();

  const [total, aTraiter, enAttenteReponse, enDepassement, envoyes] = await Promise.all([
    db.$count(courriers),
    db.$count(courriers, and(eq(courriers.direction, 'entrant'), eq(courriers.suiviStatut, 'en_attente'))),
    db.$count(
      courriers,
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    ),
    db.$count(
      courriers,
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente'),
        lte(courriers.dateReception, limiteCritique)
      )
    ),
    db.$count(courriers, eq(courriers.direction, 'sortant')),
  ]);

  return { total, aTraiter, enAttenteReponse, enDepassement, envoyes };
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

  if (filters.dateDebut) {
    conditions.push(gte(courriers.dateReception, filters.dateDebut));
  }

  if (filters.dateFin) {
    conditions.push(lte(courriers.dateReception, filters.dateFin));
  }

  if (filters.enDepassement) {
    const limiteCritique = await calculerLimiteCritique();
    conditions.push(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente'),
        lte(courriers.dateReception, limiteCritique)
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

  // Vérifier que les contacts appartiennent bien à l'organisation choisie
  if (params.expediteurContactId) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, params.expediteurContactId));
    if (!contact || contact.organisationId !== params.expediteurOrganisationId) {
      throw new Error('CONTACT_EXPEDITEUR_INVALIDE');
    }
  }
  if (params.destinataireContactId) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, params.destinataireContactId));
    if (!contact || contact.organisationId !== params.destinataireOrganisationId) {
      throw new Error('CONTACT_DESTINATAIRE_INVALIDE');
    }
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
      expediteurContactId: params.expediteurContactId,
      destinataireContactId: params.destinataireContactId,
      dateReception: params.dateReception,
      reponseRequise: params.reponseRequise,
      dateLimiteReponse: params.dateLimiteReponse,
      suiviStatut: 'en_attente',
      reponseAId: params.reponseAId,
      accordId: params.accordId,
      missionId: params.missionId,
      createdPar: params.createdByUserId,
    })
    .returning();

  if (params.documentIds && params.documentIds.length > 0) {
    await db
      .insert(courrierDocuments)
      .values(params.documentIds.map((documentId) => ({ courrierId: courrier.id, documentId })));
  }

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
  if (params.dateReception !== undefined) updates.dateReception = params.dateReception;
  if (params.reponseRequise !== undefined) updates.reponseRequise = params.reponseRequise;
  if (params.expediteurOrganisationId !== undefined) {
    updates.expediteurOrganisationId = params.expediteurOrganisationId;
  }
  if (params.destinataireOrganisationId !== undefined) {
    updates.destinataireOrganisationId = params.destinataireOrganisationId;
  }
  if (params.expediteurContactId !== undefined) updates.expediteurContactId = params.expediteurContactId;
  if (params.destinataireContactId !== undefined) updates.destinataireContactId = params.destinataireContactId;
  if (params.suiviStatut !== undefined) updates.suiviStatut = params.suiviStatut;
  if (params.dateLimiteReponse !== undefined) updates.dateLimiteReponse = params.dateLimiteReponse;
  if (params.accordId !== undefined) updates.accordId = params.accordId;
  if (params.missionId !== undefined) updates.missionId = params.missionId;

  // Un contact doit toujours appartenir à l'organisation effective (celle
  // fournie dans cette requête, sinon celle déjà enregistrée) — évite un
  // contact orphelin si l'organisation change sans que le contact suive.
  const orgExpediteurEffective =
    updates.expediteurOrganisationId !== undefined
      ? updates.expediteurOrganisationId
      : existant.expediteurOrganisationId;
  const contactExpediteurEffectif =
    updates.expediteurContactId !== undefined ? updates.expediteurContactId : existant.expediteurContactId;
  if (contactExpediteurEffectif) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactExpediteurEffectif));
    if (!contact || contact.organisationId !== orgExpediteurEffective) {
      throw new Error('CONTACT_EXPEDITEUR_INVALIDE');
    }
  }

  const orgDestinataireEffective =
    updates.destinataireOrganisationId !== undefined
      ? updates.destinataireOrganisationId
      : existant.destinataireOrganisationId;
  const contactDestinataireEffectif =
    updates.destinataireContactId !== undefined
      ? updates.destinataireContactId
      : existant.destinataireContactId;
  if (contactDestinataireEffectif) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactDestinataireEffectif));
    if (!contact || contact.organisationId !== orgDestinataireEffective) {
      throw new Error('CONTACT_DESTINATAIRE_INVALIDE');
    }
  }

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

// ── SERVICE : Ajouter un document joint ───────────────────────────────────
export async function ajouterDocumentCourrier(
  courrierId: number,
  documentId: number,
  userId: number
): Promise<CourrierView> {
  const [courrier] = await db.select().from(courriers).where(eq(courriers.id, courrierId));
  if (!courrier) throw new Error('COURRIER_INTROUVABLE');

  const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!document) throw new Error('DOCUMENT_INTROUVABLE');

  await db.insert(courrierDocuments).values({ courrierId, documentId });

  await logAudit({
    userId,
    action: 'COURRIER_DOCUMENT_AJOUTE',
    module: 'M4',
    entiteId: courrierId,
    details: { documentId },
  });

  const seuils = await chargerSeuils();
  return toCourrierView(courrier, seuils);
}

// ── SERVICE : Retirer un document joint ───────────────────────────────────
export async function retirerDocumentCourrier(
  courrierId: number,
  documentId: number,
  userId: number
): Promise<CourrierView> {
  const [courrier] = await db.select().from(courriers).where(eq(courriers.id, courrierId));
  if (!courrier) throw new Error('COURRIER_INTROUVABLE');

  await db
    .delete(courrierDocuments)
    .where(and(eq(courrierDocuments.courrierId, courrierId), eq(courrierDocuments.documentId, documentId)));

  await logAudit({
    userId,
    action: 'COURRIER_DOCUMENT_RETIRE',
    module: 'M4',
    entiteId: courrierId,
    details: { documentId },
  });

  const seuils = await chargerSeuils();
  return toCourrierView(courrier, seuils);
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
