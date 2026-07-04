import { db } from '@/db/index.js';
import { sql } from 'drizzle-orm';
import { avecCache } from '@/utils/cache.js';
import type {
  PeriodeFiltre,
  AccordsAnalytics,
  MissionsAnalytics,
  CourriersAnalytics,
  GlossaireAnalytics,
  DocumentsAnalytics,
  DemandesAnalytics,
  TraductionAnalytics,
  GlobalAnalytics,
} from '../analytics.types';
import { courriersCriticiteSnapshots, documents, glossaire } from '@/db/schema';

const CACHE_TTL_MS = 60_000; // 1 minute — assez court pour rester à jour, assez long pour absorber la charge

// ── Résolution de la période — défaut 12 derniers mois si non spécifiée ───
function resoudrePeriode(filtre: PeriodeFiltre): { debut: Date; fin: Date } {
  const fin = filtre.dateFin ?? new Date();
  const debut = filtre.dateDebut ?? new Date(fin.getFullYear() - 1, fin.getMonth(), fin.getDate());
  return { debut, fin };
}

function cleCache(module: string, filtre: PeriodeFiltre): string {
  const { debut, fin } = resoudrePeriode(filtre);
  return `analytics:${module}:${debut.toISOString()}:${fin.toISOString()}`;
}

