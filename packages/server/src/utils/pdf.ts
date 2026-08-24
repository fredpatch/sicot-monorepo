import puppeteer from 'puppeteer';

// ── Échappement HTML - les champs libres (titre, notes, objet…) passent
// souvent directement dans le corps HTML avant rendu PDF ──────────────────
export function echapperHTML(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '-';
  return String(valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Rendu HTML → PDF buffer, réutilisable par tout module (audit, accords,
// courriers, rapports mission - cf. backlog Sprint 3/11) ───────────────────
// Un navigateur headless est lancé par appel : acceptable pour un usage
// interne à faible fréquence. À revoir (pool de browsers) si le volume
// d'exports augmente significativement.
export async function genererPDFDepuisHTML(
  corpsHTML: string,
  options?: { titre?: string }
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(envelopperHTML(corpsHTML, options?.titre), {
      waitUntil: 'networkidle0',
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '90px', bottom: '60px', left: '30px', right: '30px' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:9px; width:100%; padding:8px 30px 0; color:#1B2A5E; font-family:Arial,sans-serif; display:flex; justify-content:space-between; border-bottom:2px solid #1B2A5E;">
          <span style="font-weight:bold;">SICOT - ANAC Gabon</span>
          <span>${options?.titre ?? ''}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size:8px; width:100%; padding:0 30px; color:#6b7280; font-family:Arial,sans-serif; display:flex; justify-content:space-between;">
          <span>Généré le ${new Date().toLocaleString('fr-FR')}</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ── Rendu HTML → PDF pour les fiches individuelles (accord, courrier,
// mission) - masthead institutionnel inclus dans le corps (pas de barre
// d'en-tête Puppeteer répétée), pied de page avec pagination ──────────────
export async function genererPDFFiche(corpsHTML: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(envelopperFicheHTML(corpsHTML), {
      waitUntil: 'networkidle0',
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', bottom: '50px', left: '30px', right: '30px' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-size:8px; width:100%; padding:4px 30px 0; color:#6b7280; font-family:Arial,sans-serif; display:flex; justify-content:space-between; border-top:1px solid #e5e7eb;">
          <span>ANAC Gabon - Système Intégré de Coopération Internationale et de Traduction (SICOT)</span>
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function envelopperFicheHTML(corps: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 10px; margin: 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1B2A5E; color: white; text-align: left; padding: 5px 8px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.02em; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9px; vertical-align: top; }
          tr:nth-child(even) td { background: #f9fafb; }
        </style>
      </head>
      <body>${corps}</body>
    </html>
  `;
}

// ── Enveloppe HTML de base avec styles ANAC ────────────────────────────────
function envelopperHTML(corps: string, titre?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 11px; margin: 0; }
          h1 { color: #1B2A5E; font-size: 16px; margin: 0 0 4px; }
          .sous-titre { color: #6b7280; font-size: 11px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1B2A5E; color: white; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.02em; }
          td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9.5px; vertical-align: top; }
          tr:nth-child(even) td { background: #f9fafb; }
        </style>
      </head>
      <body>
        ${titre ? `<h1>${titre}</h1>` : ''}
        ${corps}
      </body>
    </html>
  `;
}
