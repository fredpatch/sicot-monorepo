import {
  getAccordsKpi,
  getCourriersKpi,
  getMissionsKpi,
  getComptesSimples,
  getRecommandationsKpi,
  getNotificationsRecentes,
  getAccordsExpirantList,
  getCouriersSansReponseList,
  getRecommandationsEnAttenteList,
  getTraductionsParMoisChart,
  getDemandesParStatutChart,
  getDocumentsParCategorieChart,
  getActiviteRecenteList,
  getAccordsExpirant,
} from './dashboard.helpers';
import type { DashboardData } from './dashboard.types';

export type { DashboardData } from './dashboard.types';

// ── SERVICE : Données dashboard ────────────────────────────────────────────
export async function getDashboardData(): Promise<DashboardData> {
  const maintenant = new Date();
  const dans90jours = new Date();
  dans90jours.setDate(dans90jours.getDate() + 90);
  const dans30jours = new Date();
  dans30jours.setDate(dans30jours.getDate() + 30);
  const dans14jours = new Date();
  dans14jours.setDate(dans14jours.getDate() + 14);

  const accordsKpi = await getAccordsKpi(maintenant, dans90jours, dans30jours);
  const { accordsExpires, nonTraites } = await getAccordsExpirant(maintenant);
  const courriersKpi = await getCourriersKpi(maintenant);
  const missionsKpi = await getMissionsKpi(maintenant, dans14jours);
  const comptesSimples = await getComptesSimples();
  const recommandationsKpi = await getRecommandationsKpi(maintenant);
  const notificationsRecentes = await getNotificationsRecentes();
  const accordsExpirant = await getAccordsExpirantList(maintenant, dans90jours);
  const couriersSansReponse = await getCouriersSansReponseList(maintenant);
  const recommandationsEnAttente = await getRecommandationsEnAttenteList(maintenant);
  const traductionsParMois = await getTraductionsParMoisChart();
  const demandesParStatut = await getDemandesParStatutChart();
  const documentsParCategorie = await getDocumentsParCategorieChart();
  const activiteRecente = await getActiviteRecenteList();

  return {
    kpi: {
      accordsActifs: {
        total: accordsKpi.total,
        enAlerte: accordsKpi.enAlerteRows.length,
        critique: accordsKpi.critique,
        expiresNonTraites: nonTraites,
      },
      couriersSansReponse: {
        total: courriersKpi.rows.length,
        aSurveiller: courriersKpi.aSurveiller,
        critique: courriersKpi.critiques,
      },
      missionsEnCours: {
        total: missionsKpi.total,
        logistiqueNonConfirmee: missionsKpi.logistiqueNonConfirmee,
      },
      traductionsEnAttente: comptesSimples.traductionsEnAttente,
      documentsArchives: comptesSimples.documentsArchives,
      termesGlossaire: comptesSimples.termesGlossaire,
      demandesOuvertes: comptesSimples.demandesOuvertes,
      recommandationsEnAttente: {
        total: recommandationsKpi.rows.length,
        depassees: recommandationsKpi.depassees,
      },
    },
    accordsExpirant,
    accordsExpires,
    couriersSansReponse,
    recommandationsEnAttente,
    notificationsRecentes,
    traductionsParMois,
    demandesParStatut,
    documentsParCategorie,
    activiteRecente,
  };
}
