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
import type { MissionView, MissionStatut, LogistiqueStatut } from './missions.types';

const LABELS_STATUT: Record<MissionStatut, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const COULEURS_STATUT: Record<MissionStatut, BadgeCouleur> = {
  planifiee: 'bleu',
  en_cours: 'ambre',
  terminee: 'vert',
  annulee: 'gris',
};

const LABELS_LOGISTIQUE: Record<LogistiqueStatut, string> = {
  a_planifier: 'À planifier',
  en_cours: 'En cours',
  confirme: 'Confirmée',
};

const COULEURS_LOGISTIQUE: Record<LogistiqueStatut, BadgeCouleur> = {
  a_planifier: 'gris',
  en_cours: 'ambre',
  confirme: 'vert',
};

const LABELS_RECOMMANDATION_STATUT: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  realisee: 'Réalisée',
};

function formatDate(date?: Date): string {
  return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
}

function coche(valeur: boolean): string {
  return valeur ? '☑' : '☐';
}

function compterRecommandations(recommandations: MissionView['recommandations']): {
  enAttente: number;
  enCours: number;
  realisees: number;
  depassees: number;
} {
  const liste = recommandations ?? [];
  const maintenant = new Date();
  return {
    enAttente: liste.filter((r) => r.statut === 'en_attente').length,
    enCours: liste.filter((r) => r.statut === 'en_cours').length,
    realisees: liste.filter((r) => r.statut === 'realisee').length,
    depassees: liste.filter(
      (r) => r.statut !== 'realisee' && r.dateLimite && new Date(r.dateLimite) < maintenant
    ).length,
  };
}

// ── Export PDF — rapport de synthèse d'une mission ─────────────────────────
export async function genererPDFMission(mission: MissionView): Promise<Buffer> {
  const [rapportDocument, responsable, historique] = await Promise.all([
    mission.rapportDocumentId
      ? db
          .select({ id: documents.id, nomOriginal: documents.nomOriginal, mimeType: documents.mimeType })
          .from(documents)
          .where(eq(documents.id, mission.rapportDocumentId))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    mission.createdPar
      ? db
          .select({ nom: users.nom, prenom: users.prenom, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, mission.createdPar))
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    listerHistoriqueEntite('M3', mission.id),
  ]);

  const infosGenerales = grilleInfos([
    { label: 'Destination', valeur: echapperHTML(mission.destination) },
    { label: 'Pays', valeur: echapperHTML(mission.pays) },
    { label: 'Période', valeur: `${formatDate(mission.dateDebut)} au ${formatDate(mission.dateFin)}` },
    { label: 'Statut', valeur: badge(LABELS_STATUT[mission.statut], COULEURS_STATUT[mission.statut]) },
  ]);

  const logistiqueHTML = grilleInfos([
    {
      label: 'État logistique',
      valeur: badge(
        LABELS_LOGISTIQUE[mission.confirmationLogistique],
        COULEURS_LOGISTIQUE[mission.confirmationLogistique]
      ),
    },
    { label: 'Billet réservé', valeur: coche(mission.logistiqueBilletReserve) },
    { label: 'Hébergement confirmé', valeur: coche(mission.logistiqueHebergementConfirme) },
    { label: 'Financement validé', valeur: coche(mission.logistiqueFinancementValide) },
    {
      label: 'Contact sur place',
      valeur: mission.contactSurPlace
        ? echapperHTML(
            `${mission.contactSurPlace.prenom} ${mission.contactSurPlace.nom}${mission.contactSurPlace.organisationNom ? ` (${mission.contactSurPlace.organisationNom})` : ''}`
          )
        : '—',
    },
  ]);

  const participantsHTML = tableSimple(
    ['Nom', 'Matricule', 'Email'],
    mission.participants.map((p) => [
      echapperHTML(`${p.prenom} ${p.nom}`),
      echapperHTML(p.matricule),
      echapperHTML(p.email),
    ])
  );

  const rapportHTML = grilleInfos([
    { label: 'État du rapport', valeur: rapportDocument ? badge('Déposé', 'vert') : badge('Manquant', 'ambre') },
    { label: 'Document', valeur: rapportDocument ? echapperHTML(rapportDocument.nomOriginal) : '—' },
  ]);

  const compteurs = compterRecommandations(mission.recommandations);
  const recommandationsCompteurHTML = tableSimple(
    ['Statut', 'Nombre'],
    [
      ['En attente', String(compteurs.enAttente)],
      ['En cours', String(compteurs.enCours)],
      ['Réalisées', String(compteurs.realisees)],
      ['Dépassées', String(compteurs.depassees)],
    ]
  );

  const recommandationsDetailHTML = tableSimple(
    ['Texte', 'Responsable', 'Date limite', 'Statut'],
    (mission.recommandations ?? []).map((r) => [
      echapperHTML(r.texte),
      r.responsable ? echapperHTML(`${r.responsable.prenom} ${r.responsable.nom}`) : '—',
      formatDate(r.dateLimite),
      echapperHTML(LABELS_RECOMMANDATION_STATUT[r.statut] ?? r.statut),
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
      typeDocument: 'Mission',
      titre: echapperHTML(mission.titre),
      sousTitre: `${echapperHTML(mission.destination)}, ${echapperHTML(mission.pays)}`,
    })}
    ${deuxColonnes(
      sectionBox({ titre: 'Informations générales', contenu: infosGenerales }),
      sectionBox({ titre: 'Logistique', contenu: logistiqueHTML })
    )}
    ${sectionBox({ titre: `Participants (${mission.participants.length})`, contenu: participantsHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Rapport de mission', contenu: rapportHTML }),
      sectionBox({ titre: `Recommandations (${(mission.recommandations ?? []).length})`, contenu: recommandationsCompteurHTML })
    )}
    ${sectionBox({ titre: 'Détail des recommandations', contenu: recommandationsDetailHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Responsable', contenu: responsableHTML }),
      sectionBox({ titre: 'Historique', contenu: tableHistorique(historique) })
    )}
  `;

  return genererPDFFiche(corps);
}
