import { db } from '@/db/index';
import { courriers, organisations, contacts } from '@/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service';
import type {
  CourrierDirection,
  CourrierReponseStatut,
  CourrierSuiviStatut,
  CourrierCriticite,
  CourrierView,
  OrganisationResume,
  SeuilsCriticite,
} from './courriers.types';

// Charger les seuils de criticité une seule fois par appel de service
export async function chargerSeuils(): Promise<SeuilsCriticite> {
  return {
    surveiller: await getValeurEntier('courrier_alerte_jours', 60),
    critique: await getValeurEntier('courrier_alerte_critique_jours', 90),
  };
}

async function calculerCriticite(
  courrier: typeof courriers.$inferSelect,
  seuils: SeuilsCriticite
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
export async function genererReference(): Promise<string> {
  const annee = new Date().getFullYear();
  const prefix = `CORR-${annee}-`;

  const rows = await db
    .select({ reference: courriers.reference })
    .from(courriers)
    .where(ilike(courriers.reference, `${prefix}%`));

  const numero = (rows.length + 1).toString().padStart(4, '0');
  return `${prefix}${numero}`;
}

export async function toCourrierView(
  courrier: typeof courriers.$inferSelect,
  seuils: SeuilsCriticite
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

export async function getOrganisationAvecContact(orgId: number): Promise<OrganisationResume> {
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
