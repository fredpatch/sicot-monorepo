export interface DashboardData {
  // KPI cards
  kpi: {
    accordsActifs: {
      total: number;
      enAlerte: number; // nombre dans la fenêtre d'alerte configurée
      critique: boolean; // au moins un accord expire sous 30j
      expiresNonTraites: number; // accords expirés non traités
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

  // Accords expirés
  accordsExpires: {
    id: number;
    reference: string;
    titre: string;
    statut: string;
    dateExpiration: Date;
    joursDepuisExpiration: number;
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