// ── SERVICE : Analytics M1 Accords ─────────────────────────────────────────
export async function getAccordsAnalytics(filtre: PeriodeFiltre): Promise<AccordsAnalytics> {
  return avecCache(cleCache('accords', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    // Durée moyenne par type de partenaire — un accord multi-partenaires
    // compte une fois par type d'organisation impliqué
    const dureeParType = await db.execute(sql`
      SELECT
        o.type,
        AVG(EXTRACT(DAY FROM (a.date_expiration - a.date_signature))) AS duree_moyenne_jours,
        COUNT(*) AS nombre_accords
      FROM accords a
      JOIN accords_organisations ao ON ao.accord_id = a.id
      JOIN organisations o ON o.id = ao.organisation_id
      WHERE a.date_expiration IS NOT NULL
        AND a.date_signature BETWEEN ${debut} AND ${fin}
      GROUP BY o.type
    `);

    // Taux de renouvellement vs clôture — un accord renouvelé passe en
    // 'en_renouvellement' (cf. renouvelerAccord), jamais en 'expire'
    const renouvellement = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE statut = 'en_renouvellement') AS renouveles,
        COUNT(*) FILTER (WHERE statut = 'expire') AS clotures
      FROM accords
      WHERE date_signature BETWEEN ${debut} AND ${fin}
    `);

    // Répartition géographique — état actuel des partenaires actifs,
    // indépendant de la période (photo instantanée, pas une évolution)
    const repartition = await db.execute(sql`
      SELECT pays, region, COUNT(*) AS nombre_partenaires
      FROM organisations
      WHERE actif = true
      GROUP BY pays, region
      ORDER BY nombre_partenaires DESC
    `);

    // Évolution du nombre d'accords signés par mois, sur la période
    const evolution = await db.execute(sql`
      SELECT TO_CHAR(date_signature, 'YYYY-MM') AS mois, COUNT(*) AS total
      FROM accords
      WHERE date_signature BETWEEN ${debut} AND ${fin}
      GROUP BY mois
      ORDER BY mois ASC
    `);

    const renouvRow = renouvellement.rows[0] as { renouveles: string; clotures: string };
    const renouveles = parseInt(renouvRow.renouveles);
    const clotures = parseInt(renouvRow.clotures);
    const totalConcerne = renouveles + clotures;

    return {
      dureeMoyenneParType: (
        dureeParType.rows as {
          type: string;
          duree_moyenne_jours: string | null;
          nombre_accords: string;
        }[]
      ).map((r) => ({
        type: r.type,
        dureeMoyenneJours: r.duree_moyenne_jours
          ? Math.round(parseFloat(r.duree_moyenne_jours))
          : null,
        nombreAccords: parseInt(r.nombre_accords),
      })),
      tauxRenouvellement: {
        renouveles,
        clotures,
        tauxPourcentage: totalConcerne > 0 ? Math.round((renouveles / totalConcerne) * 100) : 0,
      },
      repartitionGeographique: (
        repartition.rows as { pays: string; region: string | null; nombre_partenaires: string }[]
      ).map((r) => ({
        pays: r.pays,
        region: r.region,
        nombrePartenaires: parseInt(r.nombre_partenaires),
      })),
      evolutionParMois: (evolution.rows as { mois: string; total: string }[]).map((r) => ({
        mois: r.mois,
        total: parseInt(r.total),
      })),
    };
  });
}

// ── SERVICE : Analytics M4 Courriers ───────────────────────────────────────
export async function getCourriersAnalytics(filtre: PeriodeFiltre): Promise<CourriersAnalytics> {
  return avecCache(cleCache('courriers', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    const volume = await db.execute(sql`
      SELECT
        TO_CHAR(date_reception, 'YYYY-MM') AS mois,
        COUNT(*) FILTER (WHERE direction = 'entrant') AS entrant,
        COUNT(*) FILTER (WHERE direction = 'sortant') AS sortant
      FROM courriers
      WHERE date_reception BETWEEN ${debut} AND ${fin}
      GROUP BY mois
      ORDER BY mois ASC
    `);

    // Aucune colonne date_reponse dédiée — updated_at utilisé comme proxy du
    // moment où suivi_statut est passé à 'repondu'. Imprécis si le courrier a
    // été modifié pour d'autres raisons après la réponse, mais c'est le seul
    // signal disponible dans le schéma actuel.
    const tempsReponse = await db.execute(sql`
      SELECT AVG(EXTRACT(DAY FROM (updated_at - date_reception))) AS delai_moyen
      FROM courriers
      WHERE suivi_statut = 'repondu'
        AND date_reception BETWEEN ${debut} AND ${fin}
    `);

    const tauxReponse = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE suivi_statut = 'repondu') AS repondus,
        COUNT(*) FILTER (WHERE suivi_statut = 'archive') AS archives_sans_reponse
      FROM courriers
      WHERE date_reception BETWEEN ${debut} AND ${fin}
    `);

    const topOrganisations = await db.execute(sql`
      SELECT o.nom AS organisation, COUNT(*) AS nombre_courriers
      FROM courriers c
      JOIN organisations o ON o.id = c.expediteur_organisation_id
      WHERE c.date_reception BETWEEN ${debut} AND ${fin}
      GROUP BY o.nom
      ORDER BY nombre_courriers DESC
      LIMIT 5
    `);

    const evolutionCriticite = await db
      .select({
        date: courriersCriticiteSnapshots.date,
        normal: courriersCriticiteSnapshots.normal,
        aSurveiller: courriersCriticiteSnapshots.aSurveiller,
        critique: courriersCriticiteSnapshots.critique,
      })
      .from(courriersCriticiteSnapshots)
      .where(sql`${courriersCriticiteSnapshots.date} BETWEEN ${debut} AND ${fin}`)
      .orderBy(courriersCriticiteSnapshots.date);

    const tempsReponseRow = tempsReponse.rows[0] as { delai_moyen: string | null };
    const tauxRow = tauxReponse.rows[0] as { repondus: string; archives_sans_reponse: string };
    const repondus = parseInt(tauxRow.repondus);
    const archives = parseInt(tauxRow.archives_sans_reponse);
    const totalConcerne = repondus + archives;

    return {
      volumeParMoisEtDirection: (
        volume.rows as { mois: string; entrant: string; sortant: string }[]
      ).map((r) => ({ mois: r.mois, entrant: parseInt(r.entrant), sortant: parseInt(r.sortant) })),
      tempsMoyenReponseJours: tempsReponseRow.delai_moyen
        ? Math.round(parseFloat(tempsReponseRow.delai_moyen))
        : null,
      tauxReponse: {
        repondus,
        archivesSansReponse: archives,
        tauxPourcentage: totalConcerne > 0 ? Math.round((repondus / totalConcerne) * 100) : 0,
      },
      topOrganisationsExpeditrices: (
        topOrganisations.rows as { organisation: string; nombre_courriers: string }[]
      ).map((r) => ({
        organisation: r.organisation,
        nombreCourriers: parseInt(r.nombre_courriers),
      })),
      evolutionCriticite: evolutionCriticite.map((r) => ({
        date: r.date,
        normal: r.normal,
        aSurveiller: r.aSurveiller,
        critique: r.critique,
      })),
    };
  });
}

