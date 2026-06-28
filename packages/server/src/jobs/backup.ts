import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logAudit } from '../modules/auth/services/auth.service';

const execAsync = promisify(exec);

// ── Configuration ─────────────────────────────────────────────────────────
const BACKUP_LOCAL_DIR = process.env.BACKUP_LOCAL_DIR ?? '/sicot/backups/local';
const BACKUP_NAS_DIR = process.env.BACKUP_NAS_DIR ?? '/mnt/nas/sicot/backups';
const LOCAL_RETENTION_DAYS = 30;
const NAS_RETENTION_MONTHS = 12;

// ── Utilitaires ───────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// Supprimer les fichiers plus vieux que N jours
function supprimerAnciensBackups(dir: string, retentionDays: number): void {
  if (!fs.existsSync(dir)) return;

  const now = Date.now();
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const ageEnJours = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageEnJours > retentionDays) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Backup supprimé (rétention) : ${file}`);
    }
  });
}

// ── Fonction principale de sauvegarde ────────────────────────────────────
async function effectuerSauvegarde(
  destination: string,
  type: 'quotidien' | 'hebdomadaire'
): Promise<void> {
  ensureDir(destination);

  const timestamp = formatDate(new Date());
  const filename = `sicot_backup_${type}_${timestamp}.sql`;
  const filepath = path.join(destination, filename);

  // pg_dump utilise les variables d'environnement PostgreSQL standard
  const databaseUrl = process.env.DATABASE_URL!;
  const command = `pg_dump "${databaseUrl}" --no-password --format=plain --file="${filepath}"`;

  try {
    await execAsync(command);
    const stats = fs.statSync(filepath);
    const tailleMo = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Sauvegarde ${type} réussie : ${filename} (${tailleMo} Mo)`);

    await logAudit({
      action: `SAUVEGARDE_${type.toUpperCase()}`,
      module: 'M10',
      details: { fichier: filename, tailleMo, destination },
    });
  } catch (error) {
    console.error(`❌ Échec sauvegarde ${type} :`, error);

    await logAudit({
      action: `SAUVEGARDE_${type.toUpperCase()}_ECHEC`,
      module: 'M10',
      details: { erreur: String(error) },
    });
  }
}

// ── Cron 1 : Sauvegarde quotidienne locale ────────────────────────────────
// Tous les jours à 02h00 du matin
function demarrerSauvegardeQuotidienne(): void {
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Démarrage sauvegarde quotidienne...');
    await effectuerSauvegarde(BACKUP_LOCAL_DIR, 'quotidien');
    supprimerAnciensBackups(BACKUP_LOCAL_DIR, LOCAL_RETENTION_DAYS);
  });

  console.log('📅 Sauvegarde quotidienne planifiée à 02h00');
}

// ── Cron 2 : Sauvegarde hebdomadaire NAS ─────────────────────────────────
// Tous les dimanches à 03h00 du matin
function demarrerSauvegardeHebdomadaire(): void {
  cron.schedule('0 3 * * 0', async () => {
    console.log('⏰ Démarrage sauvegarde hebdomadaire NAS...');
    await effectuerSauvegarde(BACKUP_NAS_DIR, 'hebdomadaire');
    supprimerAnciensBackups(BACKUP_NAS_DIR, NAS_RETENTION_MONTHS * 30);
  });

  console.log('📅 Sauvegarde hebdomadaire NAS planifiée le dimanche à 03h00');
}

// ── Point d'entrée : démarrer tous les jobs ───────────────────────────────
export function demarrerJobsSauvegarde(): void {
  demarrerSauvegardeQuotidienne();
  demarrerSauvegardeHebdomadaire();
}

// ── Sauvegarde manuelle déclenchable depuis l'interface admin ─────────────
export async function declencherSauvegardeManuelle(): Promise<void> {
  console.log('⏰ Sauvegarde manuelle déclenchée...');
  await effectuerSauvegarde(BACKUP_LOCAL_DIR, 'quotidien');
}
