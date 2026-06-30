import nodemailer from 'nodemailer';

// ── Configuration du transporteur SMTP ───────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_PORT === '465', // true uniquement pour le port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Vérification de la connexion SMTP au démarrage ───────────────────────
export async function verifyEmailConnection(): Promise<void> {
  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP établie');
  } catch (error) {
    console.warn('⚠️  SMTP non disponible — les emails ne seront pas envoyés', error);
  }
}

// ── Type de base pour tous les emails ────────────────────────────────────
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// ── Fonction d'envoi générique ────────────────────────────────────────────
async function sendEmail(options: EmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'SICOT <sicot@anac.ga>',
    ...options,
  });
}

// ── Email d'activation de compte avec OTP ────────────────────────────────
export async function sendOTPEmail(params: {
  to: string;
  nom: string;
  prenom: string;
  matricule: string;
  otp: string;
}): Promise<void> {
  const { to, nom, prenom, matricule, otp } = params;

  await sendEmail({
    to,
    subject: 'SICOT – Activation de votre compte',
    html: `
      <div style="font-family: Candara, Calibri, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1B2A5E; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">SICOT – ANAC Gabon</h1>
        </div>
        <div style="padding: 32px; background: #f4f6fa;">
          <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
          <p>Votre compte SICOT a été activé. Voici vos informations de connexion :</p>
          <div style="background: white; border: 1px solid #d1d9e6; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Matricule :</strong> ${matricule}</p>
            <p style="margin: 0 0 8px 0;"><strong>Code OTP :</strong></p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; 
                        color: #1B2A5E; text-align: center; padding: 16px 0;">
              ${otp}
            </div>
            <p style="margin: 8px 0 0 0; color: #6b7a99; font-size: 12px; text-align: center;">
              Ce code expire dans ${process.env.OTP_EXPIRY_MINUTES ?? '10'} minutes.
            </p>
          </div>
          <p>Lors de votre première connexion, vous devrez définir un mot de passe personnel.</p>
          <p style="color: #6b7a99; font-size: 12px;">
            Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement 
            le Service Informatique.
          </p>
        </div>
        <div style="background: #1B2A5E; padding: 16px; text-align: center;">
          <p style="color: #d1d9e6; margin: 0; font-size: 11px;">
            ANAC Gabon – Usage interne uniquement
          </p>
        </div>
      </div>
    `,
  });
}

// ── Email d'alerte échéance accord ────────────────────────────────────────
export async function sendAccordEcheanceEmail(params: {
  to: string;
  nomAccord: string;
  reference: string;
  dateExpiration: Date;
  joursRestants: number;
}): Promise<void> {
  const { to, nomAccord, reference, dateExpiration, joursRestants } = params;

  await sendEmail({
    to,
    subject: `SICOT – Accord ${reference} expire dans ${joursRestants} jours`,
    html: `
      <div style="font-family: Candara, Calibri, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1B2A5E; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">SICOT – ANAC Gabon</h1>
        </div>
        <div style="padding: 32px; background: #f4f6fa;">
          <div style="background: #fef3c7; border-left: 4px solid #d97706; 
                      padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <strong>⚠️ Alerte échéance accord</strong>
          </div>
          <p>L'accord suivant expire dans <strong>${joursRestants} jours</strong> :</p>
          <div style="background: white; border: 1px solid #d1d9e6; 
                      border-radius: 8px; padding: 24px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Référence :</strong> ${reference}</p>
            <p style="margin: 0 0 8px 0;"><strong>Intitulé :</strong> ${nomAccord}</p>
            <p style="margin: 0;"><strong>Date d'expiration :</strong> 
              ${dateExpiration.toLocaleDateString('fr-FR')}
            </p>
          </div>
          <p>Veuillez prendre les dispositions nécessaires pour son renouvellement.</p>
        </div>
        <div style="background: #1B2A5E; padding: 16px; text-align: center;">
          <p style="color: #d1d9e6; margin: 0; font-size: 11px;">
            ANAC Gabon – Usage interne uniquement
          </p>
        </div>
      </div>
    `,
  });
}

// ── Email d'alerte recommandation ─────────────────────────────────────────
export async function sendRecommandationEmail(params: {
  to: string;
  nomDestinataire: string;
  texteRecommandation: string;
  missionTitre: string;
  dateLimite: Date;
}): Promise<void> {
  const { to, nomDestinataire, texteRecommandation, missionTitre, dateLimite } = params;

  await sendEmail({
    to,
    subject: `SICOT – Recommandation en attente : ${missionTitre}`,
    html: `
      <div style="font-family: Candara, Calibri, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1B2A5E; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">SICOT – ANAC Gabon</h1>
        </div>
        <div style="padding: 32px; background: #f4f6fa;">
          <p>Bonjour <strong>${nomDestinataire}</strong>,</p>
          <p>Une recommandation vous est assignée pour la mission 
            <strong>${missionTitre}</strong> :
          </p>
          <div style="background: white; border: 1px solid #d1d9e6; 
                      border-radius: 8px; padding: 24px; margin: 16px 0;">
            <p style="margin: 0 0 12px 0;">${texteRecommandation}</p>
            <p style="margin: 0; color: #d97706;">
              <strong>Date limite :</strong> ${dateLimite.toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div style="background: #1B2A5E; padding: 16px; text-align: center;">
          <p style="color: #d1d9e6; margin: 0; font-size: 11px;">
            ANAC Gabon – Usage interne uniquement
          </p>
        </div>
      </div>
    `,
  });
}

// ── Email générique de relance manuelle CCIT ──────────────────────────────
export async function sendNotificationManuelle(params: {
  to: string;
  nomDestinataire?: string;
  objet: string;
  message: string;
}): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: params.objet,
    html: `
      <div style="font-family: Candara, sans-serif; color: #1B2A5E;">
        <p>${params.nomDestinataire ? `Bonjour ${params.nomDestinataire},` : 'Bonjour,'}</p>
        <div style="white-space: pre-wrap; margin: 16px 0; padding: 16px; background: #f5f5f0; border-left: 3px solid #1B2A5E;">
          ${params.message}
        </div>
        <p style="font-size: 12px; color: #888;">
          Message envoyé depuis SICOT — Cellule de Coopération Internationale et de Traduction, ANAC Gabon.
        </p>
      </div>
    `,
  });
}
