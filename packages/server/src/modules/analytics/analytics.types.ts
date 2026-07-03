// ── Filtre de période — partagé par tous les modules analytics ────────────
export interface PeriodeFiltre {
  dateDebut?: Date;
  dateFin?: Date;
}

// ── M1 Accords ──────────────────────────────────────────────────────────
export interface AccordsAnalytics {
  dureeMoyenneParType: {
    type: string;
    dureeMoyenneJours: number | null;
    nombreAccords: number;
  }[];
  tauxRenouvellement: {
    renouveles: number;
    clotures: number;
    tauxPourcentage: number;
  };
  repartitionGeographique: {
    pays: string;
    region: string | null;
    nombrePartenaires: number;
  }[];
  evolutionParMois: { mois: string; total: number }[];
}

// ── M4 Courriers ────────────────────────────────────────────────────────
export interface CourriersAnalytics {
  volumeParMoisEtDirection: { mois: string; entrant: number; sortant: number }[];
  tempsMoyenReponseJours: number | null;
  tauxReponse: { repondus: number; archivesSansReponse: number; tauxPourcentage: number };
  topOrganisationsExpeditrices: { organisation: string; nombreCourriers: number }[];
  evolutionCriticite: {
    date: string;
    normal: number;
    aSurveiller: number;
    critique: number;
  }[];
}

// ── M3 Missions ─────────────────────────────────────────────────────────
export interface MissionsAnalytics {
  missionsParPays: { pays: string; nombreMissions: number }[];
  recommandations: {
    realisees: number;
    enCours: number;
    enAttenteActives: number;
    depassees: number;
  };
  delaiMoyenRapportJours: number | null;
  topParticipants: { nom: string; prenom: string; matricule: string; nombreMissions: number }[];
}

// ── M6 Traduction ───────────────────────────────────────────────────────
export interface TraductionAnalytics {
  volumeParMois: { mois: string; nombreTraductions: number }[];
  tauxCorrectionIA: {
    valideesTelQuelles: number;
    corrigees: number;
    tauxCorrectionPourcentage: number;
  };
  tempsMoyenTraitementJours: number | null;
  repartitionDirection: { direction: string; nombre: number }[];
  termesAjoutesGlossaireDepuisM6: number;
}

// ── M5 Demandes ─────────────────────────────────────────────────────────
export interface DemandesAnalytics {
  delaiMoyenPriseEnChargeJours: number | null;
  tauxUrgenceValidee: {
    demandeesUrgentes: number;
    valideesUrgentes: number;
    tauxPourcentage: number;
  };
  volumeParDemandeur: { nom: string; prenom: string; matricule: string; nombreDemandes: number }[];
  tauxCompletion: { validees: number; archivees: number; enCours: number };
}

// ── M8 Documents ────────────────────────────────────────────────────────
export interface DocumentsAnalytics {
  volumeParMoisEtCategorie: { mois: string; categorie: string; nombre: number }[];
  tauxSuccesOCR: {
    traite: number;
    echec: number;
    aRetraiter: number;
    tauxSuccesPourcentage: number;
  };
  evolutionStockTotal: { mois: string; total: number }[];
}

// ── M7 Glossaire ────────────────────────────────────────────────────────
export interface GlossaireAnalytics {
  croissanceParMois: { mois: string; nombreTermes: number }[];
  repartitionOrigine: { manuel: number; automatiqueM6: number };
  repartitionParDomaine: { domaine: string; nombre: number }[];
}

// ── Vue globale cross-modules ──────────────────────────────────────────────
export interface GlobalAnalytics {
  accords: { totalSignes: number; tauxRenouvellementPourcentage: number };
  courriers: { totalVolume: number; tauxReponsePourcentage: number };
  missions: { totalMissions: number; delaiMoyenRapportJours: number | null };
  traductions: { totalTraductions: number; tauxCorrectionPourcentage: number };
  demandes: { totalTraitees: number; tauxUrgenceValideePourcentage: number };
  documents: { totalAjoutes: number; tauxSuccesOCRPourcentage: number };
  glossaire: { totalTermesAjoutes: number; partAutomatiqueM6Pourcentage: number };
}
