import type { TraductionDirection } from '@/utils/traduction.js';

export type TraductionStatut =
  'a_reviser' | 'en_relecture' | 'approuvee' | 'archivee' | 'manuelle_requise';

export interface TraductionView {
  id: number;
  documentId?: number;
  texteOriginal?: string;
  texteIA?: string;
  texteFinal?: string;
  direction: TraductionDirection;
  statut: TraductionStatut;
  moteurUtilise: string;
  traducteurId?: number;
  relecteurId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LancerTraductionParams {
  documentId?: number;
  texteOriginal: string;
  direction: TraductionDirection;
  userId: number;
}

export interface SauvegarderCorrectionParams {
  id: number;
  texteFinal: string;
  userId: number;
}
