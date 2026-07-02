import { db } from '@/db/index.js';
import { accords, accordsOrganisations, contacts, organisations } from '@/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import type { AccordStatut, AccordView, OrganisationResume } from './accords.types';

// Générer la référence automatique ACC-YYYY-XXXX
export async function genererReference(): Promise<string> {
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

export function toAccordView(
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
export async function getPartenairesAccord(accordId: number): Promise<OrganisationResume[]> {
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
