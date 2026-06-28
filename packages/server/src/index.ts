import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './modules/auth/routes/auth.route';
import usersRoutes from './modules/users/routes/users.route';
import auditRoutes from './modules/audit/routes/audit.route';
import documentsRoutes from './modules/document/routes/documents.route';

// Utilitaires
import { verifyEmailConnection } from './utils/email.js';
import { demarrerJobsSauvegarde } from './jobs/backup';
import { verifierServiceOCR } from './utils/ocr';

const app = express();
const PORT = process.env.PORT ?? 3001;

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

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limit strict pour l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' },
});

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques uploadés ────────────────────────────────────────────
app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? '/sicot/documents'));

// ── Routes API ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/documents', documentsRoutes);
// À brancher au fil des sprints :
// app.use('/api/organisations', organisationsRoutes);
// app.use('/api/accords', accordsRoutes);
// app.use('/api/courriers', courriersRoutes);
// app.use('/api/missions', missionsRoutes);
// app.use('/api/traductions', traductionsRoutes);
// app.use('/api/demandes', demandesRoutes);
// app.use('/api/glossaire', glossaireRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/audit', auditRoutes);

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
  await verifyEmailConnection();
  const ocrAvailable = await verifierServiceOCR();
  if (ocrAvailable) {
    console.log('✅ Service OCR disponible');
  } else {
    console.warn('⚠️  Service OCR indisponible — démarrez packages/ocr-service/main.py');
  }
  demarrerJobsSauvegarde();
});

export default app;
