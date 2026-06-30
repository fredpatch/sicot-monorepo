import { db } from '@/db/index.js';
import { accords, accordsOrganisations, contacts, organisations } from '@/db/schema';
import { eq, ilike, and, or, desc, lte, gte } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';

// ── Types ──────────────────────────────────────────────────────────────────
export type AccordStatut = 'actif' | 'expire' | 'suspendu' | 'en_renouvellement';

export interface CreateAccordParams {
  titre: string;
  dateSignature: Date;
  dateExpiration?: Date;
  partenairesIds: number[];
  documentId?: number;
  notes?: string;
  createdByUserId: number;
}

export interface UpdateAccordParams {
  titre?: string;
  statut?: AccordStatut;
  dateSignature?: Date;
  dateExpiration?: Date;
  partenairesIds?: number[];
  documentId?: number;
  notes?: string;
  updatedByUserId: number;
}

export interface AccordFilters {
  search?: string;
  statut?: AccordStatut;
  partenairesId?: number;
  expirantAvant?: Date;
  page?: number;
  pageSize?: number;
}

export interface OrganisationResume {
  id: number;
  nom: string;
  pays: string;
  type: string;
  contactPrincipal?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
}

export interface AccordView {
  id: number;
  reference: string;
  titre: string;
  statut: AccordStatut;
  dateSignature: Date;
  dateExpiration?: Date;
  parentId?: number;
  documentId?: number;
  notes?: string;
  partenaires: OrganisationResume[];
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Utilitaires ────────────────────────────────────────────────────────────

// Générer la référence automatique ACC-YYYY-XXXX
async function genererReference(): Promise<string> {
  const annee = new Date().getFullYear();
  const prefix = `ACC-${annee}-`;

  // Compter les accords de l'année courante
  const rows = await db
    .select({ reference: accords.reference })
    .from(accords)
    .where(ilike(accords.reference, `${prefix}%`));

  const numero = (rows.length + 1).toString().padStart(4, '0');
  return `${prefix}${numero}`;
}

function toAccordView(
  accord: typeof accords.$inferSelect,
  partenaires: OrganisationResume[]
): AccordView {
  return {
    id: accord.id,
    reference: accord.reference,
    titre: accord.titre,
    statut: accord.statut as AccordStatut,
    dateSignature: accord.dateSignature,
    dateExpiration: accord.dateExpiration ?? undefined,
    parentId: accord.parentId ?? undefined,
    documentId: accord.documentId ?? undefined,
    notes: accord.notes ?? undefined,
    partenaires,
    createdPar: accord.createdPar ?? undefined,
    createdAt: accord.createdAt,
    updatedAt: accord.updatedAt,
  };
}

// Récupérer les partenaires d'un accord — avec leur contact principal
async function getPartenairesAccord(accordId: number): Promise<OrganisationResume[]> {
  const orgs = await db
    .select({
      id: organisations.id,
      nom: organisations.nom,
      pays: organisations.pays,
      type: organisations.type,
    })
    .from(accordsOrganisations)
    .innerJoin(organisations, eq(accordsOrganisations.organisationId, organisations.id))
    .where(eq(accordsOrganisations.accordId, accordId));

  // Récupérer le contact principal de chaque organisation en parallèle
  const orgsAvecContact = await Promise.all(
    orgs.map(async (org) => {
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
            eq(contacts.organisationId, org.id),
            eq(contacts.principal, true),
            eq(contacts.actif, true)
          )
        );

      return {
        ...org,
        contactPrincipal: contactPrincipal
          ? {
              nom: contactPrincipal.nom,
              prenom: contactPrincipal.prenom,
              email: contactPrincipal.email ?? undefined,
              telephone: contactPrincipal.telephone ?? undefined,
            }
          : undefined,
      };
    })
  );

  return orgsAvecContact;
}

// ── SERVICE : Lister les accords ──────────────────────────────────────────
export async function listerAccords(filters: AccordFilters): Promise<{
  data: AccordView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(accords.titre, `%${filters.search}%`),
        ilike(accords.reference, `%${filters.search}%`)
      )
    );
  }

  if (filters.statut) {
    conditions.push(eq(accords.statut, filters.statut));
  }

  if (filters.expirantAvant) {
    conditions.push(lte(accords.dateExpiration, filters.expirantAvant));
  }

  const rows = await db
    .select()
    .from(accords)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(accords.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Récupérer les partenaires pour chaque accord
  const data = await Promise.all(
    rows.map(async (accord) => {
      const partenaires = await getPartenairesAccord(accord.id);
      return toAccordView(accord, partenaires);
    })
  );

  const total = await db.$count(accords, conditions.length > 0 ? and(...conditions) : undefined);

  return { data, total };
}

// ── SERVICE : Récupérer un accord par ID ──────────────────────────────────
export async function getAccord(id: number): Promise<AccordView> {
  const [accord] = await db.select().from(accords).where(eq(accords.id, id));

  if (!accord) throw new Error('ACCORD_INTROUVABLE');

  const partenaires = await getPartenairesAccord(id);
  return toAccordView(accord, partenaires);
}

