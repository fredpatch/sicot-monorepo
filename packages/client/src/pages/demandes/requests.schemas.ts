// packages/client/src/pages/demandes/demandes.schemas.ts
import { z } from 'zod';

export const demandeSchema = z
  .object({
    direction: z.enum(['fr_en', 'en_fr']),
    priorite: z.enum(['normale', 'urgente']),
    type: z.enum(['document', 'texte']),
    documentId: z.number().optional(),
    texteLibre: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'document') return !!data.documentId;
      if (data.type === 'texte') return !!data.texteLibre?.trim();
      return false;
    },
    { message: 'Un document ou un texte est requis.', path: ['documentId'] }
  );

export type DemandeFormData = z.infer<typeof demandeSchema>;
