import 'dotenv/config';
import { db } from './index.js';
import {
  organisations,
  accords,
  accordsOrganisations,
  courriers,
  missions,
  missionParticipants,
  recommandations,
  documents,
  traductions,
  demandesTraduction,
  glossaire,
  courriersCriticiteSnapshots,
  users,
} from './schema.js';
import { eq as sqlEq } from 'drizzle-orm';

// ── Garde-fou — jamais en production ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error("❌ seed-demo.ts refuse de s'exécuter avec NODE_ENV=production. Abandon.");
  process.exit(1);
}

const CONTEXTE_AUTO_M6 = 'Ajouté automatiquement depuis delta corrections M6';

// ── Utilitaires ──────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copie = [...arr];
  const resultat: T[] = [];
  for (let i = 0; i < n && copie.length > 0; i++) {
    const idx = Math.floor(Math.random() * copie.length);
    resultat.push(copie.splice(idx, 1)[0]);
  }
  return resultat;
}

// 12 derniers mois, du plus ancien au plus récent (index 0 = il y a 11 mois)
function moisDerniers(n: number): Date[] {
  const maintenant = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (n - 1 - i), 1);
    return d;
  });
}

function dateAleatoireDansMois(premierJourMois: Date): Date {
  const jour = 1 + Math.floor(Math.random() * 26);
  const heure = 8 + Math.floor(Math.random() * 9);
  return new Date(
    premierJourMois.getFullYear(),
    premierJourMois.getMonth(),
    jour,
    heure,
    Math.floor(Math.random() * 60)
  );
}

function ajouterJours(date: Date, jours: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + jours);
  return d;
}

