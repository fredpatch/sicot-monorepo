import { db } from '@/db/index.js';
import { demandesTraduction, documents, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { TraductionDirection } from '@/utils/traduction.js';
import type { DemandeView, DemandeStatut, DemandePriorite } from './demandes.types';

export async function toDemandeView(d: typeof demandesTraduction.$inferSelect): Promise<DemandeView> {
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

// ── Utilitaire interne : récupérer le texte d'un document ────────────────
export async function getTexteDocument(documentId: number): Promise<string> {
  const [doc] = await db
    .select({ texteExtrait: documents.texteExtrait })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc?.texteExtrait) throw new Error('DOCUMENT_SANS_TEXTE_OCR');
  return doc.texteExtrait;
}