// ── SERVICE : Analytics M3 Missions ────────────────────────────────────────
export async function getMissionsAnalytics(filtre: PeriodeFiltre): Promise<MissionsAnalytics> {
  return avecCache(cleCache('missions', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    const parPays = await db.execute(sql`
      SELECT pays, COUNT(*) AS nombre_missions
      FROM missions
      WHERE date_debut BETWEEN ${debut} AND ${fin}
      GROUP BY pays
      ORDER BY nombre_missions DESC
    `);

    // "Dépassées" ne s'applique qu'aux recommandations encore en_attente —
    // même convention que dashboard.helpers.ts getRecommandationsKpi
    const recos = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE r.statut = 'realisee') AS realisees,
        COUNT(*) FILTER (WHERE r.statut = 'en_cours') AS en_cours,
        COUNT(*) FILTER (WHERE r.statut = 'en_attente' AND (r.date_limite IS NULL OR r.date_limite >= NOW())) AS en_attente_actives,
        COUNT(*) FILTER (WHERE r.statut = 'en_attente' AND r.date_limite < NOW()) AS depassees
      FROM recommandations r
      JOIN missions m ON m.id = r.mission_id
      WHERE m.date_debut BETWEEN ${debut} AND ${fin}
    `);

    const delaiRapport = await db.execute(sql`
      SELECT AVG(EXTRACT(DAY FROM (d.created_at - m.date_fin))) AS delai_moyen
      FROM missions m
      JOIN documents d ON d.id = m.rapport_document_id
      WHERE m.rapport_document_id IS NOT NULL
        AND m.date_fin BETWEEN ${debut} AND ${fin}
    `);

    const topParticipants = await db.execute(sql`
      SELECT u.nom, u.prenom, u.matricule, COUNT(*) AS nombre_missions
      FROM mission_participants mp
      JOIN missions m ON m.id = mp.mission_id
      JOIN users u ON u.id = mp.user_id
      WHERE m.date_debut BETWEEN ${debut} AND ${fin}
      GROUP BY u.id, u.nom, u.prenom, u.matricule
      ORDER BY nombre_missions DESC
      LIMIT 10
    `);

    const recosRow = recos.rows[0] as {
      realisees: string;
      en_cours: string;
      en_attente_actives: string;
      depassees: string;
    };
    const delaiRow = delaiRapport.rows[0] as { delai_moyen: string | null };

    return {
      missionsParPays: (parPays.rows as { pays: string; nombre_missions: string }[]).map((r) => ({
        pays: r.pays,
        nombreMissions: parseInt(r.nombre_missions),
      })),
      recommandations: {
        realisees: parseInt(recosRow.realisees),
        enCours: parseInt(recosRow.en_cours),
        enAttenteActives: parseInt(recosRow.en_attente_actives),
        depassees: parseInt(recosRow.depassees),
      },
      delaiMoyenRapportJours: delaiRow.delai_moyen
        ? Math.round(parseFloat(delaiRow.delai_moyen))
        : null,
      topParticipants: (
        topParticipants.rows as {
          nom: string;
          prenom: string;
          matricule: string;
          nombre_missions: string;
        }[]
      ).map((r) => ({
        nom: r.nom,
        prenom: r.prenom,
        matricule: r.matricule,
        nombreMissions: parseInt(r.nombre_missions),
      })),
    };
  });
}

const CONTEXTE_AUTO_M6 = 'Ajouté automatiquement depuis delta corrections M6';

// ── SERVICE : Analytics M6 Traduction ──────────────────────────────────────
export async function getTraductionAnalytics(filtre: PeriodeFiltre): Promise<TraductionAnalytics> {
  return avecCache(cleCache('traduction', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    const volume = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mois, COUNT(*) AS total
      FROM traductions
      WHERE deleted_at IS NULL AND created_at BETWEEN ${debut} AND ${fin}
      GROUP BY mois
      ORDER BY mois ASC
    `);

    const correction = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE texte_final = texte_ia) AS validees_tel_quelles,
        COUNT(*) FILTER (WHERE texte_final <> texte_ia) AS corrigees
      FROM traductions
      WHERE deleted_at IS NULL
        AND texte_final IS NOT NULL
        AND texte_ia IS NOT NULL
        AND created_at BETWEEN ${debut} AND ${fin}
    `);

    // Pas de colonne date_approbation dédiée — updated_at utilisé comme proxy
    // (même limite que courriers/demandes : imprécis si modifié après coup)
    const tempsTraitement = await db.execute(sql`
      SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) AS delai_moyen
      FROM traductions
      WHERE deleted_at IS NULL AND statut = 'approuvee'
        AND created_at BETWEEN ${debut} AND ${fin}
    `);

    const direction = await db.execute(sql`
      SELECT direction, COUNT(*) AS nombre
      FROM traductions
      WHERE deleted_at IS NULL AND created_at BETWEEN ${debut} AND ${fin}
      GROUP BY direction
    `);

    const [termesM6] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(glossaire)
      .where(
        sql`${glossaire.contexte} = ${CONTEXTE_AUTO_M6} AND ${glossaire.createdAt} BETWEEN ${debut} AND ${fin}`
      );

    const correctionRow = correction.rows[0] as { validees_tel_quelles: string; corrigees: string };
    const valideesTelQuelles = parseInt(correctionRow.validees_tel_quelles);
    const corrigees = parseInt(correctionRow.corrigees);
    const totalCorrection = valideesTelQuelles + corrigees;
    const tempsRow = tempsTraitement.rows[0] as { delai_moyen: string | null };

    return {
      volumeParMois: (volume.rows as { mois: string; total: string }[]).map((r) => ({
        mois: r.mois,
        nombreTraductions: parseInt(r.total),
      })),
      tauxCorrectionIA: {
        valideesTelQuelles,
        corrigees,
        tauxCorrectionPourcentage:
          totalCorrection > 0 ? Math.round((corrigees / totalCorrection) * 100) : 0,
      },
      tempsMoyenTraitementJours: tempsRow.delai_moyen
        ? Math.round(parseFloat(tempsRow.delai_moyen))
        : null,
      repartitionDirection: (direction.rows as { direction: string; nombre: string }[]).map(
        (r) => ({
          direction: r.direction,
          nombre: parseInt(r.nombre),
        })
      ),
      termesAjoutesGlossaireDepuisM6: Number(termesM6?.total ?? 0),
    };
  });
}

// ── SERVICE : Analytics M5 Demandes ────────────────────────────────────────
export async function getDemandesAnalytics(filtre: PeriodeFiltre): Promise<DemandesAnalytics> {
  return avecCache(cleCache('demandes', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    // Proxy updated_at, même limite documentée pour courriers/traductions
    const delaiPriseEnCharge = await db.execute(sql`
      SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) AS delai_moyen
      FROM demandes_traduction
      WHERE statut <> 'soumise' AND created_at BETWEEN ${debut} AND ${fin}
    `);

    const urgence = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE priorite_demandee = 'urgente') AS demandees_urgentes,
        COUNT(*) FILTER (WHERE priorite_validee = 'urgente') AS validees_urgentes
      FROM demandes_traduction
      WHERE created_at BETWEEN ${debut} AND ${fin}
    `);

    const parDemandeur = await db.execute(sql`
      SELECT u.nom, u.prenom, u.matricule, COUNT(*) AS nombre_demandes
      FROM demandes_traduction dt
      JOIN users u ON u.id = dt.demandeur_id
      WHERE dt.created_at BETWEEN ${debut} AND ${fin}
      GROUP BY u.id, u.nom, u.prenom, u.matricule
      ORDER BY nombre_demandes DESC
      LIMIT 10
    `);

    const completion = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE statut = 'validee') AS validees,
        COUNT(*) FILTER (WHERE statut = 'archivee') AS archivees,
        COUNT(*) FILTER (WHERE statut = 'en_cours') AS en_cours
      FROM demandes_traduction
      WHERE created_at BETWEEN ${debut} AND ${fin}
    `);

    const delaiRow = delaiPriseEnCharge.rows[0] as { delai_moyen: string | null };
    const urgenceRow = urgence.rows[0] as { demandees_urgentes: string; validees_urgentes: string };
    const demandeesUrgentes = parseInt(urgenceRow.demandees_urgentes);
    const valideesUrgentes = parseInt(urgenceRow.validees_urgentes);
    const completionRow = completion.rows[0] as {
      validees: string;
      archivees: string;
      en_cours: string;
    };

    return {
      delaiMoyenPriseEnChargeJours: delaiRow.delai_moyen
        ? Math.round(parseFloat(delaiRow.delai_moyen))
        : null,
      tauxUrgenceValidee: {
        demandeesUrgentes,
        valideesUrgentes,
        tauxPourcentage:
          demandeesUrgentes > 0 ? Math.round((valideesUrgentes / demandeesUrgentes) * 100) : 0,
      },
      volumeParDemandeur: (
        parDemandeur.rows as {
          nom: string;
          prenom: string;
          matricule: string;
          nombre_demandes: string;
        }[]
      ).map((r) => ({
        nom: r.nom,
        prenom: r.prenom,
        matricule: r.matricule,
        nombreDemandes: parseInt(r.nombre_demandes),
      })),
      tauxCompletion: {
        validees: parseInt(completionRow.validees),
        archivees: parseInt(completionRow.archivees),
        enCours: parseInt(completionRow.en_cours),
      },
    };
  });
}

// ── SERVICE : Analytics M8 Documents ───────────────────────────────────────
export async function getDocumentsAnalytics(filtre: PeriodeFiltre): Promise<DocumentsAnalytics> {
  return avecCache(cleCache('documents', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    const volume = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mois, categorie, COUNT(*) AS nombre
      FROM documents
      WHERE deleted_at IS NULL AND created_at BETWEEN ${debut} AND ${fin}
      GROUP BY mois, categorie
      ORDER BY mois ASC
    `);

    const ocr = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE statut_ocr = 'traite') AS traite,
        COUNT(*) FILTER (WHERE statut_ocr = 'echec') AS echec,
        COUNT(*) FILTER (WHERE statut_ocr = 'a_retraiter') AS a_retraiter
      FROM documents
      WHERE deleted_at IS NULL AND created_at BETWEEN ${debut} AND ${fin}
    `);

    // Stock cumulé : base = tout ce qui existait avant la période, puis
    // somme courante des ajouts mois par mois à l'intérieur de la période
    const [baseAvant] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(documents)
      .where(sql`${documents.deletedAt} IS NULL AND ${documents.createdAt} < ${debut}`);

    const ajoutsParMois = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mois, COUNT(*) AS total
      FROM documents
      WHERE deleted_at IS NULL AND created_at BETWEEN ${debut} AND ${fin}
      GROUP BY mois
      ORDER BY mois ASC
    `);

    let cumul = Number(baseAvant?.total ?? 0);
    const evolutionStockTotal = (ajoutsParMois.rows as { mois: string; total: string }[]).map(
      (r) => {
        cumul += parseInt(r.total);
        return { mois: r.mois, total: cumul };
      }
    );

    const ocrRow = ocr.rows[0] as { traite: string; echec: string; a_retraiter: string };
    const traite = parseInt(ocrRow.traite);
    const echec = parseInt(ocrRow.echec);
    const aRetraiter = parseInt(ocrRow.a_retraiter);
    const totalOcrTraite = traite + echec + aRetraiter;

    return {
      volumeParMoisEtCategorie: (
        volume.rows as { mois: string; categorie: string; nombre: string }[]
      ).map((r) => ({ mois: r.mois, categorie: r.categorie, nombre: parseInt(r.nombre) })),
      tauxSuccesOCR: {
        traite,
        echec,
        aRetraiter,
        tauxSuccesPourcentage: totalOcrTraite > 0 ? Math.round((traite / totalOcrTraite) * 100) : 0,
      },
      evolutionStockTotal,
    };
  });
}