// ── SERVICE : Créer un accord ─────────────────────────────────────────────
export async function creerAccord(params: CreateAccordParams): Promise<AccordView> {
  if (!params.partenairesIds || params.partenairesIds.length === 0) {
    throw new Error('PARTENAIRES_REQUIS');
  }

  // Vérifier que tous les partenaires existent
  for (const orgId of params.partenairesIds) {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
    if (!org) throw new Error(`ORGANISATION_INTROUVABLE:${orgId}`);
  }

  const reference = await genererReference();

  const [accord] = await db
    .insert(accords)
    .values({
      reference,
      titre: params.titre,
      statut: 'actif',
      dateSignature: params.dateSignature,
      dateExpiration: params.dateExpiration,
      documentId: params.documentId,
      notes: params.notes,
      createdPar: params.createdByUserId,
    })
    .returning();

  // Créer les relations many-to-many
  await db.insert(accordsOrganisations).values(
    params.partenairesIds.map((orgId) => ({
      accordId: accord.id,
      organisationId: orgId,
    }))
  );

  await logAudit({
    userId: params.createdByUserId,
    action: 'ACCORD_CREE',
    module: 'M1',
    entiteId: accord.id,
    details: { reference, titre: params.titre, partenaires: params.partenairesIds },
  });

  const partenaires = await getPartenairesAccord(accord.id);
  return toAccordView(accord, partenaires);
}

// ── SERVICE : Mettre à jour un accord ────────────────────────────────────
export async function mettreAJourAccord(
  id: number,
  params: UpdateAccordParams
): Promise<AccordView> {
  const [existant] = await db.select().from(accords).where(eq(accords.id, id));

  if (!existant) throw new Error('ACCORD_INTROUVABLE');

  const updates: Partial<typeof accords.$inferInsert> = {};
  if (params.titre !== undefined) updates.titre = params.titre;
  if (params.statut !== undefined) updates.statut = params.statut;
  if (params.dateSignature !== undefined) updates.dateSignature = params.dateSignature;
  if (params.dateExpiration !== undefined) updates.dateExpiration = params.dateExpiration;
  if (params.documentId !== undefined) updates.documentId = params.documentId;
  if (params.notes !== undefined) updates.notes = params.notes;

  const [updated] = await db
    .update(accords)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(accords.id, id))
    .returning();

  // Mettre à jour les partenaires si fournis
  if (params.partenairesIds && params.partenairesIds.length > 0) {
    // Supprimer les anciennes relations
    await db.delete(accordsOrganisations).where(eq(accordsOrganisations.accordId, id));

    // Insérer les nouvelles
    await db.insert(accordsOrganisations).values(
      params.partenairesIds.map((orgId) => ({
        accordId: id,
        organisationId: orgId,
      }))
    );
  }

  await logAudit({
    userId: params.updatedByUserId,
    action: 'ACCORD_MODIFIE',
    module: 'M1',
    entiteId: id,
    details: updates,
  });

  const partenaires = await getPartenairesAccord(id);
  return toAccordView(updated, partenaires);
}

// ── SERVICE : Renouveler un accord ────────────────────────────────────────
// Crée une nouvelle version liée à l'accord parent
export async function renouvelerAccord(
  parentId: number,
  params: {
    dateSignature: Date;
    dateExpiration?: Date;
    notes?: string;
    userId: number;
  }
): Promise<AccordView> {
  const [parent] = await db.select().from(accords).where(eq(accords.id, parentId));

  if (!parent) throw new Error('ACCORD_INTROUVABLE');

  const reference = await genererReference();
  const partenairesParent = await getPartenairesAccord(parentId);

  // Créer la nouvelle version
  const [nouvelAccord] = await db
    .insert(accords)
    .values({
      reference,
      titre: parent.titre,
      statut: 'actif',
      dateSignature: params.dateSignature,
      dateExpiration: params.dateExpiration,
      parentId,
      notes: params.notes,
      createdPar: params.userId,
    })
    .returning();

  // Reprendre les mêmes partenaires
  await db.insert(accordsOrganisations).values(
    partenairesParent.map((p) => ({
      accordId: nouvelAccord.id,
      organisationId: p.id,
    }))
  );

  // Marquer l'accord parent en renouvellement
  await db
    .update(accords)
    .set({ statut: 'en_renouvellement', updatedAt: new Date() })
    .where(eq(accords.id, parentId));

  await logAudit({
    userId: params.userId,
    action: 'ACCORD_RENOUVELE',
    module: 'M1',
    entiteId: nouvelAccord.id,
    details: { parentId, reference },
  });

  return toAccordView(nouvelAccord, partenairesParent);
}

// ── SERVICE : Accords expirant bientôt ────────────────────────────────────
// Utilisé par le cron d'alertes et le dashboard M9
export async function getAccordsExpirantDans(jours: number): Promise<AccordView[]> {
  const maintenant = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + jours);

  const rows = await db
    .select()
    .from(accords)
    .where(
      and(
        eq(accords.statut, 'actif'),
        gte(accords.dateExpiration, maintenant),
        lte(accords.dateExpiration, limite)
      )
    )
    .orderBy(accords.dateExpiration);

  return Promise.all(
    rows.map(async (accord) => {
      const partenaires = await getPartenairesAccord(accord.id);
      return toAccordView(accord, partenaires);
    })
  );
}
