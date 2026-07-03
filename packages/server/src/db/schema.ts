import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { date } from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', [
  'agent',
  'traducteur',
  'relecteur',
  'admin',
  'super_admin',
]);

export const organisationTypeEnum = pgEnum('organisation_type', [
  'anac_etrangere',
  'organisation_internationale',
  'autre',
]);

export const accordStatutEnum = pgEnum('accord_statut', [
  'actif',
  'expire',
  'suspendu',
  'en_renouvellement',
]);

export const courrierDirectionEnum = pgEnum('courrier_direction', ['entrant', 'sortant']);

export const courrierReponseStatutEnum = pgEnum('courrier_reponse_statut', [
  'oui',
  'non',
  'pour_information',
]);

export const courrierSuiviStatutEnum = pgEnum('courrier_suivi_statut', [
  'en_attente',
  'repondu',
  'archive',
]);

export const missionStatutEnum = pgEnum('mission_statut', [
  'planifiee',
  'en_cours',
  'terminee',
  'annulee',
]);

export const recommandationStatutEnum = pgEnum('recommandation_statut', [
  'en_attente',
  'en_cours',
  'realisee',
]);

export const documentCategorieEnum = pgEnum('document_categorie', [
  'accord',
  'correspondance',
  'mission',
  'traduction',
  'glossaire',
  'autre',
]);

export const documentStatutOCREnum = pgEnum('document_statut_ocr', [
  'en_attente',
  'traite',
  'a_retraiter',
  'echec',
]);

export const traductionStatutEnum = pgEnum('traduction_statut', [
  'a_reviser',
  'en_relecture',
  'approuvee',
  'archivee',
  'manuelle_requise',
]);

export const traductionDirectionEnum = pgEnum('traduction_direction', ['fr_en', 'en_fr']);

export const moteurTraductionEnum = pgEnum('moteur_traduction', [
  'libretranslate',
  'deepl',
  'manuel',
]);

export const demandeStatutEnum = pgEnum('demande_statut', [
  'soumise',
  'en_cours',
  'en_relecture',
  'validee',
  'archivee',
]);

export const parametreTypeEnum = pgEnum('parametre_type', ['entier', 'booleen', 'texte']);

export const demandePrioriteEnum = pgEnum('demande_priorite', ['normale', 'urgente']);

export const notificationTypeEnum = pgEnum('notification_type', [
  'accord_echeance',
  'courrier_relance',
  'recommandation_rappel',
]);

export const notificationStatutEnum = pgEnum('notification_statut', ['envoyee', 'echec']);

export const logistiqueStatutEnum = pgEnum('logistique_statut', [
  'a_planifier',
  'en_cours',
  'confirme',
]);

// ── M10 – Notifications ───────────────────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    type: notificationTypeEnum('type').notNull(),
    entiteId: integer('entite_id').notNull(),
    destinataireEmail: varchar('destinataire_email', { length: 255 }).notNull(),
    destinataireNom: varchar('destinataire_nom', { length: 200 }),
    message: text('message').notNull(),
    declenchePar: integer('declenche_par')
      .notNull()
      .references(() => users.id),
    statut: notificationStatutEnum('statut').notNull().default('envoyee'),
    erreur: text('erreur'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('notifications_entite_idx').on(t.type, t.entiteId),
    index('notifications_created_at_idx').on(t.createdAt),
  ]
);

