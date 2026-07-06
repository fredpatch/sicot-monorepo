// packages/server/src/utils/personnel-anac.ts
import axios, { AxiosError } from 'axios';
import type { PersonnelAnacRaw, PersonnelAnacListMeta } from "@/utils/personnel-anac.types" 

export type { PersonnelAnacRaw, PersonnelAnacListMeta } from './personnel-anac.types';

// ── Configuration ──────────────────────────────────────────────────────────
// Appelle l'API Personnel ANAC (passerelle en lecture seule sur la base RH ANAC,
// accessible via le réseau Tailscale — voir doc ANAC IT, juillet 2026)
const BASE_URL = process.env.PERSONNEL_ANAC_BASE_URL ?? 'http://100.110.227.69:4005';
const API_KEY = process.env.PERSONNEL_ANAC_API_KEY ?? '';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'x-api-key': API_KEY },
});

// ── Traduit une erreur axios en erreur métier SICOT ───────────────────────
function traduireErreur(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError;

    if (err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED' || !err.response) {
      return new Error('PERSONNEL_ANAC_INDISPONIBLE');
    }
    if (err.response.status === 401 || err.response.status === 403) {
      return new Error('PERSONNEL_ANAC_AUTH_INVALIDE');
    }
    if (err.response.status === 404) {
      return new Error('PERSONNEL_INTROUVABLE');
    }
    if (err.response.status === 429) {
      return new Error('PERSONNEL_ANAC_LIMITE_ATTEINTE');
    }
  }
  console.error('[personnel-anac] Erreur inattendue:', error);
  return new Error('PERSONNEL_ANAC_ERREUR_INCONNUE');
}

// ── Rechercher des agents par texte libre (nom/prénom) ────────────────────
export async function rechercherPersonnel(q: string, limit = 20): Promise<PersonnelAnacRaw[]> {
  try {
    const res = await client.get('/api/v1/personnel/search', { params: { q, limit } });
    return res.data.data as PersonnelAnacRaw[];
  } catch (error) {
    throw traduireErreur(error);
  }
}

// ── Récupérer un agent par matricule ───────────────────────────────────────
export async function getPersonnelParMatricule(matricule: number): Promise<PersonnelAnacRaw> {
  try {
    const res = await client.get(`/api/v1/personnel/matricule/${matricule}`);
    return res.data.data as PersonnelAnacRaw;
  } catch (error) {
    throw traduireErreur(error);
  }
}

// ── Lister l'annuaire, paginé (pour l'onglet "Personnel ANAC") ────────────
export async function listerPersonnel(
  page = 1,
  limit = 20,
  sortBy: 'id' | 'lastName' = 'lastName',
  order: 'asc' | 'desc' = 'asc'
): Promise<{ data: PersonnelAnacRaw[]; meta: PersonnelAnacListMeta }> {
  try {
    const res = await client.get('/api/v1/personnel', { params: { page, limit, sortBy, order } });
    return { data: res.data.data as PersonnelAnacRaw[], meta: res.data.meta as PersonnelAnacListMeta };
  } catch (error) {
    throw traduireErreur(error);
  }
}