import path from 'path';
import type { DocumentCategorie } from './documents.types';

// ── Configuration stockage ─────────────────────────────────────────────────
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/sicot/documents';

export const DOSSIERS: Record<DocumentCategorie | 'temp', string> = {
  accord: path.join(UPLOAD_DIR, 'accords'),
  correspondance: path.join(UPLOAD_DIR, 'correspondances'),
  mission: path.join(UPLOAD_DIR, 'missions'),
  traduction: path.join(UPLOAD_DIR, 'traductions'),
  glossaire: path.join(UPLOAD_DIR, 'glossaire'),
  autre: path.join(UPLOAD_DIR, 'autres'),
  temp: path.join(UPLOAD_DIR, 'temp'),
};

// ── Classification automatique par mots-clés ───────────────────────────────
export const MOTS_CLES_CATEGORIES: Record<DocumentCategorie, string[]> = {
  accord: [
    'accord',
    'convention',
    'protocole',
    'memorandum',
    'mou',
    'agreement',
    'treaty',
    'partnership',
  ],
  correspondance: [
    'courrier',
    'lettre',
    'correspondance',
    'mail',
    'note',
    'letter',
    'correspondence',
    'communication',
  ],
  mission: [
    'mission',
    'rapport',
    'compte-rendu',
    'séminaire',
    'conférence',
    'report',
    'meeting',
    'workshop',
    'conference',
  ],
  traduction: ['traduction', 'translation', 'traduit', 'translated', 'version'],
  glossaire: ['glossaire', 'glossary', 'terminologie', 'terminology', 'lexique'],
  autre: [],
};
