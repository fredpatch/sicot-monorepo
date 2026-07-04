import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { db } from '@/db/index.js';
import { documents, rapports, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { DOSSIERS } from '@/modules/document/services/documents.constants.js';
import { genererPDFDepuisHTML } from '@/utils/pdf.js';
import { calculerMD5 } from '@/utils/hash.js';
import { SERVICE_PAR_MODULE } from '@/modules/analytics/services/analytics.service';
import {
  humaniser,
  normaliserEnLignes,
} from '@/modules/analytics/services/analytics.export.service.js';
import { logAudit } from '@/modules/auth/services/auth.service';
import {
  incrementerRapportsManuelsJour,
  verifierLimiteRapportsManuelsJour,
} from '@/modules/analytics/services/gemini-quota.service';
import { genererNarratifIA } from '@/modules/analytics/services/gemini.service';

const LABELS_MODULE: Record<string, string> = {
  global: 'Vue globale',
  accords: 'Accords',
  courriers: 'Courriers',
  missions: 'Missions',
  traductions: 'Traductions',
  demandes: 'Demandes',
  documents: 'Documents',
  glossaire: 'Glossaire',
};

export interface GenererRapportParams {
  periodeDebut: Date;
  periodeFin: Date;
  modules: string[];
  format: 'pdf' | 'excel';
  type: 'mensuel' | 'a_la_demande';
  userId?: number; // absent = généré par le cron
}

// ── Résout un utilisateur "système" pour les rapports générés par le cron ──
// documents.uploadePar est NOT NULL — un rapport automatique doit être
// attribué à quelqu'un. Premier super_admin trouvé, faute de mieux.
async function resoudreUtilisateurSysteme(): Promise<number> {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'super_admin'))
    .limit(1);

  if (!admin) {
    throw new Error(
      "Aucun super_admin trouvé — impossible d'attribuer un rapport généré automatiquement"
    );
  }
  return admin.id;
}

// ── Récupère les données de chaque module demandé ──────────────────────────
async function collecterDonnees(
  modules: string[],
  periode: { dateDebut: Date; dateFin: Date }
): Promise<Record<string, Record<string, unknown>>> {
  const resultat: Record<string, Record<string, unknown>> = {};

  for (const moduleCle of modules) {
    const serviceFn = SERVICE_PAR_MODULE[moduleCle];
    if (!serviceFn) throw new Error(`Module analytics inconnu : ${moduleCle}`);
    resultat[moduleCle] = await serviceFn(periode);
  }

  return resultat;
}

// ── PDF combiné — une section par module ───────────────────────────────────
function rendreSectionModuleHTML(moduleCle: string, data: Record<string, unknown>): string {
  const blocs = Object.entries(data)
    .map(([cle, valeur]) => {
      const lignes = normaliserEnLignes(valeur);
      if (lignes.length === 0) return '';

      const colonnes = Array.from(new Set(lignes.flatMap((l) => Object.keys(l))));
      const enTete = colonnes.map((c) => `<th>${humaniser(c)}</th>`).join('');
      const corps = lignes
        .map((l) => `<tr>${colonnes.map((c) => `<td>${l[c] ?? '—'}</td>`).join('')}</tr>`)
        .join('');

      return `
        <h3>${humaniser(cle)}</h3>
        <table><thead><tr>${enTete}</tr></thead><tbody>${corps}</tbody></table>
      `;
    })
    .join('');

  return `<h2>${LABELS_MODULE[moduleCle] ?? moduleCle}</h2>${blocs}`;
}

async function genererPDFRapport(
  dataParModule: Record<string, Record<string, unknown>>,
  periode: { dateDebut: Date; dateFin: Date }
): Promise<Buffer> {
  const periodeTexte = `${periode.dateDebut.toLocaleDateString('fr-FR')} — ${periode.dateFin.toLocaleDateString('fr-FR')}`;
  const corps = `
    <p class="sous-titre">Période : ${periodeTexte}</p>
    ${Object.entries(dataParModule)
      .map(([moduleCle, data]) => rendreSectionModuleHTML(moduleCle, data))
      .join('<div style="page-break-before: always;"></div>')}
  `;

  return genererPDFDepuisHTML(corps, { titre: 'Rapport Analytics SICOT' });
}