// ── SERVICE : Analytics M7 Glossaire ───────────────────────────────────────
export async function getGlossaireAnalytics(filtre: PeriodeFiltre): Promise<GlossaireAnalytics> {
  return avecCache(cleCache('glossaire', filtre), CACHE_TTL_MS, async () => {
    const { debut, fin } = resoudrePeriode(filtre);

    const croissance = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mois, COUNT(*) AS total
      FROM glossaire
      WHERE created_at BETWEEN ${debut} AND ${fin}
      GROUP BY mois
      ORDER BY mois ASC
    `);

    const origine = await db.execute(sql`
      SELECT COUNT(*) FILTER (WHERE contexte = ${CONTEXTE_AUTO_M6}) AS automatique_m6, COUNT(*) AS total
      FROM glossaire
      WHERE created_at BETWEEN ${debut} AND ${fin}
    `);

    // Domaine : uniquement les termes actifs — les inactifs sont hors du
    // glossaire "vivant" consulté par les traducteurs
    const parDomaine = await db.execute(sql`
      SELECT COALESCE(domaine, 'Non classé') AS domaine, COUNT(*) AS nombre
      FROM glossaire
      WHERE actif = true AND created_at BETWEEN ${debut} AND ${fin}
      GROUP BY domaine
      ORDER BY nombre DESC
    `);

    const origineRow = origine.rows[0] as { automatique_m6: string; total: string };
    const automatiqueM6 = parseInt(origineRow.automatique_m6);
    const total = parseInt(origineRow.total);

    return {
      croissanceParMois: (croissance.rows as { mois: string; total: string }[]).map((r) => ({
        mois: r.mois,
        nombreTermes: parseInt(r.total),
      })),
      repartitionOrigine: { manuel: total - automatiqueM6, automatiqueM6 },
      repartitionParDomaine: (parDomaine.rows as { domaine: string; nombre: string }[]).map(
        (r) => ({
          domaine: r.domaine,
          nombre: parseInt(r.nombre),
        })
      ),
    };
  });
}

// ── SERVICE : Vue globale cross-modules ────────────────────────────────────
export async function getGlobalAnalytics(filtre: PeriodeFiltre): Promise<GlobalAnalytics> {
  return avecCache(cleCache('global', filtre), CACHE_TTL_MS, async () => {
    const [
      accordsData,
      courriersData,
      missionsData,
      traductionData,
      demandesData,
      documentsData,
      glossaireData,
    ] = await Promise.all([
      getAccordsAnalytics(filtre),
      getCourriersAnalytics(filtre),
      getMissionsAnalytics(filtre),
      getTraductionAnalytics(filtre),
      getDemandesAnalytics(filtre),
      getDocumentsAnalytics(filtre),
      getGlossaireAnalytics(filtre),
    ]);

    const totalSignes = accordsData.evolutionParMois.reduce((s, r) => s + r.total, 0);
    const totalVolumeCourriers = courriersData.volumeParMoisEtDirection.reduce(
      (s, r) => s + r.entrant + r.sortant,
      0
    );
    const totalMissions = missionsData.missionsParPays.reduce((s, r) => s + r.nombreMissions, 0);
    const totalTraductions = traductionData.volumeParMois.reduce(
      (s, r) => s + r.nombreTraductions,
      0
    );
    const totalDemandesTraitees =
      demandesData.tauxCompletion.validees +
      demandesData.tauxCompletion.archivees +
      demandesData.tauxCompletion.enCours;
    const totalDocumentsAjoutes = documentsData.volumeParMoisEtCategorie.reduce(
      (s, r) => s + r.nombre,
      0
    );
    const totalTermesGlossaire = glossaireData.croissanceParMois.reduce(
      (s, r) => s + r.nombreTermes,
      0
    );
    const totalTermesOrigine =
      glossaireData.repartitionOrigine.manuel + glossaireData.repartitionOrigine.automatiqueM6;

    return {
      accords: {
        totalSignes,
        tauxRenouvellementPourcentage: accordsData.tauxRenouvellement.tauxPourcentage,
      },
      courriers: {
        totalVolume: totalVolumeCourriers,
        tauxReponsePourcentage: courriersData.tauxReponse.tauxPourcentage,
      },
      missions: {
        totalMissions,
        delaiMoyenRapportJours: missionsData.delaiMoyenRapportJours,
      },
      traductions: {
        totalTraductions,
        tauxCorrectionPourcentage: traductionData.tauxCorrectionIA.tauxCorrectionPourcentage,
      },
      demandes: {
        totalTraitees: totalDemandesTraitees,
        tauxUrgenceValideePourcentage: demandesData.tauxUrgenceValidee.tauxPourcentage,
      },
      documents: {
        totalAjoutes: totalDocumentsAjoutes,
        tauxSuccesOCRPourcentage: documentsData.tauxSuccesOCR.tauxSuccesPourcentage,
      },
      glossaire: {
        totalTermesAjoutes: totalTermesGlossaire,
        partAutomatiqueM6Pourcentage:
          totalTermesOrigine > 0
            ? Math.round(
                (glossaireData.repartitionOrigine.automatiqueM6 / totalTermesOrigine) * 100
              )
            : 0,
      },
    };
  });
}

export const SERVICE_PAR_MODULE: Record<string, (filtre: PeriodeFiltre) => Promise<any>> = {
  global: getGlobalAnalytics,
  accords: getAccordsAnalytics,
  courriers: getCourriersAnalytics,
  missions: getMissionsAnalytics,
  traductions: getTraductionAnalytics,
  demandes: getDemandesAnalytics,
  documents: getDocumentsAnalytics,
  glossaire: getGlossaireAnalytics,
};
