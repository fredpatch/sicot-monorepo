import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logAudit } from '@/modules/auth/services/auth.service';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';

const execAsync = promisify(exec);

// ── Configuration ─────────────────────────────────────────────────────────
const PG_DUMP_BIN = process.env.PG_DUMP_PATH ?? 'pg_dump';
export const BACKUP_LOCAL_DIR = process.env.BACKUP_LOCAL_DIR ?? '/sicot/backups/local';
export const BACKUP_NAS_DIR = process.env.BACKUP_NAS_DIR ?? '/mnt/nas/sicot/backups';

// ── Utilitaires ───────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function supprimerAnciensBackups(dir: string, retentionDays: number): number {
  if (!fs.existsSync(dir)) return 0;

  const now = Date.now();
  const files = fs.readdirSync(dir);
  let supprimes = 0;

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const ageEnJours = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageEnJours > retentionDays) {
      fs.unlinkSync(filePath);
      supprimes++;
      console.log(`🗑️  Backup supprimé (rétention) : ${file}`);
    }
  });

  return supprimes;
}

// ── Fonction principale de sauvegarde ────────────────────────────────────
export async function effectuerSauvegarde(
  destination: string,
  type: 'quotidien' | 'hebdomadaire'
): Promise<{
  succes: boolean;
  nomFichier?: string;
  tailleMo?: number;
  erreur?: string;
}> {
  ensureDir(destination);

  const timestamp = formatDate(new Date());
  const filename = `sicot_backup_${type}_${timestamp}.sql`;
  const filepath = path.join(destination, filename);

  const databaseUrl = process.env.DATABASE_URL!;
  const command = `"${PG_DUMP_BIN}" "${databaseUrl}" --no-password --format=plain --file="${filepath}"`;
  // const command = `pg_dump "${databaseUrl}" --no-password --format=plain --file="${filepath}"`;

  try {
    await execAsync(command);
    const stats = fs.statSync(filepath);
    const tailleMo = parseFloat((stats.size / (1024 * 1024)).toFixed(2));

    console.log(`✅ Sauvegarde ${type} réussie : ${filename} (${tailleMo} Mo)`);

    await logAudit({
      action: `SAUVEGARDE_${type.toUpperCase()}`,
      module: 'M10',
      details: { fichier: filename, tailleMo, destination },
    });

    return { succes: true, nomFichier: filename, tailleMo };
  } catch (error) {
    const erreur = error instanceof Error ? error.message : String(error);
    console.error(`❌ Échec sauvegarde ${type} :`, error);

    await logAudit({
      action: `SAUVEGARDE_${type.toUpperCase()}_ECHEC`,
      module: 'M10',
      details: { erreur },
    });

    return { succes: false, erreur };
  }
}

// ── Cron 1 : Sauvegarde quotidienne locale ────────────────────────────────
function demarrerSauvegardeQuotidienne(): void {
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Démarrage sauvegarde quotidienne...');
    await effectuerSauvegarde(BACKUP_LOCAL_DIR, 'quotidien');
    const retentionJours = await getValeurEntier('backup_retention_locale_jours', 30);
    supprimerAnciensBackups(BACKUP_LOCAL_DIR, retentionJours);
  });

  console.log('📅 Sauvegarde quotidienne planifiée à 02h00');
}

// ── Cron 2 : Sauvegarde hebdomadaire NAS ─────────────────────────────────
function demarrerSauvegardeHebdomadaire(): void {
  cron.schedule('0 3 * * 0', async () => {
    console.log('⏰ Démarrage sauvegarde hebdomadaire NAS...');
    await effectuerSauvegarde(BACKUP_NAS_DIR, 'hebdomadaire');
    const retentionJours = await getValeurEntier('backup_retention_nas_jours', 360);
    supprimerAnciensBackups(BACKUP_NAS_DIR, retentionJours);
  });

  console.log('📅 Sauvegarde hebdomadaire NAS planifiée le dimanche à 03h00');
}

// ── Point d'entrée : démarrer tous les jobs ───────────────────────────────
export function demarrerJobsSauvegarde(): void {
  demarrerSauvegardeQuotidienne();
  demarrerSauvegardeHebdomadaire();
}

// ── Sauvegarde manuelle déclenchable depuis l'interface admin ─────────────
export async function declencherSauvegardeManuelle(): Promise<{
  succes: boolean;
  nomFichier?: string;
  tailleMo?: number;
  erreur?: string;
}> {
  console.log('⏰ Sauvegarde manuelle déclenchée...');
  return effectuerSauvegarde(BACKUP_LOCAL_DIR, 'quotidien');
}
