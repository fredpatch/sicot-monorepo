// packages/client/src/pages/documents/documents.schemas.ts
import { z } from 'zod';

export const ocrSchema = z.object({
  texte: z.string().min(1, 'Le texte corrigé est requis'),
});
export type OcrFormData = z.infer<typeof ocrSchema>;
