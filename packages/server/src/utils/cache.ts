// ── Cache mémoire courte durée ─────────────────────────────────────────────
// Usage : analytics (agrégats coûteux, lus bien plus souvent qu'écrits).
// Volontairement simple (Map en mémoire) — suffisant pour un seul process
// Node ; à revoir (Redis) si le déploiement passe un jour en multi-instance.
const cache = new Map<string, { valeur: unknown; expireA: number }>();

export async function avecCache<T>(
  cle: string,
  ttlMs: number,
  calculer: () => Promise<T>
): Promise<T> {
  const entree = cache.get(cle);

  if (entree && entree.expireA > Date.now()) {
    return entree.valeur as T;
  }

  const valeur = await calculer();
  cache.set(cle, { valeur, expireA: Date.now() + ttlMs });
  return valeur;
}
