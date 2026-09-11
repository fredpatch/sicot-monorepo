// Phase 12.4 - TRUST_PROXY_HOPS
//
// Express's `trust proxy` setting controls whether req.ip trusts the
// X-Forwarded-For/X-Real-IP headers set by a reverse proxy. SICOT sits
// behind exactly one Nginx hop in production/staging (see
// docs/security/csrf-and-session-security.md), but native/Docker dev has
// no proxy in front of the API at all - blindly trusting one hop there
// would let a client spoof its own IP via X-Forwarded-For. This helper
// keeps that decision explicit and environment-specific rather than a
// blanket `trust proxy = true`.
//
// unset / "0" -> do not trust any proxy hop (Express default: false)
// positive integer (bounded) -> number of trusted hops, per Express's
//   own hop-count semantics (see https://expressjs.com/en/guide/behind-proxies.html)

const MAX_SANE_HOPS = 10;

export function resolveTrustProxyHops(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') {
    return 0;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SANE_HOPS) {
    console.warn(
      `[SICOT] TRUST_PROXY_HOPS="${raw}" invalide (entier attendu entre 0 et ${MAX_SANE_HOPS}) - trust proxy désactivé.`
    );
    return 0;
  }

  return parsed;
}

// Express treats the number 0 the same as `false` would be clearer for a
// reader of index.ts than a bare 0, so this maps the resolved hop count to
// exactly what app.set('trust proxy', ...) should receive.
export function toExpressTrustProxySetting(hops: number): number | false {
  return hops > 0 ? hops : false;
}
