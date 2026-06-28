import { Response } from 'express';

// ── Traduction des codes d'erreur ─────────────────────────────────────────
export function handleDocumentsError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'ERREUR_INCONNUE';

  const errorMap: Record<string, { status: number; message: string }> = {
    DOCUMENT_INTROUVABLE: { status: 404, message: 'Document introuvable.' },
    OCR_SERVICE_INDISPONIBLE: { status: 503, message: 'Service OCR indisponible.' },
    OCR_TIMEOUT: { status: 504, message: 'Délai OCR dépassé.' },
  };

  const mapped = errorMap[message];
  if (mapped) {
    res.status(mapped.status).json({ message: mapped.message, code: message });
    return;
  }

  // Erreur OCR préfixée
  if (message.startsWith('OCR_ERREUR:')) {
    res.status(422).json({ message, code: 'OCR_ERREUR' });
    return;
  }

  console.error('[documents.controller]', error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}