async function main() {
  console.log('🌱 Seed de démonstration — démarrage...\n');

  // ── Utilisateurs existants (requis — au moins 1) ────────────────────────
  const usersExistants = await db.select({ id: users.id, role: users.role }).from(users);
  if (usersExistants.length === 0) {
    console.error(
      '❌ Aucun utilisateur en base. Créez au moins un compte (bootstrap Super Admin) avant de seed.'
    );
    process.exit(1);
  }
  const userIds = usersExistants.map((u) => u.id);
  console.log(
    `👤 ${userIds.length} utilisateur(s) trouvé(s), réutilisés comme créateurs/participants.\n`
  );

  const mois12 = moisDerniers(12);

  // ── M2 – Organisations ───────────────────────────────────────────────────
  const orgsSeed = [
    { nom: 'DGCA France', pays: 'France', region: 'Europe', type: 'anac_etrangere' as const },
    {
      nom: 'ANAC Cameroun',
      pays: 'Cameroun',
      region: 'Afrique Centrale',
      type: 'anac_etrangere' as const,
    },
    {
      nom: 'ANAC Sénégal',
      pays: 'Sénégal',
      region: "Afrique de l'Ouest",
      type: 'anac_etrangere' as const,
    },
    {
      nom: 'DGAC Maroc',
      pays: 'Maroc',
      region: 'Afrique du Nord',
      type: 'anac_etrangere' as const,
    },
    {
      nom: 'OACI',
      pays: 'Canada',
      region: 'Amérique du Nord',
      type: 'organisation_internationale' as const,
    },
    {
      nom: 'ASECNA',
      pays: 'Sénégal',
      region: "Afrique de l'Ouest",
      type: 'organisation_internationale' as const,
    },
    {
      nom: 'GCAA UAE',
      pays: 'Émirats Arabes Unis',
      region: 'Moyen-Orient',
      type: 'anac_etrangere' as const,
    },
    {
      nom: 'Cabinet Juridique Aviation SA',
      pays: 'Belgique',
      region: 'Europe',
      type: 'autre' as const,
    },
  ];
  const orgsInsertees = await db
    .insert(organisations)
    .values(orgsSeed.map((o) => ({ ...o, actif: true })))
    .returning({ id: organisations.id, type: organisations.type });
  console.log(`✅ ${orgsInsertees.length} organisations créées`);

  // ── M1 – Accords ─────────────────────────────────────────────────────────
  const statutsAccord = [
    'actif',
    'actif',
    'actif',
    'expire',
    'en_renouvellement',
    'suspendu',
  ] as const;
  let refAccord = 1;
  const accordsAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
      const dateSignature = dateAleatoireDansMois(mois);
      const dureeJours = 180 + Math.floor(Math.random() * 730); // 6 mois à 2,5 ans
      return {
        reference: `ACC-2026-${String(refAccord++).padStart(3, '0')}`,
        titre: `Accord de coopération ${pick(['technique', 'réglementaire', 'formation', 'sûreté'])} n°${refAccord}`,
        statut: pick(statutsAccord),
        dateSignature,
        dateExpiration: ajouterJours(dateSignature, dureeJours),
        createdPar: pick(userIds),
      };
    })
  );
  const accordsInseres = await db
    .insert(accords)
    .values(accordsAInserer)
    .returning({ id: accords.id });
  console.log(`✅ ${accordsInseres.length} accords créés`);

  // Liaison accords ↔ organisations (1 à 2 orgs par accord)
  const liaisonsAccords = accordsInseres.flatMap((a) =>
    pickN(orgsInsertees, 1 + Math.floor(Math.random() * 2)).map((o) => ({
      accordId: a.id,
      organisationId: o.id,
    }))
  );
  await db.insert(accordsOrganisations).values(liaisonsAccords);
  console.log(`✅ ${liaisonsAccords.length} liaisons accords-organisations créées\n`);

  // ── M8 – Documents (créés avant courriers/missions/traductions qui en dépendent) ─
  const categories = [
    'accord',
    'correspondance',
    'mission',
    'traduction',
    'glossaire',
    'autre',
  ] as const;
  const statutsOCR = ['traite', 'traite', 'traite', 'traite', 'a_retraiter', 'echec'] as const;
  let refDoc = 1;
  const documentsAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => {
      const cat = pick(categories);
      return {
        nom: `doc-${refDoc}.pdf`,
        nomOriginal: `Document_${cat}_${refDoc++}.pdf`,
        chemin: `/sicot/documents/demo-${refDoc}.pdf`,
        mimeType: 'application/pdf',
        taille: 50000 + Math.floor(Math.random() * 4000000),
        categorie: cat,
        statutOCR: pick(statutsOCR),
        hashMD5: `demo${refDoc}${Date.now()}`.slice(0, 32).padEnd(32, '0'),
        uploadePar: pick(userIds),
        createdAt: dateAleatoireDansMois(mois),
      };
    })
  );
  const documentsInseres = await db
    .insert(documents)
    .values(documentsAInserer)
    .returning({ id: documents.id });
  console.log(`✅ ${documentsInseres.length} documents créés`);

  // ── M4 – Courriers ───────────────────────────────────────────────────────
  const directions = ['entrant', 'sortant'] as const;
  const suivisStatut = ['en_attente', 'repondu', 'repondu', 'archive'] as const;
  let refCourrier = 1;
  const courriersAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => {
      const direction = pick(directions);
      const dateReception = dateAleatoireDansMois(mois);
      const suivi = pick(suivisStatut);
      return {
        reference: `COU-2026-${String(refCourrier++).padStart(3, '0')}`,
        direction,
        objet: `${pick(["Demande d'information", 'Notification', 'Invitation', "Rapport d'audit", 'Suivi de dossier'])} — ${pick(['sûreté', 'navigabilité', 'licences', 'formation'])}`,
        expediteurOrganisationId: direction === 'entrant' ? pick(orgsInsertees).id : null,
        destinataireOrganisationId: direction === 'sortant' ? pick(orgsInsertees).id : null,
        dateReception,
        reponseRequise: pick(['oui', 'non', 'pour_information'] as const),
        suiviStatut: suivi,
        createdPar: pick(userIds),
        createdAt: dateReception,
        updatedAt:
          suivi === 'repondu'
            ? ajouterJours(dateReception, 3 + Math.floor(Math.random() * 20))
            : dateReception,
      };
    })
  );
  await db.insert(courriers).values(courriersAInserer);
  console.log(`✅ ${courriersAInserer.length} courriers créés\n`);

  // ── M3 – Missions + recommandations ─────────────────────────────────────
  const paysMission = ['France', 'Cameroun', 'Sénégal', 'Maroc', 'Canada', 'Émirats Arabes Unis'];
  const statutsMission = ['terminee', 'terminee', 'terminee', 'en_cours', 'planifiee'] as const;
  const missionsAInserer = mois12.flatMap((mois) =>
    Array.from({ length: Math.random() > 0.4 ? 1 : 0 }, () => {
      const dateDebut = dateAleatoireDansMois(mois);
      const dureeJours = 3 + Math.floor(Math.random() * 7);
      return {
        titre: `Mission d'audit ${pick(['OACI', 'sûreté', 'navigabilité', 'formation'])}`,
        destination: pick(['Paris', 'Yaoundé', 'Dakar', 'Rabat', 'Montréal', 'Dubaï']),
        pays: pick(paysMission),
        dateDebut,
        dateFin: ajouterJours(dateDebut, dureeJours),
        statut: pick(statutsMission),
        createdPar: pick(userIds),
      };
    })
  );
  const missionsInserees = await db.insert(missions).values(missionsAInserer).returning({
    id: missions.id,
    dateFin: missions.dateFin,
    statut: missions.statut,
  });
  console.log(`✅ ${missionsInserees.length} missions créées`);

  // Participants (2-3 agents par mission)
  const participantsAInserer = missionsInserees.flatMap((m) =>
    pickN(userIds, 2 + Math.floor(Math.random() * 2)).map((userId) => ({ missionId: m.id, userId }))
  );
  await db.insert(missionParticipants).values(participantsAInserer);

  // Rapport de mission — pour les missions terminées, lier un document catégorie "mission"
  const documentsMission = documentsInseres.slice(
    0,
    Math.min(documentsInseres.length, missionsInserees.length)
  );
  for (let i = 0; i < missionsInserees.length; i++) {
    const m = missionsInserees[i];
    if (m.statut === 'terminee' && documentsMission[i] && Math.random() > 0.3) {
      await db
        .update(missions)
        .set({ rapportDocumentId: documentsMission[i].id })
        .where(sqlEq(missions.id, m.id));
    }
  }

  // Recommandations (1-3 par mission)
  const statutsReco = ['realisee', 'realisee', 'en_cours', 'en_attente', 'en_attente'] as const;
  const recosAInserer = missionsInserees.flatMap((m) =>
    Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
      const statut = pick(statutsReco);
      // Certaines "en_attente" ont une date limite dépassée pour peupler la métrique "dépassées"
      const dateLimite = ajouterJours(
        m.dateFin,
        statut === 'en_attente' && Math.random() > 0.5 ? -10 : 30
      );
      return {
        missionId: m.id,
        texte: `Recommandation : ${pick(['renforcer les contrôles', 'former le personnel', 'mettre à jour la procédure', 'planifier un suivi'])}`,
        responsableId: pick(userIds),
        dateLimite,
        statut,
      };
    })
  );
  await db.insert(recommandations).values(recosAInserer);
  console.log(`✅ ${recosAInserer.length} recommandations créées\n`);

  // ── M6 – Traductions ─────────────────────────────────────────────────────
  const statutsTraduction = [
    'approuvee',
    'approuvee',
    'approuvee',
    'en_relecture',
    'a_reviser',
  ] as const;
  const documentsTraduction = documentsInseres.filter(() => Math.random() > 0.6);
  const traductionsAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
      const dateCreation = dateAleatoireDansMois(mois);
      const statut = pick(statutsTraduction);
      const texteIA = 'Ceci est un texte traduit automatiquement par le moteur de traduction.';
      const corrige = Math.random() > 0.55; // ~45% validées telles quelles
      return {
        documentId: documentsTraduction.length > 0 ? pick(documentsTraduction).id : null,
        texteOriginal: 'This is the original source text to be translated.',
        texteIA,
        texteFinal:
          statut === 'approuvee' ? (corrige ? texteIA + ' [relu et corrigé]' : texteIA) : null,
        direction: pick(['fr_en', 'en_fr'] as const),
        statut,
        moteurUtilise: pick(['libretranslate', 'libretranslate', 'deepl'] as const),
        traducteurId: pick(userIds),
        relecteurId: statut === 'approuvee' ? pick(userIds) : null,
        createdAt: dateCreation,
        updatedAt:
          statut === 'approuvee'
            ? ajouterJours(dateCreation, 1 + Math.floor(Math.random() * 6))
            : dateCreation,
      };
    })
  );
  await db.insert(traductions).values(traductionsAInserer);
  console.log(`✅ ${traductionsAInserer.length} traductions créées\n`);

  // ── M5 – Demandes de traduction ─────────────────────────────────────────
  const statutsDemande = ['validee', 'validee', 'archivee', 'en_cours', 'soumise'] as const;
  const demandesAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
      const dateCreation = dateAleatoireDansMois(mois);
      const statut = pick(statutsDemande);
      const prioriteDemandee = Math.random() > 0.75 ? 'urgente' : ('normale' as const);
      return {
        demandeurId: pick(userIds),
        texteLibre: 'Merci de traduire ce document dans les meilleurs délais.',
        direction: pick(['fr_en', 'en_fr'] as const),
        prioriteDemandee,
        prioriteValidee:
          statut !== 'soumise'
            ? prioriteDemandee === 'urgente' && Math.random() > 0.3
              ? 'urgente'
              : 'normale'
            : null,
        statut,
        createdAt: dateCreation,
        updatedAt:
          statut !== 'soumise'
            ? ajouterJours(dateCreation, 1 + Math.floor(Math.random() * 5))
            : dateCreation,
      };
    })
  );
  await db.insert(demandesTraduction).values(demandesAInserer);
  console.log(`✅ ${demandesAInserer.length} demandes de traduction créées\n`);

  // ── M7 – Glossaire ───────────────────────────────────────────────────────
  const domaines = ['Navigabilité', 'Sûreté', 'Licences', 'Réglementation', 'Formation'];
  const termesBase = [
    ['aéronef', 'aircraft'],
    ['navigabilité', 'airworthiness'],
    ['licence de pilote', 'pilot license'],
    ['contrôle aérien', 'air traffic control'],
    ["piste d'atterrissage", 'runway'],
    ['certificat de type', 'type certificate'],
    ['sûreté aéroportuaire', 'airport security'],
    ['inspection technique', 'technical inspection'],
    ['maintenance préventive', 'preventive maintenance'],
    ['zone de fret', 'cargo area'],
  ];
  let refTerme = 0;
  const glossaireAInserer = mois12.flatMap((mois) =>
    Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
      const [fr, en] = termesBase[refTerme % termesBase.length];
      refTerme++;
      const auto = Math.random() > 0.6;
      return {
        termeFr: `${fr} ${refTerme}`,
        termeEn: `${en} ${refTerme}`,
        domaine: pick(domaines),
        contexte: auto
          ? CONTEXTE_AUTO_M6
          : `Terme ajouté lors de la révision du glossaire ${pick(domaines).toLowerCase()}`,
        actif: true,
        createdPar: pick(userIds),
        createdAt: dateAleatoireDansMois(mois),
      };
    })
  );
  await db.insert(glossaire).values(glossaireAInserer);
  console.log(`✅ ${glossaireAInserer.length} termes de glossaire créés\n`);

  // ── Historique criticité courriers — backfill 14 jours ──────────────────
  // Le cron réel n'a démarré qu'aujourd'hui : ceci simule un historique pour
  // que le graphique d'évolution ne soit pas vide en attendant l'accumulation réelle.
  const snapshotsAInserer = Array.from({ length: 14 }, (_, i) => {
    const date = ajouterJours(new Date(), -14 + i);
    const normal = 3 + Math.floor(Math.random() * 4);
    const aSurveiller = Math.floor(Math.random() * 3);
    const critique = Math.random() > 0.7 ? 1 : 0;
    return {
      date: date.toISOString().slice(0, 10),
      normal,
      aSurveiller,
      critique,
      totalEnAttente: normal + aSurveiller + critique,
    };
  });
  await db
    .insert(courriersCriticiteSnapshots)
    .values(snapshotsAInserer)
    .onConflictDoNothing({ target: courriersCriticiteSnapshots.date });
  console.log(
    `✅ ${snapshotsAInserer.length} jours d'historique de criticité créés (simulés, à titre de démo)\n`
  );

  console.log('🎉 Seed de démonstration terminé.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur pendant le seed :', err);
  process.exit(1);
});
