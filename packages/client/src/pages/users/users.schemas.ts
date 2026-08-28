// packages/client/src/pages/utilisateurs/utilisateurs.schemas.ts
import { z } from 'zod';

export const creerUtilisateurSchema = z.object({
  matricule: z.string().min(1, 'Le matricule est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  role: z.enum(['agent', 'operateur', 'admin', 'super_admin']),
  // Non éditables dans le formulaire - reportés tels quels depuis la sélection
  // Personnel ANAC (voir CreateUserDialog.tsx), absents pour une création manuelle.
  poste: z.string().nullish(),
  service: z.string().nullish(),
  direction: z.string().nullish(),
});
export type CreerUtilisateurFormData = z.infer<typeof creerUtilisateurSchema>;

export const modifierUtilisateurSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['agent', 'operateur', 'admin', 'super_admin']),
});
export type ModifierUtilisateurFormData = z.infer<typeof modifierUtilisateurSchema>;
