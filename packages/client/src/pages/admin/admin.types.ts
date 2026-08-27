// packages/client/src/pages/admin/admin.types.ts
import type { Capability } from '@sicot/shared';

export type ParametreType = 'entier' | 'booleen' | 'texte';

export interface Parametre {
  id: number;
  cle: string;
  valeur: string;
  type: ParametreType;
  module: string;
  description?: string;
  modifiePar?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobDisponible {
  cle: string;
  label: string;
  description: string;
  executionCapability: Capability;
  module: string;
}

export interface JobResultat {
  cle: string;
  succes: boolean;
  resume: string;
  erreur?: string;
  dureeMs: number;
}

export interface StatutGemini {
  modeles: {
    modele: string;
    appelsAujourdhui: number;
    plafond: number;
    thinkingTokensAujourdhui: number;
  }[];
  rapportsIA: { utilises: number; max: number };
  dernierRapportMensuel: { createdAt: string; documentId: number } | null;
}

export interface StatutMoteurTraduction {
  accessible: boolean;
  langues: string[];
  deeplConfigure: boolean;
  erreur?: string;
}

export interface JobExecution {
  id: number;
  jobCle: string;
  module: string;
  source: 'manuel' | 'cron';
  succes: boolean;
  resume: string;
  erreur: string | null;
  dureeMs: number;
  declenchePar: number | null;
  createdAt: string;
}
