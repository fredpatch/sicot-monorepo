// packages/client/src/pages/traductions/traductions.types.ts
import type { TraductionStatut, TraductionDirection } from '@/lib/traductions.api';

export interface Traduction {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  createdAt: string;
  updatedAt: string;
}
