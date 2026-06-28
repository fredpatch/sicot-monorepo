import { z } from 'zod';

export const loginSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('otp'),
    matricule: z.string().min(1, 'Le matricule est requis'),
    otp: z
      .string()
      .length(6, 'Le code OTP doit contenir exactement 6 chiffres')
      .regex(/^\d+$/, 'Uniquement des chiffres'),
    motDePasse: z.string().optional(),
  }),
  z.object({
    mode: z.literal('password'),
    matricule: z.string().min(1, 'Le matricule est requis'),
    motDePasse: z.string().min(1, 'Le mot de passe est requis'),
    otp: z.string().optional(),
  }),
]);

export const setPasswordSchema = z
  .object({
    motDePasse: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre')
      .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
    confirmation: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;
export type Etape = 'login' | 'set-password';
