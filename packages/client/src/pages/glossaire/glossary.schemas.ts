// packages/client/src/pages/glossaire/glossaire.schemas.ts
import { z } from 'zod';

export const termeSchema = z.object({
  termeFr: z.string().min(1, 'Le terme FR est requis'),
  termeEn: z.string().min(1, 'Le terme EN est requis'),
  domaine: z.string().optional(),
  contexte: z.string().optional(),
});
export type TermeFormData = z.infer<typeof termeSchema>;
