export type NotificationType = 'accord_echeance' | 'courrier_relance' | 'recommandation_rappel';
export type NotificationStatut = 'envoyee' | 'echec';

export interface NotificationView {
  id: number;
  type: NotificationType;
  entiteId: number;
  destinataireEmail: string;
  destinataireNom?: string;
  message: string;
  declenchePar: number;
  declencheParNom?: string;
  statut: NotificationStatut;
  erreur?: string;
  createdAt: Date;
}

export interface EnvoyerNotificationParams {
  type: NotificationType;
  entiteId: number;
  destinataireEmail: string;
  destinataireNom?: string;
  objet: string;
  message: string;
  userId: number;
}
