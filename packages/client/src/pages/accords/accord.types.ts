import type { AccordStatut } from '@/lib/accords.api';

export interface AccordPartner {
  id: number;
  nom: string;
  pays: string;
  type: string;
  contactPrincipal?: {
    nom: string;
    prenom: string;
    email?: string;
    telephone?: string;
  };
}

export interface Accord {
  id: number;
  reference: string;
  titre: string;
  statut: AccordStatut;
  dateSignature: string;
  dateExpiration?: string;
  parentId?: number;
  documentId?: number;
  partenaires: AccordPartner[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationOption {
  id: number;
  nom: string;
  pays: string;
  type: string;
}

export interface AccordListResponse {
  data: Accord[];
  total: number;
}

export type ExpiryFilter = '' | 'expired' | '30' | '90';

