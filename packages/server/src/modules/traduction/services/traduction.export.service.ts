import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  ImageRun,
} from 'docx';
import { db } from '@/db/index.js';
import { demandesTraduction, users } from '@/db/schema';
import { genererPDFFiche, echapperHTML } from '@/utils/pdf.js';
import { masthead, sectionBox, grilleInfos, badge, type BadgeCouleur } from '@/utils/ficheHTML.js';
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

const ANAC_NAVY = '1B2A5E';

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
// texteIA (traduction brute) — jamais un texte inventé. Source et traduction
// occupent chacune la pleine largeur (pas de mise en colonnes côte à côte),
// la traduction démarre sur une nouvelle page. ─────────────────────────────
export async function genererPDFTraduction(traduction: TraductionView): Promise<Buffer> {
  const demandeur = await getDemandeurOrigine(traduction.id);
  const texte = traduction.texteFinal ?? traduction.texteIA;

  const infosHTML = grilleInfos([
    { label: 'Direction', valeur: echapperHTML(directionLabel(traduction.direction)) },
    { label: 'Statut', valeur: badge(LABELS_STATUT[traduction.statut], COULEURS_STATUT[traduction.statut]) },
    { label: 'Demandeur', valeur: demandeur ? echapperHTML(`${demandeur.prenom} ${demandeur.nom}`) : '—' },
    { label: 'Dernière mise à jour', valeur: echapperHTML(formatDateHeure(traduction.updatedAt)) },
  ]);

  const texteSourceHTML = `<p style="white-space:pre-wrap; font-size:10px; line-height:1.7; margin:0;">${echapperHTML(traduction.texteOriginal ?? '—')}</p>`;
  const texteTraduitHTML = `<p style="white-space:pre-wrap; font-size:10px; line-height:1.7; margin:0;">${echapperHTML(texte ?? '—')}</p>`;

  const corps = `
    ${masthead({
      typeDocument: 'Traduction',
      titre: `Traduction #${traduction.id}`,
      sousTitre: directionLabel(traduction.direction),
    })}
    ${sectionBox({ titre: 'Informations', contenu: infosHTML })}
    ${sectionBox({ titre: 'Texte source', contenu: texteSourceHTML })}
    <div style="page-break-before: always;">
      ${sectionBox({ titre: 'Texte traduit', contenu: texteTraduitHTML })}
    </div>
  `;

  return genererPDFFiche(corps);
}

// ── Sceau ANAC en buffer brut (docx a besoin des octets, pas d'un data URI
// comme la version HTML/PDF dans ficheHTML.ts) — absent = pas d'image,
// jamais une erreur bloquante. ──────────────────────────────────────────────
function chargerSceauBuffer(): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'assets', 'anac-seal.png'));
  } catch {
    return null;
  }
}

function celluleSansBordure(children: Paragraph[], width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children,
  });
}

// ── Export DOCX — même mise en forme institutionnelle que le PDF (masthead
// ANAC, sceau, section Informations), pour que l'agent retrouve le même
// document, simplement dans un format qu'il peut rouvrir/modifier localement.
// Source et traduction restent chacune pleine page, séparées par un saut de
// page, comme dans le PDF. ──────────────────────────────────────────────────
export async function genererDOCXTraduction(traduction: TraductionView): Promise<Buffer> {
  const demandeur = await getDemandeurOrigine(traduction.id);
  const texte = traduction.texteFinal ?? traduction.texteIA ?? '';
  const sceau = chargerSceauBuffer();

  const mastheadTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celluleSansBordure(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "AGENCE NATIONALE\nDE L'AVIATION CIVILE",
                    bold: true,
                    color: ANAC_NAVY,
                    size: 16,
                  }),
                ],
              }),
            ],
            34
          ),
          celluleSansBordure(
            sceau
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        type: 'png',
                        data: sceau,
                        transformation: { width: 70, height: 70 },
                      }),
                    ],
                  }),
                ]
              : [new Paragraph({ text: '' })],
            32
          ),
          celluleSansBordure(
            [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'RÉPUBLIQUE GABONAISE', bold: true, color: ANAC_NAVY, size: 16 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'Union - Travail - Justice', italics: true, size: 14, color: '6b7280' })],
              }),
            ],
            34
          ),
        ],
      }),
    ],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });

  const infosLignes = [
    ['Direction', directionLabel(traduction.direction)],
    ['Statut', LABELS_STATUT[traduction.statut]],
    ['Demandeur', demandeur ? `${demandeur.prenom} ${demandeur.nom}` : '—'],
    ['Dernière mise à jour', formatDateHeure(traduction.updatedAt)],
  ];

  const infosTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: infosLignes.map(
      ([label, valeur]) =>
        new TableRow({
          children: [
            celluleSansBordure(
              [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: '475569' })] })],
              35
            ),
            celluleSansBordure([new Paragraph({ children: [new TextRun({ text: valeur, size: 18 })] })], 65),
          ],
        })
    ),
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });

  function sectionTexte(titre: string, contenu: string): Paragraph[] {
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text: titre, color: ANAC_NAVY })],
      }),
      ...(contenu.trim()
        ? contenu
            .split(/\n{2,}/)
            .map(
              (paragraphe) =>
                new Paragraph({
                  children: [new TextRun(paragraphe.replace(/\n/g, ' '))],
                  spacing: { after: 200 },
                })
            )
        : [new Paragraph({ children: [new TextRun({ text: '—', color: '9ca3af' })] })]),
    ];
  }

  const doc = new Document({
    sections: [
      {
        children: [
          mastheadTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 50 },
            children: [
              new TextRun({ text: `TRADUCTION #${traduction.id}`, bold: true, size: 28, color: ANAC_NAVY }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: directionLabel(traduction.direction), size: 20, color: '6b7280' }),
            ],
          }),
          infosTable,
          ...sectionTexte('Texte source', traduction.texteOriginal ?? ''),
          new Paragraph({ children: [new PageBreak()] }),
          ...sectionTexte('Texte traduit', texte),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
