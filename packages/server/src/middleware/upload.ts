import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// ── Types MIME autorisés ───────────────────────────────────────────────────
export const TYPES_AUTORISES = [
  'application/pdf',
  'application/msword',                                                          // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',    // .docx
  'application/vnd.ms-excel',                                                    // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',          // .xlsx
  'text/plain',                                                                  // .txt
  'image/jpeg',
  'image/png',
  'image/tiff',
];

const TAILLE_MAX = 50 * 1024 * 1024; // 50 Mo

// ── Instance multer — stockage mémoire ────────────────────────────────────
// memoryStorage : le buffer est passé directement au service OCR sans écriture intermédiaire
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX },
  fileFilter: (_req, file, cb) => {
    if (TYPES_AUTORISES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`FORMAT_NON_SUPPORTE: ${file.mimetype}`));
    }
  },
});

// ── Middleware de gestion des erreurs Multer ──────────────────────────────
// À placer après upload.single() dans la chaîne de middlewares
export function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        message: `Fichier trop volumineux. Taille maximale : ${TAILLE_MAX / 1024 / 1024} Mo.`,
        code: 'FICHIER_TROP_GRAND',
      });
      return;
    }
    res.status(400).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof Error && err.message.startsWith('FORMAT_NON_SUPPORTE')) {
    res.status(415).json({
      message: 'Format de fichier non supporté.',
      code: 'FORMAT_NON_SUPPORTE',
      formatsAcceptes: TYPES_AUTORISES,
    });
    return;
  }

  next(err);
}
