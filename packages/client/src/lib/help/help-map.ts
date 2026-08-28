// packages/client/src/lib/help/help-map.ts
//
// Static content source for the contextual Help Drawer (Phase 10.1). Route
// visibility already comes from CapabilityRoute (router.tsx) - this module
// only decides *what to say* once a route is reachable, and hides individual
// sections a viewer's role can't act on. Never re-derives visibility from
// role name: every gate here goes through hasCapability(), same helper as
// router.tsx/Layout.tsx.
//
// Content strategy (Phase 10 audit, §3): TS objects, not Markdown - this
// content is short, changes alongside the workflow rules it documents, and
// benefits from being type-checked against real Capability literals. Long-
// form /aide and /docs content (not built yet, Phase 10.2+) is a different
// shape and will be Markdown.
//
// i18n note: drawer chrome (trigger label, fallback copy) goes through
// react-i18next (see i18n/index.ts, `aide` namespace). The contextual
// section content below is French-only for now - the wider application
// isn't fully translated yet, and duplicating this much prose into an `en`
// resource before it's needed would be wasted work. Each entry's copy is
// still one string per field (heading/body), which is the shape i18next
// keys already have - moving it into resources later is a value swap, not a
// restructure.
import type { Capability, UserRole } from '@sicot/shared';
import { hasCapability } from '@sicot/shared';

export interface HelpSection {
  id: string;
  heading: string;
  body: string;
  /** Hidden unless the viewer holds this capability. Omit for sections true for every viewer who can already reach the route. */
  capability?: Capability;
}

export interface HelpEntry {
  /** Route template, matched against the current pathname - supports `:param` segments (e.g. '/missions/:id') for forward compatibility, even though no Phase 10.1 entry needs one yet. */
  routePattern: string;
  title: string;
  sections: HelpSection[];
}

export const HELP_MAP: HelpEntry[] = [
  {
    routePattern: '/demandes',
    title: 'Aide - File des demandes',
    sections: [
      {
        id: 'registre-vs-mes-demandes',
        heading: 'Registre global et « Mes demandes »',
        body:
          'Cette page affiche toutes les demandes de traduction du système, quel que soit le demandeur. ' +
          '« Mes demandes » (menu personnel) ne montre que celles que vous avez vous-même soumises. Les deux ' +
          'écrans consultent les mêmes données, avec un périmètre différent.',
      },
      {
        id: 'cycle-de-vie',
        heading: 'Cycle de vie d’une demande',
        body:
          'Soumise → En cours (prise en charge par un traducteur) → En relecture → Validée → Archivée. ' +
          'Une demande peut aussi être rappelée par son demandeur tant qu’elle est encore au statut Soumise.',
      },
      {
        id: 'prendre-en-charge',
        heading: 'Prendre en charge une demande',
        body:
          'Disponible sur une demande Soumise et non verrouillée. La prendre en charge la fait passer En cours ' +
          'et vous l’assigne comme traducteur.',
        capability: 'REQUEST_TAKE',
      },
      {
        id: 'priorite-vs-validation',
        heading: 'Valider la priorité - différent de valider la demande',
        body:
          'La validation de priorité confirme ou ajuste le niveau d’urgence demandé ; elle reste possible à ' +
          'tout moment tant que la demande n’est pas archivée. La validation de la demande, elle, clôt le ' +
          'travail de traduction et n’est possible qu’une fois la demande En relecture.',
        capability: 'REQUEST_PRIORITY_VALIDATE',
      },
      {
        id: 'valider',
        heading: 'Valider une demande',
        body: 'Disponible uniquement sur une demande En relecture. La fait passer au statut Validée.',
        capability: 'REQUEST_VALIDATE',
      },
      {
        id: 'archiver',
        heading: 'Archiver une demande',
        body: 'Disponible uniquement sur une demande Validée. L’archive et clôt définitivement son cycle.',
        capability: 'REQUEST_ARCHIVE',
      },
    ],
  },
  {
    routePattern: '/mes-demandes',
    title: 'Aide - Mes demandes',
    sections: [
      {
        id: 'creer',
        heading: 'Créer une demande',
        body:
          'Utilisez « Nouvelle demande » pour soumettre un document (avec OCR) ou un texte libre à traduire, ' +
          'en précisant la direction (FR→EN ou EN→FR) et la priorité souhaitée.',
        capability: 'REQUEST_CREATE_OWN',
      },
      {
        id: 'suivre',
        heading: 'Suivre mes demandes',
        body:
          'Cette page ne montre que les demandes que vous avez soumises vous-même - pas la file globale de ' +
          'traduction. Le statut de chaque demande évolue automatiquement à mesure qu’elle est traitée.',
      },
      {
        id: 'rappeler',
        heading: 'Rappeler une demande',
        body:
          'Possible uniquement tant que votre demande est encore au statut Soumise, c’est-à-dire avant ' +
          'qu’un traducteur ne l’ait prise en charge. Une fois rappelée, elle est archivée et ne peut ' +
          'plus être reprise.',
        capability: 'REQUEST_RECALL_OWN',
      },
      {
        id: 'statuts',
        heading: 'Comprendre les statuts',
        body:
          'Soumise : en attente de prise en charge. En cours : un traducteur y travaille. En relecture : ' +
          'traduction terminée, en cours de vérification. Validée : relecture confirmée. Archivée : cycle clos ' +
          '(validation ou rappel).',
      },
    ],
  },
];

function matchesPattern(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every(
    (segment, i) => segment.startsWith(':') || segment === pathSegments[i]
  );
}

/** Finds the help entry for the current route, if any - matches route templates (`:id` segments included), not literal paths. */
export function getHelpEntry(pathname: string): HelpEntry | undefined {
  return HELP_MAP.find((entry) => matchesPattern(entry.routePattern, pathname));
}

/** Returns the entry with only the sections the given role may act on - sections without a capability requirement are always kept. */
export function filterHelpEntry(entry: HelpEntry, role: UserRole | undefined): HelpEntry {
  return {
    ...entry,
    sections: entry.sections.filter(
      (section) => !section.capability || (!!role && hasCapability(role, section.capability))
    ),
  };
}
