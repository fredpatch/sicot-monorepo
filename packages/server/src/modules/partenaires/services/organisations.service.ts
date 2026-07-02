import { db } from '@/db/index';
import { organisations, contacts } from '@/db/schema';
import { eq, ilike, and, or, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { toOrganisationView, toContactView } from './organisations.helpers';
import type {
  OrganisationType,
  CreateOrganisationParams,
  UpdateOrganisationParams,
  OrganisationFilters,
  CreateContactParams,
  UpdateContactParams,
  OrganisationView,
  ContactView,
} from './organisations.types';

export type {
  OrganisationType,
  CreateOrganisationParams,
  UpdateOrganisationParams,
  OrganisationFilters,
  CreateContactParams,
  UpdateContactParams,
  OrganisationView,
  ContactView,
} from './organisations.types';

// ── SERVICE : Lister les organisations ────────────────────────────────────
export async function listerOrganisations(
  filters: OrganisationFilters
): Promise<{ data: OrganisationView[]; total: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(organisations.nom, `%${filters.search}%`),
        ilike(organisations.pays, `%${filters.search}%`)
      )
    );
  }

  if (filters.pays) {
    conditions.push(ilike(organisations.pays, `%${filters.pays}%`));
  }

  if (filters.region) {
    conditions.push(ilike(organisations.region, `%${filters.region}%`));
  }

  if (filters.type) {
    conditions.push(eq(organisations.type, filters.type));
  }

  if (filters.actif !== undefined) {
    conditions.push(eq(organisations.actif, filters.actif));
  }

  const rows = await db
    .select()
    .from(organisations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(organisations.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(
    organisations,
    conditions.length > 0 ? and(...conditions) : undefined
  );

  return { data: rows.map((o) => toOrganisationView(o)), total };
}

// ── SERVICE : Récupérer une organisation avec ses contacts ────────────────
export async function getOrganisation(id: number): Promise<OrganisationView> {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, id));

  if (!org) throw new Error('ORGANISATION_INTROUVABLE');

  const contactsList = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.organisationId, id), eq(contacts.actif, true)))
    .orderBy(desc(contacts.principal));

  return toOrganisationView(org, contactsList.map(toContactView));
}

// ── SERVICE : Créer une organisation ──────────────────────────────────────
export async function creerOrganisation(
  params: CreateOrganisationParams
): Promise<OrganisationView> {
  const [existante] = await db
    .select()
    .from(organisations)
    .where(ilike(organisations.nom, params.nom));

  if (existante) throw new Error('ORGANISATION_EXISTANTE');

  const [org] = await db
    .insert(organisations)
    .values({
      nom: params.nom,
      pays: params.pays,
      region: params.region,
      type: params.type,
      notes: params.notes,
      actif: true,
    })
    .returning();

  await logAudit({
    userId: params.createdByUserId,
    action: 'ORGANISATION_CREEE',
    module: 'M2',
    entiteId: org.id,
    details: { nom: org.nom, pays: org.pays, type: org.type },
  });

  return toOrganisationView(org, []);
}

// ── SERVICE : Mettre à jour une organisation ──────────────────────────────
export async function mettreAJourOrganisation(
  id: number,
  params: UpdateOrganisationParams
): Promise<OrganisationView> {
  const [existante] = await db.select().from(organisations).where(eq(organisations.id, id));

  if (!existante) throw new Error('ORGANISATION_INTROUVABLE');

  const updates: Partial<typeof organisations.$inferInsert> = {};
  if (params.nom !== undefined) updates.nom = params.nom;
  if (params.pays !== undefined) updates.pays = params.pays;
  if (params.region !== undefined) updates.region = params.region;
  if (params.type !== undefined) updates.type = params.type;
  if (params.actif !== undefined) updates.actif = params.actif;
  if (params.notes !== undefined) updates.notes = params.notes;

  const [updated] = await db
    .update(organisations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organisations.id, id))
    .returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'ORGANISATION_MODIFIEE',
    module: 'M2',
    entiteId: id,
    details: updates,
  });

  return toOrganisationView(updated);
}

