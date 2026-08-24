import { z } from 'zod';

// Create — the 4-step guided flow. Only real fields (see courrier.types.ts /
// the Phase 1 audit) — no priorité/type de réponse/mode de réception.
export const courrierCreateSchema = z.object({
  direction: z.enum(['entrant', 'sortant']),
  objet: z.string().min(1, "L'objet est requis"),
  dateReception: z.string().min(1, 'La date est requise'),
  reponseRequise: z.enum(['oui', 'non', 'pour_information']),
  dateLimiteReponse: z.string().optional(),
  expediteurOrganisationId: z.number().optional(),
  destinataireOrganisationId: z.number().optional(),
  expediteurContactId: z.number().optional(),
  destinataireContactId: z.number().optional(),
  reponseAId: z.number().optional(),
  accordId: z.number().optional(),
  documentIds: z.array(z.number()).optional(),
});

export type CourrierCreateFormData = z.infer<typeof courrierCreateSchema>;

// Edit — only the fields the server actually accepts post-creation.
// Direction stays immutable (a courrier doesn't flip from entrant to
// sortant); expéditeur/destinataire, date, and réponse requise are
// editable per explicit user request. Documents are managed from the
// detail workspace's Documents section (real add/remove endpoints), not
// through this form.
export const courrierEditSchema = z.object({
  objet: z.string().min(1, "L'objet est requis"),
  dateReception: z.string().min(1, 'La date est requise'),
  reponseRequise: z.enum(['oui', 'non', 'pour_information']),
  expediteurOrganisationId: z.number().optional(),
  destinataireOrganisationId: z.number().optional(),
  expediteurContactId: z.number().nullable().optional(),
  destinataireContactId: z.number().nullable().optional(),
  suiviStatut: z.enum(['en_attente', 'repondu', 'archive']).optional(),
  dateLimiteReponse: z.string().optional(),
  accordId: z.number().optional(),
});

export type CourrierEditFormData = z.infer<typeof courrierEditSchema>;
