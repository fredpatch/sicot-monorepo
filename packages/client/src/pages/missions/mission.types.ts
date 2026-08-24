import type { MissionStatut, RecommandationStatut, LogistiqueStatut } from '@/lib/missions.api';

export interface ParticipantResume {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string;
}

export interface ContactResume {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  organisationNom?: string;
}

export interface RecommandationView {
  id: number;
  missionId: number;
  texte: string;
  responsableId?: number;
  responsable?: ParticipantResume;
  dateLimite?: string;
  statut: RecommandationStatut;
  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: string;
  dateFin: string;
  statut: MissionStatut;
  participants: ParticipantResume[];
  recommandations?: RecommandationView[];
  // Derived server-side from the three checklist items below — see
  // mission.utils.ts / the server's mettreAJourMission.
  confirmationLogistique: LogistiqueStatut;
  logistiqueBilletReserve: boolean;
  logistiqueHebergementConfirme: boolean;
  logistiqueFinancementValide: boolean;
  contactSurPlace?: ContactResume;
  rapportDocumentId?: number;
  createdPar?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MissionListResponse {
  data: Mission[];
  total: number;
}

export interface MissionsAggregates {
  total: number;
  planifiees: number;
  enCours: number;
  terminees: number;
  annulees: number;
  aVenir30Jours: number;
  logistiqueARisque: number;
}

export type { MissionStatut, RecommandationStatut, LogistiqueStatut };
