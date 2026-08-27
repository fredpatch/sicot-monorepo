export interface DashboardData {
  kpi?: {
    accordsActifs?: {
      total?: number;
      enAlerte?: number;
      critique?: boolean;
      expiresNonTraites?: number;
    };
    couriersSansReponse?: {
      total?: number;
      aSurveiller?: number;
      critique?: number;
    };
    missionsEnCours?: {
      total?: number;
      logistiqueNonConfirmee?: number;
    };
    traductionsEnAttente?: number;
    documentsArchives?: number;
    termesGlossaire?: number;
    demandesOuvertes?: number;
    recommandationsEnAttente?: {
      total?: number;
      depassees?: number;
    };
  };
  accordsExpirant?: AccordExpirant[];
  accordsExpires?: AccordExpire[];
  couriersSansReponse?: CourrierSansReponse[];
  recommandationsEnAttente?: RecommandationEnAttente[];
  traductionsParMois?: TraductionParMois[];
  demandesParStatut?: DemandeParStatut[];
  documentsParCategorie?: { categorie: string; total: number }[];
  activiteRecente?: ActiviteRecente[];
  notificationsRecentes?: NotificationRecente[];
}

export interface AccordExpirant {
  id: number;
  reference: string;
  titre: string;
  statut: string;
  dateExpiration: string | Date;
  joursRestants: number;
}

export interface AccordExpire {
  id: number;
  reference: string;
  titre: string;
  statut: string;
  dateExpiration: string | Date;
  joursDepuisExpiration: number;
}

export interface CourrierSansReponse {
  id: number;
  reference: string;
  objet: string;
  dateReception: string | Date;
  joursAttente: number;
}

export interface RecommandationEnAttente {
  id: number;
  texte: string;
  missionId: number;
  dateLimite?: string | Date;
  depasse: boolean;
}

export interface TraductionParMois {
  mois: string;
  total: number;
  approuvees: number;
}

export interface DemandeParStatut {
  statut: string;
  total: number;
}

export interface ActiviteRecente {
  type: string;
  reference: string;
  label: string;
  date: string | Date;
}

export interface NotificationRecente {
  id: number;
  type: string;
  entiteId: number;
  destinataireEmail: string;
  destinataireNom?: string;
  declencheParNom?: string;
  statut: string;
  createdAt: string | Date;
}

export type PrioritySeverity = 'critical' | 'warning';

export interface PriorityItem {
  id: string;
  severity: PrioritySeverity;
  entityType: 'Accord' | 'Courrier' | 'Recommandation' | 'Traduction';
  reference: string;
  title: string;
  timing: string;
  nextAction: string;
  href: string;
  sortScore: number;
}

export interface DeadlineItem {
  label: string;
  title: string;
  date: Date;
  countdown: string;
  href: string;
}