// ── SERVICE : Créer un contact ────────────────────────────────────────────
export async function creerContact(params: CreateContactParams): Promise<ContactView> {
  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, params.organisationId));

  if (!org) throw new Error('ORGANISATION_INTROUVABLE');

  // Si ce contact est marqué principal, retirer le statut des autres
  if (params.principal) {
    await db
      .update(contacts)
      .set({ principal: false })
      .where(eq(contacts.organisationId, params.organisationId));
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      organisationId: params.organisationId,
      nom: params.nom,
      prenom: params.prenom,
      email: params.email,
      telephone: params.telephone,
      poste: params.poste,
      principal: params.principal ?? false,
      actif: true,
    })
    .returning();

  await logAudit({
    userId: params.createdByUserId,
    action: 'CONTACT_CREE',
    module: 'M2',
    entiteId: contact.id,
    details: { organisationId: params.organisationId, nom: params.nom },
  });

  return toContactView(contact);
}

// ── SERVICE : Mettre à jour un contact ───────────────────────────────────
export async function mettreAJourContact(
  id: number,
  params: UpdateContactParams
): Promise<ContactView> {
  const [existant] = await db.select().from(contacts).where(eq(contacts.id, id));

  if (!existant) throw new Error('CONTACT_INTROUVABLE');

  const updates: Partial<typeof contacts.$inferInsert> = {};
  if (params.nom !== undefined) updates.nom = params.nom;
  if (params.prenom !== undefined) updates.prenom = params.prenom;
  if (params.email !== undefined) updates.email = params.email;
  if (params.telephone !== undefined) updates.telephone = params.telephone;
  if (params.poste !== undefined) updates.poste = params.poste;
  if (params.actif !== undefined) updates.actif = params.actif;

  const [updated] = await db.update(contacts).set(updates).where(eq(contacts.id, id)).returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'CONTACT_MODIFIE',
    module: 'M2',
    entiteId: id,
    details: updates,
  });

  return toContactView(updated);
}

// ── SERVICE : Définir le contact principal ────────────────────────────────
export async function definirContactPrincipal(
  contactId: number,
  userId: number
): Promise<ContactView> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));

  if (!contact) throw new Error('CONTACT_INTROUVABLE');

  // Retirer le statut principal de tous les contacts de l'organisation
  await db
    .update(contacts)
    .set({ principal: false })
    .where(eq(contacts.organisationId, contact.organisationId));

  // Définir ce contact comme principal
  const [updated] = await db
    .update(contacts)
    .set({ principal: true })
    .where(eq(contacts.id, contactId))
    .returning();

  await logAudit({
    userId,
    action: 'CONTACT_PRINCIPAL_DEFINI',
    module: 'M2',
    entiteId: contactId,
    details: { organisationId: contact.organisationId },
  });

  return toContactView(updated);
}

// ── SERVICE : Lister les contacts d'une organisation ─────────────────────
export async function listerContacts(organisationId: number): Promise<ContactView[]> {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, organisationId));

  if (!org) throw new Error('ORGANISATION_INTROUVABLE');

  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organisationId, organisationId))
    .orderBy(desc(contacts.principal));

  return rows.map(toContactView);
}

// ── SERVICE : Pays distincts ──────────────────────────────────────────────
// Alimente le filtre "Pays" dans l'interface
export async function getPaysDisponibles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ pays: organisations.pays })
    .from(organisations)
    .orderBy(organisations.pays);

  return rows.map((r) => r.pays);
}

// ── SERVICE : Régions distinctes ──────────────────────────────────────────
export async function getRegionsDisponibles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ region: organisations.region })
    .from(organisations)
    .orderBy(organisations.region);

  return rows.map((r) => r.region).filter((r): r is string => r !== null);
}
