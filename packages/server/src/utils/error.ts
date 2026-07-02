import { Response } from 'express';

type ErrorMap = Record<string, { status: number; message: string }>;

type PrefixHandler = { prefix: string; status: number; message: (id: string) => string };

// ── Fabrique de gestionnaires d'erreurs service → HTTP ────────────────────
function createErrorHandler(errorMap: ErrorMap, logPrefix: string, prefixHandlers: PrefixHandler[] = []) {
  return (res: Response, error: unknown): void => {
    const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

    for (const { prefix, status, message: buildMessage } of prefixHandlers) {
      if (message.startsWith(prefix)) {
        const id = message.split(':')[1];
        res.status(status).json({ message: buildMessage(id), code: prefix });
        return;
      }
    }

    const mapped = errorMap[message];
    if (mapped) {
      res.status(mapped.status).json({ message: mapped.message, code: message });
      return;
    }

    // Erreur non mappée — erreur interne
    console.error(logPrefix, error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  };
}

export const handleAuthError = createErrorHandler(
  {
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
  },
  '[auth.controller]'
);

export const handleUsersError = createErrorHandler(
  {
    UTILISATEUR_INTROUVABLE: { status: 404, message: 'Utilisateur introuvable.' },
    MATRICULE_EXISTANT: { status: 409, message: 'Ce matricule est déjà utilisé.' },
    COMPTE_INACTIF: { status: 400, message: 'Le compte est inactif.' },
    SUPER_ADMIN_INDESACTIVABLE: {
      status: 403,
      message: 'Le Super Admin ne peut pas être désactivé.',
    },
  },
  '[users.controller]'
);

export const handleAuditError = createErrorHandler(
  {
    AUDIT_LOG_INTROUVABLE: { status: 404, message: 'Entrée de journal introuvable.' },
  },
  '[audit.controller]'
);

export const handleGlossaireError = createErrorHandler(
  {
    TERME_INTROUVABLE: { status: 404, message: 'Terme introuvable.' },
  },
  '[glossaire.controller]'
);

export const handleParametresError = createErrorHandler(
  {
    PARAMETRE_INTROUVABLE: { status: 404, message: 'Paramètre introuvable.' },
    VALEUR_INVALIDE_ENTIER: { status: 400, message: 'La valeur doit être un nombre entier.' },
    VALEUR_INVALIDE_BOOLEEN: { status: 400, message: 'La valeur doit être true ou false.' },
  },
  '[parametres.controller]'
);

export const handleOrganisationsError = createErrorHandler(
  {
    ORGANISATION_INTROUVABLE: { status: 404, message: 'Organisation introuvable.' },
    ORGANISATION_EXISTANTE: { status: 409, message: 'Une organisation avec ce nom existe déjà.' },
    CONTACT_INTROUVABLE: { status: 404, message: 'Contact introuvable.' },
  },
  '[organisations.controller]'
);

export const handleCourriersError = createErrorHandler(
  {
    COURRIER_INTROUVABLE: { status: 404, message: 'Courrier introuvable.' },
    COURRIER_PARENT_INTROUVABLE: { status: 404, message: 'Courrier parent introuvable.' },
    ACCORD_INTROUVABLE: { status: 404, message: 'Accord introuvable.' },
    MISSION_INTROUVABLE: { status: 404, message: 'Mission introuvable.' },
  },
  '[courriers.controller]'
);

export const handleAccordsError = createErrorHandler(
  {
    ACCORD_INTROUVABLE: { status: 404, message: 'Accord introuvable.' },
    PARTENAIRES_REQUIS: { status: 400, message: 'Au moins un partenaire est requis.' },
    ORGANISATION_INTROUVABLE: { status: 404, message: 'Organisation partenaire introuvable.' },
  },
  '[accords.controller]',
  [
    {
      prefix: 'ORGANISATION_INTROUVABLE:',
      status: 404,
      message: (id) => `Organisation partenaire introuvable (ID: ${id}).`,
    },
  ]
);

export const handleMissionsError = createErrorHandler(
  {
    MISSION_INTROUVABLE: { status: 404, message: 'Mission introuvable.' },
    MISSION_ANNULEE: { status: 400, message: 'Une mission annulée ne peut pas être modifiée.' },
    RECOMMANDATION_INTROUVABLE: { status: 404, message: 'Recommandation introuvable.' },
    DATES_INVALIDES: {
      status: 400,
      message: 'La date de début doit être antérieure à la date de fin.',
    },
    CONTACT_INTROUVABLE: { status: 404, message: 'Contact introuvable.' },
  },
  '[missions.controller]',
  [
    {
      prefix: 'PARTICIPANT_INTROUVABLE:',
      status: 404,
      message: (id) => `Participant introuvable (ID: ${id}).`,
    },
  ]
);

export const handleDemandesError = createErrorHandler(
  {
    DEMANDE_INTROUVABLE: { status: 404, message: 'Demande introuvable.' },
    DEMANDE_NON_DISPONIBLE: { status: 400, message: "Cette demande n'est plus disponible." },
    DEMANDE_VERROUILEE: { status: 409, message: 'Cette demande a déjà été prise en charge.' },
    DEMANDE_NON_AUTORISEE: {
      status: 403,
      message: "Vous n'êtes pas autorisé à effectuer cette action.",
    },
    DEMANDE_DEJA_PRISE: { status: 400, message: 'Cette demande est déjà en cours de traitement.' },
    DEMANDE_STATUT_INVALIDE: {
      status: 400,
      message: 'Statut de la demande incompatible avec cette action.',
    },
    CONTENU_REQUIS: { status: 400, message: 'Un document ou un texte libre est requis.' },
    DOCUMENT_INTROUVABLE: { status: 404, message: 'Document introuvable.' },
    DOCUMENT_SANS_TEXTE_OCR: {
      status: 400,
      message: "Le document n'a pas de texte extrait (OCR requis).",
    },
  },
  '[demandes.controller]'
);

export const handleTraductionError = createErrorHandler(
  {
    TRADUCTION_INTROUVABLE: { status: 404, message: 'Traduction introuvable.' },
    TEXTE_FINAL_REQUIS: { status: 400, message: 'Un texte final est requis avant approbation.' },
    APPROBATION_REQUISE: {
      status: 400,
      message: 'La traduction doit être approuvée avant archivage.',
    },
    TRADUCTION_APPROUVEE_NON_SUPPRIMABLE: {
      status: 400,
      message: 'Une traduction approuvée ne peut pas être supprimée.',
    },
    TRADUCTION_ARCHIVEE_NON_SUPPRIMABLE: {
      status: 400,
      message: 'Une traduction archivée ne peut pas être supprimée.',
    },
    TRADUCTION_DEJA_SUPPRIMEE: { status: 400, message: 'Cette traduction est déjà supprimée.' },
    TRADUCTION_NON_SUPPRIMEE: { status: 400, message: "Cette traduction n'est pas supprimée." },
  },
  '[traduction.controller]'
);
