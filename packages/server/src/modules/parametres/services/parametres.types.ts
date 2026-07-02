export type ParametreType = 'entier' | 'booleen' | 'texte';

export interface ParametreView {
  id: number;
  cle: string;
  valeur: string;
  type: ParametreType;
  module: string;
  description?: string;
  modifiePar?: number;
  createdAt: Date;
  updatedAt: Date;
}
