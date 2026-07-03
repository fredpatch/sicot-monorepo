import cron from 'node-cron';
import { db } from '@/db/index.js';
import { courriersCriticiteSnapshots } from '@/db/schema';
import { getValeurEntier } from '@/modules/parametres/services/parametres.service.js';
import { sql } from 'drizzle-orm';

// ── Capturer l'état de criticité du jour ───────────────────────────────────
// Reproduit la logique de calculerCriticite() (courriers.helpers.ts) en SQL
// pur plutôt qu'en itérant ligne par ligne — même règles, en une requête.
export async function snapshotCriticiteCourriers(): Promise<{
  date: string;
  normal: number;
  aSurveiller: number;
  critique: number;
  totalEnAttente: number;
}> {
  const seuilSurveiller = await getValeurEntier('courrier_alerte_jours', 60);
  const seuilCritique = await getValeurEntier('courrier_alerte_critique_jours', 90);

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE jours_attente < ${seuilSurveiller}) AS normal,
      COUNT(*) FILTER (WHERE jours_attente >= ${seuilSurveiller} AND jours_attente < ${seuilCritique}) AS a_surveiller,
      COUNT(*) FILTER (WHERE jours_attente >= ${seuilCritique}) AS critique,
      COUNT(*) AS total_en_attente
    FROM (
      SELECT EXTRACT(DAY FROM (NOW() - date_reception)) AS jours_attente
      FROM courriers
      WHERE direction = 'entrant' AND reponse_requise = 'oui' AND suivi_statut = 'en_attente'
    ) sub
  `);

  const row = result.rows[0] as {
    normal: string;
    a_surveiller: string;
    critique: string;
    total_en_attente: string;
  };

  const aujourdHui = new Date().toISOString().slice(0, 10);

  const snapshot = {
    date: aujourdHui,
    normal: parseInt(row.normal),
    aSurveiller: parseInt(row.a_surveiller),
    critique: parseInt(row.critique),
    totalEnAttente: parseInt(row.total_en_attente),
  };

  // Idempotent — un job manuel relancé le même jour écrase, ne duplique pas
  await db
    .insert(courriersCriticiteSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: courriersCriticiteSnapshots.date,
      set: {
        normal: snapshot.normal,
        aSurveiller: snapshot.aSurveiller,
        critique: snapshot.critique,
        totalEnAttente: snapshot.totalEnAttente,
      },
    });

  return snapshot;
}

// ── Planification quotidienne ──────────────────────────────────────────────
export function demarrerJobSnapshotCriticite(): void {
  cron.schedule('55 23 * * *', async () => {
    console.log('📸 Capture criticité courriers du jour...');
    await snapshotCriticiteCourriers();
  });

  console.log('📅 Snapshot criticité courriers planifié à 23h55 quotidiennement');
}
