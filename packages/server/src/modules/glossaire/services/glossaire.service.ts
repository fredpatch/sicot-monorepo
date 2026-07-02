import { db } from '@/db/index.js';
import { glossaire, glossaireHistorique, users } from '@/db/schema';
import { eq, ilike, and, or, desc, asc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service';
import { toTermeView } from './glossaire.helpers';
import type {
  CreateTermeParams,
  UpdateTermeParams,
  GlossaireFilters,
  HistoriqueEntry,
  TermeView,
} from './glossaire.types';

export type {
  CreateTermeParams,
  UpdateTermeParams,
  GlossaireFilters,
  HistoriqueEntry,
  TermeView,
} from './glossaire.types';

// ── SERVICE : Lister les termes ────────────────────────────────────────────
export async function listerTermes(filters: GlossaireFilters): Promise<{
  data: TermeView[];
  total: number;
  domaines: string[];
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(glossaire.termeFr, `%${filters.search}%`),
        ilike(glossaire.termeEn, `%${filters.search}%`),
        ilike(glossaire.domaine, `%${filters.search}%`)
      )
    );
  }

  if (filters.domaine) {
    conditions.push(ilike(glossaire.domaine, `%${filters.domaine}%`));
  }

  // Par défaut on affiche seulement les termes actifs
  const actifFilter = filters.actif !== undefined ? filters.actif : true;
  conditions.push(eq(glossaire.actif, actifFilter));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(glossaire)
    .where(where)
    .orderBy(asc(glossaire.termeFr))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(glossaire, where);

  // Récupérer les domaines distincts pour le filtre
  const domainesRows = await db
    .selectDistinct({ domaine: glossaire.domaine })
    .from(glossaire)
    .where(eq(glossaire.actif, true));

  const domaines = domainesRows
    .map((r) => r.domaine)
    .filter((d): d is string => !!d)
    .sort();

  return { data: rows.map(toTermeView), total, domaines };
}

// ── SERVICE : Récupérer un terme par ID ────────────────────────────────────
export async function getTerme(id: number): Promise<TermeView> {
  const [terme] = await db.select().from(glossaire).where(eq(glossaire.id, id));

  if (!terme) throw new Error('TERME_INTROUVABLE');

  // Charger l'historique
  const historiqueRows = await db
    .select({
      id: glossaireHistorique.id,
      ancienTermeFr: glossaireHistorique.ancienTermeFr,
      ancienTermeEn: glossaireHistorique.ancienTermeEn,
      modifiePar: glossaireHistorique.modifiePar,
      nom: users.nom,
      prenom: users.prenom,
      createdAt: glossaireHistorique.createdAt,
    })
    .from(glossaireHistorique)
    .leftJoin(users, eq(glossaireHistorique.modifiePar, users.id))
    .where(eq(glossaireHistorique.termeId, id))
    .orderBy(desc(glossaireHistorique.createdAt));

  const historique: HistoriqueEntry[] = historiqueRows.map((h) => ({
    id: h.id,
    ancienTermeFr: h.ancienTermeFr ?? undefined,
    ancienTermeEn: h.ancienTermeEn ?? undefined,
    modifiePar: h.modifiePar ?? undefined,
    modifieParNom: h.nom && h.prenom ? `${h.prenom} ${h.nom}` : undefined,
    createdAt: h.createdAt,
  }));

  return { ...toTermeView(terme), historique };
}

// ── SERVICE : Créer un terme ───────────────────────────────────────────────
export async function creerTerme(params: CreateTermeParams): Promise<TermeView> {
  const [terme] = await db
    .insert(glossaire)
    .values({
      termeFr: params.termeFr,
      termeEn: params.termeEn,
      domaine: params.domaine,
      contexte: params.contexte,
      actif: true,
      createdPar: params.createdByUserId,
    })
    .returning();

  await logAudit({
    userId: params.createdByUserId,
    action: 'TERME_CREE',
    module: 'M7',
    entiteId: terme.id,
    details: { termeFr: params.termeFr, termeEn: params.termeEn },
  });

  return toTermeView(terme);
}

