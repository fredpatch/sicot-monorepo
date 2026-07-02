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
import type { DashboardData } from './dashboard.types';

// ── Nombre de jours entre deux dates ──────────────────────────────────────
export function getDaysDiff(from: Date, to: Date, arrondi: 'floor' | 'ceil' = 'floor'): number {
  const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return arrondi === 'ceil' ? Math.ceil(diff) : Math.floor(diff);
}

// ── Accords actifs + criticité ────────────────────────────────────────────
export async function getAccordsKpi(maintenant: Date, dans90jours: Date, dans30jours: Date) {
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

  return { total: accordsActifsTotal, enAlerteRows: accordsEnAlerteRows, critique: accordsCritique };
}

// ── Courriers sans réponse + paliers ──────────────────────────────────────
export async function getCourriersKpi(maintenant: Date) {
  const seuilCourrierSurveiller = await getValeurEntier('courrier_alerte_jours', 60);
  const seuilCourrierCritique = await getValeurEntier('courrier_alerte_critique_jours', 90);

  const rows = await db
    .select({ id: courriers.id, dateReception: courriers.dateReception })
    .from(courriers)
    .where(
      and(
        eq(courriers.direction, 'entrant'),
        eq(courriers.reponseRequise, 'oui'),
        eq(courriers.suiviStatut, 'en_attente')
      )
    );

  let aSurveiller = 0;
  let critiques = 0;
  for (const c of rows) {
    const jours = getDaysDiff(new Date(c.dateReception), maintenant);
    if (jours >= seuilCourrierCritique) critiques++;
    else if (jours >= seuilCourrierSurveiller) aSurveiller++;
  }

  return { rows, aSurveiller, critiques };
}

// ── Missions en cours + logistique non confirmée ──────────────────────────
export async function getMissionsKpi(maintenant: Date, dans14jours: Date) {
  const total = await db.$count(missions, eq(missions.statut, 'en_cours'));

  const missionsAVenirRows = await db
    .select({
      id: missions.id,
      dateDebut: missions.dateDebut,
      confirmationLogistique: missions.confirmationLogistique,
      statut: missions.statut,
    })
    .from(missions)
    .where(eq(missions.statut, 'planifiee'));

  const logistiqueNonConfirmee = missionsAVenirRows.filter(
    (m) =>
      m.confirmationLogistique !== 'confirme' &&
      new Date(m.dateDebut) <= dans14jours &&
      new Date(m.dateDebut) >= maintenant
  ).length;

  return { total, logistiqueNonConfirmee };
}

// ── Traductions, documents, glossaire, demandes — compteurs simples ──────
export async function getComptesSimples() {
  const traductionsEnAttente = await db.$count(
    traductions,
    and(eq(traductions.statut, 'a_reviser'), isNull(traductions.deletedAt))
  );
  const documentsArchives = await db.$count(documents, isNull(documents.deletedAt));
  const termesGlossaire = await db.$count(glossaire, eq(glossaire.actif, true));
  const demandesOuvertes = await db.$count(
    demandesTraduction,
    eq(demandesTraduction.statut, 'soumise')
  );

  return { traductionsEnAttente, documentsArchives, termesGlossaire, demandesOuvertes };
}

// ── Recommandations en attente + dépassées ────────────────────────────────
export async function getRecommandationsKpi(maintenant: Date) {
  const rows = await db
    .select({ id: recommandations.id, dateLimite: recommandations.dateLimite })
    .from(recommandations)
    .where(eq(recommandations.statut, 'en_attente'));

  const depassees = rows.filter((r) => r.dateLimite && new Date(r.dateLimite) < maintenant).length;

  return { rows, depassees };
}

// ── Notifications récentes avec nom du déclencheur ────────────────────────
export async function getNotificationsRecentes(): Promise<DashboardData['notificationsRecentes']> {
  const rows = await db
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
  const declencheurIds = [...new Set(rows.map((n) => n.declenchePar))];
  const declencheurs =
    declencheurIds.length > 0
      ? await db
          .select({ id: users.id, nom: users.nom, prenom: users.prenom })
          .from(users)
          .where(inArray(users.id, declencheurIds))
      : [];

  const declencheurMap = new Map(declencheurs.map((d) => [d.id, `${d.prenom} ${d.nom}`]));

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    entiteId: n.entiteId,
    destinataireEmail: n.destinataireEmail,
    destinataireNom: n.destinataireNom ?? undefined,
    declencheParNom: declencheurMap.get(n.declenchePar),
    statut: n.statut,
    createdAt: n.createdAt,
  }));
}

// ── Accords expirant sous 90j (top 5) ──────────────────────────────────────
export async function getAccordsExpirantList(
  maintenant: Date,
  dans90jours: Date
): Promise<DashboardData['accordsExpirant']> {
  const rows = await db
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

  return rows.map((a) => ({
    ...a,
    dateExpiration: a.dateExpiration!,
    joursRestants: getDaysDiff(maintenant, new Date(a.dateExpiration!), 'ceil'),
  }));
}

// ── Courriers sans réponse (top 5) ─────────────────────────────────────────
export async function getCouriersSansReponseList(
  maintenant: Date
): Promise<DashboardData['couriersSansReponse']> {
  const rows = await db
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

  return rows.map((c) => ({
    ...c,
    joursAttente: getDaysDiff(new Date(c.dateReception), maintenant),
  }));
}

// ── Recommandations en attente (top 5) ─────────────────────────────────────
export async function getRecommandationsEnAttenteList(
  maintenant: Date
): Promise<DashboardData['recommandationsEnAttente']> {
  const rows = await db
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

  return rows.map((r) => ({
    ...r,
    dateLimite: r.dateLimite ?? undefined,
    depasse: r.dateLimite ? new Date(r.dateLimite) < maintenant : false,
  }));
}

// ── Graphique : traductions par mois (6 derniers mois) ────────────────────
export async function getTraductionsParMoisChart(): Promise<DashboardData['traductionsParMois']> {
  const result = await db.execute(sql`
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

  return (result.rows as { mois: string; total: string; approuvees: string }[]).map((r) => ({
    mois: r.mois,
    total: parseInt(r.total),
    approuvees: parseInt(r.approuvees),
  }));
}

// ── Graphique : demandes par statut ────────────────────────────────────────
export async function getDemandesParStatutChart(): Promise<DashboardData['demandesParStatut']> {
  const result = await db.execute(sql`
    SELECT statut, COUNT(*) AS total
    FROM demandes_traduction
    GROUP BY statut
    ORDER BY total DESC
  `);

  return (result.rows as { statut: string; total: string }[]).map((r) => ({
    statut: r.statut,
    total: parseInt(r.total),
  }));
}

// ── Graphique : documents par catégorie ────────────────────────────────────
export async function getDocumentsParCategorieChart(): Promise<
  DashboardData['documentsParCategorie']
> {
  const result = await db.execute(sql`
    SELECT categorie, COUNT(*) AS total
    FROM documents
    WHERE deleted_at IS NULL
    GROUP BY categorie
    ORDER BY total DESC
  `);

  return (result.rows as { categorie: string; total: string }[]).map((r) => ({
    categorie: r.categorie,
    total: parseInt(r.total),
  }));
}

// ── Activité récente (5 dernières actions cross-modules) ──────────────────
export async function getActiviteRecenteList(): Promise<DashboardData['activiteRecente']> {
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

  return [
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
}
