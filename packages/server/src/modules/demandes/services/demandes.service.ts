/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from '@/db/index.js';
import { demandesTraduction, traductions, documents, users } from '@/db/schema';
import { eq, and, desc, isNull, isNotNull } from 'drizzle-orm';
import { logAudit } from '@/modules/auth/services/auth.service.js';
import { lancerTraduction } from '../../traduction/services/traduction.service';
import type { TraductionDirection } from '@/utils/traduction.js';

// ── Types ──────────────────────────────────────────────────────────────────
export type DemandeStatut = 'soumise' | 'en_cours' | 'en_relecture' | 'validee' | 'archivee';

export type DemandePriorite = 'normale' | 'urgente';

export interface DemandeView {
  id: number;
  demandeurId: number;
  demandeurNom?: string;
  traducteurId?: number;
  traducteurNom?: string;
  documentId?: number;
  documentNom?: string;
  texteLibre?: string;
  direction: TraductionDirection;
  prioriteDemandee: DemandePriorite;
  prioriteValidee?: DemandePriorite;
  statut: DemandeStatut;
  traductionId?: number;
  verrou: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreerDemandeParams {
  demandeurId: number;
  documentId?: number;
  texteLibre?: string;
  direction: TraductionDirection;
  priorite: DemandePriorite;
}

export interface DemandeFilters {
  statut?: DemandeStatut;
  priorite?: DemandePriorite;
  demandeurId?: number;
  traducteurId?: number;
  page?: number;
  pageSize?: number;
}

// ── Utilitaire ─────────────────────────────────────────────────────────────
async function toDemandeView(d: typeof demandesTraduction.$inferSelect): Promise<DemandeView> {
  // Charger demandeur
  let demandeurNom: string | undefined;
  if (d.demandeurId) {
    const [u] = await db
      .select({ nom: users.nom, prenom: users.prenom })
      .from(users)
      .where(eq(users.id, d.demandeurId));
    if (u) demandeurNom = `${u.prenom} ${u.nom}`;
  }

  // Charger traducteur
  let traducteurNom: string | undefined;
  if (d.traducteurId) {
    const [u] = await db
      .select({ nom: users.nom, prenom: users.prenom })
      .from(users)
      .where(eq(users.id, d.traducteurId));
    if (u) traducteurNom = `${u.prenom} ${u.nom}`;
  }

  // Charger nom document
  let documentNom: string | undefined;
  if (d.documentId) {
    const [doc] = await db
      .select({ nomOriginal: documents.nomOriginal })
      .from(documents)
      .where(eq(documents.id, d.documentId));
    if (doc) documentNom = doc.nomOriginal;
  }

  return {
    id: d.id,
    demandeurId: d.demandeurId,
    demandeurNom,
    traducteurId: d.traducteurId ?? undefined,
    traducteurNom,
    documentId: d.documentId ?? undefined,
    documentNom,
    texteLibre: d.texteLibre ?? undefined,
    direction: d.direction as TraductionDirection,
    prioriteDemandee: d.prioriteDemandee as DemandePriorite,
    prioriteValidee: d.prioriteValidee as DemandePriorite | undefined,
    statut: d.statut as DemandeStatut,
    traductionId: d.traductionId ?? undefined,
    verrou: d.verrou,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

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
  if (filters.demandeurId) conditions.push(eq(demandesTraduction.demandeurId, filters.demandeurId));
  if (filters.traducteurId)
    conditions.push(eq(demandesTraduction.traducteurId, filters.traducteurId));

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

// ── Utilitaire interne : récupérer le texte d'un document ────────────────
async function getTexteDocument(documentId: number): Promise<string> {
  const [doc] = await db
    .select({ texteExtrait: documents.texteExtrait })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc?.texteExtrait) throw new Error('DOCUMENT_SANS_TEXTE_OCR');
  return doc.texteExtrait;
}
