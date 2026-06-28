import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { handleAuthError } from '@/utils/error';
import {
  accessCookieOptions,
  refreshCookieOptions,
  clearAuthCookies,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/middleware/auth';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ── POST /api/auth/login ───────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { matricule, otp, motDePasse } = req.body;

  if (!matricule) {
    res.status(400).json({ message: 'Matricule requis.' });
    return;
  }

  try {
    const result = await authService.login({
      matricule,
      otp,
      motDePasse,
      ip: req.ip,
    });

    if (result.premiereConnexion && result.tokens) {
      // Token temporaire uniquement — pas de refresh token
      res.cookie(ACCESS_TOKEN_COOKIE, result.tokens.accessToken, {
        ...accessCookieOptions,
        maxAge: 5 * 60 * 1000, // 5 minutes
      });
      res.json({ premiereConnexion: true, message: result.message });
      return;
    }

    // Connexion normale — poser les deux cookies
    if (result.tokens) {
      res.cookie(ACCESS_TOKEN_COOKIE, result.tokens.accessToken, accessCookieOptions);
      res.cookie(REFRESH_TOKEN_COOKIE, result.tokens.refreshToken, refreshCookieOptions);
    }

    res.json({
      premiereConnexion: false,
      user: result.user,
    });
  } catch (error) {
    handleAuthError(res, error);
  }
}

// ── POST /api/auth/set-password ────────────────────────────────────────────
export async function setPassword(req: Request, res: Response): Promise<void> {
  const { motDePasse, confirmation } = req.body;

  if (!motDePasse || !confirmation) {
    res.status(400).json({ message: 'Mot de passe et confirmation requis.' });
    return;
  }

  try {
    const { tokens, user } = await authService.setPassword({
      userId: req.user!.userId,
      motDePasse,
      confirmation,
      ip: req.ip,
    });

    // Remplacer le token temporaire par les tokens définitifs
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessCookieOptions);
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshCookieOptions);

    res.json({ message: 'Mot de passe défini avec succès.', user });
  } catch (error) {
    handleAuthError(res, error);
  }
}

// ── POST /api/auth/refresh ─────────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token manquant.' });
    return;
  }

  try {
    const { accessToken } = await authService.refreshToken(refreshToken);
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions);
    res.json({ message: 'Token renouvelé.' });
  } catch (error) {
    clearAuthCookies(res);
    handleAuthError(res, error);
  }
}

// ── POST /api/auth/logout ──────────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    await authService.logAudit({
      userId: req.user!.userId,
      action: 'DECONNEXION',
      module: 'M10',
      ip: req.ip,
    });
  } catch (error) {
    console.error('[auth/logout] Erreur audit:', error);
  } finally {
    clearAuthCookies(res);
    res.json({ message: 'Déconnexion réussie.' });
  }
}

// ── GET /api/auth/me ───────────────────────────────────────────────────────
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId));

    if (!user) {
      res.status(404).json({ message: 'Utilisateur introuvable.' });
      return;
    }

    res.json({
      id: user.id,
      matricule: user.matricule,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    });
  } catch (error) {
    console.error('[auth/me]', error);
    res.status(500).json({ message: 'Erreur interne.' });
  }
}