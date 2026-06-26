import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Routes (à créer au fil des sprints)
// import authRoutes from './routes/auth.js';
// import usersRoutes from './routes/users.js';
// import documentsRoutes from './routes/documents.js';
// import accordsRoutes from './routes/accords.js';
// import courriersRoutes from './routes/courriers.js';
// import missionsRoutes from './routes/missions.js';
// import traductionsRoutes from './routes/traductions.js';
// import demandesRoutes from './routes/demandes.js';
// import glossaireRoutes from './routes/glossaire.js';
// import dashboardRoutes from './routes/dashboard.js';
// import auditRoutes from './routes/audit.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Sécurité ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);

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
// app.use('/api/auth', authLimiter, authRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/documents', documentsRoutes);
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
app.listen(PORT, () => {
  console.log(`✅ SICOT API démarrée sur http://localhost:${PORT}`);
  console.log(`📋 Environnement : ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