// ── M10 – Paramètres de configuration ─────────────────────────────────────
export const parametres = pgTable('parametres', {
  id: serial('id').primaryKey(),
  cle: varchar('cle', { length: 100 }).notNull().unique(),
  valeur: text('valeur').notNull(),
  type: parametreTypeEnum('type').notNull(),
  module: varchar('module', { length: 20 }).notNull(), // M1, M3, M4, NOTIF...
  description: text('description'),
  modifiePar: integer('modifie_par').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── M10 – Utilisateurs ─────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    matricule: varchar('matricule', { length: 20 }).notNull().unique(),
    nom: varchar('nom', { length: 100 }).notNull(),
    prenom: varchar('prenom', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    motDePasseHash: varchar('mot_de_passe_hash', { length: 255 }),
    otpHash: varchar('otp_hash', { length: 255 }),
    otpExpiresAt: timestamp('otp_expires_at'),
    role: userRoleEnum('role').notNull().default('agent'),
    actif: boolean('actif').notNull().default(false),
    premiereConnexion: boolean('premiere_connexion').notNull().default(true),
    tentativesEchouees: integer('tentatives_echouees').notNull().default(0),
    bloqueJusquA: timestamp('bloque_jusqu_a'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  // ✅ Nouvelle API : tableau au lieu d'objet
  (t) => [uniqueIndex('users_matricule_idx').on(t.matricule)]
);

// ── M10 – Journal d'audit ──────────────────────────────────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    module: varchar('module', { length: 20 }).notNull(),
    entiteId: integer('entite_id'),
    details: jsonb('details'),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_user_idx').on(t.userId),
    index('audit_logs_module_idx').on(t.module),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ]
);

// ── M2 – Organisations ─────────────────────────────────────────────────────
export const organisations = pgTable('organisations', {
  id: serial('id').primaryKey(),
  nom: varchar('nom', { length: 255 }).notNull(),
  pays: varchar('pays', { length: 100 }).notNull(),
  region: varchar('region', { length: 100 }),
  type: organisationTypeEnum('type').notNull(),
  actif: boolean('actif').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── M2 – Contacts ──────────────────────────────────────────────────────────
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  organisationId: integer('organisation_id')
    .notNull()
    .references(() => organisations.id),
  nom: varchar('nom', { length: 100 }).notNull(),
  prenom: varchar('prenom', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  telephone: varchar('telephone', { length: 30 }),
  poste: varchar('poste', { length: 150 }),
  principal: boolean('principal').notNull().default(false),
  actif: boolean('actif').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── M8 – Documents ─────────────────────────────────────────────────────────
export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    nom: varchar('nom', { length: 255 }).notNull(),
    nomOriginal: varchar('nom_original', { length: 255 }).notNull(),
    chemin: varchar('chemin', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    taille: integer('taille').notNull(),
    categorie: documentCategorieEnum('categorie').notNull().default('autre'),
    langue: varchar('langue', { length: 10 }),
    texteExtrait: text('texte_extrait'),
    statutOCR: documentStatutOCREnum('statut_ocr').notNull().default('en_attente'),
    hashMD5: varchar('hash_md5', { length: 32 }).notNull(),
    version: integer('version').notNull().default(1),
    parentId: integer('parent_id'),
    uploadePar: integer('uploade_par')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),

    visibilitePortail: boolean('visibilite_portail').notNull().default(false),
    portailTokenDureeJours: integer('portail_token_duree_jours'), // null = permanent
  },
  (t) => [
    index('documents_hash_idx').on(t.hashMD5),
    index('documents_categorie_idx').on(t.categorie),
    index('documents_statut_ocr_idx').on(t.statutOCR),
  ]
);

// ── M1 – Accords ───────────────────────────────────────────────────────────
export const accords = pgTable('accords', {
  id: serial('id').primaryKey(),
  reference: varchar('reference', { length: 20 }).notNull().unique(),
  titre: varchar('titre', { length: 255 }).notNull(),
  statut: accordStatutEnum('statut').notNull().default('actif'),
  dateSignature: timestamp('date_signature').notNull(),
  dateExpiration: timestamp('date_expiration'),
  parentId: integer('parent_id'),
  documentId: integer('document_id').references(() => documents.id),
  notes: text('notes'),
  createdPar: integer('cree_par').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── M1 – Relation many-to-many accords ↔ organisations ────────────────────
export const accordsOrganisations = pgTable('accords_organisations', {
  accordId: integer('accord_id')
    .notNull()
    .references(() => accords.id),
  organisationId: integer('organisation_id')
    .notNull()
    .references(() => organisations.id),
});

// ── M4 – Courriers ─────────────────────────────────────────────────────────
export const courriers = pgTable(
  'courriers',
  {
    id: serial('id').primaryKey(),
    reference: varchar('reference', { length: 20 }).notNull().unique(),
    referenceExpediteur: varchar('reference_expediteur', { length: 100 }),
    direction: courrierDirectionEnum('direction').notNull(),
    objet: varchar('objet', { length: 500 }).notNull(),
    expediteurOrganisationId: integer('expediteur_organisation_id').references(
      () => organisations.id
    ),
    destinataireOrganisationId: integer('destinataire_organisation_id').references(
      () => organisations.id
    ),
    dateReception: timestamp('date_reception').notNull(),
    reponseRequise: courrierReponseStatutEnum('reponse_requise').notNull(),
    dateLimiteReponse: timestamp('date_limite_reponse'),
    suiviStatut: courrierSuiviStatutEnum('suivi_statut').notNull().default('en_attente'),
    reponseAId: integer('reponse_a_id'),
    accordId: integer('accord_id').references(() => accords.id),
    missionId: integer('mission_id'),
    documentId: integer('document_id').references(() => documents.id),
    createdPar: integer('cree_par').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('courriers_direction_idx').on(t.direction),
    index('courriers_statut_idx').on(t.suiviStatut),
  ]
);

// ── M3 – Missions ──────────────────────────────────────────────────────────
export const missions = pgTable('missions', {
  id: serial('id').primaryKey(),
  titre: varchar('titre', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }).notNull(),
  pays: varchar('pays', { length: 100 }).notNull(),
  dateDebut: timestamp('date_debut').notNull(),
  dateFin: timestamp('date_fin').notNull(),
  statut: missionStatutEnum('statut').notNull().default('planifiee'),
  rapportDocumentId: integer('rapport_document_id').references(() => documents.id),
  createdPar: integer('cree_par').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  confirmationLogistique: logistiqueStatutEnum('confirmation_logistique')
    .notNull()
    .default('a_planifier'),
  contactSurPlaceId: integer('contact_sur_place_id').references(() => contacts.id),
});

// ── M3 – Participants a une mission ─────────────────────────────────────
export const missionParticipants = pgTable('mission_participants', {
  missionId: integer('mission_id')
    .notNull()
    .references(() => missions.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
});

// ── M3 – Recommandations ───────────────────────────────────────────────────
export const recommandations = pgTable('recommandations', {
  id: serial('id').primaryKey(),
  missionId: integer('mission_id')
    .notNull()
    .references(() => missions.id),
  texte: text('texte').notNull(),
  responsableId: integer('responsable_id').references(() => users.id),
  dateLimite: timestamp('date_limite'),
  statut: recommandationStatutEnum('statut').notNull().default('en_attente'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── M7 – Glossaire ─────────────────────────────────────────────────────────
export const glossaire = pgTable(
  'glossaire',
  {
    id: serial('id').primaryKey(),
    termeFr: varchar('terme_fr', { length: 255 }).notNull(),
    termeEn: varchar('terme_en', { length: 255 }).notNull(),
    domaine: varchar('domaine', { length: 100 }),
    contexte: text('contexte'),
    actif: boolean('actif').notNull().default(true),
    createdPar: integer('cree_par').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('glossaire_terme_fr_idx').on(t.termeFr),
    index('glossaire_terme_en_idx').on(t.termeEn),
  ]
);

// ── M7 – Historique glossaire ──────────────────────────────────────────────
export const glossaireHistorique = pgTable('glossaire_historique', {
  id: serial('id').primaryKey(),
  termeId: integer('terme_id')
    .notNull()
    .references(() => glossaire.id),
  ancienTermeFr: varchar('ancien_terme_fr', { length: 255 }),
  ancienTermeEn: varchar('ancien_terme_en', { length: 255 }),
  modifiePar: integer('modifie_par').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── M6 – Traductions ───────────────────────────────────────────────────────
export const traductions = pgTable('traductions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documents.id),
  texteOriginal: text('texte_original'),
  texteIA: text('texte_ia'),
  texteFinal: text('texte_final'),
  direction: traductionDirectionEnum('direction').notNull(),
  statut: traductionStatutEnum('statut').notNull().default('a_reviser'),
  moteurUtilise: moteurTraductionEnum('moteur_utilise').notNull().default('libretranslate'),
  traducteurId: integer('traducteur_id').references(() => users.id),
  relecteurId: integer('relecteur_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ── M5 – Demandes de traduction ────────────────────────────────────────────
export const demandesTraduction = pgTable(
  'demandes_traduction',
  {
    id: serial('id').primaryKey(),
    demandeurId: integer('demandeur_id')
      .notNull()
      .references(() => users.id),
    traducteurId: integer('traducteur_id').references(() => users.id),
    documentId: integer('document_id').references(() => documents.id),
    texteLibre: text('texte_libre'),
    direction: traductionDirectionEnum('direction').notNull(),
    prioriteDemandee: demandePrioriteEnum('priorite_demandee').notNull().default('normale'),
    prioriteValidee: demandePrioriteEnum('priorite_validee'),
    statut: demandeStatutEnum('statut').notNull().default('soumise'),
    traductionId: integer('traduction_id').references(() => traductions.id),
    verrou: boolean('verrou').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('demandes_statut_idx').on(t.statut),
    index('demandes_traducteur_idx').on(t.traducteurId),
  ]
);

// Sprint 9
export const portailTokens = pgTable(
  'portail_tokens',
  {
    id: serial('id').primaryKey(),
    documentId: integer('document_id')
      .notNull()
      .references(() => documents.id),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 36 }).notNull().unique(), // UUID v4
    expiresAt: timestamp('expires_at'), // null = permanent
    utiliseLe: timestamp('utilise_le'),
    ipUtilisateur: varchar('ip_utilisateur', { length: 45 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('portail_tokens_token_idx').on(t.token),
    index('portail_tokens_document_idx').on(t.documentId),
    index('portail_tokens_email_idx').on(t.email),
  ]
);

// ── M4/M11 – Historique quotidien de criticité des courriers ──────────────
// Une ligne par jour : la criticité n'étant jamais persistée sur le courrier
// lui-même (calculée à la volée depuis parametres), ceci est le seul moyen
// d'observer une évolution dans le temps. S'accumule à partir du déploiement.
export const courriersCriticiteSnapshots = pgTable('courriers_criticite_snapshots', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  normal: integer('normal').notNull(),
  aSurveiller: integer('a_surveiller').notNull(),
  critique: integer('critique').notNull(),
  totalEnAttente: integer('total_en_attente').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
  demandesCreees: many(demandesTraduction, { relationName: 'demandeur' }),
  traductionsAssignees: many(traductions, { relationName: 'traducteur' }),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
  contacts: many(contacts),
  accords: many(accordsOrganisations),
}));

export const accordsRelations = relations(accords, ({ many, one }) => ({
  partenaires: many(accordsOrganisations),
  document: one(documents, { fields: [accords.documentId], references: [documents.id] }),
}));

export const missionsRelations = relations(missions, ({ many }) => ({
  participants: many(missionParticipants),
  recommandations: many(recommandations),
}));
