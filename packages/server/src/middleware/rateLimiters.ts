import rateLimit, { Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Phase 12.4 - Limiteurs de requêtes (protection anti-abus).
//
// Toutes les instances sont créées via des factories (et non des singletons
// exportés directement) pour que les tests puissent construire des
// limiteurs isolés, à seuils bas, sans jamais affaiblir les valeurs de
// production ni partager d'état entre tests. Chaque appel à une factory
// crée son propre store en mémoire (comportement par défaut de
// express-rate-limit) - aucune dépendance à Redis ou à un store distribué.

export const RATE_LIMIT_CODE = 'TROP_DE_REQUETES';

type LimiterOverrides = Partial<Pick<Options, 'windowMs' | 'max' | 'skip'>>;

function jsonHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ message, code: RATE_LIMIT_CODE });
  };
}

// /api/health est appelé fréquemment par le healthcheck Docker/reverse-proxy
// et ne doit jamais être compté dans le limiteur global. Comparaison sur
// l'URL d'origine complète pour rester correcte quel que soit le point de
// montage du middleware.
function isHealthCheck(req: Request): boolean {
  return req.originalUrl.split('?')[0] === '/api/health';
}

export function createGlobalLimiter(overrides: LimiterOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isHealthCheck,
    handler: jsonHandler('Trop de requêtes, réessayez plus tard.'),
    ...overrides,
  });
}

export function createLoginLimiter(overrides: LimiterOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler('Trop de tentatives de connexion, réessayez dans 15 minutes.'),
    ...overrides,
  });
}

export function createPortalListLimiter(overrides: LimiterOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler('Trop de requêtes, réessayez plus tard.'),
    ...overrides,
  });
}

export function createPortalTokenLimiter(overrides: LimiterOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler('Trop de demandes de lien de téléchargement, réessayez plus tard.'),
    ...overrides,
  });
}

export function createPortalViewLimiter(overrides: LimiterOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonHandler('Trop de requêtes, réessayez plus tard.'),
    ...overrides,
  });
}
