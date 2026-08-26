import { db } from '@/db/index.js';
import { demandesTraduction, documents, users } from '@/db/schema';
import { eq, and, or, ilike, inArray, desc } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { lancerTraduction } from '../../traduction/services/traduction.service';
import type { TraductionDirection } from '@/utils/traduction.js';
import { toDemandeView, getTexteDocument } from './demandes.helpers';
import type {
  DemandeStatut,
  DemandePriorite,
  DemandeView,
  CreerDemandeParams,
  DemandeFilters,
  DemandesAggregates,
} from './demandes.types';

export type {
  DemandeStatut,
  DemandePriorite,
  DemandeView,
  CreerDemandeParams,
  DemandeFilters,
  DemandesAggregates,
} from './demandes.types';

// ── SERVICE : Créer une demande ───────────────────────────────────────────
export async function creerDemande(params: CreerDemandeParams): Promise<DemandeView> {
  if (!params.documentId && !params.texteLibre) {
    throw new Error('CONTENU_REQUIS');
  }

  // Si document, vérifier qu'il existe et a un texte extrait
  if (params.documentId) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, params.documentId));

    if (!doc) throw new Error('DOCUMENT_INTROUVABLE');
    if (!doc.texteExtrait) throw new Error('DOCUMENT_SANS_TEXTE_OCR');
  }

  const [demande] = await db
    .insert(demandesTraduction)
    .values({
      demandeurId: params.demandeurId,
      documentId: params.documentId,
      texteLibre: params.texteLibre,
      direction: params.direction,
      prioriteDemandee: params.priorite,
      statut: 'soumise',
      verrou: false,
    })
    .returning();

  await logAudit({
    userId: params.demandeurId,
    action: 'DEMANDE_CREEE',
    module: 'M5',
    entiteId: demande.id,
    details: { direction: params.direction, priorite: params.priorite },
  });

  return toDemandeView(demande);
}

