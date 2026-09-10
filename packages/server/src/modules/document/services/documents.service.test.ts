// Phase 12.2 regression: GET /documents/:id and GET /documents/:id/telecharger
// must treat a soft-deleted document exactly like a nonexistent one, and a
// caller holding DOCUMENT_UPLOAD must never bypass that lifecycle check.
//
// This intentionally does NOT mock db.select()/.from()/.where() - a mock at
// that layer would stay green even if the isNull(documents.deletedAt)
// predicate were deleted from the real code, since it never inspects what
// query Drizzle actually built.
//
// Instead this spies on Pool.prototype.query - the lowest layer Drizzle's
// node-postgres driver calls through (confirmed by reading
// drizzle-orm/node-postgres/session.js: NodePgPreparedQuery#execute() always
// ends in `client.query(rawQuery, params)`, where `client` is the same `pg`
// Pool instance passed into `drizzle(pool, { schema })` in src/db/index.ts).
// The real query builder still runs in full; only the actual network/DB call
// is intercepted, so the captured SQL text is exactly what would be sent to
// Postgres. If `isNull(documents.deletedAt)` were removed from any of the
// three functions under test, the SQL-fragment assertions below would fail.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  querySpy = vi.spyOn(Pool.prototype, 'query');
});

afterEach(() => {
  querySpy.mockRestore();
});

function mockRows(rows: unknown[][]) {
  querySpy.mockImplementationOnce(() => Promise.resolve({ rows }) as never);
}

function lastQueryText(): string {
  const call = querySpy.mock.calls[querySpy.mock.calls.length - 1];
  return (call[0] as { text: string }).text;
}

// Tolerant of column list/whitespace/alias differences - only cares that the
// two predicates this fix depends on are both present, ANDed together.
function assertActiveOnlyPredicate(sqlText: string) {
  const normalized = sqlText.replace(/\s+/g, ' ').toLowerCase();
  expect(normalized).toMatch(/"documents"\."id"\s*=\s*\$\d+/);
  expect(normalized).toMatch(/"documents"\."deleted_at"\s+is\s+null/);
  // Must be a conjunction (and), not two independent/unrelated clauses.
  expect(normalized).toMatch(/"documents"\."id"\s*=\s*\$\d+\s+and\s+"documents"\."deleted_at"\s+is\s+null/);
}

// Full-row array in the exact column order documents is declared in
// packages/server/src/db/schema.ts (id, nom, nomOriginal, chemin, mimeType,
// taille, categorie, langue, texteExtrait, statutOCR, hashMD5, version,
// parentId, uploadePar, createdAt, deletedAt, visibilitePortail,
// portailTokenDureeJours, visibiliteInterne) - required because Drizzle's
// node-postgres driver returns schema-aware selects in rowMode "array" and
// maps columns back to camelCase JS fields by position, not by name.
function activeDocumentRow(): unknown[] {
  return [
    1, // id
    'doc.pdf', // nom
    'Document.pdf', // nomOriginal
    '/data/documents/doc.pdf', // chemin
    'application/pdf', // mimeType
    1024, // taille
    'autre', // categorie
    'fr', // langue
    'texte', // texteExtrait
    'traite', // statutOCR
    'abc123', // hashMD5
    1, // version
    null, // parentId
    5, // uploadePar
    new Date('2026-01-01'), // createdAt
    null, // deletedAt (active)
    false, // visibilitePortail
    null, // portailTokenDureeJours
    false, // visibiliteInterne
  ];
}

