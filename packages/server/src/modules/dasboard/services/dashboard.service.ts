/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from '@/db/index.js';
import {
  accords,
  courriers,
  missions,
  recommandations,
  documents,
  traductions,
  demandesTraduction,
  glossaire,
  notifications,
  users,
} from '@/db/schema';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service';
import { eq, and, lte, gte, isNull, desc, sql, inArray } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────
export interface DashboardData {
  // KPI cards
  kpi: {
    accordsActifs: {
      total: number;
      enAlerte: number; // nombre dans la fenêtre d'alerte configurée
      critique: boolean; // au moins un accord expire sous 30j
    };
    couriersSansReponse: {
      total: number;
      aSurveiller: number;
      critique: number;
    };
    missionsEnCours: {
      total: number;
      logistiqueNonConfirmee: number; // départ proche + logistique pas confirmée
    };
    traductionsEnAttente: number;
    documentsArchives: number;
    termesGlossaire: number;
    demandesOuvertes: number;
    recommandationsEnAttente: {
      total: number;
      depassees: number;
    };
  };

  // Accords expirant sous 90j
  accordsExpirant: {
    id: number;
    reference: string;
    titre: string;
    statut: string;
    dateExpiration: Date;
    joursRestants: number;
  }[];

  // Courriers sans réponse
  couriersSansReponse: {
    id: number;
    reference: string;
    objet: string;
    dateReception: Date;
    joursAttente: number;
  }[];

  // Recommandations en attente avec date limite
  recommandationsEnAttente: {
    id: number;
    texte: string;
    missionId: number;
    dateLimite?: Date;
    depasse: boolean;
  }[];

  // Graphique : traductions par mois (6 derniers mois)
  traductionsParMois: {
    mois: string;
    total: number;
    approuvees: number;
  }[];

  // Graphique : demandes par statut
  demandesParStatut: {
    statut: string;
    total: number;
  }[];

  // Graphique : documents par catégorie
  documentsParCategorie: {
    categorie: string;
    total: number;
  }[];

  // Activité récente
  activiteRecente: {
    type: string;
    reference: string;
    label: string;
    date: Date;
  }[];

  // Notifications récentes — traçabilité des relances CCIT
  notificationsRecentes: {
    id: number;
    type: string;
    entiteId: number;
    destinataireEmail: string;
    destinataireNom?: string;
    declencheParNom?: string;
    statut: string;
    createdAt: Date;
  }[];
}