// ── SERVICE : Lister les demandes ─────────────────────────────────────────
export async function listerDemandes(filters: DemandeFilters): Promise<{
  data: DemandeView[];
  total: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.statut) conditions.push(eq(demandesTraduction.statut, filters.statut));
  if (filters.priorite) conditions.push(eq(demandesTraduction.prioriteDemandee, filters.priorite));
  if (filters.direction) conditions.push(eq(demandesTraduction.direction, filters.direction));
  if (filters.demandeurId) conditions.push(eq(demandesTraduction.demandeurId, filters.demandeurId));
  if (filters.traducteurId)
    conditions.push(eq(demandesTraduction.traducteurId, filters.traducteurId));

  // Recherche : demandeur/traducteur (par nom/prénom), document (par nom) ou texte libre.
  // Résolue en IDs candidats plutôt que via jointure, pour rester simple sur une table
  // de taille modeste — cohérent avec le reste du module (pas de jointure en lecture).
  if (filters.search) {
    const terme = `%${filters.search}%`;
    const [utilisateurs, docs] = await Promise.all([
      db
        .select({ id: users.id })
        .from(users)
        .where(or(ilike(users.nom, terme), ilike(users.prenom, terme))),
      db.select({ id: documents.id }).from(documents).where(ilike(documents.nomOriginal, terme)),
    ]);
    const userIds = utilisateurs.map((u) => u.id);
    const docIds = docs.map((d) => d.id);

    const searchConditions = [ilike(demandesTraduction.texteLibre, terme)];
    if (userIds.length > 0) {
      searchConditions.push(inArray(demandesTraduction.demandeurId, userIds));
      searchConditions.push(inArray(demandesTraduction.traducteurId, userIds));
    }
    if (docIds.length > 0) {
      searchConditions.push(inArray(demandesTraduction.documentId, docIds));
    }
    conditions.push(or(...searchConditions)!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(demandesTraduction)
    .where(where)
    .orderBy(desc(demandesTraduction.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(demandesTraduction, where);
  const data = await Promise.all(rows.map(toDemandeView));

  return { data, total };
}

// ── SERVICE : Agrégats globaux (indépendants de la pagination/des filtres) ─
// demandeurId optionnel — quand fourni, tous les comptes sont restreints aux
// demandes de cet utilisateur (ex. l'espace de travail agent "Mon espace").
export async function getDemandesAggregates(demandeurId?: number): Promise<DemandesAggregates> {
  const scope = demandeurId !== undefined ? eq(demandesTraduction.demandeurId, demandeurId) : undefined;
  const withStatut = (statut: DemandeStatut) =>
    scope ? and(eq(demandesTraduction.statut, statut), scope) : eq(demandesTraduction.statut, statut);
  const withPriorite = (priorite: DemandePriorite) =>
    scope
      ? and(eq(demandesTraduction.prioriteDemandee, priorite), scope)
      : eq(demandesTraduction.prioriteDemandee, priorite);

  const [total, aAssigner, enCours, enRelecture, validees, archivees, urgentes, normales] = await Promise.all([
    db.$count(demandesTraduction, scope),
    db.$count(demandesTraduction, withStatut('soumise')),
    db.$count(demandesTraduction, withStatut('en_cours')),
    db.$count(demandesTraduction, withStatut('en_relecture')),
    db.$count(demandesTraduction, withStatut('validee')),
    db.$count(demandesTraduction, withStatut('archivee')),
    db.$count(demandesTraduction, withPriorite('urgente')),
    db.$count(demandesTraduction, withPriorite('normale')),
  ]);

  return { total, aAssigner, enCours, enRelecture, validees, archivees, urgentes, normales };
}

// ── SERVICE : Vérifier qu'un utilisateur est demandeur d'une traduction ───
// Utilisé par le module traduction pour autoriser un agent à lire *sa
// propre* traduction (GET /traductions/:id) sans lui ouvrir tout le module.
export async function estDemandeurDeTraduction(
  traductionId: number,
  userId: number
): Promise<boolean> {
  const [demande] = await db
    .select({ id: demandesTraduction.id })
    .from(demandesTraduction)
    .where(
      and(eq(demandesTraduction.traductionId, traductionId), eq(demandesTraduction.demandeurId, userId))
    );

  return !!demande;
}

// ── SERVICE : Récupérer une demande ───────────────────────────────────────
export async function getDemande(id: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');
  return toDemandeView(demande);
}

// ── SERVICE : Prendre en charge une demande ───────────────────────────────
// Auto-assignation avec verrou BDD — premier arrivé premier servi
export async function prendreEnCharge(id: number, userId: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');
  if (demande.statut !== 'soumise') throw new Error('DEMANDE_NON_DISPONIBLE');
  if (demande.verrou) throw new Error('DEMANDE_VERROUILEE');

  // Poser le verrou atomiquement
  const [updated] = await db
    .update(demandesTraduction)
    .set({
      traducteurId: userId,
      statut: 'en_cours',
      verrou: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(demandesTraduction.id, id),
        eq(demandesTraduction.verrou, false) // Condition atomique anti-doublon
      )
    )
    .returning();

  if (!updated) throw new Error('DEMANDE_VERROUILEE');

  // Lancer la traduction IA automatiquement
  try {
    const texteOriginal = demande.texteLibre ?? (await getTexteDocument(demande.documentId!));

    const traduction = await lancerTraduction({
      documentId: demande.documentId ?? undefined,
      texteOriginal,
      direction: demande.direction as TraductionDirection,
      userId,
    });

    // Lier la traduction à la demande
    await db
      .update(demandesTraduction)
      .set({ traductionId: traduction.id, updatedAt: new Date() })
      .where(eq(demandesTraduction.id, id));

    updated.traductionId = traduction.id;
  } catch (error) {
    console.warn('[demandes] Lancement traduction IA échoué:', error);
    // Non bloquant — la demande reste en_cours, traduction manuelle possible
  }

  await logAudit({
    userId,
    action: 'DEMANDE_PRISE_EN_CHARGE',
    module: 'M5',
    entiteId: id,
  });

  return toDemandeView(updated);
}

// ── SERVICE : Rappel demande par le demandeur ─────────────────────────────
// Possible uniquement si statut 'soumise' (non prise en charge)
export async function rappelerDemande(id: number, userId: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');

  if (demande.demandeurId !== userId) {
    throw new Error('DEMANDE_NON_AUTORISEE');
  }
  if (demande.statut !== 'soumise') {
    throw new Error('DEMANDE_DEJA_PRISE');
  }

  // Annuler la demande — le demandeur peut la recréer
  const [updated] = await db
    .update(demandesTraduction)
    .set({ statut: 'archivee', updatedAt: new Date() })
    .where(eq(demandesTraduction.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DEMANDE_RAPPELEE',
    module: 'M5',
    entiteId: id,
  });

  return toDemandeView(updated);
}

// ── SERVICE : Valider une priorité ────────────────────────────────────────
export async function validerPriorite(
  id: number,
  priorite: DemandePriorite,
  userId: number
): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');

  const [updated] = await db
    .update(demandesTraduction)
    .set({ prioriteValidee: priorite, updatedAt: new Date() })
    .where(eq(demandesTraduction.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DEMANDE_PRIORITE_VALIDEE',
    module: 'M5',
    entiteId: id,
    details: { priorite },
  });

  return toDemandeView(updated);
}

// ── SERVICE : Passer en relecture ─────────────────────────────────────────
export async function passerEnRelecture(id: number, userId: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');
  if (demande.statut !== 'en_cours') throw new Error('DEMANDE_STATUT_INVALIDE');
  if (demande.traducteurId !== userId) throw new Error('DEMANDE_NON_AUTORISEE');

  const [updated] = await db
    .update(demandesTraduction)
    .set({ statut: 'en_relecture', updatedAt: new Date() })
    .where(eq(demandesTraduction.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DEMANDE_EN_RELECTURE',
    module: 'M5',
    entiteId: id,
  });

  return toDemandeView(updated);
}

// ── SERVICE : Valider une demande ─────────────────────────────────────────
export async function validerDemande(id: number, userId: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');
  if (demande.statut !== 'en_relecture') throw new Error('DEMANDE_STATUT_INVALIDE');

  const [updated] = await db
    .update(demandesTraduction)
    .set({ statut: 'validee', updatedAt: new Date() })
    .where(eq(demandesTraduction.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DEMANDE_VALIDEE',
    module: 'M5',
    entiteId: id,
  });

  return toDemandeView(updated);
}

// ── SERVICE : Archiver une demande ────────────────────────────────────────
export async function archiverDemande(id: number, userId: number): Promise<DemandeView> {
  const [demande] = await db.select().from(demandesTraduction).where(eq(demandesTraduction.id, id));

  if (!demande) throw new Error('DEMANDE_INTROUVABLE');
  if (demande.statut !== 'validee') throw new Error('DEMANDE_STATUT_INVALIDE');

  const [updated] = await db
    .update(demandesTraduction)
    .set({ statut: 'archivee', updatedAt: new Date() })
    .where(eq(demandesTraduction.id, id))
    .returning();

  await logAudit({
    userId,
    action: 'DEMANDE_ARCHIVEE',
    module: 'M5',
    entiteId: id,
  });

  return toDemandeView(updated);
}