// ── SERVICE : Mettre à jour un terme ──────────────────────────────────────
export async function mettreAJourTerme(id: number, params: UpdateTermeParams): Promise<TermeView> {
  const [existant] = await db.select().from(glossaire).where(eq(glossaire.id, id));

  if (!existant) throw new Error('TERME_INTROUVABLE');

  // Sauvegarder l'historique avant modification
  if (params.termeFr !== undefined || params.termeEn !== undefined) {
    await db.insert(glossaireHistorique).values({
      termeId: id,
      ancienTermeFr: existant.termeFr,
      ancienTermeEn: existant.termeEn,
      modifiePar: params.updatedByUserId,
    });
  }

  const updates: Partial<typeof glossaire.$inferInsert> = {};
  if (params.termeFr !== undefined) updates.termeFr = params.termeFr;
  if (params.termeEn !== undefined) updates.termeEn = params.termeEn;
  if (params.domaine !== undefined) updates.domaine = params.domaine;
  if (params.contexte !== undefined) updates.contexte = params.contexte;
  if (params.actif !== undefined) updates.actif = params.actif;

  const [updated] = await db
    .update(glossaire)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(glossaire.id, id))
    .returning();

  await logAudit({
    userId: params.updatedByUserId,
    action: 'TERME_MODIFIE',
    module: 'M7',
    entiteId: id,
    details: updates,
  });

  return toTermeView(updated);
}

// ── SERVICE : Désactiver un terme ─────────────────────────────────────────
// Jamais supprimé — marqué inactif, retiré des suggestions M6
export async function desactiverTerme(id: number, userId: number): Promise<TermeView> {
  const [existant] = await db.select().from(glossaire).where(eq(glossaire.id, id));

  if (!existant) throw new Error('TERME_INTROUVABLE');

  const [updated] = await db
    .update(glossaire)
    .set({ actif: false, updatedAt: new Date() })
    .where(eq(glossaire.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'TERME_DESACTIVE',
    module: 'M7',
    entiteId: id,
    details: { termeFr: existant.termeFr },
  });

  return toTermeView(updated);
}

// ── SERVICE : Suggestions pour l'éditeur M6 ───────────────────────────────
// Recherche rapide par préfixe — utilisé par l'éditeur de traduction
export async function suggererTermes(texte: string, limite: number = 5): Promise<TermeView[]> {
  const rows = await db
    .select()
    .from(glossaire)
    .where(
      and(
        eq(glossaire.actif, true),
        or(ilike(glossaire.termeFr, `%${texte}%`), ilike(glossaire.termeEn, `%${texte}%`))
      )
    )
    .orderBy(asc(glossaire.termeFr))
    .limit(limite);

  return rows.map(toTermeView);
}

// ── SERVICE : Import CSV/Excel ─────────────────────────────────────────────
// Utilisé par le script de seed initial CCIT
export async function importerTermes(
  termes: Array<{ termeFr: string; termeEn: string; domaine?: string; contexte?: string }>,
  userId: number
): Promise<{ importes: number; ignores: number }> {
  let importes = 0;
  let ignores = 0;

  for (const t of termes) {
    if (!t.termeFr || !t.termeEn) {
      ignores++;
      continue;
    }

    // Vérifier doublon exact
    const [existant] = await db
      .select()
      .from(glossaire)
      .where(and(ilike(glossaire.termeFr, t.termeFr), ilike(glossaire.termeEn, t.termeEn)));

    if (existant) {
      ignores++;
      continue;
    }

    await db.insert(glossaire).values({
      termeFr: t.termeFr.trim(),
      termeEn: t.termeEn.trim(),
      domaine: t.domaine?.trim(),
      contexte: t.contexte?.trim(),
      actif: true,
      createdPar: userId,
    });

    importes++;
  }

  await logAudit({
    userId,
    action: 'GLOSSAIRE_IMPORTE',
    module: 'M7',
    details: { importes, ignores },
  });

  return { importes, ignores };
}
