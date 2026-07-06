import nodemailer from 'nodemailer';
import {
  otpEmailTemplate,
  compteActiveEmailTemplate,
  accordEcheanceEmailTemplate,
  recommandationEmailTemplate,
  notificationManuelleTemplate,
} from './email.templates';

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
  const { to, ...templateParams } = params;

  await sendEmail({
    to,
    subject: 'SICOT - Activation de votre compte',
    html: otpEmailTemplate(templateParams),
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
  const { to, joursRestants, reference, ...templateParams } = params;

  await sendEmail({
    to,
    subject: `SICOT - Accord ${reference} expire dans ${joursRestants} jours`,
    html: accordEcheanceEmailTemplate({ ...templateParams, reference, joursRestants }),
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
  const { to, missionTitre, ...templateParams } = params;

  await sendEmail({
    to,
    subject: `SICOT - Recommandation en attente : ${missionTitre}`,
    html: recommandationEmailTemplate({ ...templateParams, missionTitre }),
  });
}

// ── Email générique de relance manuelle CCIT ──────────────────────────────
export async function sendNotificationManuelle(params: {
  to: string;
  nomDestinataire?: string;
  objet: string;
  message: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: params.objet,
    html: notificationManuelleTemplate(params),
  });
}

// ── Email de confirmation d'activation ────────────────────────────────────
export async function sendCompteActiveEmail(params: {
  to: string;
  nom: string;
  prenom: string;
  matricule: string;
  dateHeure: string;
  ip?: string;
}): Promise<void> {
  const { to, ...templateParams } = params;

  await sendEmail({
    to,
    subject: 'SICOT - Confirmation d\'activation de votre compte',
    html: compteActiveEmailTemplate(templateParams),
  });
}