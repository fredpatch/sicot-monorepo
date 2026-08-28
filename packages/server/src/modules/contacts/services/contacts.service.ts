import { db } from '@/db/index';
import { contacts, organisations } from '@/db/schema';
import { and, eq, ilike, or } from 'drizzle-orm';

export interface ContactListItem {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  organisationId: number;
  organisationNom: string;
}

export interface ContactFilters {
  search?: string;
  actif?: boolean;
  organisationId?: number;
  pageSize?: number;
}

// Generalizes the single-contact join already used by
// missions.helpers.ts's getContactSurPlace - this is what the Missions
// contact-on-site picker calls instead of fetching every organisation and
// then every organisation's contacts (the N+1 pattern it replaces).
export async function listerContacts(filters: ContactFilters): Promise<ContactListItem[]> {
  const conditions = [];

  if (filters.actif !== undefined) {
    conditions.push(eq(contacts.actif, filters.actif));
  }

  if (filters.organisationId !== undefined) {
    conditions.push(eq(contacts.organisationId, filters.organisationId));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(contacts.nom, `%${filters.search}%`),
        ilike(contacts.prenom, `%${filters.search}%`),
        ilike(organisations.nom, `%${filters.search}%`)
      )
    );
  }

  const rows = await db
    .select({
      id: contacts.id,
      nom: contacts.nom,
      prenom: contacts.prenom,
      email: contacts.email,
      telephone: contacts.telephone,
      poste: contacts.poste,
      organisationId: contacts.organisationId,
      organisationNom: organisations.nom,
    })
    .from(contacts)
    .innerJoin(organisations, eq(contacts.organisationId, organisations.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(contacts.nom)
    .limit(filters.pageSize ?? 50);

  return rows.map((row) => ({
    ...row,
    email: row.email ?? undefined,
    telephone: row.telephone ?? undefined,
    poste: row.poste ?? undefined,
  }));
}
