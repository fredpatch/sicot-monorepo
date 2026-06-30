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
} from '@/db/schema';
import { eq, and, lte, gte, isNull, desc, sql } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────
export interface DashboardData {
  // KPI cards
  kpi: {
    accordsActifs: number;
    couriersSansReponse: number;
    missionsEnCours: number;
    traductionsEnAttente: number;
    documentsArchives: number;
    termesGlossaire: number;
    demandesOuvertes: number;
    recommandationsEnAttente: number;
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
}

// ── SERVICE : Données dashboard ────────────────────────────────────────────
export async function getDashboardData(): Promise<DashboardData> {
  const maintenant = new Date();
  const dans90jours = new Date();
  dans90jours.setDate(dans90jours.getDate() + 90);

  // ── KPI en parallèle ─────────────────────────────────────────────────
  const [
    accordsActifsRows,
    couriersSansReponseRows,
    missionsEnCoursRows,
    traductionsEnAttenteRows,
    documentsArchivesRows,
    termesGlossaireRows,
    demandesOuvertesRows,
    recommandationsEnAttenteRows,
  ] = await Promise.all([
    db.$count(accords, eq(accords.statut, 'actif')),
    db.$count(
      courriers,
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    ),
    db.$count(missions, eq(missions.statut, 'en_cours')),
    db.$count(traductions, and(eq(traductions.statut, 'a_reviser'), isNull(traductions.deletedAt))),
    db.$count(documents, isNull(documents.deletedAt)),
    db.$count(glossaire, eq(glossaire.actif, true)),
    db.$count(demandesTraduction, and(eq(demandesTraduction.statut, 'soumise'))),
    db.$count(recommandations, and(eq(recommandations.statut, 'en_attente'))),
  ]);

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
    .orderBy(courriers.dateReception)
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
      accordsActifs: accordsActifsRows,
      couriersSansReponse: couriersSansReponseRows,
      missionsEnCours: missionsEnCoursRows,
      traductionsEnAttente: traductionsEnAttenteRows,
      documentsArchives: documentsArchivesRows,
      termesGlossaire: termesGlossaireRows,
      demandesOuvertes: demandesOuvertesRows,
      recommandationsEnAttente: recommandationsEnAttenteRows,
    },
    accordsExpirant,
    couriersSansReponse,
    recommandationsEnAttente,
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
