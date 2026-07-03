import ExcelJS from 'exceljs';
import { genererPDFDepuisHTML } from '@/utils/pdf';
import type { AuditLogView } from './audit.types';

// ── Résumé des filtres actifs, pour affichage en en-tête d'export ─────────
export function resumerFiltres(filters: {
  module?: string;
  action?: string;
  dateDebut?: Date;
  dateFin?: Date;
}): string {
  const parts: string[] = [];
  if (filters.module) parts.push(`Module : ${filters.module}`);
  if (filters.action) parts.push(`Action : ${filters.action}`);
  if (filters.dateDebut) parts.push(`Du ${filters.dateDebut.toLocaleDateString('fr-FR')}`);
  if (filters.dateFin) parts.push(`Au ${filters.dateFin.toLocaleDateString('fr-FR')}`);
  return parts.length > 0 ? parts.join(' — ') : 'Aucun filtre — journal complet';
}

function formatUtilisateur(log: AuditLogView): string {
  return log.userMatricule
    ? `${log.userPrenom ?? ''} ${log.userNom ?? ''} (${log.userMatricule})`.trim()
    : 'Système';
}

function formatDateHeure(date: Date): string {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Export Excel ─────────────────────────────────────────────────────────
export async function genererExcelAudit(logs: AuditLogView[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SICOT — ANAC Gabon';
  workbook.created = new Date();

  const feuille = workbook.addWorksheet("Journal d'audit");

  feuille.columns = [
    { header: 'Date / heure', key: 'date', width: 18 },
    { header: 'Utilisateur', key: 'utilisateur', width: 28 },
    { header: 'Module', key: 'module', width: 10 },
    { header: 'Action', key: 'action', width: 30 },
    { header: 'Entité', key: 'entite', width: 10 },
    { header: 'IP', key: 'ip', width: 16 },
    { header: 'Détails', key: 'details', width: 60 },
  ];

  feuille.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A5E' } };
  });
  feuille.getRow(1).height = 20;

  for (const log of logs) {
    feuille.addRow({
      date: formatDateHeure(log.createdAt),
      utilisateur: formatUtilisateur(log),
      module: log.module,
      action: log.action,
      entite: log.entiteId ?? '',
      ip: log.ip ?? '',
      details: log.details ? JSON.stringify(log.details) : '',
    });
  }

  feuille.autoFilter = { from: 'A1', to: 'G1' };
  feuille.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── Export PDF ──────────────────────────────────────────────────────────
export async function genererPDFAudit(
  logs: AuditLogView[],
  resumeFiltres: string,
  tronque: boolean
): Promise<Buffer> {
  const lignes = logs
    .map(
      (log) => `
        <tr>
          <td>${formatDateHeure(log.createdAt)}</td>
          <td>${formatUtilisateur(log)}</td>
          <td>${log.module}</td>
          <td>${log.action}</td>
          <td>${log.entiteId ?? '—'}</td>
          <td>${log.ip ?? '—'}</td>
        </tr>
      `
    )
    .join('');

  const corps = `
    <p class="sous-titre">
      ${resumeFiltres} — ${logs.length} entrée${logs.length > 1 ? 's' : ''}
      ${tronque ? " (résultat tronqué, affinez les filtres ou utilisez l'export Excel)" : ''}
    </p>
    <table>
      <thead>
        <tr><th>Date / heure</th><th>Utilisateur</th><th>Module</th><th>Action</th><th>Entité</th><th>IP</th></tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
  `;

  return genererPDFDepuisHTML(corps, { titre: "Journal d'audit" });
}
