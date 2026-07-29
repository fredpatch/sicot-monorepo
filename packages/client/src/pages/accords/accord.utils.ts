import type { AccordStatut } from '@/lib/accords.api';
import { ACCORD_EXPIRY_WARNING_DAYS, ACCORD_STATUS_LABELS } from './accord.constants';
import type { Accord, AccordPartner } from './accord.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateOnly(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(year, month - 1, day);
}

export function formatAccordDate(value?: string | Date | null, month: 'short' | 'long' = 'short') {
  const date = parseDateOnly(value);
  if (!date) return '-';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });
}

export function daysUntilExpiration(accord: Pick<Accord, 'dateExpiration'>, now = new Date()) {
  const expiration = parseDateOnly(accord.dateExpiration);
  if (!expiration) return null;
  return Math.ceil((expiration.getTime() - parseDateOnly(now)!.getTime()) / MS_PER_DAY);
}

export function isExpired(accord: Pick<Accord, 'dateExpiration'>, now = new Date()) {
  const days = daysUntilExpiration(accord, now);
  return days !== null && days < 0;
}

export function isExpiringSoon(
  accord: Pick<Accord, 'dateExpiration' | 'statut'>,
  now = new Date()
) {
  const days = daysUntilExpiration(accord, now);
  return (
    accord.statut === 'actif' &&
    days !== null &&
    days >= 0 &&
    days <= ACCORD_EXPIRY_WARNING_DAYS
  );
}

export function formatExpiryLabel(accord: Pick<Accord, 'dateExpiration' | 'statut'>) {
  const days = daysUntilExpiration(accord);
  if (days === null) return 'Sans échéance';
  if (days < 0) return `Expiré depuis ${Math.abs(days)} j`;
  if (days === 0) return "Expire aujourd'hui";
  if (days <= ACCORD_EXPIRY_WARNING_DAYS) return `J-${days}`;
  const months = Math.max(1, Math.round(days / 30));
  return `Dans ${months} mois`;
}

export function getStatusLabel(statut: AccordStatut) {
  return ACCORD_STATUS_LABELS[statut] ?? statut;
}

export function formatPartnersSummary(partners: AccordPartner[]) {
  if (partners.length === 0) return '-';
  const first = partners[0];
  const rest = partners.length - 1;
  return rest > 0 ? `${first.nom} +${rest}` : first.nom;
}

export function formatPartnerCountries(partners: AccordPartner[]) {
  const countries = [...new Set(partners.map((partner) => partner.pays).filter(Boolean))];
  return countries.join(', ') || '-';
}

export function getPartnerCountries(partners: AccordPartner[]) {
  return [...new Set(partners.map((partner) => partner.pays).filter(Boolean))];
}

export function isRenewable(accord: Accord) {
  return accord.statut !== 'en_renouvellement';
}

export function getExpiryTone(accord: Pick<Accord, 'dateExpiration' | 'statut'>) {
  if (isExpired(accord) || accord.statut === 'expire') return 'critical';
  if (isExpiringSoon(accord)) return 'warning';
  return 'normal';
}
