export type MissionStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type RecommandationStatut = 'en_attente' | 'en_cours' | 'realisee';
export type LogistiqueStatut = 'a_planifier' | 'en_cours' | 'confirme';

// Type contact sur place
export interface ContactResume {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  poste?: string;
  organisationNom?: string;
}

export interface CreateMissionParams {
  titre: string;
  destination: string;
  pays: string;
  dateDebut: Date;
  dateFin: Date;
  participantsIds: number[];
  contactSurPlaceId?: number;
  createdByUserId: number;
}

export interface UpdateMissionParams {
  titre?: string;
  destination?: string;
  pays?: string;
  dateDebut?: Date;
  dateFin?: Date;
  statut?: MissionStatut;
  participantsIds?: number[];
  confirmationLogistique?: LogistiqueStatut;
  contactSurPlaceId?: number;
  rapportDocumentId?: number;
  updatedByUserId: number;
}

export interface CreateRecommandationParams {
  missionId: number;
  texte: string;
  responsableId?: number;
  dateLimite?: Date;
  createdByUserId: number;
}

export interface UpdateRecommandationParams {
  texte?: string;
  responsableId?: number;
  dateLimite?: Date;
  statut?: RecommandationStatut;
  updatedByUserId: number;
}

export interface MissionFilters {
  search?: string;
  statut?: MissionStatut;
  pays?: string;
  participantId?: number;
  page?: number;
  pageSize?: number;
}

export interface ParticipantResume {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string; // ← ajouter
}

export interface RecommandationView {
  id: number;
  missionId: number;
  texte: string;
  responsableId?: number;
  responsable?: ParticipantResume;
  dateLimite?: Date;
  statut: RecommandationStatut;
  createdAt: Date;
  updatedAt: Date;
}

export interface MissionView {
  id: number;
  titre: string;
  destination: string;
  pays: string;
  dateDebut: Date;
  dateFin: Date;
  statut: MissionStatut;
  participants: ParticipantResume[];
  recommandations?: RecommandationView[];
  confirmationLogistique: LogistiqueStatut;
  contactSurPlace?: ContactResume;
  rapportDocumentId?: number;
  createdPar?: number;
  createdAt: Date;
  updatedAt: Date;
}
