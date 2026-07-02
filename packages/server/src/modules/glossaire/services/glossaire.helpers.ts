import { glossaire } from '@/db/schema';
import type { TermeView } from './glossaire.types';

export function toTermeView(terme: typeof glossaire.$inferSelect): TermeView {
  return {
    id: terme.id,
    termeFr: terme.termeFr,
    termeEn: terme.termeEn,
    domaine: terme.domaine ?? undefined,
    contexte: terme.contexte ?? undefined,
    actif: terme.actif,
    createdPar: terme.createdPar ?? undefined,
    createdAt: terme.createdAt,
    updatedAt: terme.updatedAt,
  };
}
