import { organisations, contacts } from '@/db/schema';
import type { OrganisationType, OrganisationView, ContactView } from './organisations.types';

export function toOrganisationView(
  org: typeof organisations.$inferSelect,
  contactsList?: ContactView[],
  meta?: {
    contactPrincipal?: ContactView;
    contactsActifsCount?: number;
    contactsTotalCount?: number;
    accordsCount?: number;
  }
): OrganisationView {
  return {
    id: org.id,
    nom: org.nom,
    pays: org.pays,
    region: org.region ?? undefined,
    type: org.type as OrganisationType,
    actif: org.actif,
    notes: org.notes ?? undefined,
    contacts: contactsList,
    contactPrincipal: meta?.contactPrincipal,
    contactsActifsCount: meta?.contactsActifsCount,
    contactsTotalCount: meta?.contactsTotalCount,
    accordsCount: meta?.accordsCount,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export function toContactView(contact: typeof contacts.$inferSelect): ContactView {
  return {
    id: contact.id,
    organisationId: contact.organisationId,
    nom: contact.nom,
    prenom: contact.prenom,
    email: contact.email ?? undefined,
    telephone: contact.telephone ?? undefined,
    poste: contact.poste ?? undefined,
    principal: contact.principal,
    actif: contact.actif,
    createdAt: contact.createdAt,
  };
}
