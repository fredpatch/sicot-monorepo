// packages/client/src/pages/profil/profil.schemas.ts
import { z } from 'zod';

// Mêmes règles que BootstrapPage.tsx — le serveur applique désormais la même
// politique de complexité (auth.service.ts, validerForceMotDePasse), donc ce
// n'est plus une contrainte purement cosmétique côté client.
export const changerMotDePasseSchema = z
  .object({
    motDePasseActuel: z.string().min(1, 'Le mot de passe actuel est requis'),
    nouveauMotDePasse: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre')
      .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
    confirmation: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });

export type ChangerMotDePasseFormData = z.infer<typeof changerMotDePasseSchema>;
