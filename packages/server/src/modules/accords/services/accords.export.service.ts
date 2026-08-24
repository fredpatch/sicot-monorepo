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
import type { AccordView, AccordStatut } from './accords.types';

const LABELS_STATUT: Record<AccordStatut, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  suspendu: 'Suspendu',
  en_renouvellement: 'En renouvellement',
};

const COULEURS_STATUT: Record<AccordStatut, BadgeCouleur> = {
  actif: 'vert',
  expire: 'rouge',
  suspendu: 'ambre',
  en_renouvellement: 'bleu',
};

const LABELS_TYPE_ORGANISATION: Record<string, string> = {
  anac_etrangere: 'ANAC étrangère',
  organisation_internationale: 'Organisation internationale',
  autre: 'Autre organisation',
};

function formatDate(date?: Date): string {
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
}

// ── Export PDF — fiche individuelle d'un accord ────────────────────────────
export async function genererPDFAccord(accord: AccordView): Promise<Buffer> {
  const [document, responsable, historique] = await Promise.all([
    accord.documentId
      ? db
          .select({ id: documents.id, nomOriginal: documents.nomOriginal, mimeType: documents.mimeType })
          .from(documents)
          .where(eq(documents.id, accord.documentId))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    accord.createdPar
      ? db
          .select({ nom: users.nom, prenom: users.prenom, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, accord.createdPar))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    listerHistoriqueEntite('M1', accord.id),
  ]);

  const infosGenerales = grilleInfos([
    { label: 'Référence', valeur: echapperHTML(accord.reference) },
    { label: 'Statut', valeur: badge(LABELS_STATUT[accord.statut], COULEURS_STATUT[accord.statut]) },
    { label: 'Date de signature', valeur: formatDate(accord.dateSignature) },
    { label: "Date d'expiration", valeur: formatDate(accord.dateExpiration) },
  ]);

  const notes = sectionBox({
    titre: 'Notes',
    contenu: `<p style="margin:0; font-size:9px; line-height:1.5;">${accord.notes ? echapperHTML(accord.notes) : 'Aucune note.'}</p>`,
  });

  const documentHTML = document
    ? tableSimple(
        ['Nom du document', 'Type'],
        [[echapperHTML(document.nomOriginal), echapperHTML(document.mimeType)]]
      )
    : `<p style="font-size:9px; color:#9ca3af; margin:0;">Aucun document lié.</p>`;

  const partenairesHTML = tableSimple(
    ['Organisation', 'Pays', 'Type', 'Contact principal'],
    accord.partenaires.map((p) => [
      echapperHTML(p.nom),
      echapperHTML(p.pays),
      echapperHTML(LABELS_TYPE_ORGANISATION[p.type] ?? p.type),
      p.contactPrincipal ? echapperHTML(`${p.contactPrincipal.prenom} ${p.contactPrincipal.nom}`) : '—',
    ])
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
      typeDocument: 'Accord de coopération',
      titre: echapperHTML(accord.titre),
      sousTitre: `Référence : ${echapperHTML(accord.reference)}`,
    })}
    ${deuxColonnes(
      sectionBox({ titre: 'Informations générales', contenu: infosGenerales }),
      notes
    )}
    ${sectionBox({ titre: 'Document lié', contenu: documentHTML })}
    ${sectionBox({ titre: 'Partenaires', contenu: partenairesHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Responsable', contenu: responsableHTML }),
      sectionBox({ titre: 'Historique', contenu: tableHistorique(historique) })
    )}
  `;

  return genererPDFFiche(corps);
}
