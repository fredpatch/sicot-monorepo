import type { Contact, ContactQualityFilter, Organisation } from './partenaires.types';

export function formatPartnerDate(value?: string | Date | null, month: 'short' | 'long' = 'short') {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });
}

export function getOrganisationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    anac_etrangere: 'ANAC étrangère',
    organisation_internationale: 'Organisation internationale',
    autre: 'Autre organisation',
  };
  return labels[type] ?? type;
}

export function getPrincipalContact(organisation: Organisation) {
  return organisation.contactPrincipal ?? organisation.contacts?.find((contact) => contact.principal);
}

export function getActiveContactsCount(organisation: Organisation) {
  if (organisation.contactsActifsCount !== undefined) return organisation.contactsActifsCount;
  return organisation.contacts?.filter((contact) => contact.actif).length ?? 0;
}

export function getTotalContactsCount(organisation: Organisation) {
  if (organisation.contactsTotalCount !== undefined) return organisation.contactsTotalCount;
  return organisation.contacts?.length ?? 0;
}

export function getContactHealth(organisation: Organisation) {
  const activeCount = getActiveContactsCount(organisation);
  const principal = getPrincipalContact(organisation);

  if (activeCount === 0) {
    return {
      key: 'sans_contact_actif' as const,
      label: 'Sans contact actif',
      tone: 'red' as const,
      helper: 'Action requise',
    };
  }

  if (!principal || !principal.actif) {
    return {
      key: 'avec_contact_sans_principal' as const,
      label: 'Sans principal',
      tone: 'amber' as const,
      helper: 'Principal à définir',
    };
  }

  if (!principal.email && !principal.telephone) {
    return {
      key: 'principal_incomplet' as const,
      label: 'Contact incomplet',
      tone: 'amber' as const,
      helper: 'Email ou téléphone manquant',
    };
  }

  return {
    key: 'complet' as const,
    label: 'Complet',
    tone: 'green' as const,
    helper: 'Contact principal disponible',
  };
}

export function getContactQualityLabel(value: ContactQualityFilter) {
  const labels: Record<Exclude<ContactQualityFilter, ''>, string> = {
    avec_principal: 'Avec contact principal',
    avec_contact_sans_principal: 'Contact sans principal',
    sans_contact_actif: 'Sans contact actif',
  };
  return value ? labels[value] : 'Tous les contacts';
}

export function formatContactName(contact?: Contact) {
  if (!contact) return 'Aucun contact principal';
  return `${contact.prenom} ${contact.nom}`;
}

export function getCountryMark(country: string) {
  const normalized = country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const marks: Record<string, { background: string; symbol?: 'dot' | 'cross' | 'canada' }> = {
    allemagne: { background: 'linear-gradient(#000 0 33%, #dd0000 33% 66%, #ffce00 66%)' },
    belgique: { background: 'linear-gradient(90deg, #000 0 33%, #ffd90c 33% 66%, #ef3340 66%)' },
    cameroun: { background: 'linear-gradient(90deg, #007a5e 0 33%, #ce1126 33% 66%, #fcd116 66%)', symbol: 'dot' },
    canada: { background: 'linear-gradient(90deg, #d80621 0 25%, #fff 25% 75%, #d80621 75%)', symbol: 'canada' },
    chine: { background: '#de2910', symbol: 'dot' },
    'cote d ivoire': { background: 'linear-gradient(90deg, #f77f00 0 33%, #fff 33% 66%, #009e60 66%)' },
    espagne: { background: 'linear-gradient(#aa151b 0 25%, #f1bf00 25% 75%, #aa151b 75%)' },
    'etats-unis': { background: 'linear-gradient(#b22234 0 14%, #fff 14% 28%, #b22234 28% 42%, #fff 42% 56%, #b22234 56% 70%, #fff 70% 84%, #b22234 84%)' },
    'etats unis': { background: 'linear-gradient(#b22234 0 14%, #fff 14% 28%, #b22234 28% 42%, #fff 42% 56%, #b22234 56% 70%, #fff 70% 84%, #b22234 84%)' },
    france: { background: 'linear-gradient(90deg, #002395 0 33%, #fff 33% 66%, #ed2939 66%)' },
    gabon: { background: 'linear-gradient(#009e60 0 33%, #fcd116 33% 66%, #3a75c4 66%)' },
    maroc: { background: '#c1272d', symbol: 'dot' },
    senegal: { background: 'linear-gradient(90deg, #00853f 0 33%, #fdef42 33% 66%, #e31b23 66%)', symbol: 'dot' },
    suisse: { background: '#d52b1e', symbol: 'cross' },
  };

  return marks[normalized];
}