// ── Excel combiné — feuilles préfixées par module, noms dédupliqués ────────
async function genererExcelRapport(
  dataParModule: Record<string, Record<string, unknown>>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SICOT — ANAC Gabon';
  workbook.created = new Date();

  const nomsUtilises = new Set<string>();

  for (const [moduleCle, data] of Object.entries(dataParModule)) {
    for (const [cle, valeur] of Object.entries(data)) {
      const lignes = normaliserEnLignes(valeur);
      if (lignes.length === 0) continue;

      let nomFeuille = `${humaniser(moduleCle).slice(0, 10)} ${humaniser(cle).slice(0, 15)}`.slice(
        0,
        31
      );
      let suffixe = 1;
      while (nomsUtilises.has(nomFeuille)) {
        nomFeuille = `${nomFeuille.slice(0, 28)} (${++suffixe})`;
      }
      nomsUtilises.add(nomFeuille);

      const colonnes = Array.from(new Set(lignes.flatMap((l) => Object.keys(l))));
      const feuille = workbook.addWorksheet(nomFeuille);
      feuille.columns = colonnes.map((c) => ({ header: humaniser(c), key: c, width: 22 }));
      feuille.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A5E' } };
      });
      lignes.forEach((l) => feuille.addRow(l));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── SERVICE : Générer un rapport, l'archiver dans M8, l'historiser ─────────
export async function genererRapport(params: GenererRapportParams): Promise<{
  rapportId: number;
  documentId: number;
}> {
  const { periodeDebut, periodeFin, modules, format, type } = params;

  const dataParModule = await collecterDonnees(modules, {
    dateDebut: periodeDebut,
    dateFin: periodeFin,
  });

  const buffer =
    format === 'pdf'
      ? await genererPDFRapport(dataParModule, { dateDebut: periodeDebut, dateFin: periodeFin })
      : await genererExcelRapport(dataParModule);

  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  const mimeType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const dateStr = periodeFin.toISOString().slice(0, 10);
  const nomFichier = `rapport-analytics-${dateStr}-${Date.now()}.${extension}`;

  if (!fs.existsSync(DOSSIERS.rapport)) {
    fs.mkdirSync(DOSSIERS.rapport, { recursive: true });
  }
  const cheminFichier = path.join(DOSSIERS.rapport, nomFichier);
  fs.writeFileSync(cheminFichier, buffer);

  const uploadePar = params.userId ?? (await resoudreUtilisateurSysteme());

  const [document] = await db
    .insert(documents)
    .values({
      nom: nomFichier,
      nomOriginal: nomFichier,
      chemin: cheminFichier,
      mimeType,
      taille: buffer.length,
      categorie: 'rapport',
      statutOCR: 'traite', // pas d'OCR nécessaire — on l'a généré nous-mêmes
      hashMD5: calculerMD5(buffer),
      uploadePar,
    })
    .returning({ id: documents.id });

  const [rapport] = await db
    .insert(rapports)
    .values({
      type,
      periodeDebut,
      periodeFin,
      modulesInclus: modules,
      format,
      documentId: document.id,
      genereParUserId: params.userId ?? null,
    })
    .returning({ id: rapports.id });

  return { rapportId: rapport.id, documentId: document.id };
}

// ── SERVICE : Lister l'historique des rapports générés ─────────────────────
export async function listerRapports(): Promise<
  {
    id: number;
    type: string;
    periodeDebut: Date;
    periodeFin: Date;
    modulesInclus: string[];
    format: string;
    documentId: number;
    createdAt: Date;
    contenuIA: string | null;
    contenuIAValide: string | null;
    statutRelectureIA: string;
    moteurIA: string | null;
    relecteurIAId: number | null;
    relusLeIA: Date | null;
  }[]
> {
  const rows = await db.select().from(rapports).orderBy(desc(rapports.createdAt));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    periodeDebut: r.periodeDebut,
    periodeFin: r.periodeFin,
    modulesInclus: r.modulesInclus as string[],
    format: r.format,
    documentId: r.documentId,
    createdAt: r.createdAt,
    contenuIA: r.contenuIA,
    contenuIAValide: r.contenuIAValide,
    statutRelectureIA: r.statutRelectureIA,
    moteurIA: r.moteurIA,
    relecteurIAId: r.relecteurIAId,
    relusLeIA: r.relusLeIA,
  }));
}

