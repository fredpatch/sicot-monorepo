import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Routes
import authRoutes from './modules/auth/routes/auth.route';
import usersRoutes from './modules/users/routes/users.route';
import auditRoutes from './modules/audit/routes/audit.route';
import documentsRoutes from './modules/document/routes/documents.route';
import organisationsRoutes from './modules/partenaires/routes/organisations.route';
import bootstrapRoutes from './start/routes/bootstrap.route';
import accordsRoutes from './modules/accords/routes/accords.route';
import courriersRoutes from './modules/courriers/routes/courriers.route';
import missionsRoutes from './modules/missions/routes/missions.route';
import glossaireRoutes from './modules/glossaire/routes/glossaire.route';
import traductionsRoutes from './modules/traduction/routes/traduction.route';
import demandesRoutes from './modules/demandes/routes/demandes.route';
import dashboardRoutes from './modules/dasboard/routes/dashboard.route';
import parametresRoutes from './modules/parametres/routes/parametres.route';
import notificationsRoutes from './modules/notifications/routes/notifications.route';
import jobsRoutes from './modules/jobs/routes/jobs.route';
import portalRoutes from './modules/portal/routes/portal.route';
import analyticsRoutes from './modules/analytics/routes/analytics.route';
import personnelAnacRoutes from './modules/personnel-anac/routes/personnel-anac.route';
import contactsRoutes from './modules/contacts/routes/contacts.route';

// Utilitaires
import { verifyEmailConnection } from './utils/email';
import { demarrerJobsSauvegarde } from './jobs/backup';
import { verifierServiceOCR } from './utils/ocr';
import { demarrerJobsAlertes } from './jobs/alertes';
import { seedParametresDefaut } from './start/services/parameters-seed.service';
import { demarrerJobSnapshotCriticite } from './jobs/criticite-snapshot';
import { demarrerJobRapportMensuel } from './jobs/rapport-mensuel';
import { createGlobalLimiter } from './middleware/rateLimiters';
import { resolveTrustProxyHops, toExpressTrustProxySetting } from './utils/trustProxy';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Reverse proxy ──────────────────────────────────────────────────────────
// Voir utils/trustProxy.ts : sans ceci, req.ip (et donc les limiteurs
// IP-based ci-dessous) verrait l'IP du conteneur Nginx pour toute requête
// en production/staging, pas celle du vrai client.
const trustProxyHops = resolveTrustProxyHops(process.env.TRUST_PROXY_HOPS);
app.set('trust proxy', toExpressTrustProxySetting(trustProxyHops));

// ── Sécurité ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // indispensable pour que les cookies soient envoyés
  })
);

// ── Cookies ────────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────
// Doit tourner AVANT le limiteur global : sinon une requête rejetée par le
// limiteur (429) se termine avant d'atteindre Morgan et n'apparaît jamais
// dans l'access log - notre seul mécanisme de visibilité pour les 429
// (voir docs/security/csrf-and-session-security.md#rate-limiting ; pas
// d'écriture audit_logs par 429, pour éviter d'amplifier un flood en
// flood d'écritures DB).
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Rate limiting - filet de sécurité global /api ─────────────────────────
// Volume-based, pas un mécanisme anti-brute-force (voir loginLimiter dans
// auth.route.ts et le verrouillage de compte existant dans auth.helpers.ts).
// Placé avant le parsing du corps pour éviter ce coût sur une requête déjà
// vouée au rejet. /api/health est explicitement exclu (healthchecks Docker/
// reverse-proxy).
app.use('/api', createGlobalLimiter());

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques uploadés ────────────────────────────────────────────
app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? '/sicot/documents'));

// ── Routes API ─────────────────────────────────────────────────────────────
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/accords', accordsRoutes);
app.use('/api/courriers', courriersRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/glossaire', glossaireRoutes);
app.use('/api/traductions', traductionsRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/parametres', parametresRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/personnel-anac', personnelAnacRoutes);
app.use('/api/contacts', contactsRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'SICOT API',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SICOT]', err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

// ── Démarrage ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ SICOT API démarrée sur http://localhost:${PORT}`);
  console.log(`📋 Environnement : ${process.env.NODE_ENV ?? 'development'}`);
  // Seed des paramètres par défaut
  await seedParametresDefaut();

  // Vérification de la connexion au serveur SMTP
  await verifyEmailConnection();

  // Vérification de la disponibilité du service OCR
  const ocrAvailable = await verifierServiceOCR();
  if (ocrAvailable) {
    console.log('✅ Service OCR disponible');
  } else {
    console.warn('⚠️  Service OCR indisponible - démarrez packages/ocr-service/main.py');
  }

  // Démarrage des jobs de sauvegarde et d'alertes
  demarrerJobsSauvegarde();
  demarrerJobsAlertes();

  // Démarrage du job de snapshot de criticité
  demarrerJobSnapshotCriticite();

  // Démarrage du job de génération automatique du rapport mensuel
  demarrerJobRapportMensuel();
});

export default app;
