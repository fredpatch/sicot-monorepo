import { Response } from 'express';

// ── Traduction des codes d'erreur service → HTTP ──────────────────────────
export function handleAuthError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    COMPTE_INTROUVABLE: { status: 401, message: 'Compte introuvable ou inactif.' },
    COMPTE_BLOQUE: { status: 423, message: 'Compte temporairement bloqué. Réessayez plus tard.' },
    COMPTE_INACTIF: { status: 401, message: 'Compte inactif.' },
    OTP_REQUIS: { status: 400, message: 'Code OTP requis pour la première connexion.' },
    OTP_NON_GENERE: { status: 400, message: 'Aucun OTP généré pour ce compte.' },
    OTP_EXPIRE: { status: 401, message: 'Code OTP expiré.' },
    OTP_INVALIDE: { status: 401, message: 'Code OTP incorrect.' },
    MOT_DE_PASSE_REQUIS: { status: 400, message: 'Mot de passe requis.' },
    MOT_DE_PASSE_NON_DEFINI: { status: 401, message: 'Mot de passe non défini.' },
    MOT_DE_PASSE_INVALIDE: { status: 401, message: 'Mot de passe incorrect.' },
    MOTS_DE_PASSE_DIFFERENTS: { status: 400, message: 'Les mots de passe ne correspondent pas.' },
    MOT_DE_PASSE_TROP_COURT: {
      status: 400,
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    },
    UTILISATEUR_INTROUVABLE: { status: 404, message: 'Utilisateur introuvable.' },
    EMAIL_MANQUANT: { status: 400, message: 'Aucun email associé à ce compte.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  // Erreur non mappée — erreur interne
  console.error('[auth.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── Traduction des codes d'erreur service → HTTP ──────────────────────────
export function handleUsersError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    UTILISATEUR_INTROUVABLE: { status: 404, message: 'Utilisateur introuvable.' },
    MATRICULE_EXISTANT: { status: 409, message: 'Ce matricule est déjà utilisé.' },
    COMPTE_INACTIF: { status: 400, message: 'Le compte est inactif.' },
    SUPER_ADMIN_INDESACTIVABLE: {
      status: 403,
      message: 'Le Super Admin ne peut pas être désactivé.',
    },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[users.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}

// ── Traduction des codes d'erreur ─────────────────────────────────────────
export function handleAuditError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    AUDIT_LOG_INTROUVABLE: { status: 404, message: 'Entrée de journal introuvable.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  console.error('[audit.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}
