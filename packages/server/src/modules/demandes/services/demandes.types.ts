import type { TraductionDirection } from '@/utils/traduction.js';

export type DemandeStatut = 'soumise' | 'en_cours' | 'en_relecture' | 'validee' | 'archivee';

export type DemandePriorite = 'normale' | 'urgente';

export interface DemandeView {
  id: number;
  demandeurId: number;
  demandeurNom?: string;
  traducteurId?: number;
  traducteurNom?: string;
  documentId?: number;
  documentNom?: string;
  texteLibre?: string;
  direction: TraductionDirection;
  prioriteDemandee: DemandePriorite;
  prioriteValidee?: DemandePriorite;
  statut: DemandeStatut;
  traductionId?: number;
  verrou: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreerDemandeParams {
  demandeurId: number;
  documentId?: number;
  texteLibre?: string;
  direction: TraductionDirection;
  priorite: DemandePriorite;
}

export interface DemandeFilters {
  statut?: DemandeStatut;
  priorite?: DemandePriorite;
  demandeurId?: number;
  traducteurId?: number;
  page?: number;
  pageSize?: number;
}