describe('documents.service - getDocument (Phase 12.2 active-only lifecycle)', () => {
  it('queries with an id + deleted_at IS NULL predicate', async () => {
    mockRows([]);
    const { getDocument } = await import('./documents.service');

    await expect(getDocument(1)).rejects.toThrow('DOCUMENT_INTROUVABLE');
    assertActiveOnlyPredicate(lastQueryText());
  });

  it('no active row (nonexistent or soft-deleted) -> DOCUMENT_INTROUVABLE', async () => {
    mockRows([]);
    const { getDocument } = await import('./documents.service');

    await expect(getDocument(1)).rejects.toThrow('DOCUMENT_INTROUVABLE');
  });

  it('active row -> resolves', async () => {
    mockRows([activeDocumentRow()]);
    const { getDocument } = await import('./documents.service');

    await expect(getDocument(1)).resolves.toMatchObject({ id: 1, nomOriginal: 'Document.pdf' });
  });
});

describe('documents.service - getCheminDocument (Phase 12.2 active-only lifecycle)', () => {
  it('queries with an id + deleted_at IS NULL predicate', async () => {
    mockRows([]);
    const { getCheminDocument } = await import('./documents.service');

    await expect(getCheminDocument(1)).rejects.toThrow('DOCUMENT_INTROUVABLE');
    assertActiveOnlyPredicate(lastQueryText());
  });

  it('no active row (nonexistent or soft-deleted) -> DOCUMENT_INTROUVABLE', async () => {
    mockRows([]);
    const { getCheminDocument } = await import('./documents.service');

    await expect(getCheminDocument(1)).rejects.toThrow('DOCUMENT_INTROUVABLE');
  });

  it('active row -> resolves with the file path', async () => {
    mockRows([activeDocumentRow()]);
    const { getCheminDocument } = await import('./documents.service');

    await expect(getCheminDocument(1)).resolves.toMatchObject({
      chemin: '/data/documents/doc.pdf',
      nomOriginal: 'Document.pdf',
    });
  });
});

describe('documents.service - verifierAccesDocument (Phase 12.2 lifecycle-first control flow)', () => {
  it('queries with an id + deleted_at IS NULL predicate', async () => {
    mockRows([]);
    const { verifierAccesDocument } = await import('./documents.service');

    await expect(
      verifierAccesDocument(1, { role: 'operateur', userId: 5 })
    ).rejects.toThrow('DOCUMENT_INTROUVABLE');
    assertActiveOnlyPredicate(lastQueryText());
  });

  // Mandatory case (prompt.md §3B): a DOCUMENT_UPLOAD-capable caller must
  // still hit the active-document query and be rejected when it returns no
  // row - proving the capability short-circuit no longer runs ahead of the
  // lifecycle check (the exact bypass this phase closes).
  it('privileged caller (DOCUMENT_UPLOAD) + no active row -> DOCUMENT_INTROUVABLE, query still executed', async () => {
    mockRows([]);
    const { verifierAccesDocument } = await import('./documents.service');

    await expect(
      verifierAccesDocument(1, { role: 'operateur', userId: 5 })
    ).rejects.toThrow('DOCUMENT_INTROUVABLE');
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it('privileged caller (DOCUMENT_UPLOAD) + active row -> succeeds without owner/visibility restriction', async () => {
    // visibiliteInterne=false, uploadePar=999 (not the caller) - would be
    // denied for an ordinary caller, but DOCUMENT_UPLOAD bypasses that once
    // the row is confirmed active.
    mockRows([[false, 999]]);
    const { verifierAccesDocument } = await import('./documents.service');

    await expect(
      verifierAccesDocument(1, { role: 'operateur', userId: 5 })
    ).resolves.toBeUndefined();
  });

  it('ordinary owner + active row -> succeeds', async () => {
    mockRows([[false, 5]]);
    const { verifierAccesDocument } = await import('./documents.service');

    await expect(
      verifierAccesDocument(1, { role: 'agent', userId: 5 })
    ).resolves.toBeUndefined();
  });

  it('ordinary non-owner, non-internally-visible + active row -> DOCUMENT_NON_AUTORISE', async () => {
    mockRows([[false, 999]]);
    const { verifierAccesDocument } = await import('./documents.service');

    await expect(
      verifierAccesDocument(1, { role: 'agent', userId: 5 })
    ).rejects.toThrow('DOCUMENT_NON_AUTORISE');
  });
});
