import fs from 'fs';
import path from 'path';
import { echapperHTML } from './pdf.js';

// ── Sceau ANAC - lu une seule fois et mis en cache en data URI. Si le
// fichier est absent, le masthead reste texte seul plutôt que d'échouer ────
let sceauDataURI: string | null | undefined;

function chargerSceauANAC(): string | null {
  if (sceauDataURI !== undefined) return sceauDataURI;
  try {
    const chemin = path.join(process.cwd(), 'assets', 'anac-seal.png');
    const buffer = fs.readFileSync(chemin);
    sceauDataURI = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    sceauDataURI = null;
  }
  return sceauDataURI;
}

// ── Blocs HTML réutilisables pour les fiches PDF individuelles (accord,
// courrier, mission…) - masthead ANAC, badges de statut, tableaux, section
// "Historique" adossée aux vraies entrées du journal d'audit. Toute donnée
// affichée ici doit provenir d'un champ réel : ne jamais inventer une valeur
// pour remplir une section qui n'a pas d'équivalent en base ─────────────────

export type BadgeCouleur = 'vert' | 'ambre' | 'rouge' | 'gris' | 'bleu';

const COULEURS_BADGE: Record<BadgeCouleur, { bg: string; fg: string }> = {
  vert: { bg: '#dcfce7', fg: '#15803d' },
  ambre: { bg: '#fef3c7', fg: '#b45309' },
  rouge: { bg: '#fee2e2', fg: '#b91c1c' },
  gris: { bg: '#f1f5f9', fg: '#475569' },
  bleu: { bg: '#dbeafe', fg: '#1d4ed8' },
};

export function badge(texte: string, couleur: BadgeCouleur): string {
  const c = COULEURS_BADGE[couleur];
  return `<span style="display:inline-block; padding:2px 10px; border-radius:999px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; background:${c.bg}; color:${c.fg};">${echapperHTML(texte)}</span>`;
}

// ── En-tête institutionnel - sceau ANAC centré entre les deux blocs de
// texte quand le fichier est disponible (packages/server/assets/anac-seal.png)
export function masthead(params: {
  typeDocument: string;
  titre: string;
  sousTitre?: string;
}): string {
  const genereLe = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sceau = chargerSceauANAC();

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1B2A5E; padding-bottom:10px; margin-bottom:16px;">
      <p style="margin:0; flex:1; font-size:9.5px; font-weight:700; color:#1B2A5E; letter-spacing:.03em; line-height:1.4;">
        AGENCE NATIONALE<br />DE L'AVIATION CIVILE
      </p>
      ${sceau ? `<img src="${sceau}" alt="Sceau ANAC" style="height:106px; width:106px; object-fit:contain; margin:0 12px;" />` : ''}
      <p style="margin:0; flex:1; font-size:9.5px; font-weight:700; color:#1B2A5E; letter-spacing:.03em; text-align:right; line-height:1.4;">
        RÉPUBLIQUE GABONAISE<br />
        <span style="font-size:8px; font-weight:400; color:#6b7280;">Union - Travail - Justice</span>
      </p>
    </div>
    <div style="text-align:center; margin-bottom:18px;">
      <h1 style="margin:0; font-size:16px; color:#1B2A5E; letter-spacing:.02em;">RAPPORT - ${echapperHTML(params.typeDocument.toUpperCase())}</h1>
      <p style="margin:5px 0 0; font-size:11px; font-weight:600; color:#1a1a1a;">${params.titre}</p>
      ${params.sousTitre ? `<p style="margin:2px 0 0; font-size:9.5px; color:#6b7280;">${params.sousTitre}</p>` : ''}
      <p style="margin:6px 0 0; font-size:8px; color:#9ca3af;">Généré le ${genereLe}</p>
    </div>
  `;
}

export function sectionBox(params: { titre: string; contenu: string }): string {
  return `
    <div style="border:1px solid #e5e7eb; border-radius:6px; margin-bottom:12px; overflow:hidden; break-inside:avoid;">
      <div style="background:#f8fafc; border-bottom:1px solid #e5e7eb; padding:6px 10px; font-size:8.5px; font-weight:700; color:#1B2A5E; text-transform:uppercase; letter-spacing:.03em;">
        ${echapperHTML(params.titre)}
      </div>
      <div style="padding:10px;">${params.contenu}</div>
    </div>
  `;
}

// ── Deux sections côte à côte (mise en page mockup) ────────────────────────
export function deuxColonnes(gauche: string, droite: string): string {
  return `<div style="display:flex; gap:12px;"><div style="flex:1; min-width:0;">${gauche}</div><div style="flex:1; min-width:0;">${droite}</div></div>`;
}

export function grilleInfos(lignes: Array<{ label: string; valeur: string }>): string {
  return `
    <table style="width:100%;">
      <tbody>
        ${lignes
          .map(
            (l) => `
          <tr>
            <td style="width:45%; font-weight:600; color:#475569; padding:3px 8px 3px 0; border:none; background:transparent; font-size:9px;">${echapperHTML(l.label)}</td>
            <td style="padding:3px 0; border:none; background:transparent; font-size:9px;">${l.valeur}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function tableSimple(colonnes: string[], lignes: string[][]): string {
  if (lignes.length === 0) {
    return `<p style="font-size:9px; color:#9ca3af; margin:0;">Aucune donnée.</p>`;
  }
  return `
    <table>
      <thead><tr>${colonnes.map((c) => `<th>${echapperHTML(c)}</th>`).join('')}</tr></thead>
      <tbody>${lignes.map((l) => `<tr>${l.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

// ── Historique - construit depuis les vraies entrées du journal d'audit
// (module + entiteId), jamais des données inventées ────────────────────────
const LABELS_ACTION: Record<string, string> = {
  ACCORD_CREE: 'Création',
  ACCORD_MODIFIE: 'Modification',
  ACCORD_RENOUVELE: 'Renouvellement',
  COURRIER_CREE: 'Création',
  COURRIER_MODIFIE: 'Modification',
  COURRIER_DOCUMENT_AJOUTE: 'Document ajouté',
  COURRIER_DOCUMENT_RETIRE: 'Document retiré',
  MISSION_CREEE: 'Création',
  MISSION_MODIFIEE: 'Modification',
};

export interface HistoriqueLogPourFiche {
  action: string;
  createdAt: Date;
  userNom?: string;
  userPrenom?: string;
}

export function tableHistorique(logs: HistoriqueLogPourFiche[]): string {
  return tableSimple(
    ['Action', 'Date', 'Par'],
    logs.map((l) => [
      echapperHTML(LABELS_ACTION[l.action] ?? l.action),
      echapperHTML(
        new Date(l.createdAt).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      ),
      l.userNom ? echapperHTML(`${l.userPrenom ?? ''} ${l.userNom}`.trim()) : 'Système',
    ])
  );
}
