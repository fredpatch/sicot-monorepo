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
// form /aide and /docs content (Phase 10.3, packages/client/src/lib/docs/)
// is a different shape and is Markdown - entries here link out to it via
// `articles` rather than duplicating it.
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
  /** Slugs of related long-form /aide articles (Phase 10.3) - resolved through getVisibleArticleBySlug() by the drawer, so a capability-gated article never appears as a link to a viewer who can't open it. Short "En savoir plus" links only, never a substitute for the section content above. */
  articles?: string[];
}

export const HELP_MAP: HelpEntry[] = [
  {
    routePattern: '/demandes',
    title: 'Aide - File des demandes',
    articles: ['statuts-demande'],
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
    articles: ['creer-suivre-demande', 'statuts-demande'],
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
    // Phase 10.2 - audited against TraductionsPage.tsx (registry) directly.
    // Note: TRANSLATION_PROCESS/REVIEW/APPROVE/ARCHIVE are always granted
    // together (operateur+, see role-capabilities.ts) - no real role holds
    // TRANSLATION_VIEW alone today. Sections stay capability-gated anyway,
    // both for correctness if that ever changes and because it's what a
    // TRANSLATION_VIEW-only viewer should see.
    routePattern: '/traductions',
    title: 'Aide - Registre des traductions',
    articles: ['traiter-relire-approuver'],
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
          'utilisateur habilité peut corriger le texte puis l’approuver lui-même - il n’y a pas d’obligation ' +
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
    // document level) - omitted per the Phase 10.2 brief.
    routePattern: '/traductions/:id',
    title: 'Aide - Atelier de traduction',
    articles: ['traiter-relire-approuver'],
    sections: [
      {
        id: 'statut-et-actions',
        heading: 'Statut actuel et actions disponibles',
        body:
          'À réviser, En relecture et Manuelle requise sont des statuts modifiables : le texte peut être ' +
          'corrigé et sauvegardé. Approuvée et Archivée sont verrouillés - plus aucune modification du texte ' +
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
          'présent. Vous pouvez approuver une traduction que vous venez vous-même de corriger - aucune seconde ' +
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
    // Audited against MesMissionsPage.tsx directly - the neutral wording
    // below ("en attente du responsable désigné" / "aucun responsable
    // désigné") mirrors the page's own copy so the drawer never contradicts
    // what's on screen. No admin/assignment instructions here at all -
    // /mes-missions carries only MISSION_VIEW_OWN, never MISSION_MANAGE.
    routePattern: '/mes-missions',
    title: 'Aide - Mes missions',
    articles: ['rapport-mission'],
    sections: [
      {
        id: 'vue-personnelle',
        heading: 'Vue personnelle, pas le registre global',
        body:
          'Cette page ne montre que les missions auxquelles vous participez - pas l’ensemble des missions de ' +
          'l’organisation.',
      },
      {
        id: 'responsable-rapport',
        heading: 'Rapport officiel et responsable désigné',
        body:
          'Une mission a un seul rapport officiel consolidé, pas un rapport par participant. Seul le ' +
          'participant désigné comme responsable du rapport peut le déposer depuis cette page. Si un autre ' +
          'participant est désigné, la ligne indique « En attente du responsable désigné ». Si personne n’a ' +
          'encore été désigné, elle indique « Aucun responsable désigné » - dans les deux cas, le dépôt n’est ' +
          'pas disponible pour vous ici.',
      },
    ],
  },
  {
    // Audited against MissionsPage.tsx. MISSION_MANAGE and
    // MISSION_RECOMMENDATION_MANAGE are both admin+-only today (bundled
    // with MISSION_REGISTRY_VIEW itself), so a view-only MISSION_REGISTRY_VIEW
    // holder is a theoretical case, same caveat as translations above -
    // gated correctly regardless.
    routePattern: '/missions',
    title: 'Aide - Registre des missions',
    articles: ['rapport-mission'],
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
          'Le responsable désigné du rapport doit obligatoirement être un participant de la mission - il se ' +
          'choisit depuis la fiche détaillée de la mission, onglet « Rapport ».',
        capability: 'MISSION_MANAGE',
      },
    ],
  },
  {
    // Audited against MissionDetailPage.tsx (section tabs) +
    // MissionReportSection.tsx + MissionRecommendationsSection.tsx +
    // MissionParticipantsSection.tsx. Report section explicitly enforces
    // "one official report field, not one per participant" - reflected
    // below. rapportResponsableId itself never appears in copy - the UI
    // already says "Responsable du rapport" / "responsable désigné".
    routePattern: '/missions/:id',
    title: 'Aide - Fiche mission',
    articles: ['rapport-mission'],
    sections: [
      {
        id: 'sections',
        heading: 'Sections de la fiche',
        body:
          'Aperçu, Participants, Logistique, Rapport, Recommandations, Notifications et Historique - ' +
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
          'Une mission n’a qu’un seul rapport officiel - pas un rapport par participant. L’onglet Rapport ' +
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
  {
    // Phase 10.4 — audited against DocumentsPage.tsx, documents.columns.tsx,
    // DocumentActionsMenu.tsx, DocumentWorkspace.tsx, and the server's
    // documents.route.ts. /documents itself carries no route-level
    // capability gate (auth only) — visibility/actions are entirely
    // per-document, via getDocumentCapabilities(). Two capability-naming
    // mismatches were found and fixed during this audit (nouvelle version
    // was gated on DOCUMENT_CATEGORY_MANAGE instead of DOCUMENT_UPLOAD;
    // category change was gated on DOCUMENT_UPLOAD instead of
    // DOCUMENT_CATEGORY_MANAGE) — sections below reflect the corrected,
    // accurate capability per action.
    routePattern: '/documents',
    title: 'Aide - Bibliothèque de documents',
    articles: ['comprendre-bibliotheque-documents', 'publier-portail-externe'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'La bibliothèque centralise les documents déposés dans SICOT (pièces jointes de demandes, rapports ' +
          'de mission, documents de coopération...).',
      },
      {
        id: 'visibilite-variable',
        heading: 'Pourquoi le contenu visible peut différer',
        body:
          'Deux comptes connectés ne voient pas nécessairement les mêmes documents ni les mêmes colonnes - ' +
          'cela dépend de règles d’accès et du contexte de chaque document, pas de la page consultée.',
      },
      {
        id: 'deposer',
        heading: 'Déposer un document',
        body:
          'Déposer un fichier est une opération de stockage : cela ne le rend ni visible en interne, ni ' +
          'publié sur le portail externe. Ce sont deux étapes distinctes, à faire séparément.',
        capability: 'DOCUMENT_UPLOAD',
      },
      {
        id: 'visibilite-interne',
        heading: 'Visibilité interne',
        body:
          'Rend un document consultable par le personnel interne au-delà du seul déposant - distinct de la ' +
          'publication externe.',
        capability: 'DOCUMENT_INTERNAL_VISIBILITY_MANAGE',
      },
      {
        id: 'publication-portail',
        heading: 'Publication sur le portail externe',
        body:
          'Rend un document accessible au public, en dehors de SICOT, via un lien sécurisé - une étape ' +
          'supplémentaire et réversible, distincte du dépôt et de la visibilité interne. Uniquement pour un ' +
          'document dont l’OCR est traité.',
        capability: 'PORTAL_PUBLICATION_MANAGE',
      },
      {
        id: 'ocr',
        heading: 'Correction et relance OCR',
        body: 'Corriger le texte extrait ou relancer la reconnaissance après un échec.',
        capability: 'DOCUMENT_OCR_MANAGE',
      },
      {
        id: 'suppression',
        heading: 'Retirer un document',
        body: 'La suppression est réversible (restauration possible).',
        capability: 'DOCUMENT_DELETE',
      },
    ],
  },
  {
    // Phase 10.4 — audited against GlossairePage.tsx and the server's
    // glossaire.route.ts; mutation controls (create/edit/deactivate/
    // reactivate) are now gated on GLOSSARY_MANAGE via
    // glossary.permissions.ts (final Phase 10.4 alignment pass), matching
    // the sections below.
    routePattern: '/glossaire',
    title: 'Aide - Glossaire terminologique',
    articles: ['utiliser-glossaire'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert le glossaire',
        body:
          'Recense la terminologie officielle FR/EN utilisée dans les traductions, pour garder un vocabulaire ' +
          'cohérent d’une traduction à l’autre.',
      },
      {
        id: 'rechercher',
        heading: 'Rechercher un terme',
        body:
          'Filtrez par texte, domaine ou statut. Une suggestion du glossaire apparaît aussi automatiquement ' +
          'dans l’atelier de traduction sur un passage de texte sélectionné.',
      },
      {
        id: 'gestion',
        heading: 'Créer, modifier, désactiver un terme',
        body: 'Réservé aux comptes disposant du droit de gestion du glossaire.',
        capability: 'GLOSSARY_MANAGE',
      },
    ],
  },
  {
    // Phase 10.4 — audited against MonEspacePage.tsx + MyRequestsPanel.tsx +
    // MyMissionsPanel.tsx + WorkspaceFooterCards.tsx. A real bug was found
    // and fixed during this audit: MyMissionsPanel's report-upload button
    // used the admin-only mettreAJour mutation and showed "Rapport à
    // déposer" to any participant, not just the designated
    // rapportResponsableId — the same bug Phase 8 already fixed on the full
    // /mes-missions page, missed here. Now uses definirRapportPersonnel and
    // the same responsable check.
    routePattern: '/mon-espace',
    title: 'Aide - Mon espace',
    articles: ['mon-espace'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'Votre point d’entrée personnel',
        body:
          'Regroupe un résumé de vos demandes de traduction et missions, sans mélanger vos données avec ' +
          'celles de l’ensemble de l’organisation.',
      },
      {
        id: 'vs-registres-globaux',
        heading: 'Espace personnel et registres globaux',
        body:
          'Pour le détail complet et filtrable de vos demandes, direction « Mes demandes » ; pour vos ' +
          'missions, « Mes missions ». Mon espace n’en montre qu’un aperçu.',
      },
      {
        id: 'modules-disponibles',
        heading: 'Pourquoi certains modules n’apparaissent pas',
        body:
          'Les modules visibles dans la barre latérale dépendent de vos droits d’accès et de vos ' +
          'responsabilités dans SICOT, pas de la page où vous vous trouvez - un module absent n’est jamais un ' +
          'signe d’erreur.',
      },
    ],
  },
  {
    // Phase 10.5 — audited against AccordsPage.tsx, AccordDetail.tsx,
    // AccordRegistryTable.tsx, router.tsx and the server's accords.route.ts.
    // A capability-naming mismatch was found and fixed during this audit:
    // /accords/new and /accords/:id/edit were route-guarded on AGREEMENT_VIEW
    // instead of AGREEMENT_MANAGE (mirrored in AccordsPage.tsx's "Nouvel
    // accord" button and AccordDetail.tsx's Modifier/Renouveler/notify
    // actions, none of which checked a capability at all before this phase)
    // — sections below reflect the corrected, accurate capability per action.
    routePattern: '/accords',
    title: 'Aide - Registre des accords',
    articles: ['gerer-suivre-accords'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Liste les accords et conventions de coopération internationale de l’organisation, avec leur statut ' +
          'et leur échéance.',
      },
      {
        id: 'statuts-echeance',
        heading: 'Statuts et échéance',
        body:
          'Un accord peut être actif, expiré, suspendu ou en renouvellement. Une échéance proche (90 jours ou ' +
          'moins) ou dépassée est signalée directement dans le registre.',
      },
      {
        id: 'gestion',
        heading: 'Créer, modifier, renouveler',
        body:
          'La création, la modification et le renouvellement d’un accord sont réservés aux comptes disposant ' +
          'du droit de gestion des accords.',
        capability: 'AGREEMENT_MANAGE',
      },
    ],
  },
  {
    // Audited against AccordDetail.tsx (section tabs) + the server's
    // notifications.policies.ts (peutEnvoyerNotification: AGREEMENT_MANAGE
    // to send an échéance notification, AGREEMENT_VIEW to view its history).
    routePattern: '/accords/:id',
    title: 'Aide - Fiche accord',
    articles: ['gerer-suivre-accords'],
    sections: [
      {
        id: 'sections',
        heading: 'Sections de la fiche',
        body:
          'Aperçu, Partenaires, Document, Validité et versions, Notifications - accessibles depuis le menu à ' +
          'gauche de la fiche.',
      },
      {
        id: 'validite-versions',
        heading: 'Validité et versions',
        body:
          'Un accord renouvelé garde un lien vers ses versions précédente et suivante, consultable depuis cet ' +
          'onglet - l’historique de suivi n’est jamais perdu lors d’un renouvellement.',
      },
      {
        id: 'modifier-renouveler',
        heading: 'Modifier et renouveler',
        body:
          'Le renouvellement crée une nouvelle version de l’accord et fait passer la version actuelle au ' +
          'statut « En renouvellement ».',
        capability: 'AGREEMENT_MANAGE',
      },
      {
        id: 'notifications',
        heading: 'Relancer les partenaires',
        body:
          'Préparer une relance ou notifier l’ensemble des partenaires associés se fait depuis l’onglet ' +
          'Notifications. L’historique des relances envoyées y reste consultable même sans ce droit.',
        capability: 'AGREEMENT_MANAGE',
      },
    ],
  },
  {
    // Phase 10.5 — audited against PartenairesPage.tsx,
    // PartenaireDetailPage.tsx, PartenairesRegistryTable.tsx, router.tsx and
    // the server's organisations.route.ts. A capability-naming mismatch was
    // found and fixed during this audit: /partenaires/new and
    // /partenaires/:id/edit were route-guarded on PARTNER_VIEW instead of
    // PARTNER_MANAGE (mirrored in the page's action buttons, none of which
    // checked a capability before this phase). Contacts have no separate
    // capability server-side - creating, editing, or setting a contact as
    // principal all require PARTNER_MANAGE too, reflected below rather than
    // assuming a dedicated contact capability exists.
    routePattern: '/partenaires',
    title: 'Aide - Annuaire des partenaires',
    articles: ['gerer-partenaires'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Recense les organisations partenaires de la coopération internationale de l’ANAC, avec leurs pays, ' +
          'contacts et accords associés.',
      },
      {
        id: 'organisation-vs-contact',
        heading: 'Organisation et contact',
        body:
          'Une organisation (le partenaire) et ses contacts sont distincts - une organisation peut avoir ' +
          'plusieurs contacts, dont l’un peut être désigné contact principal.',
      },
      {
        id: 'gestion',
        heading: 'Créer et modifier',
        body:
          'La création et la modification d’une organisation, ainsi que la gestion de ses contacts, sont ' +
          'réservées aux comptes disposant du droit de gestion des partenaires.',
        capability: 'PARTNER_MANAGE',
      },
    ],
  },
  {
    // Audited against PartenaireDetailPage.tsx (section tabs + contact
    // management dialog).
    routePattern: '/partenaires/:id',
    title: 'Aide - Fiche partenaire',
    articles: ['gerer-partenaires'],
    sections: [
      {
        id: 'sections',
        heading: 'Sections de la fiche',
        body:
          'Aperçu, Contacts, Informations, Accords liés, Informations système - accessibles depuis le menu à ' +
          'gauche de la fiche.',
      },
      {
        id: 'accords-lies',
        heading: 'Accords liés',
        body: 'Liste les accords de coopération associés à cette organisation, avec un accès direct à chacun.',
      },
      {
        id: 'gestion-contacts',
        heading: 'Gérer les contacts',
        body:
          'Ajouter, modifier un contact ou en désigner un comme principal se fait depuis l’onglet Contacts - ' +
          'réservé aux comptes disposant du droit de gestion des partenaires.',
        capability: 'PARTNER_MANAGE',
      },
    ],
  },
  {
    // Phase 10.5 — audited against CourriersPage.tsx, CourrierDetailPage.tsx
    // (+ CourrierDetailHeader/DocumentSection/ResponseSection), router.tsx
    // and the server's courriers.route.ts. A capability-naming mismatch was
    // found and fixed during this audit: /courriers/new and
    // /courriers/:id/edit were route-guarded on CORRESPONDENCE_VIEW instead
    // of CORRESPONDENCE_MANAGE (mirrored in the page's action buttons, none
    // of which checked a capability before this phase). No formal approval
    // circuit or signature flow exists in the current implementation -
    // suivi is limited to en_attente/répondu/archivé, reflected below rather
    // than describing a workflow the application doesn't have.
    routePattern: '/courriers',
    title: 'Aide - Registre des courriers',
    articles: ['suivre-courriers'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Liste les courriers entrants et sortants liés à la coopération internationale, avec leur statut de ' +
          'suivi et leur échéance de réponse.',
      },
      {
        id: 'entrant-sortant',
        heading: 'Entrant et sortant',
        body:
          'Un courrier entrant est reçu ; un courrier sortant est envoyé. Répondre à un courrier entrant crée ' +
          'automatiquement un nouveau courrier sortant, relié à l’original.',
      },
      {
        id: 'gestion',
        heading: 'Enregistrer, modifier, répondre, archiver',
        body:
          'Ces actions sont réservées aux comptes disposant du droit de gestion des courriers.',
        capability: 'CORRESPONDENCE_MANAGE',
      },
    ],
  },
  {
    // Audited against CourrierDetailHeader.tsx (peutRepondre/peutArchiver/
    // peutRelancer local rules) + CourrierResponseSection.tsx +
    // CourrierDocumentSection.tsx + the server's notifications.policies.ts
    // (peutEnvoyerNotification: CORRESPONDENCE_MANAGE to send a relance,
    // CORRESPONDENCE_VIEW to view its history).
    routePattern: '/courriers/:id',
    title: 'Aide - Fiche courrier',
    articles: ['suivre-courriers'],
    sections: [
      {
        id: 'sections',
        heading: 'Sections de la fiche',
        body:
          'Aperçu, Documents, Réponse / Courriers liés, Historique - accessibles depuis le menu à gauche de la ' +
          'fiche.',
      },
      {
        id: 'suivi-reponse',
        heading: 'Suivi de la réponse',
        body:
          'Le statut et, pour un courrier entrant en attente, la date limite de réponse sont visibles dans ' +
          'l’onglet Réponse / Courriers liés, avec l’historique des relances envoyées.',
      },
      {
        id: 'documents-joints',
        heading: 'Documents joints',
        body: 'Consultables par tout compte pouvant consulter le courrier ; ajouter ou retirer un document est réservé à la gestion des courriers.',
        capability: 'CORRESPONDENCE_MANAGE',
      },
      {
        id: 'repondre-relancer',
        heading: 'Répondre et relancer',
        body:
          'Répondre, archiver ou préparer une relance pour un courrier entrant en attente sont réservés à la ' +
          'gestion des courriers.',
        capability: 'CORRESPONDENCE_MANAGE',
      },
    ],
  },
  {
    // Phase 10.6 — audited against AdminUsersPage.tsx, UsersTab.tsx,
    // PersonnelAnacTab.tsx, UserActionsMenu.tsx, users.permissions.ts,
    // router.tsx and Layout.tsx's nav config. The route guard (USER_MANAGE),
    // the sidebar nav link, and the server's mutation endpoints all
    // consistently require USER_MANAGE — the server's GET /utilisateurs
    // list endpoint itself only requires the more lenient
    // USER_DIRECTORY_VIEW (shared with mission-participant pickers
    // elsewhere), but nothing in the actual UI (route, nav, or any button)
    // exposes that wider access today, so this isn't a live mismatch to
    // fix — reported to the user as a verified, consistently-applied
    // design rather than a bug. No sections below are gated separately:
    // the entire page (viewing and every mutation) already requires
    // USER_MANAGE just to be reached.
    routePattern: '/utilisateurs',
    title: 'Aide - Gestion des utilisateurs',
    articles: ['gerer-comptes-utilisateurs'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Gère les comptes SICOT (rôle, statut, réinitialisation OTP) et donne accès à l’annuaire Personnel ' +
          'ANAC pour créer un compte à partir d’un agent existant.',
      },
      {
        id: 'roles',
        heading: 'Le modèle de rôles',
        body:
          'Chaque compte porte un seul rôle parmi Agent, Opérateur, Admin, Super Admin - modifiable depuis la ' +
          'fiche du compte.',
      },
      {
        id: 'protections',
        heading: 'Protections de compte',
        body:
          'Un compte ne peut pas se désactiver lui-même, et le compte Super Admin ne peut jamais être ' +
          'désactivé, par personne.',
      },
    ],
  },
  {
    // Phase 10.6 — audited against AdminPage.tsx (Paramètres / Monitoring &
    // Jobs tabs), ParameterSection/ParameterCard/AdminInfoBanner.tsx,
    // JobsList/JobRow/JobHistoryTable.tsx, admin.permissions.ts, router.tsx.
    // /admin is a single route (SYSTEM_SETTINGS_VIEW) hosting both tabs -
    // there is no separate route per tab. Settings read/write already
    // correctly split client-side (canEditParameter → SYSTEM_SETTINGS_MANAGE,
    // super_admin only); jobs already correctly gated per-job via
    // canRunJob(role, job.executionCapability), either JOB_EXECUTE (admin+)
    // or SYSTEM_ADMIN_OPERATION (super_admin only, shown but disabled for
    // admin) - no mismatch found on this route.
    routePattern: '/admin',
    title: 'Aide - Administration',
    articles: ['gerer-parametres-systeme', 'executer-operations-administratives'],
    sections: [
      {
        id: 'parametres',
        heading: 'Paramètres du système',
        body:
          'Réglages regroupés par thème (Métier, Sécurité, Sauvegardes, Traduction, IA). Visibles par tout ' +
          'compte ayant accès à cette page ; la modification est réservée au Super Admin.',
      },
      {
        id: 'jobs',
        heading: 'Jobs et historique',
        body:
          'L’onglet Monitoring &amp; Jobs permet de déclencher manuellement un job planifié et d’en consulter ' +
          'l’historique. Certains jobs à risque élevé restent visibles mais non exécutables sans le droit ' +
          'requis.',
        capability: 'JOB_EXECUTE',
      },
    ],
  },
  {
    // Phase 10.6 — audited against AuditPage.tsx, audit.columns.tsx,
    // AuditDetailsDialog.tsx, router.tsx. Page explicitly states
    // "lecture seule, non modifiable" - no delete/alter action exists.
    routePattern: '/audit',
    title: 'Aide - Journal d’audit',
    articles: ['consulter-journal-audit'],
    sections: [
      {
        id: 'a-quoi-sert',
        heading: 'À quoi sert cette page',
        body:
          'Trace les actions effectuées dans SICOT, à des fins de traçabilité - en lecture seule, aucune ' +
          'entrée ne peut être modifiée ou supprimée.',
      },
      {
        id: 'filtrer',
        heading: 'Trouver un événement',
        body: 'Filtrez par module, par action ou par période (date de début / date de fin).',
      },
      {
        id: 'lire-entree',
        heading: 'Lire une entrée',
        body:
          'Le bouton Détails ouvre la fiche complète d’un événement : utilisateur à l’origine, entité ' +
          'concernée, adresse IP et informations techniques additionnelles propres à l’action.',
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
