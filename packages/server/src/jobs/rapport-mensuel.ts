import cron from 'node-cron';
import { genererAnalyseIA, genererRapport } from '@/modules/report/services/rapports.service';

const TOUS_LES_MODULES = [
  'global',
  'accords',
  'courriers',
  'missions',
  'traductions',
  'demandes',
  'documents',
  'glossaire',
];

// ── Génère le rapport du mois précédent, PDF + Excel ────────────────────
export async function genererRapportMensuel(): Promise<{ pdf: number; excel: number }> {
  const maintenant = new Date();
  const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const finMoisPrecedent = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  const pdf = await genererRapport({
    periodeDebut: debutMoisPrecedent,
    periodeFin: finMoisPrecedent,
    modules: TOUS_LES_MODULES,
    format: 'pdf',
    type: 'mensuel',
  });

  const excel = await genererRapport({
    periodeDebut: debutMoisPrecedent,
    periodeFin: finMoisPrecedent,
    modules: TOUS_LES_MODULES,
    format: 'excel',
    type: 'mensuel',
  });

  // Analyse IA tentée sur le rapport PDF uniquement — jamais bloquante
  try {
    await genererAnalyseIA(pdf.rapportId, { estAutomatique: true });
  } catch (err) {
    console.warn('⚠️ Analyse IA du rapport mensuel non générée :', err);
  }

  return { pdf: pdf.documentId, excel: excel.documentId };
}

// ── Planification — 1er du mois à 06h00 ────────────────────────────────────
export function demarrerJobRapportMensuel(): void {
  cron.schedule('0 6 1 * *', async () => {
    console.log('📊 Génération du rapport mensuel automatique...');
    await genererRapportMensuel();
  });

  console.log('📅 Rapport mensuel planifié le 1er de chaque mois à 06h00');
}
