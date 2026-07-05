import { z } from 'zod';

export const orgSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  pays: z.string().min(1, 'Le pays est requis'),
  region: z.string().optional(),
  type: z.string().min(1, 'Le type est requis'),
  notes: z.string().optional(),
});

export const contactSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  poste: z.string().optional(),
  principal: z.boolean(),
});

export type OrgFormData = z.infer<typeof orgSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
