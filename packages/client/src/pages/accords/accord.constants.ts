import type { AccordStatut } from '@/lib/accords.api';

export const ACCORD_EXPIRY_WARNING_DAYS = 90;

export const ACCORD_STATUS_LABELS: Record<AccordStatut, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  suspendu: 'Suspendu',
  en_renouvellement: 'En renouvellement',
};

export const ACCORD_STATUS_OPTIONS: { value: AccordStatut; label: string }[] = [
  { value: 'actif', label: ACCORD_STATUS_LABELS.actif },
  { value: 'expire', label: ACCORD_STATUS_LABELS.expire },
  { value: 'suspendu', label: ACCORD_STATUS_LABELS.suspendu },
  { value: 'en_renouvellement', label: ACCORD_STATUS_LABELS.en_renouvellement },
];

export const ACCORD_PAGE_SIZE = 8;
