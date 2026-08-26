// packages/client/src/pages/demandes/requests.utils.ts
import type { DemandePriorite } from '@/lib/demandes.api';
import type { Demande, RequestSourceType } from './requests.types';

export function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function apercu(texte?: string, longueur = 60): string {
  if (!texte) return '—';
  return texte.length > longueur ? texte.slice(0, longueur) + '...' : texte;
}

export function getRequestEffectivePriority(demande: Demande): DemandePriorite {
  return demande.prioriteValidee ?? demande.prioriteDemandee;
}

export function getRequestSourceType(demande: Demande): RequestSourceType {
  return demande.documentId ? 'document' : 'texte';
}
