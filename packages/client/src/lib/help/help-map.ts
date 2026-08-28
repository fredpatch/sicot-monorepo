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
  {
    // Phase 10.2 — audited against TraductionsPage.tsx (registry) directly.
    // Note: TRANSLATION_PROCESS/REVIEW/APPROVE/ARCHIVE are always granted
    // together (operateur+, see role-capabilities.ts) — no real role holds
    // TRANSLATION_VIEW alone today. Sections stay capability-gated anyway,
    // both for correctness if that ever changes and because it's what a
    // TRANSLATION_VIEW-only viewer should see.
    routePattern: '/traductions',
    title: 'Aide - Registre des traductions',
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Ce registre liste les traductions liées aux demandes soumises. Chaque traduction passe par un ' +
          'atelier dédié (ouvert en cliquant dessus) où le texte peut être corrigé, puis approuvé.',
      },
      {
        id: 'traiter-relire-approuver',
        heading: 'Traiter, relire, approuver',
        body:
          'Ce sont des actions liées au statut de la traduction, pas des rôles fixes distincts : un même ' +
          'utilisateur habilité peut corriger le texte puis l’approuver lui-même — il n’y a pas d’obligation ' +
          'qu’une seconde personne relise ou valide.',
        capability: 'TRANSLATION_PROCESS',
      },
      {
        id: 'action-indisponible',
        heading: 'Si une action n’est pas disponible',
        body:
          'Les actions visibles dépendent à la fois de votre profil et du statut actuel de la traduction ' +
          '(par exemple : une traduction déjà Archivée ne peut plus être modifiée). Si une action attendue ' +
          'manque, vérifiez d’abord le statut affiché sur la ligne.',
      },
    ],
  },
  {
    // Audited against TraductionEditeur.tsx + WorkshopHeader.tsx. Statuses
    // confirmed from traductions.api.ts: a_reviser, en_relecture,
    // manuelle_requise (all editable/approvable) -> approuvee -> archivee.
    // No OCR interaction is surfaced on this page (OCR happens earlier, at
    // document level) — omitted per the Phase 10.2 brief.
    routePattern: '/traductions/:id',
    title: 'Aide - Atelier de traduction',
    sections: [
      {
        id: 'statut-et-actions',
        heading: 'Statut actuel et actions disponibles',
        body:
          'À réviser, En relecture et Manuelle requise sont des statuts modifiables : le texte peut être ' +
          'corrigé et sauvegardé. Approuvée et Archivée sont verrouillés — plus aucune modification du texte ' +
          'n’est possible.',
      },
      {
        id: 'corriger',
        heading: 'Corriger et sauvegarder',
        body:
          'Modifiez le texte dans le panneau de traduction, puis « Sauvegarder ». Le panneau d’assistance ' +
          'propose des suggestions du glossaire sur le texte sélectionné.',
        capability: 'TRANSLATION_PROCESS',
      },
      {
        id: 'approuver',
        heading: 'Approuver',
        body:
          'Disponible tant que la traduction n’est pas déjà Approuvée ou Archivée, dès qu’un texte final est ' +
          'présent. Vous pouvez approuver une traduction que vous venez vous-même de corriger — aucune seconde ' +
          'personne n’est requise.',
        capability: 'TRANSLATION_APPROVE',
      },
      {
        id: 'archiver',
        heading: 'Archiver',
        body: 'Disponible uniquement une fois la traduction Approuvée. L’archive et clôt son cycle.',
        capability: 'TRANSLATION_ARCHIVE',
      },
      {
        id: 'manuelle-requise',
        heading: 'Traduction manuelle requise',
        body:
          'Le moteur de traduction automatique n’a pas produit de résultat exploitable. Le texte source reste ' +
          'disponible ; saisissez la traduction manuellement dans le panneau de droite, puis sauvegardez et ' +
          'approuvez normalement. Si le moteur redevient disponible, un bouton « Relancer la traduction » ' +
          'apparaît.',
      },
    ],
  },
  {
    // Audited against MesMissionsPage.tsx directly — the neutral wording
    // below ("en attente du responsable désigné" / "aucun responsable
    // désigné") mirrors the page's own copy so the drawer never contradicts
    // what's on screen. No admin/assignment instructions here at all —
    // /mes-missions carries only MISSION_VIEW_OWN, never MISSION_MANAGE.
    routePattern: '/mes-missions',
    title: 'Aide - Mes missions',
    sections: [
      {
        id: 'vue-personnelle',
        heading: 'Vue personnelle, pas le registre global',
        body:
          'Cette page ne montre que les missions auxquelles vous participez — pas l’ensemble des missions de ' +
          'l’organisation.',
      },
      {
        id: 'responsable-rapport',
        heading: 'Rapport officiel et responsable désigné',
        body:
          'Une mission a un seul rapport officiel consolidé, pas un rapport par participant. Seul le ' +
          'participant désigné comme responsable du rapport peut le déposer depuis cette page. Si un autre ' +
          'participant est désigné, la ligne indique « En attente du responsable désigné ». Si personne n’a ' +
          'encore été désigné, elle indique « Aucun responsable désigné » — dans les deux cas, le dépôt n’est ' +
          'pas disponible pour vous ici.',
      },
    ],
  },
  {
    // Audited against MissionsPage.tsx. MISSION_MANAGE and
    // MISSION_RECOMMENDATION_MANAGE are both admin+-only today (bundled
    // with MISSION_REGISTRY_VIEW itself), so a view-only MISSION_REGISTRY_VIEW
    // holder is a theoretical case, same caveat as translations above —
    // gated correctly regardless.
    routePattern: '/missions',
    title: 'Aide - Registre des missions',
    sections: [
      {
        id: 'registre-global',
        heading: 'Registre global des missions',
        body:
          'Cette page liste toutes les missions et déplacements officiels de l’organisation, quel que soit le ' +
          'participant.',
      },
      {
        id: 'vs-mes-missions',
        heading: 'Différence avec « Mes missions »',
        body:
          '« Mes missions » (menu personnel) ne montre que les missions auxquelles un utilisateur participe. ' +
          'Ce registre montre l’ensemble.',
      },
      {
        id: 'gestion',
        heading: 'Créer et modifier une mission',
        body:
          'La création, la modification et l’annulation d’une mission se font depuis cette page ou la fiche ' +
          'détaillée d’une mission.',
        capability: 'MISSION_MANAGE',
      },
      {
        id: 'recommandations',
        heading: 'Gestion des recommandations',
        body:
          'L’ajout et le suivi des recommandations d’une mission se font depuis sa fiche détaillée, onglet ' +
          '« Recommandations ».',
        capability: 'MISSION_RECOMMENDATION_MANAGE',
      },
      {
        id: 'responsable-rapport',
        heading: 'Désigner le responsable du rapport',
        body:
          'Le responsable désigné du rapport doit obligatoirement être un participant de la mission — il se ' +
          'choisit depuis la fiche détaillée de la mission, onglet « Rapport ».',
        capability: 'MISSION_MANAGE',
      },
    ],
  },
  {
    // Audited against MissionDetailPage.tsx (section tabs) +
    // MissionReportSection.tsx + MissionRecommendationsSection.tsx +
    // MissionParticipantsSection.tsx. Report section explicitly enforces
    // "one official report field, not one per participant" — reflected
    // below. rapportResponsableId itself never appears in copy — the UI
    // already says "Responsable du rapport" / "responsable désigné".
    routePattern: '/missions/:id',
    title: 'Aide - Fiche mission',
    sections: [
      {
        id: 'sections',
        heading: 'Sections de la fiche',
        body:
          'Aperçu, Participants, Logistique, Rapport, Recommandations, Notifications et Historique — ' +
          'accessibles depuis le menu à gauche de la fiche.',
      },
      {
        id: 'participants',
        heading: 'Participants',
        body:
          'La liste des participants est visible par tous les consultants du registre. La modifier ' +
          '(« Modifier les participants ») est réservé à la gestion des missions.',
        capability: 'MISSION_MANAGE',
      },
      {
        id: 'rapport-officiel',
        heading: 'Rapport officiel consolidé',
        body:
          'Une mission n’a qu’un seul rapport officiel — pas un rapport par participant. L’onglet Rapport ' +
          'permet de désigner le participant responsable de son dépôt, puis de déposer ou remplacer le fichier ' +
          '(nouveau fichier ou document existant du dossier documentaire).',
        capability: 'MISSION_MANAGE',
      },
      {
        id: 'recommandations-detail',
        heading: 'Recommandations',
        body:
          'Chaque recommandation a un statut et, si elle a un responsable et une échéance dépassée, apparaît ' +
          'comme dépassée. L’ajout et la relance par notification se font depuis cet onglet.',
        capability: 'MISSION_RECOMMENDATION_MANAGE',
      },
      {
        id: 'notifications-historique',
        heading: 'Notifications et historique',
        body:
          'L’onglet Notifications retrace les relances envoyées pour les recommandations de cette mission ; ' +
          'l’onglet Historique indique les dates de création et de dernière modification.',
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
