import FormData from 'form-data';
import axios from 'axios';

// ── Configuration ─────────────────────────────────────────────────────────
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://localhost:5001';
const OCR_TIMEOUT_MS = 60000; // 60 secondes — les gros PDF peuvent prendre du temps

// ── Types ─────────────────────────────────────────────────────────────────
export interface OCRResult {
  texte: string;
  langue: string;
  format: string;
  caracteres: number;
  succes: boolean;
}

// ── Client OCR ────────────────────────────────────────────────────────────
const ocrClient = axios.create({
  baseURL: OCR_SERVICE_URL,
  timeout: OCR_TIMEOUT_MS,
});

// ── Extraire le texte d'un fichier ────────────────────────────────────────
export async function extraireTexte(params: {
  buffer: Buffer;
  nomFichier: string;
  mimeType: string;
}): Promise<OCRResult> {
  const { buffer, nomFichier, mimeType } = params;

  const formData = new FormData();
  formData.append('file', buffer, {
    filename: nomFichier,
    contentType: mimeType,
  });

  try {
    const response = await ocrClient.post<OCRResult>('/extract', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Le microservice a retourné une erreur métier
      if (error.response?.data?.error) {
        throw new Error(`OCR_ERREUR: ${error.response.data.error}`);
      }
      // Microservice injoignable
      if (error.code === 'ECONNREFUSED') {
        throw new Error('OCR_SERVICE_INDISPONIBLE');
      }
      // Timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('OCR_TIMEOUT');
      }
    }
    throw new Error('OCR_ERREUR_INCONNUE');
  }
}

// ── Vérifier que le microservice est disponible ───────────────────────────
export async function verifierServiceOCR(): Promise<boolean> {
  try {
    const response = await ocrClient.get('/health', { timeout: 3000 });
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}
