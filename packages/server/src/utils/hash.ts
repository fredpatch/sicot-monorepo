import crypto from 'crypto';

// ── Calcul du hash MD5 d'un buffer ────────────────────────────────────────
// Utilisé à l'upload pour détecter les doublons dans la table documents
export function calculerMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// ── Comparer deux hash ────────────────────────────────────────────────────
export function hashesIdentiques(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}
