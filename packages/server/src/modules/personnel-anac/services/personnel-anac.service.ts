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
}

function normaliser(raw: PersonnelAnacRaw): PersonnelAnacView {
  const { service, direction, function: fonction } = raw.organization;
  const organisationLabel =
    [service?.name, direction?.name, fonction?.name].filter(Boolean).join(' - ') || null;

  return {
    matricule: String(raw.identity.matricule),
    nom: raw.identity.lastName,
    prenom: raw.identity.firstName,
    organisationLabel,
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