// packages/server/src/modules/personnel-anac/services/personnel-anac.service.ts
import * as personnelAnac from '@/utils/personnel-anac';
import type { PersonnelAnacRaw } from '@/utils/personnel-anac';

// Vue normalisée exposée par SICOT au client (matricule en string pour matcher
// notre colonne users.matricule, organisation aplatie en libellé lisible)
export interface PersonnelAnacView {
  matricule: string;
  nom: string | null;
  prenom: string | null;
  organisationLabel: string | null; // ex: "Service Informatique - Direction Technique - Agent"
  poste: string | null;
  service: string | null;
  direction: string | null;
}

// L'API Personnel ANAC renvoie identity.matricule en number - un matricule
// "0230" y est donc déjà indiscernable de 230 (un nombre ne porte pas de
// zéro non significatif). SICOT restaure le format à 4 chiffres attendu en
// interne (badge/matricule ANAC) en le re-complétant de zéros ici, au seul
// point de la conversion number -> string. Si l'API source expose un jour un
// champ matricule déjà formaté en string, préférer ce champ à identity.matricule.
const MATRICULE_LONGUEUR = 4;

function normaliser(raw: PersonnelAnacRaw): PersonnelAnacView {
  const { service, direction, function: fonction } = raw.organization;
  const organisationLabel =
    [service?.name, direction?.name, fonction?.name].filter(Boolean).join(' - ') || null;

  return {
    matricule: String(raw.identity.matricule).padStart(MATRICULE_LONGUEUR, '0'),
    nom: raw.identity.lastName,
    prenom: raw.identity.firstName,
    organisationLabel,
    poste: fonction?.name ?? null,
    service: service?.name ?? null,
    direction: direction?.name ?? null,
  };
}

export async function rechercher(q: string): Promise<PersonnelAnacView[]> {
  if (q.trim().length < 2) {
    throw new Error('RECHERCHE_TROP_COURTE');
  }
  const resultats = await personnelAnac.rechercherPersonnel(q.trim());
  return resultats.map(normaliser);
}

export async function getParMatricule(matricule: string): Promise<PersonnelAnacView> {
  const matriculeInt = parseInt(matricule, 10);
  if (isNaN(matriculeInt) || matriculeInt <= 0) {
    throw new Error('MATRICULE_INVALIDE');
  }
  const raw = await personnelAnac.getPersonnelParMatricule(matriculeInt);
  return normaliser(raw);
}

export async function lister(
  page: number,
  limit: number,
  sortBy: 'id' | 'lastName',
  order: 'asc' | 'desc'
): Promise<{ data: PersonnelAnacView[]; total: number; page: number; limit: number }> {
  const { data, meta } = await personnelAnac.listerPersonnel(page, limit, sortBy, order);
  return { data: data.map(normaliser), total: meta.total, page: meta.page, limit: meta.limit };
}