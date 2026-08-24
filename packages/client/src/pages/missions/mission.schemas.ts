import { z } from 'zod';

// Create — the 5-step guided flow. Only real fields (see mission.types.ts /
// the Phase 1 audit) — no reference/priority/type/programme/budget.
export const missionCreateSchema = z
  .object({
    titre: z.string().min(1, 'Le titre est requis'),
    destination: z.string().min(1, 'La destination est requise'),
    pays: z.string().min(1, 'Le pays est requis'),
    dateDebut: z.string().min(1, 'La date de début est requise'),
    dateFin: z.string().min(1, 'La date de fin est requise'),
    participantsIds: z.array(z.number()).optional(),
    contactSurPlaceId: z.number().optional(),
  })
  .refine((data) => !data.dateDebut || !data.dateFin || data.dateDebut <= data.dateFin, {
    message: 'La date de fin doit être après la date de début',
    path: ['dateFin'],
  });

export type MissionCreateFormData = z.infer<typeof missionCreateSchema>;

// Edit — grouped sections, not a stepper (report and recommendations are
// separate workflows, not part of this form — see Phase 2 plan §6/§7).
export const missionEditSchema = z
  .object({
    titre: z.string().min(1, 'Le titre est requis'),
    destination: z.string().min(1, 'La destination est requise'),
    pays: z.string().min(1, 'Le pays est requis'),
    dateDebut: z.string().min(1, 'La date de début est requise'),
    dateFin: z.string().min(1, 'La date de fin est requise'),
    statut: z.enum(['planifiee', 'en_cours', 'terminee', 'annulee']),
    participantsIds: z.array(z.number()).optional(),
    // nullable — an explicit null clears a mistakenly-set contact.
    contactSurPlaceId: z.number().nullable().optional(),
  })
  .refine((data) => !data.dateDebut || !data.dateFin || data.dateDebut <= data.dateFin, {
    message: 'La date de fin doit être après la date de début',
    path: ['dateFin'],
  });

export type MissionEditFormData = z.infer<typeof missionEditSchema>;

export const recommandationSchema = z.object({
  texte: z.string().min(1, 'Le texte est requis'),
  responsableId: z.number().optional(),
  dateLimite: z.string().optional(),
});

export type RecommandationFormData = z.infer<typeof recommandationSchema>;
