import { eq } from 'drizzle-orm';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { db } from '@/db/index.js';
import { demandesTraduction, users } from '@/db/schema';
import { genererPDFFiche, echapperHTML } from '@/utils/pdf.js';
import { masthead, sectionBox, deuxColonnes, grilleInfos, badge, type BadgeCouleur } from '@/utils/ficheHTML.js';
import type { TraductionView, TraductionStatut } from './traduction.types';

const LABELS_STATUT: Record<TraductionStatut, string> = {
  a_reviser: 'À réviser',
  en_relecture: 'En relecture',
  approuvee: 'Approuvée',
  archivee: 'Archivée',
  manuelle_requise: 'Manuelle requise',
};

const COULEURS_STATUT: Record<TraductionStatut, BadgeCouleur> = {
  a_reviser: 'gris',
  en_relecture: 'ambre',
  approuvee: 'vert',
  archivee: 'gris',
  manuelle_requise: 'rouge',
};

// ── Demandeur d'origine — recherche inverse depuis demandes_traduction,
// aucun champ direct sur traductions. Optionnel : une traduction lancée
// hors du workflow Demandes (texte libre admin) n'en a pas. ────────────────
async function getDemandeurOrigine(
  traductionId: number
): Promise<{ nom: string; prenom: string } | undefined> {
  const [row] = await db
    .select({ nom: users.nom, prenom: users.prenom })
    .from(demandesTraduction)
    .innerJoin(users, eq(users.id, demandesTraduction.demandeurId))
    .where(eq(demandesTraduction.traductionId, traductionId));

  return row;
}

function directionLabel(direction: string): string {
  return direction === 'fr_en' ? 'Français → Anglais' : 'Anglais → Français';
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

// ── Export PDF — fiche institutionnelle, même gabarit que accords/courriers/
// missions. Le texte affiché est texteFinal (corrigé) s'il existe, sinon
// texteIA (traduction brute) — jamais un texte inventé. ────────────────────
export async function genererPDFTraduction(traduction: TraductionView): Promise<Buffer> {
  const demandeur = await getDemandeurOrigine(traduction.id);
  const texte = traduction.texteFinal ?? traduction.texteIA;

  const infosHTML = grilleInfos([
    { label: 'Direction', valeur: echapperHTML(directionLabel(traduction.direction)) },
    { label: 'Statut', valeur: badge(LABELS_STATUT[traduction.statut], COULEURS_STATUT[traduction.statut]) },
    { label: 'Demandeur', valeur: demandeur ? echapperHTML(`${demandeur.prenom} ${demandeur.nom}`) : '—' },
    { label: 'Dernière mise à jour', valeur: echapperHTML(formatDateHeure(traduction.updatedAt)) },
  ]);

  const texteSourceHTML = `<p style="white-space:pre-wrap; font-size:9.5px; line-height:1.6; margin:0;">${echapperHTML(traduction.texteOriginal ?? '—')}</p>`;
  const texteTraduitHTML = `<p style="white-space:pre-wrap; font-size:9.5px; line-height:1.6; margin:0;">${echapperHTML(texte ?? '—')}</p>`;

  const corps = `
    ${masthead({
      typeDocument: 'Traduction',
      titre: `Traduction #${traduction.id}`,
      sousTitre: directionLabel(traduction.direction),
    })}
    ${sectionBox({ titre: 'Informations', contenu: infosHTML })}
    ${deuxColonnes(
      sectionBox({ titre: 'Texte source', contenu: texteSourceHTML }),
      sectionBox({ titre: 'Texte traduit', contenu: texteTraduitHTML })
    )}
  `;

  return genererPDFFiche(corps);
}

// ── Export DOCX — texte traduit seul, éditable localement par l'utilisateur.
// Pas de mise en page institutionnelle complexe : l'objectif est un document
// que l'agent peut rouvrir/modifier sur son poste, pas une fiche officielle
// (celle-ci existe déjà en PDF ci-dessus). ──────────────────────────────────
export async function genererDOCXTraduction(traduction: TraductionView): Promise<Buffer> {
  const demandeur = await getDemandeurOrigine(traduction.id);
  const texte = traduction.texteFinal ?? traduction.texteIA ?? '';

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(`Traduction #${traduction.id}`)],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${directionLabel(traduction.direction)} — ${LABELS_STATUT[traduction.statut]}`,
                italics: true,
                color: '6b7280',
              }),
            ],
          }),
          ...(demandeur
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Demandeur : ${demandeur.prenom} ${demandeur.nom}`,
                      italics: true,
                      color: '6b7280',
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({ text: '' }),
          ...texte.split(/\n{2,}/).map(
            (paragraphe) =>
              new Paragraph({
                children: [new TextRun(paragraphe.replace(/\n/g, ' '))],
                spacing: { after: 200 },
              })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
