import { Request, Response } from 'express';
import * as usersService from '../services/users.service';
import { UserRole } from '@sicot/shared';
import { handleUsersError } from '@/utils/error';

// ── GET /api/users ────────────────────────────────────────────────────────
export async function lister(req: Request, res: Response): Promise<void> {
  try {
    const { search, role, actif, page, pageSize } = req.query;

    const result = await usersService.listerUtilisateurs({
      search: search as string | undefined,
      role: role as UserRole | undefined,
      actif: actif !== undefined ? actif === 'true' : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleUsersError(res, error);
  }
}

// ── GET /api/users/:id ────────────────────────────────────────────────────
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const user = await usersService.getUtilisateur(id);
    res.json(user);
  } catch (error) {
    handleUsersError(res, error);
  }
}

// ── POST /api/users ───────────────────────────────────────────────────────
export async function creer(req: Request, res: Response): Promise<void> {
  try {
    const { matricule, nom, prenom, email, role } = req.body;

    // Validation des champs requis
    if (!matricule || !nom || !prenom || !email || !role) {
      res.status(400).json({
        message: 'Champs requis : matricule, nom, prenom, email, role.',
      });
      return;
    }

    // Validation du rôle
    const rolesValides: UserRole[] = ['agent', 'traducteur', 'relecteur', 'admin', 'super_admin'];
    if (!rolesValides.includes(role)) {
      res.status(400).json({ message: 'Rôle invalide.' });
      return;
    }

    const {user, emailEnvoye} = await usersService.creerUtilisateur({
      matricule,
      nom,
      prenom,
      email,
      role,
      createdByUserId: req.user!.userId,
    });

    res.status(201).json({ ...user, emailEnvoye });
  } catch (error) {
    handleUsersError(res, error);
  }
}

// ── PATCH /api/users/:id ──────────────────────────────────────────────────
export async function mettreAJour(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { role, actif, email } = req.body;

    // Au moins un champ à modifier
    if (role === undefined && actif === undefined && email === undefined) {
      res.status(400).json({ message: 'Aucun champ à modifier.' });
      return;
    }

     if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ message: 'Email invalide.' });
      return;
    }

    const user = await usersService.mettreAJourUtilisateur(id, {
      role,
      actif,
      email,
      updatedByUserId: req.user!.userId,
    });

    res.json(user);
  } catch (error) {
    handleUsersError(res, error);
  }
}

// ── PATCH /api/users/:id/activation ──────────────────────────────────────
export async function toggleActivation(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { actif } = req.body;
    if (typeof actif !== 'boolean') {
      res.status(400).json({ message: 'Le champ actif doit être un booléen.' });
      return;
    }

    // Un admin ne peut pas se désactiver lui-même
    if (id === req.user!.userId && !actif) {
      res.status(403).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
      return;
    }

    const user = await usersService.toggleActivation(id, actif, req.user!.userId);
    res.json(user);
  } catch (error) {
    handleUsersError(res, error);
  }
}

// ── POST /api/users/:id/reinitialiser-otp ────────────────────────────────
export async function reinitialiserOTP(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID invalide.' });
      return;
    }

    const { emailEnvoye } = await usersService.reinitialiserOTP(id, req.user!.userId);
    res.json({
      message: emailEnvoye
        ? 'OTP réinitialisé et envoyé par email.'
        : "OTP réinitialisé, mais l'email n'a pas pu être envoyé - vérifiez la configuration SMTP.",
      emailEnvoye,
    });
  } catch (error) {
    handleUsersError(res, error);
  }
}
