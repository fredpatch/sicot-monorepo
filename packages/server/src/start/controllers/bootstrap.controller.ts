import { Request, Response } from 'express';
import * as bootstrapService from '../services/bootstrap.service.js';

// ── GET /api/bootstrap/status ─────────────────────────────────────────────
// Vérifie si le système est déjà initialisé
// Appelé au démarrage du client React pour décider quelle page afficher
export async function status(_req: Request, res: Response): Promise<void> {
  try {
    const initialise = await bootstrapService.estInitialise();
    res.json({ initialise });
  } catch (error) {
    console.error('[bootstrap/status]', error);
    res.status(500).json({ message: 'Erreur interne.' });
  }
}

// ── POST /api/bootstrap/init ──────────────────────────────────────────────
// Crée le premier Super Admin — désactivé si système déjà initialisé
export async function init(req: Request, res: Response): Promise<void> {
  try {
    // Vérification préalable — si déjà initialisé on refuse immédiatement
    const dejaInitialise = await bootstrapService.estInitialise();
    if (dejaInitialise) {
      res.status(403).json({
        message: 'Le système est déjà initialisé.',
        code: 'SYSTEME_DEJA_INITIALISE',
      });
      return;
    }

    const { matricule, nom, prenom, email, motDePasse, confirmation } = req.body;

    // Validation des champs requis
    if (!matricule || !nom || !prenom || !email || !motDePasse || !confirmation) {
      res.status(400).json({
        message:
          'Tous les champs sont requis : matricule, nom, prenom, email, motDePasse, confirmation.',
      });
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Email invalide.' });
      return;
    }

    // Validation mot de passe
    if (motDePasse !== confirmation) {
      res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    if (motDePasse.length < 8) {
      res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
      return;
    }

    await bootstrapService.initialiserSuperAdmin({
      matricule,
      nom,
      prenom,
      email,
      motDePasse,
    });

    res.status(201).json({
      message: 'Super Admin créé avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

    if (message === 'SYSTEME_DEJA_INITIALISE') {
      res.status(403).json({
        message: 'Le système est déjà initialisé.',
        code: message,
      });
      return;
    }

    if (message === 'MATRICULE_EXISTANT') {
      res.status(409).json({
        message: 'Ce matricule est déjà utilisé.',
        code: message,
      });
      return;
    }

    console.error('[bootstrap/init]', error);
    res.status(500).json({ message: 'Erreur interne.' });
  }
}
