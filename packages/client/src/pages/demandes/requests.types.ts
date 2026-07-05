// packages/client/src/pages/demandes/demandes.types.ts
import type { DemandeStatut, DemandePriorite } from '@/lib/demandes.api';

export interface Demande {
  id: number;
  demandeurId: number;
  demandeurNom?: string;
  traducteurId?: number;
  traducteurNom?: string;
  documentId?: number;
  documentNom?: string;
  texteLibre?: string;
  direction: 'fr_en' | 'en_fr';
  prioriteDemandee: DemandePriorite;
  prioriteValidee?: DemandePriorite;
  statut: DemandeStatut;
  traductionId?: number;
  verrou: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDisponible {
  id: number;
  nomOriginal: string;
  statutOCR: string;
}