// ── SERVICE : Récupérer un rapport avec son narratif IA éventuel ──────────
export async function getRapportById(id: number) {
  const [rapport] = await db.select().from(rapports).where(eq(rapports.id, id));
  if (!rapport) throw new Error('RAPPORT_INTROUVABLE');
  return rapport;
}

// ── SERVICE : Générer le narratif IA pour un rapport existant ─────────────
export async function genererAnalyseIA(
  rapportId: number,
  options?: { estAutomatique?: boolean }
): Promise<void> {
  const rapport = await getRapportById(rapportId);

  // La limite quotidienne (Layer 2) ne s'applique qu'aux déclenchements
  // humains — le cron mensuel (estAutomatique) n'est pas une "demande manuelle"
  if (!options?.estAutomatique) {
    const { autorise, utilises, max } = await verifierLimiteRapportsManuelsJour();
    if (!autorise) {
      throw new Error(`LIMITE_QUOTIDIENNE_ATTEINTE:${utilises}/${max}`);
    }
  }

  const modules = rapport.modulesInclus as string[];
  const periode = { dateDebut: rapport.periodeDebut, dateFin: rapport.periodeFin };
  const dataParModule = await collecterDonnees(modules, periode);

  let resultat;
  try {
    resultat = await genererNarratifIA(dataParModule, periode);
  } catch (err) {
    console.error(`❌ Échec génération analyse IA pour rapport #${rapportId} :`, err);
    throw err;
  }

  // Un message "activité insuffisante" est un texte fixe, déterministe, sans
  // risque interprétatif — pas besoin de relecture humaine, validé d'office
  const statut = resultat.insuffisant ? 'valide' : 'en_attente';

  await db
    .update(rapports)
    .set({
      contenuIA: resultat.texte,
      contenuIAValide: resultat.insuffisant ? resultat.texte : null,
      moteurIA: resultat.modeleUtilise,
      statutRelectureIA: statut,
    })
    .where(eq(rapports.id, rapportId));

  if (!options?.estAutomatique) {
    await incrementerRapportsManuelsJour();
  }
}

// ── SERVICE : Valider ou rejeter le narratif IA (Admin minimum) ──────────
export async function validerOuRejeterAnalyseIA(
  rapportId: number,
  params: { statutRelectureIA: 'valide' | 'rejete'; contenuIAValide?: string; relecteurId: number }
): Promise<void> {
  const rapport = await getRapportById(rapportId);
  if (rapport.statutRelectureIA !== 'en_attente') {
    throw new Error('DEJA_TRAITE');
  }

  await db
    .update(rapports)
    .set({
      statutRelectureIA: params.statutRelectureIA,
      contenuIAValide:
        params.statutRelectureIA === 'valide'
          ? (params.contenuIAValide ?? rapport.contenuIA)
          : null,
      relecteurIAId: params.relecteurId,
      relusLeIA: new Date(),
    })
    .where(eq(rapports.id, rapportId));

  await logAudit({
    userId: params.relecteurId,
    action: params.statutRelectureIA === 'valide' ? 'RAPPORT_IA_VALIDE' : 'RAPPORT_IA_REJETE',
    module: 'M11',
    entiteId: rapportId,
    details: {},
  });
}
