import { Request, Response, NextFunction } from 'express';
import { Capability, hasCapability, hasAnyCapability, hasAllCapabilities, UserRole } from '@sicot/shared';

// ── Middleware d'autorisation par capacité ─────────────────────────────────
// Ne détermine que "cette catégorie d'action est-elle autorisée" ; les
// vérifications contextuelles (propriété d'une ressource, état du workflow)
// restent dans les policies de chaque module de domaine.
//
// Usage : router.post('/accords', authenticate, requireCapability('AGREEMENT_MANAGE'), handler)
export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!hasCapability(req.user.role as UserRole, capability)) {
      res.status(403).json({ message: 'Accès refusé - droits insuffisants.' });
      return;
    }

    next();
  };
}

/** L'utilisateur doit avoir AU MOINS UNE des capacités listées. */
export function requireAnyCapability(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!hasAnyCapability(req.user.role as UserRole, capabilities)) {
      res.status(403).json({ message: 'Accès refusé - droits insuffisants.' });
      return;
    }

    next();
  };
}

/** L'utilisateur doit avoir TOUTES les capacités listées. */
export function requireAllCapabilities(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!hasAllCapabilities(req.user.role as UserRole, capabilities)) {
      res.status(403).json({ message: 'Accès refusé - droits insuffisants.' });
      return;
    }

    next();
  };
}
