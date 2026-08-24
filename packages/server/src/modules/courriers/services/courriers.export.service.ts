import { eq } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { users, documents } from '@/db/schema';
import { genererPDFFiche, echapperHTML } from '@/utils/pdf.js';
import {
  masthead,
  sectionBox,
  deuxColonnes,
  grilleInfos,
  tableSimple,
  tableHistorique,
  badge,
  type BadgeCouleur,
} from '@/utils/ficheHTML.js';
import { listerHistoriqueEntite } from '@/modules/audit/services/audit.service.js';
import type { CourrierView, CourrierSuiviStatut, CourrierCriticite } from './courriers.types';

const LABELS_DIRECTION: Record<string, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
};

const LABELS_SUIVI: Record<CourrierSuiviStatut, string> = {
  en_attente: 'En attente',
  repondu: 'Répondu',
  archive: 'Archivé',
};

const COULEURS_SUIVI: Record<CourrierSuiviStatut, BadgeCouleur> = {
  en_attente: 'ambre',
  repondu: 'vert',
  archive: 'gris',
};

const LABELS_REPONSE: Record<string, string> = {
  oui: 'Oui',
  non: 'Non',
  pour_information: 'Pour information',
};

const LABELS_CRITICITE: Record<CourrierCriticite, string> = {
  normal: 'Normale',
  a_surveiller: 'À surveiller',
  critique: 'Critique',
};

const COULEURS_CRITICITE: Record<CourrierCriticite, BadgeCouleur> = {
  normal: 'gris',
  a_surveiller: 'ambre',
  critique: 'rouge',
};

function formatDate(date?: Date): string {
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
}

function formatOrganisation(org?: CourrierView['expediteur']): string {
  if (!org) return '—';
  const contact = org.contactPrincipal
    ? ` — contact : ${echapperHTML(`${org.contactPrincipal.prenom} ${org.contactPrincipal.nom}`)}`
    : '';
  return `${echapperHTML(org.nom)} (${echapperHTML(org.pays)})${contact}`;
}

// ── Export PDF — fiche individuelle d'un courrier ──────────────────────────
export async function genererPDFCourrier(courrier: CourrierView): Promise<Buffer> {
  const [document, responsable, historique] = await Promise.all([
    courrier.documentId
      ? db
          .select({ id: documents.id, nomOriginal: documents.nomOriginal, mimeType: documents.mimeType })
          .from(documents)
          .where(eq(documents.id, courrier.documentId))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    courrier.createdPar
      ? db
          .select({ nom: users.nom, prenom: users.prenom, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, courrier.createdPar))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    listerHistoriqueEntite('M4', courrier.id),
  ]);

  const infosGenerales = grilleInfos([
    { label: 'Référence', valeur: echapperHTML(courrier.reference) },
    { label: 'Direction', valeur: echapperHTML(LABELS_DIRECTION[courrier.direction] ?? courrier.direction) },
    { label: 'Statut de suivi', valeur: badge(LABELS_SUIVI[courrier.suiviStatut], COULEURS_SUIVI[courrier.suiviStatut]) },
    {
      label: 'Priorité',
      valeur: courrier.criticite
        ? badge(LABELS_CRITICITE[courrier.criticite], COULEURS_CRITICITE[courrier.criticite])
        : '—',
    },
    { label: 'Date de réception', valeur: formatDate(courrier.dateReception) },
    { label: 'Réponse requise', valeur: echapperHTML(LABELS_REPONSE[courrier.reponseRequise] ?? courrier.reponseRequise) },
    { label: 'Date limite de réponse', valeur: formatDate(courrier.dateLimiteReponse) },
  ]);

  const correspondants = sectionBox({
    titre: 'Correspondants',
    contenu: grilleInfos([
      { label: 'Expéditeur', valeur: formatOrganisation(courrier.expediteur) },
      { label: 'Destinataire', valeur: formatOrganisation(courrier.destinataire) },
    ]),
  });

  const documentHTML = document
    ? tableSimple(
        ['Nom du document', 'Type'],
        [[echapperHTML(document.nomOriginal), echapperHTML(document.mimeType)]]
      )
    : `<p style="font-size:9px; color:#9ca3af; margin:0;">Aucun document lié.</p>`;

  const responsableHTML = responsable
    ? grilleInfos([
        { label: 'Responsable', valeur: echapperHTML(`${responsable.prenom} ${responsable.nom}`) },
        { label: 'Rôle', valeur: echapperHTML(responsable.role) },
        { label: 'Email', valeur: echapperHTML(responsable.email) },
      ])
    : `<p style="font-size:9px; color:#9ca3af; margin:0;">Non renseigné.</p>`;

  const corps = `
    ${masthead({
      typeDocument: 'Courrier',
      titre: echapperHTML(courrier.objet),
      sousTitre: `Référence : ${echapperHTML(courrier.reference)}`,
    })}
    ${deuxColonnes(
      sectionBox({ titre: 'Informations générales', contenu: infosGenerales }),
      correspondants
    )}
    ${sectionBox({ titre: 'Document lié', contenu: documentHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Responsable', contenu: responsableHTML }),
      sectionBox({ titre: 'Historique', contenu: tableHistorique(historique) })
    )}
  `;

  return genererPDFFiche(corps);
}
