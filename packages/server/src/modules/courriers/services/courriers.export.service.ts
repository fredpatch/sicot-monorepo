import { eq } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { users } from '@/db/schema';
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

// Le contact explicitement choisi prime sur le contact principal générique
// de l'organisation — un choix explicite ne doit pas être silencieusement
// remplacé par quelqu'un d'autre.
function formatOrganisation(
  org?: CourrierView['expediteur'],
  contactChoisi?: CourrierView['expediteurContact']
): string {
  if (!org) return '—';
  const contact = contactChoisi
    ? ` — contact : ${echapperHTML(`${contactChoisi.prenom} ${contactChoisi.nom}`)}`
    : org.contactPrincipal
      ? ` — contact : ${echapperHTML(`${org.contactPrincipal.prenom} ${org.contactPrincipal.nom}`)}`
      : '';
  return `${echapperHTML(org.nom)} (${echapperHTML(org.pays)})${contact}`;
}

// ── Export PDF — fiche individuelle d'un courrier ──────────────────────────
export async function genererPDFCourrier(courrier: CourrierView): Promise<Buffer> {
  const [responsable, historique] = await Promise.all([
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
      { label: 'Expéditeur', valeur: formatOrganisation(courrier.expediteur, courrier.expediteurContact) },
      { label: 'Destinataire', valeur: formatOrganisation(courrier.destinataire, courrier.destinataireContact) },
    ]),
  });

  const documentHTML = tableSimple(
    ['Nom du document', 'Type'],
    courrier.documents.map((doc) => [echapperHTML(doc.nomOriginal), echapperHTML(doc.mimeType)])
  );

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
    ${sectionBox({ titre: 'Documents joints', contenu: documentHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Responsable', contenu: responsableHTML }),
      sectionBox({ titre: 'Historique', contenu: tableHistorique(historique) })
    )}
  `;

  return genererPDFFiche(corps);
}
