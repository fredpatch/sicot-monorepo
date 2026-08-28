// packages/client/src/pages/admin/admin.constants.ts

// Labels des paramètres - friendly name affiché en titre de carte, la clé
// technique reste visible en métadonnée secondaire (voir ParameterCard.tsx).
export const PARAMETRE_LABELS: Record<string, string> = {
  accord_alerte_jours: 'Alerte échéance accord',
  courrier_alerte_jours: 'Seuil courrier « à surveiller »',
  courrier_alerte_critique_jours: 'Seuil courrier « critique »',
  recommandation_alerte_jours: 'Alerte recommandation à risque',
  otp_expiration_minutes: 'Expiration du code OTP',
  lockout_max_tentatives: 'Tentatives avant blocage',
  lockout_duree_minutes: 'Durée du blocage',
  backup_local_dir: 'Dossier de sauvegarde local',
  backup_retention_quotidien_nombre: 'Sauvegardes quotidiennes conservées',
  backup_retention_hebdomadaire_nombre: 'Sauvegardes hebdomadaires conservées',
  backup_retention_mensuel_nombre: 'Sauvegardes mensuelles conservées',
  deepl_fallback_actif: 'Fallback traduction DeepL',
  gemini_quota_journalier_par_modele: 'Quota journalier Gemini par modèle',
  gemini_rapports_manuels_max_jour: 'Rapports IA manuels maximum par jour',
};

// Labels des modules backend réels (voir Phase 1 audit) - couvre tous les
// modules effectivement utilisés par au moins un paramètre ou un job
// aujourd'hui (M1/M3/M4/M6/M10/M11). Jamais de code brut affiché à l'écran :
// getModuleLabel() ci-dessous retombe sur le code seulement si un module
// totalement nouveau apparaît côté serveur, en attendant une mise à jour de
// cette table.
export const MODULE_LABELS: Record<string, string> = {
  M1: 'Accords & Partenariats',
  M3: 'Missions & Recommandations',
  M4: 'Correspondances',
  M6: 'Traduction',
  M10: 'Sécurité & Système',
  M11: 'IA & Rapports',
};

export function getModuleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

// Regroupement de présentation (friendly sections) - re-tranche les mêmes
// paramètres réels par convivialité d'usage, sans jamais renommer la clé ni
// le module réel qui reste la vérité technique (audit/API). Un paramètre non
// listé ici retombe dans une section « Autres » plutôt que d'être masqué -
// voir admin.utils.ts#grouperParametresParSection.
export const PARAMETER_SECTIONS: { label: string; keys: string[] }[] = [
  {
    label: 'Métier',
    keys: [
      'accord_alerte_jours',
      'courrier_alerte_jours',
      'courrier_alerte_critique_jours',
      'recommandation_alerte_jours',
    ],
  },
  {
    label: 'Sécurité & Authentification',
    keys: ['otp_expiration_minutes', 'lockout_max_tentatives', 'lockout_duree_minutes'],
  },
  {
    label: 'Sauvegardes',
    keys: [
      'backup_local_dir',
      'backup_retention_quotidien_nombre',
      'backup_retention_hebdomadaire_nombre',
      'backup_retention_mensuel_nombre',
    ],
  },
  {
    label: 'Traduction',
    keys: ['deepl_fallback_actif'],
  },
  {
    label: 'IA & Rapports',
    keys: ['gemini_quota_journalier_par_modele', 'gemini_rapports_manuels_max_jour'],
  },
];

// Paramètres dont la prise d'effet est réellement différée à un cycle cron,
// plutôt qu'immédiate - voir Phase 1 audit (jobs/alertes.ts, cron 08h00).
// Toute clé absente de cette table prend effet immédiatement, à la prochaine
// lecture (connexion, calcul de criticité, appel Gemini, purge de sauvegarde...).
export const PARAMETRES_A_EFFET_DIFFERE: Record<string, string> = {
  accord_alerte_jours:
    'Les nouveaux seuils seront utilisés lors du prochain cycle planifié (08h00).',
};

const LABELS_MODELE_GEMINI: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
};

export function getModeleGeminiLabel(modele: string): string {
  return LABELS_MODELE_GEMINI[modele] ?? modele;
}
