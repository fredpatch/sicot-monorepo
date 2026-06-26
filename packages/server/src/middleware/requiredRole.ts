import {Request, Response, NextFunction} from "express"
import {UserRole} from "@sicot/shared"

// ── Hiérarchie des rôles ──────────────────────────────────────────────────
// Un rôle plus élevé inclut tous les droits des rôles inférieurs
const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  traducteur: 2,
  relecteur: 3,
  admin: 4,
  super_admin: 5,
};

// ── Middleware de vérification de rôle ────────────────────────────────────
// Usage : router.get('/users', authenticate, requireRole('admin'), handler)
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // L'utilisateur doit avoir AU MOINS le niveau du rôle le plus bas
    // parmi ceux acceptés
    const minRequiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < minRequiredLevel) {
      res.status(403).json({ message: 'Accès refusé - droits insuffisants.' });
      return;
    }

    next();
  };
}

// ── Raccourcis pratiques ───────────────────────────────────────────────────
// Au lieu de requireRole('admin', 'super_admin') partout
export const requireAdmin = requireRole('admin');
export const requireSuperAdmin = requireRole('super_admin');
export const requireTraducteur = requireRole('traducteur');