// ── SERVICE : Données dashboard ────────────────────────────────────────────
export async function getDashboardData(): Promise<DashboardData> {
  const maintenant = new Date();
  const dans90jours = new Date();
  dans90jours.setDate(dans90jours.getDate() + 90);
  const dans30jours = new Date();
  dans30jours.setDate(dans30jours.getDate() + 30);
  const dans14jours = new Date();
  dans14jours.setDate(dans14jours.getDate() + 14);

  // Charger les seuils une fois
  const seuilCourrierSurveiller = await getValeurEntier('courrier_alerte_jours', 60);
  const seuilCourrierCritique = await getValeurEntier('courrier_alerte_critique_jours', 90);

  // ── Accords actifs + criticité ────────────────────────────────────────
  const accordsActifsTotal = await db.$count(accords, eq(accords.statut, 'actif'));

  const accordsEnAlerteRows = await db
    .select({ id: accords.id, dateExpiration: accords.dateExpiration })
    .from(accords)
    .where(
      and(
        eq(accords.statut, 'actif'),
        gte(accords.dateExpiration, maintenant),
        lte(accords.dateExpiration, dans90jours)
      )
    );

  const accordsCritique = accordsEnAlerteRows.some(
    (a) => a.dateExpiration && new Date(a.dateExpiration) <= dans30jours
  );

  // ── Courriers sans réponse + paliers ──────────────────────────────────
  const courriersSansReponseRows = await db
    .select({ id: courriers.id, dateReception: courriers.dateReception })
    .from(courriers)
    .where(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    );

  let courriersASurveiller = 0;
  let courriersCritiques = 0;
  for (const c of courriersSansReponseRows) {
    const jours = Math.floor(
      (maintenant.getTime() - new Date(c.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (jours >= seuilCourrierCritique) courriersCritiques++;
    else if (jours >= seuilCourrierSurveiller) courriersASurveiller++;
  }

  // ── Missions en cours + logistique non confirmée ──────────────────────
  const missionsEnCoursTotal = await db.$count(missions, eq(missions.statut, 'en_cours'));

  const missionsAVenirRows = await db
    .select({
      id: missions.id,
      dateDebut: missions.dateDebut,
      confirmationLogistique: missions.confirmationLogistique,
      statut: missions.statut,
    })
    .from(missions)
    .where(eq(missions.statut, 'planifiee'));

  const missionsLogistiqueNonConfirmee = missionsAVenirRows.filter(
    (m) =>
      m.confirmationLogistique !== 'confirme' &&
      new Date(m.dateDebut) <= dans14jours &&
      new Date(m.dateDebut) >= maintenant
  ).length;

  // ── Traductions, documents, glossaire, demandes — inchangés ───────────
  const traductionsEnAttenteRows = await db.$count(
    traductions,
    and(eq(traductions.statut, 'a_reviser'), isNull(traductions.deletedAt))
  );
  const documentsArchivesRows = await db.$count(documents, isNull(documents.deletedAt));
  const termesGlossaireRows = await db.$count(glossaire, eq(glossaire.actif, true));
  const demandesOuvertesRows = await db.$count(
    demandesTraduction,
    eq(demandesTraduction.statut, 'soumise')
  );

  // ── Recommandations en attente + dépassées ────────────────────────────
  const recommandationsRows = await db
    .select({ id: recommandations.id, dateLimite: recommandations.dateLimite })
    .from(recommandations)
    .where(eq(recommandations.statut, 'en_attente'));

  const recommandationsDepassees = recommandationsRows.filter(
    (r) => r.dateLimite && new Date(r.dateLimite) < maintenant
  ).length;

  const notificationsRecentesRows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      entiteId: notifications.entiteId,
      destinataireEmail: notifications.destinataireEmail,
      destinataireNom: notifications.destinataireNom,
      declenchePar: notifications.declenchePar,
      statut: notifications.statut,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(6);

  // Charger les noms des déclencheurs (CCIT/admin) en une passe
  const declencheurIds = [...new Set(notificationsRecentesRows.map((n) => n.declenchePar))];
  const declencheurs =
    declencheurIds.length > 0
      ? await db
          .select({ id: users.id, nom: users.nom, prenom: users.prenom })
          .from(users)
          .where(inArray(users.id, declencheurIds))
      : [];

  const declencheurMap = new Map(declencheurs.map((d) => [d.id, `${d.prenom} ${d.nom}`]));

  const notificationsRecentes = notificationsRecentesRows.map((n) => ({
    id: n.id,
    type: n.type,
    entiteId: n.entiteId,
    destinataireEmail: n.destinataireEmail,
    destinataireNom: n.destinataireNom ?? undefined,
    declencheParNom: declencheurMap.get(n.declenchePar),
    statut: n.statut,
    createdAt: n.createdAt,
  }));

  // ── Accords expirant sous 90j ─────────────────────────────────────────
  const accordsExpirantRows = await db
    .select({
      id: accords.id,
      reference: accords.reference,
      titre: accords.titre,
      statut: accords.statut,
      dateExpiration: accords.dateExpiration,
    })
    .from(accords)
    .where(
      and(
        eq(accords.statut, 'actif'),
        gte(accords.dateExpiration, maintenant),
        lte(accords.dateExpiration, dans90jours)
      )
    )
    .orderBy(accords.dateExpiration)
    .limit(5);

  const accordsExpirant = accordsExpirantRows.map((a) => ({
    ...a,
    dateExpiration: a.dateExpiration!,
    joursRestants: Math.ceil(
      (new Date(a.dateExpiration!).getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // ── Courriers sans réponse ────────────────────────────────────────────
  const courriersRows = await db
    .select({
      id: courriers.id,
      reference: courriers.reference,
      objet: courriers.objet,
      dateReception: courriers.dateReception,
    })
    .from(courriers)
    .where(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    )
    .orderBy(courriers.dateReception) // les plus anciens (donc les plus critiques) en premier
    .limit(5);

  const couriersSansReponse = courriersRows.map((c) => ({
    ...c,
    joursAttente: Math.floor(
      (maintenant.getTime() - new Date(c.dateReception).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // ── Recommandations en attente ────────────────────────────────────────
  const recsRows = await db
    .select({
      id: recommandations.id,
      texte: recommandations.texte,
      missionId: recommandations.missionId,
      dateLimite: recommandations.dateLimite,
    })
    .from(recommandations)
    .where(eq(recommandations.statut, 'en_attente'))
    .orderBy(recommandations.dateLimite)
    .limit(5);

  const recommandationsEnAttente = recsRows.map((r) => ({
    ...r,
    dateLimite: r.dateLimite ?? undefined,
    depasse: r.dateLimite ? new Date(r.dateLimite) < maintenant : false,
  }));

  // ── Graphique : traductions par mois (6 derniers mois) ───────────────
  const traductionsParMois = await db.execute(sql`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS mois,
      COUNT(*)                        AS total,
      COUNT(*) FILTER (WHERE statut = 'approuvee') AS approuvees
    FROM traductions
    WHERE
      deleted_at IS NULL
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY mois
    ORDER BY mois ASC
  `);

  // ── Graphique : demandes par statut ───────────────────────────────────
  const demandesParStatutRows = await db.execute(sql`
    SELECT statut, COUNT(*) AS total
    FROM demandes_traduction
    GROUP BY statut
    ORDER BY total DESC
  `);

  // ── Graphique : documents par catégorie ──────────────────────────────
  const documentsParCategorieRows = await db.execute(sql`
    SELECT categorie, COUNT(*) AS total
    FROM documents
    WHERE deleted_at IS NULL
    GROUP BY categorie
    ORDER BY total DESC
  `);

  // ── Activité récente (5 dernières actions cross-modules) ─────────────
  const [derniersAccords, derniersCourriers, dernieresMissions, dernieresTraductions] =
    await Promise.all([
      db
        .select({
          id: accords.id,
          reference: accords.reference,
          titre: accords.titre,
          date: accords.createdAt,
        })
        .from(accords)
        .orderBy(desc(accords.createdAt))
        .limit(3),
      db
        .select({
          id: courriers.id,
          reference: courriers.reference,
          objet: courriers.objet,
          date: courriers.createdAt,
        })
        .from(courriers)
        .orderBy(desc(courriers.createdAt))
        .limit(3),
      db
        .select({ id: missions.id, titre: missions.titre, date: missions.createdAt })
        .from(missions)
        .orderBy(desc(missions.createdAt))
        .limit(3),
      db
        .select({
          id: traductions.id,
          direction: traductions.direction,
          date: traductions.createdAt,
        })
        .from(traductions)
        .where(isNull(traductions.deletedAt))
        .orderBy(desc(traductions.createdAt))
        .limit(3),
    ]);

  const activiteRecente = [
    ...derniersAccords.map((a) => ({
      type: 'accord',
      reference: a.reference,
      label: a.titre,
      date: a.date,
    })),
    ...derniersCourriers.map((c) => ({
      type: 'courrier',
      reference: c.reference,
      label: c.objet,
      date: c.date,
    })),
    ...dernieresMissions.map((m) => ({
      type: 'mission',
      reference: `M-${m.id}`,
      label: m.titre,
      date: m.date,
    })),
    ...dernieresTraductions.map((t) => ({
      type: 'traduction',
      reference: `T-${t.id}`,
      label: t.direction === 'fr_en' ? 'FR → EN' : 'EN → FR',
      date: t.date,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return {
    kpi: {
      accordsActifs: {
        total: accordsActifsTotal,
        enAlerte: accordsEnAlerteRows.length,
        critique: accordsCritique,
      },
      couriersSansReponse: {
        total: courriersSansReponseRows.length,
        aSurveiller: courriersASurveiller,
        critique: courriersCritiques,
      },
      missionsEnCours: {
        total: missionsEnCoursTotal,
        logistiqueNonConfirmee: missionsLogistiqueNonConfirmee,
      },
      traductionsEnAttente: traductionsEnAttenteRows,
      documentsArchives: documentsArchivesRows,
      termesGlossaire: termesGlossaireRows,
      demandesOuvertes: demandesOuvertesRows,
      recommandationsEnAttente: {
        total: recommandationsRows.length,
        depassees: recommandationsDepassees,
      },
    },
    accordsExpirant,
    couriersSansReponse,
    recommandationsEnAttente,
    notificationsRecentes,
    traductionsParMois: (
      traductionsParMois.rows as { mois: string; total: string; approuvees: string }[]
    ).map((r) => ({
      mois: r.mois,
      total: parseInt(r.total),
      approuvees: parseInt(r.approuvees),
    })),
    demandesParStatut: (demandesParStatutRows.rows as { statut: string; total: string }[]).map(
      (r) => ({
        statut: r.statut,
        total: parseInt(r.total),
      })
    ),
    documentsParCategorie: (
      documentsParCategorieRows.rows as { categorie: string; total: string }[]
    ).map((r) => ({
      categorie: r.categorie,
      total: parseInt(r.total),
    })),
    activiteRecente,
  };
}
