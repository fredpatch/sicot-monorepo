import ExcelJS from 'exceljs';

// ── Humanise une clé camelCase en libellé lisible ──────────────────────────
export function humaniser(cle: string): string {
  return cle
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ── Normalise n'importe quelle forme de section en lignes de tableau ───────
// Tableau d'objets → une ligne par élément. Objet simple → une seule ligne.
// Primitif/null → une ligne à une colonne.
export function normaliserEnLignes(valeur: unknown): Record<string, unknown>[] {
  if (Array.isArray(valeur)) {
    return valeur.map((item) =>
      typeof item === 'object' && item !== null
        ? (item as Record<string, unknown>)
        : { valeur: item }
    );
  }
  if (typeof valeur === 'object' && valeur !== null) {
    return [valeur as Record<string, unknown>];
  }
  return [{ valeur }];
}

function csvEchapper(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '';
  const s = String(valeur);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Export Excel — un onglet par métrique du module ────────────────────────
export async function genererExcelAnalytics(data: Record<string, unknown>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SICOT — ANAC Gabon';
  workbook.created = new Date();

  for (const [cle, valeur] of Object.entries(data)) {
    const lignes = normaliserEnLignes(valeur);
    if (lignes.length === 0) continue;

    const colonnes = Array.from(new Set(lignes.flatMap((l) => Object.keys(l))));
    // Excel limite les noms de feuille à 31 caractères
    const feuille = workbook.addWorksheet(humaniser(cle).slice(0, 31));

    feuille.columns = colonnes.map((c) => ({ header: humaniser(c), key: c, width: 22 }));
    feuille.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A5E' } };
    });

    lignes.forEach((l) => feuille.addRow(l));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── Export CSV — sections séparées par une ligne vide ──────────────────────
// Moins pratique qu'Excel pour du multi-tableau, mais certains outils
// n'ouvrent que du CSV — offert en option légère plutôt qu'imposé.
export function genererCSVAnalytics(data: Record<string, unknown>): string {
  const sections: string[] = [];

  for (const [cle, valeur] of Object.entries(data)) {
    const lignes = normaliserEnLignes(valeur);
    if (lignes.length === 0) continue;

    const colonnes = Array.from(new Set(lignes.flatMap((l) => Object.keys(l))));
    const enTete = colonnes.map(humaniser).join(',');
    const corps = lignes.map((l) => colonnes.map((c) => csvEchapper(l[c])).join(',')).join('\n');

    sections.push(`${humaniser(cle)}\n${enTete}\n${corps}`);
  }

  return sections.join('\n\n');
}
